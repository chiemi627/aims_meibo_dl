# 履修者データダウンロード＆出欠テンプレート作成 Chrome拡張機能

筑波技術大学教務システムAIMS（※1）の履修者名簿ダウンロードページで、科目別のデータダウンロードと出欠管理用テンプレート作成を効率化するChrome拡張機能です。

* ※1: AIMSは株式会社電翔Active Academy Advance (https://www.densho-gp.co.jp/active-academy)をベースに導入されているシステムです

> **⚠️ 免責事項**
> - これは個人が開発した非公式ツールです。筑波技術大学の公式ツールではありません。
> - 本ツールの使用は自己責任でお願いします。
> - データの正確性については、必ず元のシステムと照合してください。
> - 大学の規定に反する使用はしないでください。

## 主な機能

### 1. 科目別履修者名簿ダウンロード
- 一つの授業に複数の科目番号がついていた場合、AIMSだと科目番号ごとにファイルをダウンロードしなきゃいけなかったのですが、それをまとめて一つの履修者名簿としてダウンロードできます。

### 2. 出欠テンプレート作成
- 出欠テンプレートもダウンロードできます。
- ダウンロードされたテンプレートに出欠情報を入れ、CSVファイルとしてアップロードできます

## インストール方法

1. Chromeで `chrome://extensions/` を開く
2. 右上の「デベロッパーモード」をオンにする
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. このフォルダ(`aims_meibo_dl`)を選択

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
- `docs/dev` : 開発するために必要だった技術的内容

## 対応環境

- Google Chrome（最新版推奨）
- File System Access API対応ブラウザ

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

### v1.1 (2025/11/27)
- ページを開くと担当する科目情報が1画面にまとめて表示されます
- ページネーションを跨いだ科目も自動的に集約されます

### v1.0 (2025/11/26)
- 出欠テンプレート作成機能を追加
- カンマ区切りCSV形式に対応（Excel対応）
- 全角数字の時限情報抽出に対応
- 科目一覧の表示/非表示切り替え機能を追加
- UI/UXの大幅改善

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
