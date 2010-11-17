Components.utils.import('resource://treestyletab-modules/prefs.js', {});
Components.utils.import('resource://treestyletab-modules/namespace.jsm');
var prefs = getNamespaceFor('piro.sakura.ne.jp')['piro.sakura.ne.jp'].prefs;

var gOpenLinkInTabScale,
	gLoadLocationBarToNewTabScale,
	gLoadLocationBarToChildTabScale;

function initLinkPane()
{
	gOpenLinkInTabScale = new ScaleSet(
		['extensions.treestyletab.openOuterLinkInNewTab',
		 'extensions.treestyletab.openAnyLinkInNewTab'],
		'openLinkInNewTab-scale',
		'openLinkInNewTab-labels'
	);
}

function initUrlbarPane()
{
	gOpenLinkInTabScale = new ScaleSet(
		['extensions.treestyletab.openOuterLinkInNewTab',
		 'extensions.treestyletab.openAnyLinkInNewTab'],
		'openLinkInNewTab-scale',
		'openLinkInNewTab-labels'
	);
	gLoadLocationBarToNewTabScale = new ScaleSet(
		['extensions.treestyletab.urlbar.loadDifferentDomainToNewTab',
		 'extensions.treestyletab.urlbar.loadSameDomainToNewTab'],
		'loadLocationBarToNewTab-scale',
		'loadLocationBarToNewTab-labels'
	);
	gLoadLocationBarToChildTabScale = new ScaleSet(
		['extensions.treestyletab.urlbar.loadSameDomainToNewTab.asChild',
		 'extensions.treestyletab.urlbar.loadDifferentDomainToNewTab.asChild'],
		'loadLocationBarToChildTab-scale',
		'loadLocationBarToChildTab-labels'
	);

	gLoadLocationBarToChildTabScale.disabled = gLoadLocationBarToNewTabScale.value == 0;
}

function initJSOpenPane()
{
	var restrictionKey = 'browser.link.open_newwindow.restriction';
	var restriction = document.getElementById(restrictionKey);
	try {
		restriction.value = prefs.getPref(restrictionKey);
	}
	catch(e) {
		prefs.setPref(restrictionKey, parseInt(restriction.value));
	}
}


function ScaleSet(aPrefs, aScale, aLabelsContainer)
{
	this.prefs = aPrefs.map(document.getElementById, document);
	this.scale = document.getElementById(aScale);
	this.labels = Array.slice(document.getElementById(aLabelsContainer).getElementsByTagName('label'));

	this.scale.value = this.prefs[1].value ? 2 :
						this.prefs[0].value ? 1 :
							0 ;
	this.updateLabels();
}
ScaleSet.prototype = {
	onChange : function()
	{
		var value = this.value;
		this.prefs[0].value = value > 0;
		this.prefs[1].value = value > 1;
		this.updateLabels();
	},

	set value(aValue)
	{
		this.scale.value = aValue;
		this.onChange();
		return aValue;
	},
	get value()
	{
		return parseInt(this.scale.value);
	},

	set disabled(aDisabled)
	{
		if (aDisabled) {
			this.scale.setAttribute('disabled', true);
			this.labels.forEach(function(aNode) {
				aNode.setAttribute('disabled', true);
			});
		}
		else {
			this.scale.removeAttribute('disabled');
			this.labels.forEach(function(aNode) {
				aNode.removeAttribute('disabled');
			});
		}
	},
	get disabled()
	{
		return this.scale.getAttribute('disabled') == 'true';
	},

	updateLabels : function()
	{
		this.labels.forEach(function(aLabel, aIndex) {
			if (aIndex == this.value)
				aLabel.setAttribute('scale-selected', true);
			else
				aLabel.removeAttribute('scale-selected');
		}, this);
	},

	destroy : function()
	{
		this.prefs = null;
		this.scale = null;
		this.labels = null;
	}
};
