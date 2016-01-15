var NewTabFromLocationBarService = { 
	
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
 
	init : function NTFLBService_init() 
	{
		if (!('gBrowser' in window)) return;

		if (!this.preInitialized)
			this.preInit();

		if (this.initialized) return;
		this.initialized = true;

		window.removeEventListener('load', this, false);
		window.addEventListener('unload', this, false);
		window.addEventListener('TabOpen', this, true);

		this.overrideExtensionsOnInitBefore(); // hacks.js
		this.overrideGlobalFunctions();
		this.overrideExtensionsOnInitAfter(); // hacks.js
	},
	initialized : false,
 
	destroy : function NTFLBService_destroy() 
	{
		window.removeEventListener('unload', this, false);
		window.removeEventListener('TabOpen', this, true);
		let toolbox = document.getElementById('navigator-toolbox');
		toolbox.removeEventListener('customizationending', this, false);
	},
 
	overrideGlobalFunctions : function NTFLBService_overrideGlobalFunctions() 
	{
		{
			let toolbox = document.getElementById('navigator-toolbox');
			toolbox.addEventListener('customizationending', this, false);
			if (toolbox.customizeDone) {
				toolbox.__newtabfromlocationbar__customizeDone = toolbox.customizeDone;
				toolbox.customizeDone = function(aChanged) {
					this.__newtabfromlocationbar__customizeDone(aChanged);
					NewTabFromLocationBarService.initToolbarItems();
				};
			}
			if ('BrowserToolboxCustomizeDone' in window) {
				window.__newtabfromlocationbar__BrowserToolboxCustomizeDone = window.BrowserToolboxCustomizeDone;
				window.BrowserToolboxCustomizeDone = function(aChanged) {
					window.__newtabfromlocationbar__BrowserToolboxCustomizeDone.apply(window, arguments);
					NewTabFromLocationBarService.initToolbarItems();
				};
			}
			this.initToolbarItems();
			toolbox = null;
		}

		[
			'window.permaTabs.utils.wrappedFunctions["window.BrowserLoadURL"]',
			'window.BrowserLoadURL'
		].forEach(function(aFunc) {
			let source = this._getFunctionSource(aFunc);
			if (!source || !/^\(?function BrowserLoadURL/.test(source))
				return;
			eval(aFunc+' = '+source.replace(
				'aTriggeringEvent && aTriggeringEvent.altKey',
				'NewTabFromLocationBarService.checkReadyToOpenNewTabOnLocationBar(url, $&)'
			));
			source = null;
		}, this);
	},
	
	_getFunctionSource : function NTFLBService_getFunctionSource(aFunc) 
	{
		var func;
		try {
			eval('func = '+aFunc);
		}
		catch(e) {
			return null;
		}
		return func ? func.toString() : null ;
	},
  
	initToolbarItems : function NTFLBService_initToolbarItems() 
	{
		var bar = document.getElementById('urlbar');
		if (!bar) return;

		var source;
		if (
			'handleCommand' in bar &&
			(source = bar.handleCommand.toString()) &&
			source.indexOf('NewTabFromLocationBarService') < 0
			) {
			eval('bar.handleCommand = '+source.replace(
				// for Firefox 4 or later
				/(whereToOpenLink\([^\)]*\))/g,
				'NewTabFromLocationBarService.overrideWhere(url, $1)'
			).replace(
				/(aTriggeringEvent &&\s*\n?\s*aTriggeringEvent\.altKey)/g,
				'NewTabFromLocationBarService.checkReadyToOpenNewTabOnLocationBar(this.value, $1)'
			).replace(
				// by the modification above, preventDefault() and stopPropagation()
				// can be called even if aTriggeringEvent is null!
				/(aTriggeringEvent\.(?:preventDefault|stopPropagation)\(\))/g,
				'aTriggeringEvent && $1'
			));
		}
		bar    = null;
		source = null;
	},
 
	handleEvent : function NTFLBService_handleEvent(aEvent) 
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

			case 'customizationending':
				return this.initToolbarItems();
		}
	},
 
	onTabOpened : function NTFLBService_onTabOpened(aEvent) 
	{
		var tab = aEvent.originalTarget;
		var b   = this.helper.getTabBrowserFromChild(tab);
		if (b.__newtabfromlocationbar__owner) {
			b.moveTabTo(tab, (b.__newtabfromlocationbar__lastRelatedTab || b.selectedTab)._tPos + 1);
			tab.owner = b.__newtabfromlocationbar__owner;
			b.__newtabfromlocationbar__owner = null;
			b.__newtabfromlocationbar__lastRelatedTab = null;
		}
	},
 
	onGoButtonClick : function NTFLBService_onGoButtonClick(aURI, aEvent) // for Firefox 3.6 
	{
		this.checkReadyToOpenNewTabOnLocationBar(aURI, aEvent.button == 1 || (aEvent.button == 0 && (aEvent.ctrlKey || aEvent.metaKey)));
	},
 
	overrideWhere : function NTFLBService_overrideWhere(aURI, aWhere) // for Firefox 4 or later 
	{
		var newTab = aWhere.indexOf('tab') == 0;
		if (this.checkReadyToOpenNewTabOnLocationBar(aURI, newTab) &&
			!newTab)
			aWhere = 'tab';
		return aWhere;
	},
 
	checkReadyToOpenNewTabOnLocationBar : function NTFLBService_checkReadyToOpenNewTabOnLocationBar(aURI, aModifier) 
	{
		return this.utils.checkReadyToOpenNewTabOnLocationBar(aURI, aModifier, this.browser);
	}
}; 
  
(function() { 
	var { NewTabFromLocationBarUtils } = Components.utils.import('resource://newtabfromlocationbar-modules/utils.js', {});
	var { autoNewTabHelper } = Components.utils.import('resource://newtabfromlocationbar-modules/autoNewTabHelper.js', {});
	NewTabFromLocationBarService.utils = NewTabFromLocationBarUtils;
	NewTabFromLocationBarService.helper = autoNewTabHelper;

	window.addEventListener('DOMContentLoaded', NewTabFromLocationBarService, false);
	window.addEventListener('load', NewTabFromLocationBarService, false);
})();
 
