/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

gLogContext = 'BG';

var gTabs = {};
var gActiveTabsInWindow = {};
var gTabIdWrongToCorrect = {};
var gTabIdCorrectToWrong = {};

browser.tabs.query({}).then(aTabs => {
  for (let tab of aTabs) {
    let url = normalizeTabURI(tab.url);
    gTabs[tab.id] = {
      url:      url,
      initialUrl: url,
      newTab:   false,
      active:   tab.active,
      windowId: tab.windowId
    };
    if (tab.active)
      gActiveTabsInWindow[tab.windowId] = tab.id;
  }
});

browser.tabs.onCreated.addListener(aTab => {
  var url = normalizeTabURI(aTab.url);
  gTabs[aTab.id] = {
    url:      url,
    initialUrl: url,
    newTab:   true,
    active:   aTab.active,
    windowId: aTab.windowId
  };
  if (aTab.active)
    gActiveTabsInWindow[aTab.windowId] = aTab.id;
});

browser.tabs.onActivated.addListener(aActiveInfo => {
  // workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=1398272
  var correctId = gTabIdWrongToCorrect[aActiveInfo.tabId];
  if (correctId)
    aActiveInfo.tabId = correctId;

  var lastActiveTab = gTabs[gActiveTabsInWindow[aActiveInfo.windowId]];
  if (lastActiveTab)
    lastActiveTab.active = false;
  gActiveTabsInWindow[aActiveInfo.windowId] = aActiveInfo.tabId;
  gTabs[aActiveInfo.tabId].active = true;
});

browser.tabs.onUpdated.addListener((aTabId, aChangeInfo, aTab) => {
  // workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=1398272
  var correctId = gTabIdWrongToCorrect[aTabId];
  if (correctId)
    aTabId = aTab.id = correctId;

  if ('url' in aChangeInfo) {
    let tab = gTabs[aTab.id];
    tab.previousUrl = tab.url;
    tab.url = normalizeTabURI(aChangeInfo.url);
    if (tab.newTab && isBlankTabURI(tab.previousUrl))
      tab.previousUrl = null;
    if (isBlankTabURI(tab.initialUrl))
      tab.initialUrl = aChangeInfo.url;
    tab.newTab = false;
  }
});

function normalizeTabURI(aURI) {
  if (aURI.indexOf('about:reader?') == 0) {
    aURI = decodeURIComponent(aURI.replace(/^about:reader\?url=/, ''));
  }
  return aURI;
}

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
  delete gActiveTabsInWindow[aWindowId];
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
      aTabId = tab.id;
    }
  }
  catch(e) {
  }
  gTabs[aTabId].windowId = aAttachInfo.newWindowId;
});

function isBlankTabURI(aURI) {
  return (aURI == 'about:blank' ||
          (new RegExp(configs.recycleTabUrlPattern)).test(aURI));
}

function tryRedirectToNewTab(aDetails, aCurrentURI) {
  log('tryRedirectToNewTab', aDetails);
  var loadingURI = normalizeTabURI(aDetails.url);
  if (configs.recycleBlankCurrentTab) {
    if (isBlankTabURI(aCurrentURI)) {
      log(' => blank tab, recycle it');
      return false;
    }
  }

  var samePath     = aCurrentURI.split('#')[0] == loadingURI.split('#')[0];
  var origin       = extractOriginPart(aDetails.url);
  var sameOrigin   = origin && origin == extractOriginPart(aCurrentURI);

  var newTabParams = {
    active: true,
    url:    aDetails.url
  };
  if (samePath) {
    if (!configs.newTabForSamePath) {
      log(' => same path');
      return false;
    }
    if (configs.openAsChildIfSamePath)
      newTabParams.openerTabId = aDetails.tabId;
  }
  else if (sameOrigin) {
    if (!configs.newTabForSameOrigin) {
      log(' => same origin');
      return false;
    }
    if (configs.openAsChildIfSameOrigin)
      newTabParams.openerTabId = aDetails.tabId;
  }

  browser.tabs.create(newTabParams).then(aTab => {
    gTabs[aTab.id].redirectionSourceTabId = aDetails.tabId;
    gTabs[aTab.id].redirectionSourceURI   = aCurrentURI;
  });
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

    var tab = gTabs[aDetails.tabId];
    if (!tab.active)
      return { cancel: false };

    log('onBeforeRequest loading on existing tab ', tab);

    if (tab.initialUrl == aDetails.url) {
      log(' => initial page of the tab');
      return { cancel: false };
    }

    var redirected  = tryRedirectToNewTab(aDetails, tab.url);
    var isLocalPage = /^(about|file|resource|chrome|moz-extension):/.test(tab.url);
    return { cancel: redirected && !isLocalPage };
  },
  { urls: ['<all_urls>'] },
  ['blocking']
);

browser.webNavigation.onCommitted.addListener(
  aDetails => {
    if (aDetails.frameId != 0)
      return;

    var tab = gTabs[aDetails.tabId];
    if (!tab.active)
      return;

    if (configs.allowBlockRequest &&
        tab.initialUrl != aDetails.url)
      return;

    var maybeFromLocationBar = (
      aDetails.transitionType == 'typed' ||
      aDetails.transitionType == 'generated' ||
      aDetails.transitionType == 'keyword_generated'
    );

    var sourceTabId = tab.redirectionSourceTabId;
    delete tab.redirectionSourceTabId;
    var sourceURI = tab.redirectionSourceURI;
    delete tab.redirectionSourceURI;
    browser.tabs.get(sourceTabId).then(aTab => {
      if (aTab.url == sourceURI)
        return;
      browser.tabs.executeScript(sourceTabId, {
        code:  'history.back()',
        runAt: 'document_start'
      });
    });

    if (!maybeFromLocationBar)
      return;

    log('onCommitted ', aDetails);
    log('tab ', tab);

    let url = tab.previousUrl || tab.url;
    if (tryRedirectToNewTab(aDetails, url))
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
