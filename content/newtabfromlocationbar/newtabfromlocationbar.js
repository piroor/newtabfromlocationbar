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
				this._canonizeURL(aTriggeringEvent, (function(aResponse) {
					var [uri, postData, mayInheritPrincipal] = aResponse;
					if (NewTabFromLocationBarService.utils.getMyPref('debug')) {
						dump('  uri             = '+uri+'\n');
					}
					if (!uri) {
						this.__newtabfromlocationbar__handleCommand.apply(this, [aTriggeringEvent].concat(aArgs));
						return;
					}

					var where = whereToOpenLink(aTriggeringEvent, false, false);
					var overriddenWhere = NewTabFromLocationBarService.overrideWhere(uri, where);
					var realAltKey = aTriggeringEvent && aTriggeringEvent.altKey;
					if (NewTabFromLocationBarService.utils.getMyPref('debug')) {
						dump('  where           = '+where+'\n');
						dump('  overriddenWhere = '+overriddenWhere+'\n');
						dump('  realAltKey      = '+realAltKey+'\n');
					}
					if (where !== overriddenWhere &&
						overriddenWhere.indexOf('tab') == 0) {
						var reallyNewTab = NewTabFromLocationBarService.checkReadyToOpenNewTabOnLocationBar(uri, realAltKey);
						if (NewTabFromLocationBarService.utils.getMyPref('debug'))
							dump('  => Overridden by New Tab from Location Bar, newtab = '+reallyNewTab+'\n');
						aTriggeringEvent = new Proxy(aTriggeringEvent, {
							get: function(aTarget, aName) {
								switch (aName)
								{
									case 'altKey':
										return reallyNewTab;
									default:
										return aTarget[aName].bind(aTarget);
								}
							}
						});
					}
					this.__newtabfromlocationbar__handleCommand.apply(this, [aTriggeringEvent].concat(aArgs));
				}).bind(this));
			};
		}
		bar    = null;
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
 
