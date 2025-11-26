# 履修者データダウンロード＆出欠テンプレート作成 Chrome拡張機能

筑波技術大学教務システムAIMSの履修者名簿ダウンロードページで、科目別のデータダウンロードと出欠管理用テンプレート作成を効率化するChrome拡張機能です。

> **⚠️ 免責事項**
> - これは個人が開発した非公式ツールです。筑波技術大学の公式ツールではありません。
> - 本ツールの使用は自己責任でお願いします。
> - データの正確性については、必ず元のシステムと照合してください。
> - 大学の規定に反する使用はしないでください。

## 主な機能

### 1. 科目別データ表示
- ページ内の履修者データを科目ごとに自動分類
- 各科目の履修者数（現在ページ + localStorage保存数）を表示
- 科目一覧の表示/非表示切り替え機能

### 2. 科目別ダウンロード
- **ダウンロードボタン**: 現在ページの履修者データを科目ごとに1つのCSVファイルに結合してダウンロード
- ファイル名形式: `科目名_授業コード1_授業コード2_..._授業コードN.csv`
- 自動エンコーディング検出（UTF-16LE/BE、Shift_JIS、UTF-8、EUC-JP対応）
- ダウンロード後、複数ページのファイルを結合できるファイル選択ダイアログを表示

### 3. 出欠テンプレート作成
- **出欠テンプレートボタン**: 履修者データを出欠管理用のCSVフォーマットに変換
- 出力列: 年度、授業コード、授業名、出欠登録日、時限、学籍番号、学生氏名、学年、出席番号、出席、欠席、公欠、出席停止、未調査、備考
- 出欠登録日に本日の日付を自動設定
- 時限情報を自動抽出（全角数字対応）
- ファイル名形式: `出席_科目名_授業コード1_..._授業コードN.csv`
- Excel対応のカンマ区切りCSV形式（BOM付きUTF-8）

## インストール方法

1. Chromeで `chrome://extensions/` を開く
2. 右上の「デベロッパーモード」をオンにする
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. このフォルダ(`aims_meibo_dl`)を選択

## 使い方

### 基本的な使い方

1. 履修者名簿ダウンロードページにアクセス
2. ページ右上に「科目別ダウンロード」パネルが表示される
3. 「▼ 科目一覧」ボタンをクリックして科目リストを展開

### 履修者データのダウンロード

1. 科目一覧から目的の科目を探す
2. 「ダウンロード」ボタンをクリック
3. 現在ページの該当科目のデータが1つのCSVファイルとしてダウンロードされる
4. ファイル選択ダイアログが表示されるので、複数ページのファイルを選択して結合可能

### 出欠テンプレートの作成

1. 科目一覧から目的の科目を探す
2. 「出欠テンプレート」ボタン（青色）をクリック
3. 出欠管理用フォーマットのCSVファイルがダウンロードされる
4. ファイル選択ダイアログが表示されるので、複数ページのファイルを選択して結合可能
5. ダウンロードしたCSVファイルをExcelで開いて出欠管理に使用

### 複数ページのデータ結合

1. 各ページで「ダウンロード」または「出欠テンプレート」ボタンをクリックしてファイルを保存
2. すべてのページのダウンロードが完了したら、任意のページで表示されるファイル選択ダイアログを使用
3. 結合したいファイルを複数選択
4. 結合されたファイルが自動的にダウンロードされる

## 技術仕様

### エンコーディング処理
- 優先順位: UTF-16LE → UTF-16BE → Shift_JIS → UTF-8 → EUC-JP
- 置換文字（�）のペナルティスコアリングによる自動判定
- 出力は常にBOM付きUTF-8

### データ形式
- 入力: TSV（タブ区切り）またはCSV
- 出力: CSV（カンマ区切り、BOM付きUTF-8）
- カンマ・ダブルクォート・改行を含むデータは自動的にエスケープ

### localStorage
- キー接頭辞: `ntutdx1_`
- 保存形式: JSON配列（授業コードの配列）
- 重複排除機能あり

## ファイル構成
- `manifest.json`: Chrome拡張機能の設定ファイル
- `content.js`: メインスクリプト（1600行以上）
- `README.md`: このファイル

## 対応環境

- Google Chrome（最新版推奨）
- File System Access API対応ブラウザ
- 対象URL: `https://aims.ad.tsukuba-tech.ac.jp/aa_web/meiboDownload/*.aspx*`

## 注意事項

### 使用上の注意
- **学内システム専用**: このツールは筑波技術大学AIMS専用です
- **認証が必要**: 大学のシステムにログインしている状態でのみ動作します
- **個人情報の取り扱い**: ダウンロードしたファイルには学生の個人情報が含まれます。適切に管理してください
- **データの確認**: 生成されたデータは必ず元のシステムと照合してください

### 技術的な制限
- 履修者データの列構造が変更された場合、正しく動作しない可能性があります
- File System Access APIはHTTPSまたはlocalhostでのみ動作します
- ブラウザによってはファイル選択ダイアログがサポートされていない場合があります

## 更新履歴

### v2.0 (2025/11/26)
- 出欠テンプレート作成機能を追加
- カンマ区切りCSV形式に対応（Excel対応）
- 全角数字の時限情報抽出に対応
- 科目一覧の表示/非表示切り替え機能を追加
- UI/UXの大幅改善

### v1.0
- 初回リリース
- 科目別ダウンロード機能
- エンコーディング自動検出
- ファイル結合機能

## ライセンス

MIT License

Copyright (c) 2025

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## 開発者向け情報

### 貢献について
バグ報告や機能提案は、GitHubのIssuesでお願いします。
プルリクエストも歓迎します。

### ローカル開発
```bash
git clone https://github.com/chiemi627/aims_meibo_dl.git
cd aims_meibo_dl
# Chrome拡張機能としてこのディレクトリを読み込む
```
