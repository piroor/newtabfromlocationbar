Components.utils.import('resource://newtabfromlocationbar-modules/prefs.js', {});
Components.utils.import('resource://newtabfromlocationbar-modules/namespace.jsm');
Components.utils.import('resource://newtabfromlocationbar-modules/extensions.js');
var prefs = getNamespaceFor('piro.sakura.ne.jp')['piro.sakura.ne.jp'].prefs;
var extensions = getNamespaceFor('piro.sakura.ne.jp')['piro.sakura.ne.jp'].extensions;

const TREESTYLETAB_ID = 'treestyletab@piro.sakura.ne.jp';
var treeStyleTabAvailable = false;

var gLoadLocationBarToNewTabScale,
	gLoadLocationBarToChildTabScale;

function initUrlbarPane()
{
	gLoadLocationBarToNewTabScale = new ScaleSet(
		['extensions.newtabfromlocationbar@piro.sakura.ne.jp.loadDifferentDomainToNewTab',
		 'extensions.newtabfromlocationbar@piro.sakura.ne.jp.loadSameDomainToNewTab'],
		'loadLocationBarToNewTab-scale',
		'loadLocationBarToNewTab-labels'
	);
	gLoadLocationBarToChildTabScale = new ScaleSet(
		['extensions.newtabfromlocationbar@piro.sakura.ne.jp.loadSameDomainToNewTab.asChild',
		 'extensions.newtabfromlocationbar@piro.sakura.ne.jp.loadDifferentDomainToNewTab.asChild'],
		'loadLocationBarToChildTab-scale',
		'loadLocationBarToChildTab-labels'
	);

	[
		'treeStyleTabLink'
	].forEach(function(aItem) {
		aItem = document.getElementById(aItem);
		aItem.setAttribute('collapsed', true);
		extensions.isInstalled(TREESTYLETAB_ID, { ng : function() {
			aItem.removeAttribute('collapsed');
		}});
	});

	[
		'treeStyleTabConfig'
	].forEach(function(aItem) {
		aItem = document.getElementById(aItem);
		aItem.setAttribute('collapsed', true);
		aItem.setAttribute('disabled', true);
		extensions.isInstalled(TREESTYLETAB_ID, { ok : function() {
			aItem.removeAttribute('collapsed');
		}});
		extensions.isEnabled(TREESTYLETAB_ID, { ok : function() {
			aItem.removeAttribute('disabled');
			treeStyleTabAvailable = true;
			updateTreePrefAvailability();
		}});
	});

	updateTreePrefAvailability();
}

function updateTreePrefAvailability()
{
	gLoadLocationBarToChildTabScale.disabled = !treeStyleTabAvailable || gLoadLocationBarToNewTabScale.value == 0;
}

function openTreeStyleTabConfig()
{
	extensions.goToOptions(TREESTYLETAB_ID, window);
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
