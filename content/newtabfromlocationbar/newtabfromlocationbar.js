var NewTabFromLocationBarService = { 
	
	get browser() 
	{
		return window.gBrowser ;
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
	},
  
	initToolbarItems : function NTFLBService_initToolbarItems() 
	{
		var bar = document.getElementById('urlbar');
		if (!bar) return;

		if (
			'handleCommand' in bar &&
			(
				!('__newtabfromlocationbar__handleCommand' in bar) ||
				bar.handleCommand.toString() !== bar.__newtabfromlocationbar__handleCommand.toString()
			)
			) {
			bar.__newtabfromlocationbar__handleCommand = bar.handleCommand;
			bar.handleCommand = function(aTriggeringEvent, ...aArgs) {
				if (NewTabFromLocationBarService.utils.getMyPref('debug')) {
					dump('handleCommand\n');
				}
				var processURL = (function(aURL) {
					if (NewTabFromLocationBarService.utils.getMyPref('debug')) {
						dump('  uri             = '+aURL+'\n');
					}
					if (!aURL) {
						this.__newtabfromlocationbar__handleCommand(aTriggeringEvent, ...aArgs);
						return;
					}

					var where = whereToOpenLink(aTriggeringEvent, false, false);
					var overriddenWhere = NewTabFromLocationBarService.overrideWhere(aURL, where);
					var realAltKey = aTriggeringEvent && aTriggeringEvent.altKey;
					if (NewTabFromLocationBarService.utils.getMyPref('debug')) {
						dump('  where           = '+where+'\n');
						dump('  overriddenWhere = '+overriddenWhere+'\n');
						dump('  realAltKey      = '+realAltKey+'\n');
					}
					if (where !== overriddenWhere &&
						overriddenWhere.indexOf('tab') == 0 &&
						aTriggeringEvent &&
						!aTriggeringEvent.__newtabfromlocationbar__proxied) {
						var reallyNewTab = NewTabFromLocationBarService.checkReadyToOpenNewTabOnLocationBar(aURL, realAltKey);
						if (NewTabFromLocationBarService.utils.getMyPref('debug'))
							dump('  => Overridden by New Tab from Location Bar, newtab = '+reallyNewTab+'\n');
						aTriggeringEvent = NewTabFromLocationBarService.wrapTriggeringEvent(aTriggeringEvent, {
							altKey : reallyNewTab
						});
					}
					this.__newtabfromlocationbar__handleCommand(aTriggeringEvent, ...aArgs);
				}).bind(this);
				if (typeof this.maybeCanonizeURL == 'function') { // Firefox 50 and later
					processURL(this.popup.overrideValue || this.value);
				}
				else { // Firefox 49 or older versions
					this._canonizeURL(aTriggeringEvent, function(aResponse) {
						var [uri, postData, mayInheritPrincipal] = aResponse;
						processURL(uri);
					});
				}
			};

			bar.popup.__newtabfromlocationbar__onPopupClick = bar.popup.onPopupClick;
			bar.popup.onPopupClick = function(aEvent, ...aArgs) {
				if (NewTabFromLocationBarService.utils.getMyPref('debug')) {
					dump('onPopupClick\n');
				}

				var controller = this.view.QueryInterface(Components.interfaces.nsIAutoCompleteController);
				var uri = controller.getValueAt(this.selectedIndex);
				if (NewTabFromLocationBarService.utils.getMyPref('debug'))
					dump('  uri             = '+uri+'\n');
				var action = this.input._parseActionUrl(uri);
				if (action) {
					switch (action.type)
					{
						case 'switchtab':
						case 'keyword':
						case 'visiturl':
							uri = action.params.url;
							break;
						case 'searchengine':
							[uri] = this.input._parseAndRecordSearchEngineAction(action);
							break;
						default:
							uri = null;
							break;
					}
				}
				if (NewTabFromLocationBarService.utils.getMyPref('debug'))
					dump('                 => '+uri+'\n');
				if (!uri) {
					this.__newtabfromlocationbar__onPopupClick.apply(this, [aEvent].concat(aArgs));
					return;
				}

				var where = whereToOpenLink(aEvent, false, true);
				var overriddenWhere = NewTabFromLocationBarService.overrideWhere(uri, where);
				var modifier = NewTabFromLocationBarService.utils.isMac ? 'metaKey' : 'ctrlKey';
				var realModifier = aEvent && aEvent[modifier];
				if (NewTabFromLocationBarService.utils.getMyPref('debug')) {
					dump('  where           = '+where+'\n');
					dump('  overriddenWhere = '+overriddenWhere+'\n');
					dump('  realModifier    = '+realModifier+'\n');
				}
				if (where !== overriddenWhere &&
					overriddenWhere.indexOf('tab') == 0 &&
					aEvent &&
					!aEvent.__newtabfromlocationbar__proxied) {
					var reallyNewTab = NewTabFromLocationBarService.checkReadyToOpenNewTabOnLocationBar(uri, realModifier);
					if (NewTabFromLocationBarService.utils.getMyPref('debug'))
						dump('  => Overridden by New Tab from Location Bar, newtab = '+reallyNewTab+'\n');
					var fixedFields = {};
					fixedFields[modifier] = reallyNewTab;
					aEvent = NewTabFromLocationBarService.wrapTriggeringEvent(aEvent, fixedFields);
				}
				this.__newtabfromlocationbar__onPopupClick.apply(this, [aEvent].concat(aArgs));
			};
		}
		bar    = null;
	},

	wrapTriggeringEvent : function NTFLBService_wrapTriggeringEvent(aEvent, aFixedFields)
	{
		return new Proxy(aEvent, {
			get: function(aTarget, aName) {
				switch (aName)
				{
					case '__newtabfromlocationbar__proxied':
						return true;

					default:
						if (aName in aFixedFields)
							return aFixedFields[aName];

						var object = aTarget[aName];
						if (typeof object == 'function')
							return object.bind(aTarget);
						return object;
				}
			}
		});
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
 
	overrideWhere : function NTFLBService_overrideWhere(aURI, aWhere)
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
 
