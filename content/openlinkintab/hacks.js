OpenLinkInTabService.overrideExtensionsPreInit = function OLITService_overrideExtensionsPreInit() {
	// Highlander
	// https://addons.mozilla.org/firefox/addon/4086
	if ('Highlander' in window) {
		eval('Highlander.overrideHandleLinkClick = '+
			Highlander.overrideHandleLinkClick.toSource().replace(
				/(var )?origHandleLinkClick/g,
				'window.__openlinkintab__highlander__origHandleLinkClick'
			)
		);
	}
};

OpenLinkInTabService.overrideExtensionsOnInitBefore = function OLITService_overrideExtensionsOnInitBefore() {
};

OpenLinkInTabService.overrideExtensionsOnInitAfter = function OLITService_overrideExtensionsOnInitAfter() {

	// Tab Mix Plus
	if (this.getMyPref('compatibility.TMP') &&
		'TMupdateSettings' in window) {

		eval('window.TMP_contentAreaClick = '+
			window.TMP_contentAreaClick.toSource().replace(
				'if (openT)',
				<![CDATA[if (OpenLinkInTabService.checkReadyToOpenNewTabFromLink(linkNode)) {
					event.stopPropagation();
					event.preventDefault();
					handleLinkClick(event, linkNode.href, linkNode);
					return true;
				} else $&]]>
			)
		);
		if (/\(?function TMP_contentAreaClick\(/.test(window.contentAreaClick.toSource()))
			window.contentAreaClick = window.TMP_contentAreaClick;
	}


};
