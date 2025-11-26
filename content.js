// ページが読み込まれたら授業科目名でソート機能を追加
(function() {
  console.log('ソート機能拡張機能が実行されました');
  
  // テーブルを検索
  const tables = document.querySelectorAll('table');
  
  if (tables.length === 0) {
    console.log('テーブルが見つかりませんでした');
    return;
  }
  
  // 最初のテーブルを対象にする(必要に応じて変更可能)
  let targetTable = tables[0];
  
  // 複数テーブルがある場合、最も大きなテーブルを選択
  if (tables.length > 1) {
    targetTable = Array.from(tables).reduce((largest, current) => {
      const largestRows = largest.querySelectorAll('tr').length;
      const currentRows = current.querySelectorAll('tr').length;
      return currentRows > largestRows ? current : largest;
    });
  }
  
  console.log('対象テーブル:', targetTable);
  

  // ------------------
  // Helper: filename sanitize and download helpers
  function sanitizeForFilename(name, maxLen = 120) {
    if (!name) return 'download';
    return String(name).replace(/[\\/\:\*\?"<>\|]/g, '_').slice(0, maxLen);
  }

  function downloadBlob(blob, filename) {
    try {
      const safe = sanitizeForFilename(filename);
      // duplicate guard
      if (typeof downloadedSet !== 'undefined' && downloadedSet.has(safe)) {
        console.log('downloadBlob: skip already-downloaded file', safe);
        return false;
      }
      if (typeof downloadedSet !== 'undefined') downloadedSet.add(safe);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = safe;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      return true;
    } catch (e) {
      console.error('downloadBlob failed', e);
    }
  }

  function downloadTextAsFile(text, filename, mime = 'text/csv;charset=utf-8;') {
    const blob = new Blob([text], { type: mime });
    return downloadBlob(blob, filename);
  }

  // sentinel returned when fetchCsvFromGroup already triggered a blob download
  const BLOB_DOWNLOADED = '__BLOB_DOWNLOADED__';
  // set to track filenames already downloaded in this session
  const downloadedSet = new Set();
  
   
  // document.body.appendChild(fetchAllButton);

  // --- 科目別ダウンロード機能を追加 ---
  // 科目ごとのボタンを表示するパネルを作成
  const subjectPanel = document.createElement('div');
  subjectPanel.style.position = 'fixed';
  subjectPanel.style.top = '130px';
  subjectPanel.style.right = '20px';
  subjectPanel.style.maxHeight = '60vh';
  subjectPanel.style.overflow = 'auto';
  subjectPanel.style.background = 'rgba(255,255,255,0.95)';
  subjectPanel.style.border = '1px solid #ddd';
  subjectPanel.style.padding = '10px';
  subjectPanel.style.borderRadius = '8px';
  subjectPanel.style.boxShadow = '0 4px 10px rgba(0,0,0,0.08)';
  subjectPanel.style.zIndex = '10000';
  subjectPanel.style.minWidth = '220px';

  const subjectTitle = document.createElement('div');
  subjectTitle.textContent = '科目別ダウンロード';
  subjectTitle.style.fontWeight = 'bold';
  subjectTitle.style.marginBottom = '8px';
  subjectPanel.appendChild(subjectTitle);

  const refreshSubjectsBtn = document.createElement('button');
  refreshSubjectsBtn.textContent = '🔄 更新';
  refreshSubjectsBtn.style.marginBottom = '8px';
  refreshSubjectsBtn.style.display = 'block';
  refreshSubjectsBtn.style.width = '100%';
  refreshSubjectsBtn.onclick = buildSubjectButtons;
  subjectPanel.appendChild(refreshSubjectsBtn);

  const subjectList = document.createElement('div');
  subjectPanel.appendChild(subjectList);

  document.body.appendChild(subjectPanel);

  // localStorage関連のユーティリティ
  const STORAGE_PREFIX = 'ntut_subject_data_';
  
  // groupRows から データ配列に変換
  function extractDataFromGroup(grp) {
    const mainRow = grp.find(r => r.querySelectorAll('td').length >= 3);
    if (!mainRow) return null;
    
    const cells = mainRow.querySelectorAll('td');
    
    const data = {
      classCode: cells[0]?.textContent.trim() || '',
      班: cells[1]?.textContent.trim() || '',
      科目名: cells[2]?.textContent.trim() || '',
      単位: cells[3]?.textContent.trim() || '',
      必選: cells[4]?.textContent.trim() || '',
      年次: cells[5]?.textContent.trim() || '',
      学期: cells[6]?.textContent.trim() || '',
      曜日: cells[7]?.textContent.trim() || '',
      時限: cells[8]?.textContent.trim() || '',
      教室: cells[9]?.textContent.trim() || '',
      担当教員: cells[10]?.textContent.trim() || ''
    };
    return data;
  }
  
  // localStorage に科目データを保存（重複排除あり）
  function saveToLocalStorage(subject, groupsForSubject) {
    try {
      const key = STORAGE_PREFIX + subject;
      let existing = [];
      const stored = localStorage.getItem(key);
      if (stored) {
        existing = JSON.parse(stored);
      }
      
      // 各グループを授業コードで重複チェック
      groupsForSubject.forEach(grp => {
        const data = extractDataFromGroup(grp);
        if (!data || !data.classCode) return;
        
        // 既存データに同じ授業コードがあるかチェック
        const isDuplicate = existing.some(existingData => {
          return existingData.classCode === data.classCode;
        });
        
        if (!isDuplicate) {
          existing.push(data);
        }
      });
      
      localStorage.setItem(key, JSON.stringify(existing));
      console.log(`localStorage保存: ${subject} (${existing.length}件)`);
    } catch (e) {
      console.error('localStorage保存エラー:', e);
    }
  }
  
  // localStorage から全科目データを読み込み
  function loadAllFromLocalStorage() {
    const allData = new Map();
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_PREFIX)) {
          const subject = key.substring(STORAGE_PREFIX.length);
          const data = JSON.parse(localStorage.getItem(key) || '[]');
          if (data.length > 0) {
            allData.set(subject, data);
          }
        }
      }
    } catch (e) {
      console.error('localStorage読み込みエラー:', e);
    }
    return allData;
  }
  
  // localStorage をクリア
  function clearLocalStorage() {
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_PREFIX)) {
          keys.push(key);
        }
      }
      keys.forEach(k => localStorage.removeItem(k));
      console.log(`localStorage クリア: ${keys.length}件削除`);
      return keys.length;
    } catch (e) {
      console.error('localStorage クリアエラー:', e);
      return 0;
    }
  }

  // 科目ボタンを作成する (ロード時・更新ボタンで呼ぶ)
  function buildSubjectButtons() {
    subjectList.innerHTML = '';
    
    // クリアボタンと保存状況を最初に追加
    const topControls = document.createElement('div');
    topControls.style.display = 'flex';
    topControls.style.gap = '8px';
    topControls.style.marginBottom = '12px';
    topControls.style.paddingBottom = '12px';
    topControls.style.borderBottom = '1px solid #ddd';
    
    // localStorage保存状況を表示
    const savedData = loadAllFromLocalStorage();
    let savedTotal = 0;
    savedData.forEach(groups => { savedTotal += groups.length; });
    
    const statusDiv = document.createElement('div');
    statusDiv.style.flex = '1';
    statusDiv.style.fontSize = '13px';
    statusDiv.style.color = '#666';
    statusDiv.style.padding = '8px';
    statusDiv.textContent = `💾 保存中: ${savedTotal}件 (${savedData.size}科目)`;
    
    const clearBtn = document.createElement('button');
    clearBtn.textContent = '🗑️ クリア';
    clearBtn.style.flex = '0 0 auto';
    clearBtn.style.padding = '8px 12px';
    clearBtn.style.fontSize = '13px';
    clearBtn.style.background = '#f44336';
    clearBtn.style.color = 'white';
    clearBtn.style.border = 'none';
    clearBtn.style.borderRadius = '4px';
    clearBtn.style.cursor = 'pointer';
    clearBtn.onclick = () => {
      if (confirm('localStorage の保存データをすべてクリアしますか？')) {
        const count = clearLocalStorage();
        alert(`${count}件の科目データをクリアしました`);
        buildSubjectButtons(); // 再描画
      }
    };
    
    topControls.appendChild(statusDiv);
    topControls.appendChild(clearBtn);
    subjectList.appendChild(topControls);

    const tbody = targetTable.querySelector('tbody') || targetTable;
    const rows = Array.from(tbody.querySelectorAll('tr'));

    // ヘッダーを探す
    let headerIndex = -1;
    for (let i = 0; i < rows.length; i++) {
      const firstCell = rows[i].querySelector('th, td');
      if (firstCell && firstCell.textContent.trim() === '授業コード') {
        headerIndex = i;
        break;
      }
    }

    if (headerIndex === -1) return;

    // データ行から科目名を収集(3列目)
    // メイン行(授業情報)と、その直後に続くボタン行をセットで収集する
    const subjectMap = new Map();
    let i = headerIndex + 1;
    while (i < rows.length) {
      const row = rows[i];
      const rowText = row.textContent.trim();
      // 下部ページネーションで終了
      if (rowText.match(/\d+～\d+件目/) || rowText.match(/^[\d\s次]+►?$/)) break;

      const cells = row.querySelectorAll('td');
      // メイン行を検出
      if (cells.length >= 3 && cells[0].textContent.trim().match(/^\d/)) {
        const subject = (cells[2] && cells[2].textContent.trim()) || '（無題）';
        // グループ化: メイン行 + 直後のボタン行(存在すれば)
        const groupRows = [row];
        let j = i + 1;
        while (j < rows.length) {
          const nextRow = rows[j];
          const nextText = nextRow.textContent.trim();
          // ページネーションや次のメイン行が来たら終了
          const nextCells = nextRow.querySelectorAll('td');
          if (nextText.match(/\d+～\d+件目/) || nextText.match(/^[\d\s次]+►?$/)) break;
          if (nextCells.length >= 3 && nextCells[0].textContent.trim().match(/^\d/)) break;

          // ボタンやリンクを含む行をグループに含める
          if (nextRow.querySelector('input[type="button"], button, a')) {
            groupRows.push(nextRow);
            j++;
            continue;
          }

          // それ以外はスキップして先へ
          break;
        }

  if (!subjectMap.has(subject)) subjectMap.set(subject, []);
  // groupRows を1つのグループとして追加（配列の配列にする）
  subjectMap.get(subject).push(groupRows);

        // 進める
        i = j;
        continue;
      }

      i++;
    }

    // ボタンを生成
    subjectMap.forEach((groupsForSubject, subject) => {
      const wrapper = document.createElement('div');
      wrapper.style.display = 'flex';
      wrapper.style.alignItems = 'center';
      wrapper.style.justifyContent = 'space-between';
      wrapper.style.marginBottom = '6px';

      // 🆕 localStorage から保存数を取得
      let storedCount = 0;
      const key = STORAGE_PREFIX + subject;
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          const data = JSON.parse(stored);
          storedCount = data.length;
        } catch (e) {}
      }
      
      const label = document.createElement('div');
      // 現在ページ件数 + localStorage保存数を表示
      const currentCount = groupsForSubject.length;
      const totalCount = storedCount;
      if (totalCount > currentCount) {
        label.textContent = `${subject} (現在${currentCount}件 / 保存${totalCount}件)`;
      } else {
        label.textContent = `${subject} (${currentCount}件)`;
      }
      label.style.flex = '1';
      label.style.marginRight = '6px';
      label.style.fontSize = '13px';
      label.title = subject;

      const btnContainer = document.createElement('div');
      btnContainer.style.display = 'flex';
      btnContainer.style.gap = '4px';
      btnContainer.style.flex = '0 0 auto';

      const downloadBtn = document.createElement('button');
      downloadBtn.textContent = '全てDL';
      downloadBtn.style.fontSize = '11px';
      downloadBtn.style.padding = '2px 6px';
      downloadBtn.onclick = () => handleSubjectDownload(subject, groupsForSubject, downloadBtn);

      btnContainer.appendChild(downloadBtn);

      wrapper.appendChild(label);
      wrapper.appendChild(btnContainer);
      
      // 🆕 localStorage から保存データを取得して、現在のページデータとマージ
      let allClassCodes = new Map(); // classCode -> grp (DOM要素)
      
      // 現在のページのデータを追加（DOM要素を保持）
      groupsForSubject.forEach(grp => {
        const data = extractDataFromGroup(grp);
        if (data && data.classCode) {
          allClassCodes.set(data.classCode, grp);
        }
      });
      
      // localStorageのデータから授業コードリストを追加（DOM要素なし）
      if (stored) {
        try {
          const storedData = JSON.parse(stored);
          storedData.forEach(data => {
            if (data && data.classCode && !allClassCodes.has(data.classCode)) {
              allClassCodes.set(data.classCode, null); // localStorage由来はnull
            }
          });
        } catch (e) {
          console.error('localStorage読み込みエラー:', e);
        }
      }
      
      // 各グループ（授業コード）ごとの小さなボタンを追加
      const groupList = document.createElement('div');
      groupList.style.display = 'flex';
      groupList.style.flexDirection = 'column';
      groupList.style.marginTop = '6px';
      
      // 全ての授業コード（現在ページ + localStorage）に対してボタンを生成
      allClassCodes.forEach((grp, classCode) => {
        const sub = document.createElement('div');
        sub.style.display = 'flex';
        sub.style.justifyContent = 'space-between';
        sub.style.marginTop = '2px';
        
        const subLabel = document.createElement('div');
        subLabel.textContent = classCode;
        subLabel.style.fontSize = '12px';
        subLabel.style.flex = '1';
        
        const subBtn = document.createElement('button');
        subBtn.textContent = 'DL';
        subBtn.style.flex = '0 0 auto';
        subBtn.title = `${subject} - ${classCode}`;
        
        // 現在のページに存在する場合のみダウンロード可能
        if (grp) {
          subBtn.onclick = async () => {
            subBtn.disabled = true;
            try {
              await downloadGroup(subject, grp, subBtn);
            } catch (e) {
              console.error('個別グループのダウンロード失敗', e);
              alert(`ダウンロードに失敗しました: ${e.message || e}`);
            }
            subBtn.disabled = false;
          };
        } else {
          // localStorage由来（現在のページにない）場合は無効化
          subBtn.disabled = true;
          subBtn.style.opacity = '0.5';
          subBtn.title = `${subject} - ${classCode} (このページにはありません)`;
        }
        
        sub.appendChild(subLabel);
        sub.appendChild(subBtn);
        groupList.appendChild(sub);
      });
      wrapper.appendChild(groupList);
      subjectList.appendChild(wrapper);
    });
    
    // localStorage に自動保存（重複排除あり）
    subjectMap.forEach((groupsForSubject, subject) => {
      saveToLocalStorage(subject, groupsForSubject);
    });
    
    // 保存済みデータ件数を表示
    const allData = loadAllFromLocalStorage();
    let totalCount = 0;
    allData.forEach(groups => { totalCount += groups.length; });
    console.log(`localStorage総保存数: ${totalCount}件 (${allData.size}科目)`);
  }

  function getClassCodeFromGroup(groupRows) {
    const main = groupRows.find(r => r.querySelectorAll('td').length >= 3);
    if (!main) return null;
    const cells = main.querySelectorAll('td');
    return (cells && cells[0] && cells[0].textContent.trim()) || null;
  }

  // 旧: 科目 -> 結合ボタン参照は不要になった（結合ボタン削除）

  // ダウンロード完了後に結合操作を促すオーバーレイを表示
  function showAutoMergePrompt(subject) {
    try {
      // 既に表示中なら再利用
      const existing = document.getElementById('auto-merge-overlay');
      if (existing) {
        existing.querySelector('.auto-merge-subject').textContent = subject;
        existing.style.display = 'flex';
        return;
      }
      const overlay = document.createElement('div');
      overlay.id = 'auto-merge-overlay';
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      overlay.style.background = 'rgba(0,0,0,0.45)';
      overlay.style.zIndex = '999999';
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.fontFamily = 'sans-serif';

      const panel = document.createElement('div');
      panel.style.background = '#ffffff';
      panel.style.padding = '20px 24px';
      panel.style.borderRadius = '8px';
      panel.style.minWidth = '320px';
      panel.style.maxWidth = '480px';
      panel.style.boxShadow = '0 4px 18px rgba(0,0,0,0.25)';
      panel.style.display = 'flex';
      panel.style.flexDirection = 'column';
      panel.style.gap = '12px';

      const title = document.createElement('h2');
      title.textContent = 'ファイル結合';
      title.style.margin = '0';
      title.style.fontSize = '18px';
      title.style.color = '#333';

      const subjectLine = document.createElement('div');
      subjectLine.innerHTML = '科目: <span class="auto-merge-subject" style="font-weight:bold"></span>';
      subjectLine.querySelector('.auto-merge-subject').textContent = subject;
      subjectLine.style.fontSize = '14px';

      const info = document.createElement('div');
      info.textContent = 'ダウンロードが完了しました。結合したいファイルを選択してください。';
      info.style.fontSize = '13px';
      info.style.color = '#555';

      const actions = document.createElement('div');
      actions.style.display = 'flex';
      actions.style.gap = '10px';
      actions.style.justifyContent = 'flex-end';

      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = '閉じる';
      cancelBtn.style.padding = '6px 14px';
      cancelBtn.onclick = () => { overlay.style.display = 'none'; };

      const pickBtn = document.createElement('button');
      pickBtn.textContent = 'ファイル選択して結合';
      pickBtn.style.padding = '6px 14px';
      pickBtn.style.background = '#9C27B0';
      pickBtn.style.color = '#fff';
      pickBtn.style.border = 'none';
      pickBtn.style.borderRadius = '4px';
      pickBtn.style.cursor = 'pointer';
      pickBtn.onclick = () => {
        overlay.style.display = 'none';
        // 結合ボタンは削除したため triggerBtn を null で呼び出す
        mergeDownloadedFiles(subject, null);
      };

      actions.appendChild(cancelBtn);
      actions.appendChild(pickBtn);
      panel.appendChild(title);
      panel.appendChild(subjectLine);
      panel.appendChild(info);
      panel.appendChild(actions);
      overlay.appendChild(panel);
      document.body.appendChild(overlay);
      console.log('自動結合プロンプトを表示しました:', subject);
    } catch (e) {
      console.warn('自動結合プロンプト表示に失敗:', e);
    }
  }

  // ダウンロード済みファイルを選択して結合する
  async function mergeDownloadedFiles(subject, triggerBtn) {
    // ファイル名ガイドオーバーレイを作成
    const guideOverlay = document.createElement('div');
    guideOverlay.style.position = 'fixed';
    guideOverlay.style.top = '50%';
    guideOverlay.style.left = '50%';
    guideOverlay.style.transform = 'translate(-50%, -50%)';
    guideOverlay.style.background = 'rgba(255, 255, 255, 0.98)';
    guideOverlay.style.border = '3px solid #9C27B0';
    guideOverlay.style.borderRadius = '12px';
    guideOverlay.style.padding = '24px';
    guideOverlay.style.zIndex = '999999';
    guideOverlay.style.maxWidth = '600px';
    guideOverlay.style.maxHeight = '80vh';
    guideOverlay.style.overflow = 'auto';
    guideOverlay.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)';
    guideOverlay.style.fontFamily = 'sans-serif';
    
    const guideTitle = document.createElement('h3');
    guideTitle.textContent = `📁 「${subject}」のファイルを選択してください`;
    guideTitle.style.margin = '0 0 16px 0';
    guideTitle.style.color = '#9C27B0';
    guideTitle.style.fontSize = '18px';
    
    const guideContent = document.createElement('div');
    
    // localStorage から科目の全授業コードを取得
    const key = STORAGE_PREFIX + subject;
    const stored = localStorage.getItem(key);
    let classCodes = [];
    
    if (stored) {
      try {
        const data = JSON.parse(stored);
        classCodes = data.map(d => d.classCode).filter(c => c);
      } catch (e) {
        console.error('localStorage読み込みエラー:', e);
      }
    }
    
    if (classCodes.length > 0) {
      const codesTitle = document.createElement('div');
      codesTitle.textContent = '【保存されている授業コード】';
      codesTitle.style.fontWeight = 'bold';
      codesTitle.style.marginBottom = '8px';
      codesTitle.style.color = '#666';
      
      const codesList = document.createElement('div');
      codesList.textContent = classCodes.join(', ');
      codesList.style.padding = '12px';
      codesList.style.background = '#f5f5f5';
      codesList.style.borderRadius = '6px';
      codesList.style.marginBottom = '16px';
      codesList.style.fontSize = '14px';
      codesList.style.lineHeight = '1.6';
      
      const filesTitle = document.createElement('div');
      filesTitle.textContent = '【期待されるファイル名】';
      filesTitle.style.fontWeight = 'bold';
      filesTitle.style.marginBottom = '8px';
      filesTitle.style.color = '#666';
      
      const filesList = document.createElement('div');
      filesList.style.padding = '12px';
      filesList.style.background = '#f5f5f5';
      filesList.style.borderRadius = '6px';
      filesList.style.fontSize = '13px';
      filesList.style.lineHeight = '1.8';
      filesList.style.fontFamily = 'monospace';
      
      const safeSubject = subject.replace(/[\\/\:\*\?"<>\|]/g, '_').slice(0, 120);
      const displayCount = Math.min(10, classCodes.length);
      
      for (let i = 0; i < displayCount; i++) {
        const fileName = `${safeSubject}_${classCodes[i]}.csv`;
        const fileItem = document.createElement('div');
        fileItem.textContent = `• ${fileName}`;
        fileItem.style.marginBottom = '4px';
        filesList.appendChild(fileItem);
      }
      
      if (classCodes.length > displayCount) {
        const moreItem = document.createElement('div');
        moreItem.textContent = `... 他 ${classCodes.length - displayCount}件`;
        moreItem.style.marginTop = '8px';
        moreItem.style.color = '#999';
        moreItem.style.fontStyle = 'italic';
        filesList.appendChild(moreItem);
      }
      
      guideContent.appendChild(codesTitle);
      guideContent.appendChild(codesList);
      guideContent.appendChild(filesTitle);
      guideContent.appendChild(filesList);
    } else {
      const noData = document.createElement('div');
      noData.textContent = '保存された授業コードがありません。';
      noData.style.padding = '12px';
      noData.style.background = '#fff3cd';
      noData.style.borderRadius = '6px';
      noData.style.color = '#856404';
      guideContent.appendChild(noData);
    }
    
    const guideNote = document.createElement('div');
    guideNote.textContent = 'このウィンドウはファイル選択後に自動で閉じます';
    guideNote.style.marginTop = '16px';
    guideNote.style.fontSize = '12px';
    guideNote.style.color = '#999';
    guideNote.style.textAlign = 'center';
    
    guideOverlay.appendChild(guideTitle);
    guideOverlay.appendChild(guideContent);
    guideOverlay.appendChild(guideNote);
    document.body.appendChild(guideOverlay);
    
    try {
      const originalText = triggerBtn ? triggerBtn.textContent : null;
      if (triggerBtn) {
        triggerBtn.textContent = '選択...';
        triggerBtn.disabled = true;
      }

      // File System Access API でファイル選択（オーバーレイと同時表示）
      const fileHandles = await window.showOpenFilePicker({
        multiple: true,
        types: [{
          description: 'CSV/TSV Files',
          accept: {
            'text/csv': ['.csv'],
            'text/tab-separated-values': ['.tsv'],
            'text/plain': ['.txt']
          }
        }]
      });
      
      // オーバーレイを削除
      guideOverlay.remove();
      
      console.log('mergeDownloadedFiles: ファイルが選択されました', fileHandles.length);

      if (fileHandles.length === 0) {
        guideOverlay.remove();
        alert('ファイルが選択されませんでした');
        if (triggerBtn) {
          triggerBtn.textContent = originalText;
          triggerBtn.disabled = false;
        }
        return;
      }

  if (triggerBtn) triggerBtn.textContent = '読込中...';
      // 1パスでエンコーディング検出 & 結合処理
      const preferredEncodings = ['utf-16le', 'utf-16be', 'shift_jis', 'utf-8', 'euc-jp'];
      let detectedEncoding = null;
      const mergedLines = [];

      for (let fileIndex = 0; fileIndex < fileHandles.length; fileIndex++) {
        const file = await fileHandles[fileIndex].getFile();
        const buf = await file.arrayBuffer();

        // エンコーディング検出: 未確定なら候補を順に試す / 確定後はそれのみ
        const tryList = detectedEncoding ? [detectedEncoding] : preferredEncodings;
        let decodedText = null;
        for (const encoding of tryList) {
          try {
            const decoder = new TextDecoder(encoding, { fatal: false });
            const tmp = decoder.decode(buf);
            const commaCount = (tmp.match(/,/g) || []).length;
            const tabCount = (tmp.match(/\t/g) || []).length;
            const hasJapanese = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf]/.test(tmp);
            const replacementCharCount = (tmp.match(/\uFFFD/g) || []).length;
            const replacementRatio = replacementCharCount / Math.max(1, tmp.length);
            console.log(`🔍 ${file.name} - ${encoding}`, { preview: tmp.substring(0, 50), commaCount, tabCount, replacementRatio });
            if ((commaCount > 0 || tabCount > 5) && hasJapanese && replacementRatio < 0.05) {
              decodedText = tmp;
              if (!detectedEncoding) {
                detectedEncoding = encoding;
                console.log(`✅ エンコーディング決定: ${encoding}`);
              }
              break;
            }
          } catch (e) {
            console.warn(`${encoding} デコード失敗:`, e);
          }
        }
        if (!decodedText) {
          console.warn(`${file.name}: 適切なエンコーディングで読み取れませんでした (スキップ)`);
          continue;
        }

        const lines = decodedText.split(/\r?\n/).filter(l => l.trim().length > 0);
        if (lines.length === 0) continue;

        // タブ→カンマ + quoting
        const converted = lines.map(line => {
          const fields = line.split('\t').map(f => {
            if (/[",\n\r]/.test(f)) {
              return '"' + f.replace(/"/g, '""') + '"';
            }
            return f;
          });
          return fields.join(',');
        });

        if (fileIndex === 0) {
          mergedLines.push(...converted); // ヘッダー含む
        } else {
          mergedLines.push(...converted.slice(1)); // 2つ目以降はヘッダー除外
        }
      }

      if (mergedLines.length === 0) {
        alert('結合できるデータがありませんでした');
        if (triggerBtn) {
          triggerBtn.textContent = originalText;
          triggerBtn.disabled = false;
        }
        return;
      }

      const mergedText = mergedLines.join('\n');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const safeSubject = subject.replace(/[\\/\:\*\?"<>\|]/g, '_').slice(0, 120);
      const filename = `${safeSubject}_merged_${timestamp}.csv`;
      
      // 🆕 BOM付きUTF-8として保存（シンプルに）
      console.log(`保存: UTF-8 with BOM (元: ${detectedEncoding || 'utf-16le'})`);
      const bom = '\uFEFF';
      const blob = new Blob([bom + mergedText], { type: 'text/plain;charset=utf-8' });
      
      downloadBlob(blob, filename);
      
      console.log('✅ 結合完了:', {
        ファイル数: fileHandles.length,
        総行数: mergedLines.length,
        ファイル名: filename,
        元エンコーディング: detectedEncoding || 'utf-16le',
        保存形式: 'UTF-8 with BOM (カンマ区切り)',
        サイズ: blob.size,
        プレビュー: mergedLines[0]?.substring(0, 50)
      });

      if (triggerBtn) {
        triggerBtn.textContent = `✅ ${fileHandles.length}件`;
        setTimeout(() => {
          triggerBtn.textContent = originalText;
          triggerBtn.disabled = false;
        }, 2000);
      }
      alert(`${fileHandles.length}個のファイルを結合しました!\n合計: ${mergedLines.length}行\nファイル名: ${filename}`);

    } catch (err) {
      // オーバーレイが残っていたら削除
      if (guideOverlay && guideOverlay.parentNode) {
        guideOverlay.remove();
      }
      
      if (err.name === 'AbortError') {
        console.log('ファイル選択がキャンセルされました');
      } else {
        console.error('ファイル結合エラー:', err);
        alert('ファイル結合に失敗しました: ' + err.message);
      }
      if (triggerBtn) {
        triggerBtn.textContent = '結合';
        triggerBtn.disabled = false;
      }
    }
  }

  async function downloadGroup(subject, groupRows, triggerBtn) {
    const safeSubject = subject.replace(/[\\/\:\*\?"<>\|]/g, '_').slice(0, 120);
    const classCode = getClassCodeFromGroup(groupRows) || 'unknown';
    try {
      const respText = await fetchCsvFromGroup(groupRows);
      if (respText === BLOB_DOWNLOADED) {
        console.log('downloadGroup: fetchCsvFromGroup は既に Blob をダウンロードしました、二重ダウンロードを回避します');
        return;
      }
        if (respText && respText.trim().length > 0) {
        const filename = `${safeSubject}_${classCode}.csv`;
        const wrote = downloadTextAsFile(respText, filename);
        if (wrote === false) {
          console.log('downloadGroup: ファイルは既にダウンロード済み。フォールバックをスキップします', filename);
          return;
        }
        return;
      }

      // テキストが取れなかった場合は既存のクリックフォールバックを試す
      let handled = false;
      let imgBtn = null;
      for (const r of groupRows) { imgBtn = imgBtn || r.querySelector('input[type="image"]'); }
      if (imgBtn) { imgBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window })); handled = true; }
      if (!handled) {
        for (const r of groupRows) {
          const anchors = r.querySelectorAll('a[href^="javascript:"]');
          for (const a of anchors) {
            const href = a.getAttribute('href');
            if (href && href.includes('__doPostBack')) {
              const m = href.match(/__doPostBack\(['"]([^'"\)]+)['"],\s*['"]([^'"\)]*)['"]\)/i);
              if (m && typeof window.__doPostBack === 'function') { window.__doPostBack(m[1], m[2] || ''); handled = true; break; }
            }
          }
          if (handled) break;
        }
      }
      if (!handled) {
        for (const r of groupRows) {
          const btn = r.querySelector('button, input[type="button"]');
          if (btn) { btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window })); handled = true; break; }
        }
      }
      if (handled) await new Promise(res => setTimeout(res, 800));
    } catch (err) {
      console.error('個別グループの取得中に例外が発生しました', err);
      // エラーは呼び出し元に伝える
      throw err;
    }
  }

  // 科目のCSVをまとめて取得して結合しダウンロードする
  async function handleSubjectDownload(subject, rowsForSubject, triggerButton) {
    triggerButton.disabled = true;
    const originalText = triggerButton.textContent;
    triggerButton.textContent = '取得中...';
    const errors = [];
    // rowsForSubject may already be an array of groups (each group is an array of rows).
    let groups = [];
    if (rowsForSubject.length > 0 && Array.isArray(rowsForSubject[0])) {
      groups = rowsForSubject; // already grouped
    } else {
      // rowsForSubject contains raw rows; group them into main+button rows
      groups = [];
      let temp = [];
      for (let idx = 0; idx < rowsForSubject.length; idx++) {
        const r = rowsForSubject[idx];
        const cells = r.querySelectorAll('td');
        if (cells.length >= 3 && cells[0].textContent.trim().match(/^\d/)) {
          if (temp.length > 0) groups.push(temp);
          temp = [r];
        } else {
          temp.push(r);
        }
      }
      if (temp.length > 0) groups.push(temp);
    }

    // 各グループごとに個別のファイルとしてダウンロードする実装
    for (let g = 0; g < groups.length; g++) {
      const groupRows = groups[g];
      try {
        // まず fetch を試みてテキストを取得できるか確認する
        const respText = await fetchCsvFromGroup(groupRows);
        if (respText === BLOB_DOWNLOADED) {
          console.log('handleSubjectDownload: fetchCsvFromGroup は Blob をダウンロードしました（スキップ）');
          // 既にダウンロード済みなので次のグループへ
          await new Promise(res => setTimeout(res, 300));
          continue;
        }
        // main 行から科目コードを取得
        const mainCells = groupRows.find(r => r.querySelectorAll('td').length >= 3).querySelectorAll('td');
        const classCode = (mainCells && mainCells[0] && mainCells[0].textContent.trim()) || (`${g+1}`);
        const safeSubject = subject.replace(/[\\/\:\*\?"<>\|]/g, '_').slice(0, 120);

        if (respText && respText.trim().length > 0) {
          // テキストとして取得できた -> 個別ファイルを作ってダウンロード
          const filename = `${safeSubject}_${classCode}.csv`;
          const wrote = downloadTextAsFile(respText, filename);
          // 少し待つ
          await new Promise(res => setTimeout(res, 300));
          if (wrote === false) {
            console.log('handleSubjectDownload: ファイルは既にダウンロード済み。次へ', filename);
            continue;
          }
          continue;
        }

        // テキストが取れなかった場合: fetchCsvFromGroup 内で fallback として downloadResponseBlob(resp,..) を行っている可能性がある。
        // それでも何も起きていない場合は、ボタンをクリックしてブラウザの通常ダウンロードをトリガする
        let handled = false;
        // find first input[type=image]
        let imgBtn = null;
        for (const r of groupRows) { imgBtn = imgBtn || r.querySelector('input[type="image"]'); }
        if (imgBtn) {
          imgBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
          handled = true;
        }
        if (!handled) {
          for (const r of groupRows) {
            const anchors = r.querySelectorAll('a[href^="javascript:"]');
            for (const a of anchors) {
              const href = a.getAttribute('href');
              if (href && href.includes('__doPostBack')) {
                const m = href.match(/__doPostBack\(['"]([^'"\)]+)['"],\s*['"]([^'"\)]*)['"]\)/i);
                if (m && typeof window.__doPostBack === 'function') {
                  window.__doPostBack(m[1], m[2] || '');
                  handled = true;
                  break;
                }
              }
            }
            if (handled) break;
          }
        }
        if (!handled) {
          for (const r of groupRows) {
            const btn = r.querySelector('button, input[type="button"]');
            if (btn) {
              btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
              handled = true; break;
            }
          }
        }
        if (handled) await new Promise(res => setTimeout(res, 800));
      } catch (err) {
        console.error('グループのCSV取得失敗:', err);
        errors.push(err.message || String(err));
      }
    }

    triggerButton.textContent = '完了 ✅';
    setTimeout(() => {
      triggerButton.textContent = originalText;
      triggerButton.disabled = false;
    }, 1200);

    // ダウンロード後に結合ファイル選択ダイアログ誘導オーバーレイ表示
    try {
      showAutoMergePrompt(subject);
    } catch (e) {
      console.warn('自動結合プロンプト表示失敗（フォールバック: 手動で結合ボタンを押してください）', e);
    }

    if (errors.length > 0) {
      alert(`一部のファイルで取得エラーがありました:\n${errors.join('\n')}`);
    }
  }

  // グループ(複数行)からCSVを取得する関数。行群内のアンカー・ボタン・onclickや __doPostBack を探す
  async function fetchCsvFromGroup(groupRows) {
    // 1) グループ内のアンカータグを探す
    for (const row of groupRows) {
      const anchors = row.querySelectorAll('a[href]');
      for (const a of anchors) {
        const href = a.getAttribute('href') || '';
        // PDFっぽいアンカーは無視する
        if (hrefLooksLikePdf(href) || looksLikePdfElement(a)) continue;
        // javascript:__doPostBack(...) の場合は postBackFetch を試す
        if (href.trim().toLowerCase().startsWith('javascript:')) {
          const m = href.match(/__doPostBack\(['"]([^'"\)]+)['"],\s*['"]([^'"\)]*)['"]\)/i);
          if (m) {
            const target = m[1];
            const arg = m[2] || '';
            return await postBackFetch(target, arg);
          }
          continue;
        }

        if (href.match(/\.csv(\?|$)/i) || href.toLowerCase().includes('export') || href.toLowerCase().includes('download')) {
          const url = makeAbsoluteUrl(href);
        const resp = await fetch(url, { credentials: 'same-origin' });
        if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
        // clone for safe reading: use clone for text conversion, keep original for possible blob download
        const respForText = resp.clone();
        try {
          return await responseToText(respForText);
        } catch (e) {
          // fallback: サーバがテキストを返さない場合。PDF 等の不要なファイルを保存しないように判定する
          try {
            const ctype = (resp.headers.get('content-type') || '').toLowerCase();
            if (ctype.includes('pdf')) {
              console.log('fetchCsvFromGroup: PDF 応答を検出したため保存をスキップします', ctype);
              return '';
            }
            // 最低限先頭数バイトを覗いて PDF マジックナンバーをチェック
            try {
              const probe = resp.clone();
              const arr = await probe.arrayBuffer();
              const probeLen = Math.min(64, arr.byteLength);
              const probeBuf = arr.slice(0, probeLen);
              const probeText = new TextDecoder('utf-8', { fatal: false }).decode(probeBuf);
              if (probeText.includes('%PDF-')) {
                console.log('fetchCsvFromGroup: 応答先頭に %PDF- を検出、PDF のため保存をスキップします');
                return '';
              }
            } catch (probeErr) {
              // probe が失敗しても続行して保存を試みる
            }
            const dres = await downloadResponseBlob(resp, subjectFilenameSafe(groupRows)).catch(_=>null);
            if (dres === BLOB_DOWNLOADED) return BLOB_DOWNLOADED;
          } catch(_){ }
          return '';
            }
        }
      }
    }

    // 2) グループ内のボタン/画像ボタン/submit を探す
    for (const row of groupRows) {
      // 優先して画像ボタンやsubmitを探し、フォーム送信をエミュレート
      const imgBtn = row.querySelector('input[type="image"], input[type="submit"]');
      // PDF/印刷用の画像ボタンっぽければスキップ
      if (imgBtn && !looksLikePdfElement(imgBtn)) {
        return await postFormClickFetch(imgBtn);
      }

  const btn = row.querySelector('input[type="button"], button');
  if (!btn) continue;
  // PDF ボタンは無視
  if (looksLikePdfElement(btn)) continue;

      const onclick = btn.getAttribute('onclick') || '';
      // location.href
      const m1 = onclick.match(/location\.href\s*=\s*['"]([^'"]+)['"]/i);
      if (m1) {
        const url = makeAbsoluteUrl(m1[1]);
        const resp = await fetch(url, { credentials: 'same-origin' });
        if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
        const respForText = resp.clone();
        return await responseToText(respForText);
      }

      // window.open
      const m2 = onclick.match(/window\.open\(\s*['"]([^'"]+)['"]/i);
      if (m2) {
        const url = makeAbsoluteUrl(m2[1]);
        const resp = await fetch(url, { credentials: 'same-origin' });
        if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
        const respForText = resp.clone();
        return await responseToText(respForText);
      }

      // __doPostBack in onclick
      const m3 = onclick.match(/__doPostBack\(['"]([^'"\)]+)['"],\s*['"]([^'"\)]*)['"]\)/i);
      if (m3) {
        const target = m3[1];
        const arg = m3[2] || '';
        return await postBackFetch(target, arg);
      }

      // data-url 属性
      if (btn.dataset && btn.dataset.url) {
        const resp = await fetch(makeAbsoluteUrl(btn.dataset.url), { credentials: 'same-origin' });
        if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
        const respForText = resp.clone();
        return await responseToText(respForText);
      }

      // data-href / href 属性を探す
      const hrefAttr = btn.getAttribute('data-href') || btn.getAttribute('href');
      if (hrefAttr) {
        const resp = await fetch(makeAbsoluteUrl(hrefAttr), { credentials: 'same-origin' });
        if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
        const respForText = resp.clone();
        return await responseToText(respForText);
      }

      // 最終手段: ボタンをクリックしてユーザーの通常ダウンロード処理をトリガしてもらう
      try {
        btn.click();
      } catch (e) {
        // ignore
      }
      throw new Error('自動取得に対応していないトリガです（ボタンをクリックしてダウンロードしてください）');
    }

    throw new Error('ダウンロードトリガーが見つかりませんでした');
  }

  // input[type=image] や input[type=submit] をフォーム送信としてエミュレートして fetch する
  async function postFormClickFetch(elem) {
    const form = elem.closest('form') || document.querySelector('form');
    if (!form) throw new Error('フォームが見つかりません (画像ボタンのエミュレート失敗)');

    // フォームの全hidden値等をコピー
    const formData = new FormData(form);

    // 画像ボタンは name.x / name.y を送るパターン
    const name = elem.getAttribute('name') || elem.getAttribute('id');
    if (name) {
      formData.set(name + '.x', '1');
      formData.set(name + '.y', '1');
    }

    // serialize
    const params = new URLSearchParams();
    for (const pair of formData.entries()) {
      params.append(pair[0], pair[1]);
    }

    const action = form.action || window.location.href;
    const resp = await fetch(action, {
      method: 'POST',
      body: params.toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      credentials: 'same-origin'
    });

    if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);

    // clone for reading
    const respForText = resp.clone();
    try {
      return await responseToText(respForText);
    } catch (e) {
      try { await downloadResponseBlob(resp, 'postback'); } catch(_){}
      const res = await downloadResponseBlob(resp, 'postback');
      if (res === BLOB_DOWNLOADED) return BLOB_DOWNLOADED;
      return '';
    }
  }

  // 既存の行単位関数は互換のためラッパーにする
  async function fetchCsvFromRow(row) {
    return await fetchCsvFromGroup([row]);
  }

  // __doPostBack を使うケース: ページのフォームのhidden値を集めてPOST送信
  async function postBackFetch(eventTarget, eventArgument) {
    const form = document.querySelector('form');
    if (!form) throw new Error('フォームが見つかりません');

    const formData = new FormData(form);
    formData.set('__EVENTTARGET', eventTarget);
    formData.set('__EVENTARGUMENT', eventArgument);

    // serialize
    const params = new URLSearchParams();
    for (const pair of formData.entries()) {
      params.append(pair[0], pair[1]);
    }

    const action = form.action || window.location.href;
    const resp = await fetch(action, {
      method: 'POST',
      body: params.toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      credentials: 'same-origin'
    });

    if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
    // debug log: status and headers
    try {
      console.log('postBackFetch: response status=', resp.status, 'content-type=', resp.headers.get('content-type'), 'content-disposition=', resp.headers.get('content-disposition'));
      // clone before passing to responseToText so we keep an untouched original for probing/downloading
      const respForText = resp.clone();
      return await responseToText(respForText);
    } catch (e) {
      console.error('postBackFetch: responseToText で失敗しました', e);
      try {
        // try to peek first bytes for debugging from the original response (still unused)
        let probeText = null;
        try {
          const probeClone = resp.clone();
          const arr = await probeClone.arrayBuffer();
          const probeLen = Math.min(512, arr.byteLength);
          const probeBuf = arr.slice(0, probeLen);
          try {
            probeText = new TextDecoder('utf-8', { fatal: false }).decode(probeBuf);
          } catch (e2) {
            try { probeText = new TextDecoder('shift_jis', { fatal: false }).decode(probeBuf); } catch(_) { probeText = '[バイナリ]'; }
          }
          console.log('postBackFetch: response probe (first bytes):', (probeText || '').slice(0,300));
        } catch (e2) {
          console.warn('postBackFetch: probe 取得失敗', e2);
        }
        // 失敗したら元のレスポンスをBlobでダウンロードして呼び出し元へは空文字を返す
        const fallback = (eventTarget || 'postback').replace(/[^0-9A-Za-z_\-]/g, '_') + '.bin';
        // PDF 判定: Content-Type ヘッダまたは probeText に %PDF-
        const ctype = (resp.headers.get('content-type') || '').toLowerCase();
        if (ctype.includes('pdf') || (probeText && probeText.includes('%PDF-'))) {
          console.log('postBackFetch: PDF 応答を検出したため自動保存をスキップします', ctype);
          return '';
        }
  const res = await downloadResponseBlob(resp, fallback).catch(err => { console.error('postBackFetch: downloadResponseBlob で失敗しました', err); return null; });
  if (res === BLOB_DOWNLOADED) return BLOB_DOWNLOADED;
      } catch (e2) {
        console.warn('postBackFetch: probe 取得失敗', e2);
      }
      return '';
    }
  }

  // fetchのResponseを安全にテキストへ変換する。text/ csv の場合はtext()を使い、それ以外はblob->text()を試す
  async function responseToText(resp) {
    const contentType = (resp.headers.get('content-type') || '').toLowerCase();

    // PDF 応答は早期に拒否する（PDF を CSV として扱わない）
    if (contentType.includes('pdf')) {
      throw new Error('サーバがPDFを返しました');
    }

    // Content-Type がない場合は先頭数バイトを覗いて PDF マジックを確認
    if (!contentType) {
      try {
        const probe = resp.clone();
        const arr = await probe.arrayBuffer();
        if (arr && arr.byteLength >= 4) {
          const head = new TextDecoder('utf-8', { fatal: false }).decode(arr.slice(0, 4));
          if (head.includes('%PDF')) throw new Error('サーバがPDFを返しました');
        }
      } catch (e) {
        // clone が失敗したり probe が取れない場合は無視して続行
      }
    }

    try {
      // サーバが text/csv を明示している場合は text() で読み取る
      if (contentType.includes('text') || contentType.includes('csv') || contentType.includes('application/json')) {
        const txt = await resp.text();
        if (/<\s*html/i.test(txt)) throw new Error('サーバがHTMLを返しました（認証切れやエラーページの可能性があります）');
        return txt;
      }

      // それ以外はバイナリとして読み、複数エンコーディングでデコードして最もCSVらしい結果を返す
      const buffer = await resp.arrayBuffer();
      const tryEncodings = ['utf-8', 'shift_jis', 'euc-jp'];
      const candidates = [];

      for (const enc of tryEncodings) {
        try {
          const dec = new TextDecoder(enc, { fatal: false });
          const text = dec.decode(buffer);
          let score = 0;
          if (/\b(学籍|学籍番号|氏名|出席|学生|学生番号|出席番号|名前|所属)\b/.test(text)) score += 50;
          score += (text.match(/,/g) || []).length;
          if (/\<\s*html/i.test(text)) score -= 1000;
          candidates.push({ enc, text, score });
        } catch (e) {
          // ignore
        }
      }

      candidates.sort((a, b) => b.score - a.score);
      if (candidates.length === 0) throw new Error('レスポンスをテキストに変換できませんでした（対応エンコーディングなし）');
      const best = candidates[0];
      // デコード結果に置換文字(U+FFFD)が含まれる場合は、バイナリ誤解釈の可能性があるため失敗扱いにする
      const replacementCount = (best.text.match(/\uFFFD/g) || []).length;
      if (replacementCount > 0) {
        throw new Error('デコードに失敗しました（置換文字を検出）');
      }
      if (/\<\s*html/i.test(best.text)) throw new Error('サーバがHTMLを返しました（認証切れやエラーページの可能性があります）');
      return best.text;
    } catch (e) {
      // フォールバック: blob.text()
      try {
        const blob = await resp.blob();
        const txt = await blob.text();
        if (/\<\s*html/i.test(txt)) throw new Error('サーバがHTMLを返しました（認証切れやエラーページの可能性があります）');
        return txt;
      } catch (e2) {
        throw new Error('レスポンスをテキストに変換できませんでした');
      }
    }
  }

  // ----------------------------
  // ヘルパ: 要素や href から PDF トリガかどうかを推定する
  function looksLikePdfElement(el) {
    try {
      if (!el) return false;
      const id = (el.getAttribute && el.getAttribute('id')) || '';
      const name = (el.getAttribute && el.getAttribute('name')) || '';
      const cls = (el.getAttribute && el.getAttribute('class')) || '';
      const txt = (el.textContent || '') || '';
      const combined = (id + ' ' + name + ' ' + cls + ' ' + txt).toLowerCase();
      if (!combined) return false;
      return /\b(pdf|印刷|プレビュー|print|preview|ibtnpdf)\b/i.test(combined);
    } catch (e) { return false; }
  }

  function hrefLooksLikeCsv(href) {
    if (!href) return false;
    const h = href.toLowerCase();
    return /\.csv(\?|$)/i.test(h) || h.includes('export') || h.includes('download') || h.includes('csv');
  }

  function hrefLooksLikePdf(href) {
    if (!href) return false;
    const h = href.toLowerCase();
    return h.includes('.pdf') || h.includes('print') || h.includes('preview') || h.includes('pdf');
  }


  function makeAbsoluteUrl(url) {
    try {
      return new URL(url, window.location.href).href;
    } catch (e) {
      return url;
    }
  }

  // レスポンスをBlobとしてダウンロードする（ファイル名をContent-Dispositionから推定）
  async function downloadResponseBlob(resp, fallbackName) {
    try {
        // Response のボディは一度しか読めないので、まず clone() を試みる。
        // clone() が失敗する（body が既に使われている）場合は resp.blob() を直接試す。
        let blob;
        try {
          const r = resp.clone ? resp.clone() : resp;
          blob = await r.blob();
        } catch (cloneErr) {
          console.warn('downloadResponseBlob: resp.clone() に失敗しました、直接 blob() を試みます', cloneErr);
          // ここで resp.blob() が失敗する可能性もあるが、キャッチしてログ出力する
          blob = await resp.blob();
        }
      let filename = fallbackName || 'download';
      const cd = resp.headers.get('content-disposition');
      if (cd) {
        const m = cd.match(/filename\*?=(?:UTF-8'')?"?([^;"\n]+)"?/i);
        if (m) filename = decodeURIComponent(m[1]);
      }
  // ensure safe and use helper
  const safeName = sanitizeForFilename(filename);
  downloadBlob(blob, safeName);
  // indicate to caller that we performed a blob download (so they can avoid other fallbacks)
  return BLOB_DOWNLOADED;
    } catch (e) {
      console.error('Blob のダウンロードに失敗しました', e);
    }
  }

  function subjectFilenameSafe(groupRows) {
    try {
      // groupRows の最初の main 行から科目名を取る
      for (const r of groupRows) {
        const cells = r.querySelectorAll('td');
        if (cells.length >= 3 && cells[2]) {
          const subj = cells[2].textContent.trim();
          return subj.replace(/[\\/\:\*\?"<>\|]/g, '_').slice(0, 100) + '.bin';
        }
      }
    } catch (e){}
    return 'download.bin';
  }

  // 初期構築
  buildSubjectButtons();
  
})();
