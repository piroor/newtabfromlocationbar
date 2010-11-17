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

		this.overrideExtensionsOnInitBefore(); // hacks.js
		this.overrideGlobalFunctions();
		this.overrideExtensionsOnInitAfter(); // hacks.js
	},
	initialized : false,
 
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
 
