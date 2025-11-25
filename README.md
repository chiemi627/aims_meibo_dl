# Hello World Chrome拡張機能

指定されたURLでページに「Hello World」を表示するChrome拡張機能です。

## インストール方法

1. Chromeで `chrome://extensions/` を開く
2. 右上の「デベロッパーモード」をオンにする
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. このフォルダ(`ntut_dx1`)を選択

## 動作確認

以下のURLにアクセスすると、ページの右上に緑色の「Hello World」が表示されます:
- https://aims.ad.tsukuba-tech.ac.jp/aa_web/meiboDownload/jm0010.aspx?me=JM&ou=no

## ファイル構成

- `manifest.json`: 拡張機能の設定ファイル
- `content.js`: ページに挿入されるスクリプト
- `README.md`: このファイル
