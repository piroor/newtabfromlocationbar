var OpenLinkInTabService = { 
	
	get browser() 
	{
		return 'SplitBrowser' in window ? window.SplitBrowser.activeBrowser :
			window.gBrowser ;
	},
 
	preInit : function TSTService_preInit() 
	{
		if (this.preInitialized) return;
		this.preInitialized = true;

		window.removeEventListener('DOMContentLoaded', this, true);
		if (location.href.indexOf('chrome://browser/content/browser.xul') != 0)
			return;

		this.overrideExtensionsPreInit(); // hacks.js
	},
	preInitialized : false,
 
	init : function OLITService_init() 
	{
		if (!('gBrowser' in window)) return;

		if (!this.preInitialized)
			this.preInit();

		if (this.initialized) return;
		this.initialized = true;

		window.removeEventListener('load', this, false);

		window.addEventListener('unload', this, false);
		window.addEventListener('TabOpen', this, true);

//		this.overrideExtensionsOnInitBefore(); // hacks.js
		this.overrideGlobalFunctions();
//		this.overrideExtensionsOnInitAfter(); // hacks.js

		this.initUninstallationListener();
	},
	initialized : false,
	
	initUninstallationListener : function OLITService_initUninstallationListener() 
	{
		var namespace = {};
		Components.utils.import(
			'resource://openlinkintab-modules/prefs.js',
			namespace
		);
		var prefs = namespace.prefs;
		namespace = void(0);
		var restorePrefs = function() {
				if (!prefs) return;
				[
					'browser.link.open_newwindow.restriction'
				].forEach(function(aPref) {
					var backup = prefs.getPref(aPref+'.backup');
					if (backup === null) return;
					prefs.setPref(aPref+'.override', backup); // we have to set to ".override" pref, to avoid unexpectedly reset by the preference listener.
					prefs.clearPref(aPref+'.backup');
				});
			};
		new window['piro.sakura.ne.jp'].UninstallationListener({
			id : 'openlinkintab@piro.sakura.ne.jp',
			onuninstalled : restorePrefs,
			ondisabled : restorePrefs
		});
	},
  
	destroy : function OLITService_destroy() 
	{
		if (!this.initialized) return;
		this.initialized = false;

		window.removeEventListener('unload', this, false);
		window.removeEventListener('TabOpen', this, true);
	},
 
	overrideGlobalFunctions : function OLITService_overrideGlobalFunctions() 
	{
		let (toolbox) {
			toolbox = document.getElementById('navigator-toolbox');
			if (toolbox.customizeDone) {
				toolbox.__openlinkintab__customizeDone = toolbox.customizeDone;
				toolbox.customizeDone = function(aChanged) {
					this.__openlinkintab__customizeDone(aChanged);
					OpenLinkInTabService.initToolbarItems();
				};
			}
			if ('BrowserToolboxCustomizeDone' in window) {
				window.__openlinkintab__BrowserToolboxCustomizeDone = window.BrowserToolboxCustomizeDone;
				window.BrowserToolboxCustomizeDone = function(aChanged) {
					window.__openlinkintab__BrowserToolboxCustomizeDone.apply(window, arguments);
					OpenLinkInTabService.initToolbarItems();
				};
			}
			this.initToolbarItems();
			toolbox = null;
		}

		this._splitFunctionNames(<![CDATA[
			window.permaTabs.utils.wrappedFunctions["window.BrowserLoadURL"]
			window.BrowserLoadURL
		]]>).forEach(function(aFunc) {
			let source = this._getFunctionSource(aFunc);
			if (!source || !/^\(?function BrowserLoadURL/.test(source))
				return;
			eval(aFunc+' = '+source.replace(
				'aTriggeringEvent && aTriggeringEvent.altKey',
				'OpenLinkInTabService.checkReadyToOpenNewTabOnLocationBar(url, $&)'
			));
			source = null;
		}, this);


		this._splitFunctionNames(<![CDATA[
			window.duplicateTab.handleLinkClick
			window.__openlinkintab__highlander__origHandleLinkClick
			window.__splitbrowser__handleLinkClick
			window.__ctxextensions__handleLinkClick
			window.handleLinkClick
		]]>).some(function(aFunc) {
			let source = this._getFunctionSource(aFunc);
			if (!source || !/^\(?function handleLinkClick/.test(source))
				return false;
			eval(aFunc+' = '+source.replace(  // for -Firefox 3.6
				/(event.ctrlKey|event.metaKey)/,
				<![CDATA[
					OpenLinkInTabService.checkReadyToOpenNewTabFromLink({
						link     : (linkNode || { href : href }),
						modifier : $1,
						invert   : OpenLinkInTabService.getMyPref('link.invertDefaultBehavior')
					}) &&
					(
						(OpenLinkInTabService.isNewTabAction(event) ? null : OpenLinkInTabService.readyToOpenDivertedTab()),
						true
					)
				]]>
			).replace( // for -Firefox 3.6
				/* あらゆるリンクからタブを開く設定の時に、アクセルキーが押されていた場合は
				   反転された動作（通常のリンク読み込み）を行う */
				'return false;case 1:',
				<![CDATA[
						if ( // do nothing for Tab Mix Plus
							!OpenLinkInTabService.getMyPref('compatibility.TMP') ||
							!('TMP_contentAreaClick' in window)
							) {
							if ('TreeStyleTabService' in window &&
								TreeStyleTabService.checkToOpenChildTab())
								TreeStyleTabService.stopToOpenChildTab();
							if (OpenLinkInTabService.isAccelKeyPressed(event)) {
								if (linkNode)
									urlSecurityCheck(href,
										'nodePrincipal' in linkNode.ownerDocument ?
											linkNode.ownerDocument.nodePrincipal :
											linkNode.ownerDocument.location.href
									);
								var postData = {};
								href = getShortcutOrURI(href, postData);
								if (!href) return false;
								loadURI(href, null, postData.value, false);
							}
						}
						return false;
					case 1:
				]]>
			).replace( // for Firefox 4.0-
				'where = whereToOpenLink(event);',
				<![CDATA[$&
					var OLITFilteringResult = OpenLinkInTabService.filterWhereToOpenLink(where, { linkNode : linkNode, event : event });
					where = OLITFilteringResult.where;
					if (OLITFilteringResult.divertedToTab)
						OpenLinkInTabService.readyToOpenDivertedTab();
				]]>.toString()
			).replace( // for Firefox 4.0-
				/(if \([^\)]*where == "current")/,
				'$1 && !OLITFilteringResult.inverted'
			));
			source = null;
			return true;
		}, this);

		this._splitFunctionNames(<![CDATA[
			window.permaTabs.utils.wrappedFunctions["window.contentAreaClick"]
			window.__contentAreaClick
			window.__ctxextensions__contentAreaClick
			window.contentAreaClick
		]]>).forEach(function(aFunc) {
			let source = this._getFunctionSource(aFunc);
			if (!source || !/^\(?function contentAreaClick/.test(source))
				return;
			eval(aFunc+' = '+source.replace(
				/((openWebPanel\([^\;]+\);|PlacesUIUtils.showMinimalAddBookmarkUI\([^;]+\);)event.preventDefault\(\);return false;\})/,
				<![CDATA[
					$1
					else if (
						( // do nothing for Tab Mix Plus
							!OpenLinkInTabService.getMyPref('compatibility.TMP') ||
							!('TMP_contentAreaClick' in window)
						) &&
						OpenLinkInTabService.checkReadyToOpenNewTabFromLink(wrapper)
						) {
						event.stopPropagation();
						event.preventDefault();
						handleLinkClick(event, wrapper.href, linkNode);
						return true;
					}
				]]>
			));
			source = null;
		}, this);
	},
	
	_splitFunctionNames : function OLITService_splitFunctionNames(aString) 
	{
		return String(aString)
				.split(/\s+/)
				.map(function(aString) {
					return aString
							.replace(/\/\*.*\*\//g, '')
							.replace(/\/\/.+$/, '')
							.replace(/^\s+|\s+$/g, '');
				});
	},
 
	_getFunctionSource : function OLITService_getFunctionSource(aFunc) 
	{
		var func;
		try {
			eval('func = '+aFunc);
		}
		catch(e) {
			return null;
		}
		return func ? func.toSource() : null ;
	},
  
	initToolbarItems : function OLITService_initToolbarItems() 
	{
		var bar = document.getElementById('urlbar');
		if (!bar) return;

		var source;
		if (
			'handleCommand' in bar &&
			(source = bar.handleCommand.toSource()) &&
			source.indexOf('OpenLinkInTabService') < 0
			) {
			eval('bar.handleCommand = '+source.replace(
				/(aTriggeringEvent && aTriggeringEvent\.altKey)/g,
				'OpenLinkInTabService.checkReadyToOpenNewTabOnLocationBar(this.value, $1)'
			));
		}
		bar    = null;
		source = null;
	},
 
	handleEvent : function OLITService_handleEvent(aEvent) 
	{
		switch (aEvent.type)
		{
			case 'DOMContentLoaded':
				return this.preInit();

			case 'load':
				return this.init();

			case 'unload':
				return this.destroy();

			case 'TabOpen':
				return this.onTabOpened(aEvent);
		}
	},
	
	onTabOpened : function OLITService_onTabOpened(aEvent) 
	{
		var tab = aEvent.originalTarget;
		var b   = this.helper.getTabBrowserFromChild(tab);
		if (b.__openlinkintab__readiedToOpenDivertedTab) {
			if (!this.getPref('browser.tabs.loadDivertedInBackground')) {
				window.setTimeout(function() {
					if (b.selectedTab == tab)
						return;

					var owner = b.selectedTab;
					b.selectedTab = tab;
					tab.owner = owner;
				}, 0);
			}
			b.__openlinkintab__readiedToOpenDivertedTab = false;
		}
	}
  
}; 
  
(function() { 
	var namespace = {};
	Components.utils.import('resource://openlinkintab-modules/utils.js', namespace);
	Components.utils.import('resource://openlinkintab-modules/autoNewTabHelper.js', namespace);
	OpenLinkInTabService.__proto__ = namespace.OpenLinkInTabUtils;
	OpenLinkInTabService.helper = namespace.autoNewTabHelper;

	window.addEventListener('DOMContentLoaded', OpenLinkInTabService, false);
	window.addEventListener('load', OpenLinkInTabService, false);
})();
 
