# History

 - master/HEAD
   * Works on Nightly 42.0a1.
 - 0.1.2014050101
   * Works on Nightly 32.0a1.
 - 0.1.2013100801
   * Works on Firefox 25 and later.
 - 0.1.2013040601
   * Fixed: Don't open new tab for in-page links. On lately versions of Firefox, URIs with different hash (fragment) were unexpectedly detected as "different page" because the value entered to the location bar has no scheme (the "http://" part.)
   * Modified: "jar" archive is no longer included.
 - 0.1.2012122901
   * Works on Nightly 20.0a1.
 - 0.1.2012112401
   * Fixed: Reuse "about:newtab" tabs as blank tabs.
 - 0.1.2011120101
   * Improved: "Go" button in the location bar is also handled.
   * Fixed: Left-click on popup items of the awsomebar (smart location bar) didn't work on Firefox 10 and later.
 - 0.1.2010121601
   * Improved: URIs under different user's home (pages under different /~username/ ) are handled as "different website". (To disable this new feature, set extensions.newtabfromlocationbar@piro.sakura.ne.jp.checkUserHome=false )
   * Improved: Never open new tabs if the current page is "404 File Not Found" error.
   * Fixed: In the configuration dialog, selected item was not highlighted.
 - 0.1.2010112601
   * Released.
