# 更新履歴

 - master/HEAD
   * 現在のタブが「about:」で始まるURIだった場合に、入力をタブにリダイレクトすると表示されていたページの内容が失われてしまう問題の暫定的な回避策を導入（現在の読み込みをブロックせず、読み込み完了後に「戻る」で元のページに戻すようにした）
   * パスが同じURIの読み込みも新しいタブで開く設定を追加
 - 3.1.1 (2017.11.27)
   * タブの最初のページに戻るときに新しいタブが意図せず開かれてしまう問題に対処
   * オリジンが異なるURLに対して新しいタブを子タブとして開いてしまう場合があったのを修正
 - 3.1.0 (2017.11.26)
   * `browser.webRequest.onBeforeRequest`に基づくモードを実装した（Joshua Cantara, thanks a lot!）
   * 初期状態で`about:privatebrowsing`も再利用対象の空のタブと認識するようにした
 - 3.0.2 (2017.11.24)
   * 設定画面のリソースがパッケージに含まれていなかったのを修正
 - 3.0.1 (2017.11.24)
   * 検索結果も新しいタブで開くようにした
   * 設定の変更を保存できていなかったのを修正
   * 子タブを開けない問題を修正
 - 3.0.0 (2017.11.24)
   * WebExtensions APIベースで作り直した
 - 2.0.2016111801
   * ロケーションバーのオートコンプリートの項目のクリックが動作しなくなっていたのを修正
 - 2.0.2016111701
   * Firefox 50以降のバージョンに対応
   * 「貼り付けて移動」でも新しいタブを開けるようにした
 - 2.0.2016012102
   * ロケーションバーのオートコンプリート項目のクリック操作が機能しなくなっていたのを修正（後退バグ）
 - 2.0.2016012101
   * `eval`による関数の書き換えを行わない実装に変更した
 - 1.0.2016011501
   * Nightly 46.0a1に対応
   * Firefox 37およびそれ以前への対応を終了
 - 0.1.2014050101
   * Nightly 32.0a1に対応
 - 0.1.2013100801
   * Firefox 25に対応
 - 0.1.2013040601
   * FirefoxがロケーションバーのURIを短く表示するようになって以降、ページ内リンクの読み込みに対してまでタブが開かれるようになってしまっていたのを修正
   * jarファイルを含めない形のパッケージングに変更
 - 0.1.2012122901
   * Nightly 20.0a1に対応
 - 0.1.2012112401
   * 「about:newtab」のタブを空のタブとして再利用するようにした
 - 0.1.2011120101
   * ロケーションバー中の「Go」ボタンの挙動も置き換えるようにした
   * Firefox 10以降でロケーションバーのポップアップの項目の左クリックが機能しなくなっていたのを修正
 - 0.1.2010121601
   * 別のユーザのホームに属しているURI（ /~username/ の部分が異なる場合）は別のサイトと見なすようにした（ extensions.newtabfromlocationbar@piro.sakura.ne.jp.checkUserHome=false で従来の動作）
   * 現在のページが「404 ファイルが見つかりません」エラーの時は新しいタブを開かないようにした
   * 設定ダイアログで選択されている項目がハイライト表示されていなかったのを修正
 - 0.1.2010112601
   * 公開
