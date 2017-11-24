/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

var gTabs = {};

browser.tabs.query({}).then(aTabs => {
  for (let tab of aTabs) {
    gTabs[tab.id] = {
      url: tab.url
    };
  }
});

browser.tabs.onCreated.addListener(aTab => {
  gTabs[aTab.id] = {
    url: aTab.url
  };
});

browser.tabs.onUpdated.addListener((aTabId, aChangeInfo, aTab) => {
  if (!('url' in aChangeInfo))
    return;
  let tab = gTabs[aTab.id];
  tab.previousUrl = tab.url;
  tab.url = aChangeInfo.url;
});

browser.tabs.onRemoved.addListener(aTabId => {
  delete gTabs[aTabId];
});

browser.windows.onRemoved.addListener(aWindowId => {
  for (let tabId of Object.keys(gTabs)) {
    if (gTabs[tabId].windowId == aWindowId)
      delete gTabs[tabId];
  }
});

browser.webNavigation.onCommitted.addListener(
  aDetails => {
    if (aDetails.transitionType != 'typed')
      return;

    var tab = gTabs[aDetails.tabId];
    var url = tab.previousUrl || tab.url;
    if (url == 'about:blank' ||
        /^about:(newtab|home)$/.test(url))
      return;

    browser.tabs.executeScript(aDetails.tabId, {
      code:  'history.back()',
      runAt: 'document_start'
    }).then(() => {
      var params = {
        active: true,
        url:    aDetails.url
      };
      if (extractOriginPart(url) == extractOriginPart(aDetails.url))
        params.openerTabId = aDetails.tabId;
      browser.tabs.create(params);
    });
  }
);

function extractOriginPart(aURI) {
  var uriMatch = aURI.match(/^(\w+:\/\/[^\/]+)/);
  return uriMatch && uriMatch[1];
}
