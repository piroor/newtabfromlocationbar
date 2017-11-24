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
    if (configs.recycleBlankCurrentTab) {
      if (url == 'about:blank' ||
          (new RegExp(configs.recycleTabUrlPattern)).test(url))
        return;
    }

    var newTabParams = {
      active: true,
      url:    aDetails.url
    };
    let origin = extractOriginPart(aDetails.url);
    if (origin && extractOriginPart(url)) {
      if (!configs.newTabForSameOrigin)
        return;
      if (configs.openAsChildIfSameOrigin)
        params.openerTabId = aDetails.tabId;
    }

    browser.tabs.executeScript(aDetails.tabId, {
      code:  'history.back()',
      runAt: 'document_start'
    }).then(() => {
      browser.tabs.create(newTabParams);
    });
  }
);

function extractOriginPart(aURI) {
  var uriMatch = aURI.match(/^(\w+:\/\/[^\/]+)/);
  return uriMatch && uriMatch[1];
}
