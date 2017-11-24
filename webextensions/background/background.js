/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

gLogContext = 'BG';

var gTabs = {};

browser.tabs.query({}).then(aTabs => {
  for (let tab of aTabs) {
    gTabs[tab.id] = {
      url: tab.url,
      newTab: false
    };
  }
});

browser.tabs.onCreated.addListener(aTab => {
  gTabs[aTab.id] = {
    url: aTab.url,
    newTab: true
  };
});

browser.tabs.onUpdated.addListener((aTabId, aChangeInfo, aTab) => {
  if (!('url' in aChangeInfo))
    return;
  let tab = gTabs[aTab.id];
  tab.previousUrl = tab.url;
  tab.url = aChangeInfo.url;
  tab.newTab = false;
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

function tryRedirectToNewTab(aDetails) {
  log('tryRedirectToNewTab', aDetails);
  var tab = gTabs[aDetails.tabId];
  log('tab ', tab);
  var url = tab.previousUrl || tab.url;
  if (configs.recycleBlankCurrentTab) {
    if (url == 'about:blank' ||
        (new RegExp(configs.recycleTabUrlPattern)).test(url)) {
      log(' => blank tab, recycle it');
      return false;
    }
  }

  if (url.split('#')[0] == aDetails.url.split('#')[0]) {
    log(' => in-page jump');
    return false;
  }

  var newTabParams = {
    active: true,
    url:    aDetails.url
  };
  var origin = extractOriginPart(aDetails.url);
  if (origin && extractOriginPart(url)) {
    if (!configs.newTabForSameOrigin) {
      log(' => same origin');
      return false;
    }
    if (configs.openAsChildIfSameOrigin)
      newTabParams.openerTabId = aDetails.tabId;
  }
  browser.tabs.create(newTabParams);
  log('Redirect to new tab');
  return true;
}

browser.webRequest.onBeforeRequest.addListener(
  aDetails => {
    if (!configs.allowBlockRequest ||
        aDetails.type != 'main_frame' ||
        aDetails.documentUrl ||
        aDetails.originUrl ||
        aDetails.tabId == -1 ||
        gTabs[aDetails.tabId].newTab)
      return { cancel: false };

    log('onBeforeRequest loading on existing tab');

    return { cancel: tryRedirectToNewTab(aDetails) };
  },
  { urls: ['<all_urls>'] },
  ['blocking']
);

browser.webNavigation.onCommitted.addListener(
  aDetails => {
    if (configs.allowBlockRequest)
      return;

    log('onCommitted');
    if (aDetails.transitionType != 'typed' &&
        aDetails.transitionType != 'generated' /* search result */)
      return;

    if (tryRedirectToNewTab(aDetails))
      browser.tabs.executeScript(aDetails.tabId, {
        code:  'history.back()',
        runAt: 'document_start'
      });
  }
);

function extractOriginPart(aURI) {
  var uriMatch = aURI.match(/^(\w+:\/\/[^\/]+)/);
  return uriMatch && uriMatch[1];
}
