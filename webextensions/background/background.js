/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

gLogContext = 'BG';

var gTabs = {};
var gTabIdWrongToCorrect = {};
var gTabIdCorrectToWrong = {};

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

  // workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=1398272
  var correctId = gTabIdWrongToCorrect[aTabId];
  if (correctId)
    aTabId = aTab.id = correctId;

  var tab = gTabs[aTab.id];
  tab.previousUrl = tab.url;
  tab.url = aChangeInfo.url;
  if (tab.newTab && isBlankTabURI(tab.previousUrl))
    tab.previousUrl = null;
  tab.newTab = false;
});

browser.tabs.onRemoved.addListener(aTabId => {
  // workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=1398272
  var wrongId = gTabIdCorrectToWrong[aTabId];
  if (wrongId)
    delete gTabIdWrongToCorrect[wrongId];
  delete gTabIdCorrectToWrong[aTabId];

  delete gTabs[aTabId];
});

browser.windows.onRemoved.addListener(aWindowId => {
  for (let tabId of Object.keys(gTabs)) {
    if (gTabs[tabId].windowId == aWindowId)
      delete gTabs[tabId];
  }
});

browser.tabs.onAttached.addListener(async (aTabId, aAttachInfo) => {
  // workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=1398272
  try {
    let tab = await browser.tabs.get(aTabId);
    if (tab && tab.id != aTabId) {
      let oldWrongId = gTabIdCorrectToWrong[aTabId];
      if (oldWrongId)
        delete gTabIdWrongToCorrect[oldWrongId];
      gTabIdWrongToCorrect[tab.id] = aTabId;
      gTabIdCorrectToWrong[aTabId] = tab.id;
    }
  }
  catch(e) {
  }
});

function isBlankTabURI(aURI) {
  return (aURI == 'about:blank' ||
          (new RegExp(configs.recycleTabUrlPattern)).test(aURI));
}

function tryRedirectToNewTab(aDetails) {
  log('tryRedirectToNewTab', aDetails);
  var tab = gTabs[aDetails.tabId];
  log('tab ', tab);
  var url = tab.previousUrl || tab.url;
  if (configs.recycleBlankCurrentTab) {
    if (isBlankTabURI(url)) {
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
