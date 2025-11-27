## 表示したページを起点に他のページを取得するための工夫

### 背景: ASP.NET WebForms のページネーションの仕組み
1. ページ状態の管理
* ASP.NET WebForms は __VIEWSTATE という隠しフィールドに、現在のページ状態（表示中のデータ、ページ番号など）を保存します
* __EVENTVALIDATION は、サーバーがフォーム送信の正当性を検証するためのトークンです
* これらの値はページごとに異なり、次のページに移動すると更新されます

2. ページネーションの動作
* 「2ページ目」のリンクをクリックすると、__doPostBack('gvKamoku', 'Page$2') が実行されます
* サーバーは現在の __VIEWSTATE を受け取り、2ページ目のデータを含む新しいHTMLを返します
* この新しいHTMLには、2ページ目用の新しい __VIEWSTATE が含まれています

### 実装のポイント
1. 順次ページ取得とトークン更新
```
// 最初のページのトークンを取得
let viewState = form.querySelector('input[name="__VIEWSTATE"]')?.value || '';
let eventValidation = form.querySelector('input[name="__EVENTVALIDATION"]')?.value || '';

// 各ページを順番に取得
for (let p = 2; p <= maxPage; p++) {
  // 現在のトークンでPOSTリクエストを送信
  const resp = await fetch(action, { method: 'POST', body: params });
  const html = await resp.text();
  
  // レスポンスから次のページ用のトークンを抽出して更新 ← ★重要
  const doc = new DOMParser().parseFromString(html, 'text/html');
  viewState = doc.querySelector('input[name="__VIEWSTATE"]')?.value || viewState;
  eventValidation = doc.querySelector('input[name="__EVENTVALIDATION"]')?.value || eventValidation;
}
```
#### なぜこれが重要か:
2ページ目を取得したら、そのレスポンス内の新しいトークンを使って3ページ目を取得する必要があります
古いトークンを使うと、サーバーが「不正なリクエスト」と判断してエラーになります
順次更新することで、正しいトークンチェーンを維持できました


2. ページ固有トークンの保存
```
// 各ページのHTMLから固有のトークンを抽出
const pageVS = doc.querySelector('input[name="__VIEWSTATE"]')?.value || '';
const pageEV = doc.querySelector('input[name="__EVENTVALIDATION"]')?.value || '';
const pageVSG = doc.querySelector('input[name="__VIEWSTATEGENERATOR"]')?.value || '';

// クローンした行にトークンを埋め込む
clonedMain.dataset.vs = pageVS;
clonedMain.dataset.ev = pageEV;
clonedMain.dataset.vsg = pageVSG;
```

#### なぜこれが重要か:
2ページ目の「ダウンロードボタン」は、2ページ目のトークンを使わないと正しく動作しません
各行に「元のページのトークン」を保存することで、後でボタンをクリックしたときに正しいPOSTリクエストを送信できます

3. 委譲クリックハンドラ
```
document.addEventListener('click', async (e) => {
  const tr = e.target.closest('tr');
  if (tr.dataset.pageAppended !== 'true') return; // 追加行のみ処理
  
  // 保存されたトークンを取得
  const vs = tr.dataset.vs;
  const ev = tr.dataset.ev;
  const vsg = tr.dataset.vsg;
  
  // これらのトークンでPOSTリクエストを送信
  formData.set('__VIEWSTATE', vs);
  formData.set('__EVENTVALIDATION', ev);
  formData.set('__VIEWSTATEGENERATOR', vsg);
});
```

#### なぜこれが重要か:
* 通常のクリックイベントは、現在のページ（1ページ目）のトークンを使ってしまいます
* 委譲ハンドラで先にクリックを捕捉し、行に保存された正しいトークンでPOSTすることで、2ページ目のデータを取得できます