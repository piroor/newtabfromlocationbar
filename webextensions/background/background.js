/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

browser.webNavigation.onCommitted.addListener(
  aDetails => {
    switch (aDetails.transitionType) {
      case 'typed':
        browser.tabs.executeScript(aDetails.tabId, {
          code:  'history.back()',
          runAt: 'document_start'
        }).then(() => {
          var params = {
            active: true,
            url:    aDetails.url
          };
          var isSameDomain = true; // TBD
          if (isSameDomain)
            params.openerTabId = aDetails.tabId;
          browser.tabs.create(params);
        });
        break;
    }
  }
);
