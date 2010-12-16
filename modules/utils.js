/* ***** BEGIN LICENSE BLOCK ***** 
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is the New Tab from Location Bar.
 *
 * The Initial Developer of the Original Code is SHIMODA Hiroshi.
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s): SHIMODA Hiroshi <piro@p.club.ne.jp>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ******/
 
const EXPORTED_SYMBOLS = ['NewTabFromLocationBarUtils']; 

const Cc = Components.classes;
const Ci = Components.interfaces;
 
Components.utils.import('resource://newtabfromlocationbar-modules/prefs.js'); 
Components.utils.import('resource://newtabfromlocationbar-modules/autoNewTabHelper.js');

Components.utils.import('resource://newtabfromlocationbar-modules/namespace.jsm');
var window = getNamespaceFor('piro.sakura.ne.jp');
 
var NewTabFromLocationBarUtils = { 
	__proto__ : window['piro.sakura.ne.jp'].prefs,

	kPREFROOT : 'extensions.newtabfromlocationbar@piro.sakura.ne.jp',
	
	checkReadyToOpenNewTabOnLocationBar : function NTFLBUtils_checkReadyToOpenNewTabOnLocationBar(aURI, aModifier, aBrowser) 
	{
		var result = window['piro.sakura.ne.jp'].autoNewTabHelper.checkReadyToOpenNewTab({
			uri      : aURI,
			external : {
				newTab     : this.getMyPref('loadDifferentDomainToNewTab'),
				forceChild : this.getMyPref('loadDifferentDomainToNewTab.asChild')
			},
			internal : {
				newTab     : this.getMyPref('loadSameDomainToNewTab'),
				forceChild : this.getMyPref('loadSameDomainToNewTab.asChild')
			},
			modifier : aModifier,
			invert   : this.getMyPref('invertDefaultBehavior'),
			useEffectiveTLD : this.getMyPref('useEffectiveTLD'),
			checkUserHome   : this.getMyPref('checkUserHome')
		});

		if (result.open && aBrowser) {
			let currentStatus = this.getCurrentStatus(aBrowser);
			if (this.getMyPref('preventNewTab.responseStatus.'+currentStatus))
				result.open = false;
		}

		if (result.open && result.owner) {
			if ('treeStyleTab' in result.tabbrowser &&
				'readyToOpenChildTab' in result.tabbrowser.treeStyleTab) {
				result.tabbrowser.treeStyleTab.readyToOpenChildTab(
					result.owner,
					false,
					result.lastRelatedTab && result.lastRelatedTab.nextSibling
				);
			}
			else {
				result.tabbrowser.__newtabfromlocationbar__owner = result.owner;
				result.tabbrowser.__newtabfromlocationbar__lastRelatedTab = result.lastRelatedTab;
			}
		}

		return result.open;
	},
 
	getCurrentStatus : function NTFLBUtils_getCurrentStatus(aBrowser)
	{
		let channel = aBrowser.webNavigation.currentDocumentChannel;
		if (channel && channel instanceof Ci.nsIHttpChannel)
			return channel.QueryInterface(Ci.nsIHttpChannel).responseStatus;

		return -1;
	},
 
/* Save/Load Prefs */ 
	
	getMyPref : function NTFLBUtils_getMyPref(aPrefstring) 
	{
		return this.getPref(this.kPREFROOT+'.'+aPrefstring);
	},
 
	setMyPref : function NTFLBUtils_setMyPref(aPrefstring, aNewValue) 
	{
		return this.setPref(this.kPREFROOT+'.'+aPrefstring, aNewValue);
	},
 
	clearMyPref : function NTFLBUtils_clearMyPref(aPrefstring) 
	{
		return this.clearPref(this.kPREFROOT+'.'+aPrefstring);
	}
  
}; 
  
