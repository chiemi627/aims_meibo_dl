  // テキストデータをUTF-8でファイル保存する
  function downloadTextAsFile(text, filename, mime = 'text/csv;charset=utf-8;') {
    const safe = filename.replace(/[\\/:*?"<>|]/g, '_').slice(0, 120);
    const bom = '\uFEFF';
    const blob = new Blob([bom + text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = safe;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    return true;
  }
  
  // Blobをファイルとしてダウンロードする
  function downloadBlob(blob, filename) {
    const safe = filename.replace(/[\\/:*?"<>|]/g, '_').slice(0, 120);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = safe;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }
  
  // ファイル名を安全な形式にする
  function sanitizeForFilename(filename) {
    return filename.replace(/[\\/:*?"<>|]/g, '_').slice(0, 120);
  }
  // Blobダウンロード完了を示す特殊値
  const BLOB_DOWNLOADED = '__blob_downloaded__';
  // グループ（行配列）から授業コード等を抽出
  function extractDataFromGroup(groupRows) {
    if (!groupRows || groupRows.length === 0) return null;
    // メイン行（tdが3つ以上）を探す
    const mainRow = groupRows.find(r => r.querySelectorAll('td').length >= 3);
    if (!mainRow) return null;
    const cells = mainRow.querySelectorAll('td');
    return {
      classCode: cells[0]?.textContent.trim() || '',
      subject: cells[2]?.textContent.trim() || '',
      // 必要なら他の情報も追加可能
    };
  }
// ページが読み込まれたら授業科目名でソート機能を追加
(function() {

  // localStorageキーの接頭辞
  const STORAGE_PREFIX = 'ntutdx1_';

  console.log('ソート機能拡張機能が実行されました');
  

  // テーブルを検索
  const tables = document.querySelectorAll('table');
  // 操作対象テーブル（最初のテーブルを仮定）
  // 科目一覧テーブルを探す（最初のテーブルが想定外の場合は他も検査）
  let targetTable = null;
  for (let t of tables) {
    if (t.textContent.includes('授業コード')) {
      targetTable = t;
      break;
    }
  }
  if (!targetTable) {
    console.warn('科目一覧テーブルが見つかりません。UIを非表示にします。');
    subjectList.style.display = 'none';
    return;
  }

  // 科目ボタン表示用の要素を生成・追加
  let subjectList = document.getElementById('subject-list');
  if (!subjectList) {
    subjectList = document.createElement('div');
    subjectList.id = 'subject-list';
    subjectList.style.margin = '32px 0';
    subjectList.style.padding = '16px';
    subjectList.style.background = '#fafafa';
    subjectList.style.borderRadius = '8px';
    subjectList.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
    if (targetTable && targetTable.parentNode) {
      targetTable.parentNode.insertBefore(subjectList, targetTable);
    } else {
      document.body.prepend(subjectList);
    }
  }
  
  // ...existing code...
  
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
    statusDiv.textContent = `💾 授業別科目番号収集: ${savedTotal}件 (${savedData.size}科目)`;
    
    // 🆕 表示/非表示切り替えボタン
    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = '▼ 科目一覧';
    toggleBtn.style.flex = '0 0 auto';
    toggleBtn.style.padding = '8px 12px';
    toggleBtn.style.fontSize = '13px';
    toggleBtn.style.background = '#2196F3';
    toggleBtn.style.color = 'white';
    toggleBtn.style.border = 'none';
    toggleBtn.style.borderRadius = '4px';
    toggleBtn.style.cursor = 'pointer';
    
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
    topControls.appendChild(toggleBtn);
    topControls.appendChild(clearBtn);
    subjectList.appendChild(topControls);
    
    // 🆕 科目一覧コンテナ（表示/非表示の対象）
    const subjectListContainer = document.createElement('div');
    subjectListContainer.id = 'subject-list-container';
    
    // トグル状態をlocalStorageから復元（デフォルトは非表示）
    const isListVisible = localStorage.getItem('ntutdx1_listVisible') === 'true';
    subjectListContainer.style.display = isListVisible ? 'block' : 'none';
    toggleBtn.textContent = isListVisible ? '▲ 科目一覧' : '▼ 科目一覧';
    
    subjectList.appendChild(subjectListContainer);
    
    // 🆕 切り替え処理
    toggleBtn.onclick = () => {
      const isVisible = subjectListContainer.style.display !== 'none';
      if (isVisible) {
        subjectListContainer.style.display = 'none';
        toggleBtn.textContent = '▼ 科目一覧';
        localStorage.setItem('ntutdx1_listVisible', 'false');
      } else {
        subjectListContainer.style.display = 'block';
        toggleBtn.textContent = '▲ 科目一覧';
        localStorage.setItem('ntutdx1_listVisible', 'true');
      }
    };

    const tbody = targetTable.querySelector('tbody') || targetTable;
    const rows = Array.from(tbody.querySelectorAll('tr'));

    // ヘッダーを探す（「授業コード」以外にも柔軟に対応）
    let headerIndex = -1;
    for (let i = 0; i < rows.length; i++) {
      const firstCell = rows[i].querySelector('th, td');
      if (firstCell && /授業コード|科目名|学生番号|氏名/.test(firstCell.textContent.trim())) {
        headerIndex = i;
        break;
      }
    }

    if (headerIndex === -1) {
      console.warn('テーブルヘッダー（授業コード等）が見つかりません。UIを非表示にします。');
      subjectList.style.display = 'none';
      return;
    }

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
      wrapper.style.gap = '8px';
      wrapper.style.marginBottom = '6px';
      wrapper.style.padding = '6px 8px';
      wrapper.style.background = '#f5f5f5';
      wrapper.style.borderRadius = '4px';

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
        label.textContent = `${subject} (現ページ：${currentCount}件 / 保存${totalCount}件)`;
      } else {
        label.textContent = `${subject} (${currentCount}件)`;
      }
      label.style.flex = '1';
      label.style.fontSize = '13px';
      label.style.fontWeight = '500';
      label.title = subject;

      const btnContainer = document.createElement('div');
      btnContainer.style.display = 'flex';
      btnContainer.style.gap = '4px';
      btnContainer.style.flex = '0 0 auto';

      const downloadBtn = document.createElement('button');
      downloadBtn.textContent = 'ダウンロード';
      downloadBtn.style.fontSize = '12px';
      downloadBtn.style.padding = '4px 10px';
      downloadBtn.style.background = '#4CAF50';
      downloadBtn.style.color = 'white';
      downloadBtn.style.border = 'none';
      downloadBtn.style.borderRadius = '3px';
      downloadBtn.style.cursor = 'pointer';
      downloadBtn.style.whiteSpace = 'nowrap';
      downloadBtn.onclick = () => handleSubjectDownload(subject, groupsForSubject, downloadBtn);

      btnContainer.appendChild(downloadBtn);

      // 🆕 出欠テンプレートボタン
      const attendanceBtn = document.createElement('button');
      attendanceBtn.textContent = '出欠テンプレート';
      attendanceBtn.style.fontSize = '12px';
      attendanceBtn.style.padding = '4px 10px';
      attendanceBtn.style.background = '#2196F3';
      attendanceBtn.style.color = 'white';
      attendanceBtn.style.border = 'none';
      attendanceBtn.style.borderRadius = '3px';
      attendanceBtn.style.cursor = 'pointer';
      attendanceBtn.style.whiteSpace = 'nowrap';
      attendanceBtn.onclick = () => handleAttendanceTemplate(subject, groupsForSubject, attendanceBtn);

      btnContainer.appendChild(attendanceBtn);

      wrapper.appendChild(label);
      wrapper.appendChild(btnContainer);
      subjectListContainer.appendChild(wrapper);
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
  function showAutoMergePrompt(subject, isAttendanceMode = false) {
    try {
      // 既に表示中なら再利用
      const existing = document.getElementById('auto-merge-overlay');
      if (existing) {
        existing.querySelector('.auto-merge-subject').textContent = subject;
        existing.style.display = 'flex';
        // モードに応じてボタンを更新
        const pickBtn = existing.querySelector('.auto-merge-pick-btn');
        if (pickBtn) {
          pickBtn.onclick = () => {
            existing.style.display = 'none';
            mergeDownloadedFiles(subject, null, isAttendanceMode);
          };
        }
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
      pickBtn.className = 'auto-merge-pick-btn';
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
        mergeDownloadedFiles(subject, null, isAttendanceMode);
      };

      actions.appendChild(cancelBtn);
      actions.appendChild(pickBtn);
      panel.appendChild(title);
      panel.appendChild(subjectLine);
      panel.appendChild(info);
      panel.appendChild(actions);
      overlay.appendChild(panel);
      document.body.appendChild(overlay);
      console.log('自動結合プロンプトを表示しました:', subject, 'attendanceMode:', isAttendanceMode);
    } catch (e) {
      console.warn('自動結合プロンプト表示に失敗:', e);
    }
  }

  // ダウンロード済みファイルを選択して結合する
  async function mergeDownloadedFiles(subject, triggerBtn, isAttendanceMode = false) {
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
      const filePrefix = isAttendanceMode ? '出席_' : '';
      
      for (let i = 0; i < displayCount; i++) {
        const fileName = `${filePrefix}${safeSubject}_${classCodes[i]}.csv`;
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
      const filePrefix = isAttendanceMode ? '出席_' : '';
      const filename = `${filePrefix}${safeSubject}_merged_${timestamp}.csv`;
      
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

  // 🆕 出欠テンプレート作成関数
  async function handleAttendanceTemplate(subject, rowsForSubject, triggerButton) {
    triggerButton.disabled = true;
    const originalText = triggerButton.textContent;
    triggerButton.textContent = '取得中...';
    const errors = [];
    
    // グループ化処理（handleSubjectDownloadと同様）
    let groups = [];
    if (rowsForSubject.length > 0 && Array.isArray(rowsForSubject[0])) {
      groups = rowsForSubject;
    } else {
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

    console.log(`[handleAttendanceTemplate] subject='${subject}' グループ数:`, groups.length);

    // 年度計算（1-3月は前年度）
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const fiscalYear = (month >= 1 && month <= 3) ? year - 1 : year;
    
    // 本日の日付（YYYY/MM/DD形式）
    const today = `${year}/${String(month).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;

    // 出欠テンプレートのヘッダー（カンマ区切りCSV形式）
    const templateHeader = '年度,授業コード,授業名,出欠登録日,時限,学籍番号,学生氏名,学年,出席番号,出席,欠席,公欠,出席停止,未調査,備考';
    const outputLines = [templateHeader];
    const classCodes = [];

    // 各グループのデータを取得してテンプレートに変換
    for (let g = 0; g < groups.length; g++) {
      const groupRows = groups[g];
      try {
        triggerButton.textContent = `取得中 ${g+1}/${groups.length}...`;
        
        const respText = await fetchCsvFromGroup(groupRows);
        if (respText === BLOB_DOWNLOADED) {
          console.log('handleAttendanceTemplate: Blobダウンロード検出（スキップ）');
          await new Promise(res => setTimeout(res, 300));
          continue;
        }

        const mainCells = groupRows.find(r => r.querySelectorAll('td').length >= 3).querySelectorAll('td');
        const classCode = (mainCells && mainCells[0] && mainCells[0].textContent.trim()) || (`${g+1}`);
        const className = (mainCells && mainCells[2] && mainCells[2].textContent.trim()) || subject;

        if (respText && respText.trim().length > 0) {
          classCodes.push(classCode);
          
          const lines = respText.split(/\r?\n/).filter(l => l.trim().length > 0);
          if (lines.length === 0) continue;

          // 元のCSVからデータを抽出（ヘッダーをスキップ）
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            const columns = parseCSVLine(line);
            
            if (columns.length < 12) continue; // データが不十分な行はスキップ
            
            // 🔍 デバッグ: 最初の行だけログ出力
            if (i === 1) {
              console.log('📊 履修者データのサンプル（最初の行）:');
              console.log('columns.length:', columns.length);
              console.log('[0]授業コード:', columns[0]);
              console.log('[1]授業科目名称:', columns[1]);
              console.log('[4]開始時限:', columns[4]);
              console.log('[7]学籍番号:', columns[7]);
              console.log('[8]学生漢字氏名:', columns[8]);
              console.log('[11]学年:', columns[11]);
            }
            
            // 元データから必要な情報を取得
            // 履修者データの列構造:
            // [0]授業コード, [1]授業科目名称, ..., [4]開始時限, ..., [7]学籍番号, [8]学生漢字氏名, ..., [11]学年
            const subjectName = columns[1] || className; // 授業科目名称
            const periodRaw = columns[4] || '';
            // 開始時限（全角数字→半角数字に変換してから数字のみ抽出）
            const period = periodRaw
              .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)) // 全角→半角
              .replace(/[^0-9]/g, ''); // 数字のみ抽出
            const studentId = columns[7] || ''; // 学籍番号
            const studentName = columns[8] || ''; // 学生漢字氏名
            const grade = columns[11] || ''; // 学年
            
            // 🔍 デバッグ: 時限抽出の確認
            if (i === 1) {
              console.log('時限抽出: "' + periodRaw + '" → "' + period + '"');
            }
            
            // CSV用にエスケープする関数（カンマ、ダブルクォート、改行を含む場合はクォートで囲む）
            const escapeCSV = (value) => {
              const str = String(value);
              if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
                return '"' + str.replace(/"/g, '""') + '"';
              }
              return str;
            };
            
            // テンプレート形式で出力（カンマ区切りCSV形式）
            // 年度,授業コード,授業名,出欠登録日,時限,学籍番号,学生氏名,学年,出席番号,出席,欠席,公欠,出席停止,未調査,備考
            const templateLine = [
              fiscalYear,
              classCode,
              subjectName,
              today,
              period,
              studentId,
              studentName,
              grade,
              '', // 出席番号（空）
              '', // 出席（空）
              '', // 欠席（空）
              '', // 公欠（空）
              '', // 出席停止（空）
              '', // 未調査（空）
              ''  // 備考（空）
            ].map(escapeCSV).join(',');
            
            outputLines.push(templateLine);
          }
          
          console.log(`✅ ${classCode}: ${lines.length - 1}名処理`);
          await new Promise(res => setTimeout(res, 300));
          continue;
        }

        console.warn(`⚠️ ${classCode}: テキスト取得失敗、スキップ`);
        errors.push(`${classCode}: データ取得に失敗しました`);
        
      } catch (err) {
        console.error('グループのCSV取得失敗:', err);
        errors.push(err.message || String(err));
      }
    }

    // ファイル保存
    if (outputLines.length > 1) {
      triggerButton.textContent = '保存中...';
      
      const safeSubject = subject.replace(/[\\/\:\*\?"<>\|]/g, '_').slice(0, 80);
      const classCodesStr = classCodes.join('_');
      const filename = `出席_${safeSubject}_${classCodesStr}.csv`;
      
      const outputText = outputLines.join('\n');
      downloadTextAsFile(outputText, filename);
      
      console.log(`✅ 出欠テンプレート作成完了: ${classCodes.length}グループ、${outputLines.length - 1}名 -> ${filename}`);
    } else {
      console.warn('⚠️ 出力するデータがありません');
      errors.push('出力するデータがありませんでした');
    }

    triggerButton.textContent = '完了 ✅';
    setTimeout(() => {
      triggerButton.textContent = originalText;
      triggerButton.disabled = false;
    }, 1200);

    // ダウンロード後に結合ファイル選択ダイアログ誘導
    if (outputLines.length > 1) {
      try {
        showAutoMergePrompt(subject, true); // true = 出欠テンプレートモード
      } catch (e) {
        console.warn('自動結合プロンプト表示失敗', e);
      }
    }

    if (errors.length > 0) {
      alert(`一部のファイルで取得エラーがありました:\n${errors.join('\n')}`);
    }
  }

  // CSV行をパースする簡易関数（タブ区切りまたはカンマ区切り対応）
  function parseCSVLine(line) {
    // タブ区切りを優先
    if (line.includes('\t')) {
      return line.split('\t').map(cell => cell.replace(/^"|"$/g, '').trim());
    }
    // カンマ区切り（簡易版）
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result.map(cell => cell.replace(/^"|"$/g, ''));
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
    
    // グループ分割状況をログ出力
    console.log(`[handleSubjectDownload] subject='${subject}' グループ数:`, groups.length);
    groups.forEach((groupRows, idx) => {
      const mainCells = groupRows.find(r => r.querySelectorAll('td').length >= 3)?.querySelectorAll('td');
      const classCode = (mainCells && mainCells[0] && mainCells[0].textContent.trim()) || (`${idx+1}`);
      console.log(`  group[${idx}]: classCode='${classCode}' rows=${groupRows.length}`);
    });

    // 🆕 各グループのデータを取得して結合する
    const mergedLines = [];
    const classCodes = [];
    
    for (let g = 0; g < groups.length; g++) {
      const groupRows = groups[g];
      try {
        triggerButton.textContent = `取得中 ${g+1}/${groups.length}...`;
        
        // まず fetch を試みてテキストを取得できるか確認する
        const respText = await fetchCsvFromGroup(groupRows);
        if (respText === BLOB_DOWNLOADED) {
          console.log('handleSubjectDownload: fetchCsvFromGroup は Blob をダウンロードしました（スキップ）');
          await new Promise(res => setTimeout(res, 300));
          continue;
        }
        
        // main 行から科目コードを取得
        const mainCells = groupRows.find(r => r.querySelectorAll('td').length >= 3).querySelectorAll('td');
        const classCode = (mainCells && mainCells[0] && mainCells[0].textContent.trim()) || (`${g+1}`);

        if (respText && respText.trim().length > 0) {
          // テキストとして取得できた -> データを結合用配列に追加
          classCodes.push(classCode);
          
          const lines = respText.split(/\r?\n/).filter(l => l.trim().length > 0);
          if (lines.length === 0) continue;
          
          if (mergedLines.length === 0) {
            // 最初のグループ: ヘッダー含む全行を追加
            mergedLines.push(...lines);
          } else {
            // 2つ目以降: ヘッダーを除いてデータ行のみ追加
            mergedLines.push(...lines.slice(1));
          }
          
          console.log(`✅ ${classCode}: ${lines.length}行取得`);
          await new Promise(res => setTimeout(res, 300));
          continue;
        }

        // テキストが取れなかった場合のフォールバック
        console.warn(`⚠️ ${classCode}: テキスト取得失敗、スキップ`);
        errors.push(`${classCode}: データ取得に失敗しました`);
        
      } catch (err) {
        console.error('グループのCSV取得失敗:', err);
        errors.push(err.message || String(err));
      }
    }

    // 🆕 結合したデータを1つのファイルとして保存
    if (mergedLines.length > 0) {
      triggerButton.textContent = '保存中...';
      
      const safeSubject = subject.replace(/[\\/\:\*\?"<>\|]/g, '_').slice(0, 80);
      // ファイル名: 科目名_科目コード1_科目コード2_..._科目コードN.csv
      const classCodesStr = classCodes.join('_');
      const filename = `${safeSubject}_${classCodesStr}.csv`;
      
      const mergedText = mergedLines.join('\n');
      downloadTextAsFile(mergedText, filename);
      
      console.log(`✅ 結合完了: ${classCodes.length}グループ、${mergedLines.length}行 -> ${filename}`);
    } else {
      console.warn('⚠️ 結合するデータがありません');
      errors.push('結合するデータがありませんでした');
    }

    triggerButton.textContent = '完了 ✅';
    setTimeout(() => {
      triggerButton.textContent = originalText;
      triggerButton.disabled = false;
    }, 1200);

    // 🆕 ダウンロード後に結合ファイル選択ダイアログ誘導オーバーレイ表示
    if (mergedLines.length > 0) {
      try {
        showAutoMergePrompt(subject);
      } catch (e) {
        console.warn('自動結合プロンプト表示失敗', e);
      }
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
      console.log('postFormClickFetch: responseToText を呼び出します、status=', resp.status, 'content-type=', resp.headers.get('content-type'));
      const result = await responseToText(respForText);
      console.log('postFormClickFetch: responseToText 成功、テキスト長=', result.length);
      return result;
    } catch (e) {
      console.error('postFormClickFetch: responseToText で失敗しました', e.message);
      try { await downloadResponseBlob(resp, 'postback'); } catch(_){}
      const res = await downloadResponseBlob(resp, 'postback');
      console.log('postFormClickFetch: Blob 保存結果 =', res);
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
      console.log('postBackFetch: responseToText を呼び出します');
      const result = await responseToText(respForText);
      console.log('postBackFetch: responseToText 成功、テキスト長=', result.length);
      return result;
    } catch (e) {
      console.error('postBackFetch: responseToText で失敗しました', e.message);
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
    console.log('responseToText: Content-Type =', contentType);

    // PDF 応答は早期に拒否する（PDF を CSV として扱わない）
    if (contentType.includes('pdf')) {
      console.log('responseToText: PDF検出、拒否');
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
        console.log('responseToText: Content-Typeがtext/csv系なので resp.text() を使用');
        const txt = await resp.text();
        console.log('responseToText: resp.text() 取得成功、長さ=', txt.length, '先頭100文字=', txt.slice(0, 100));
        if (/<\s*html/i.test(txt)) {
          console.log('responseToText: HTML検出、エラー');
          throw new Error('サーバがHTMLを返しました（認証切れやエラーページの可能性があります）');
        }
        console.log('responseToText: テキスト返却（resp.text経由）');
        return txt;
      }

      // それ以外はバイナリとして読み、複数エンコーディングでデコードして最もCSVらしい結果を返す
      console.log('responseToText: Content-Typeが不明またはバイナリ、複数エンコーディングを試行');
      const buffer = await resp.arrayBuffer();
      console.log('responseToText: arrayBuffer取得、サイズ=', buffer.byteLength);
      // UTF-16LE/BE を優先的に試す（TSV形式の可能性が高いため）
      const tryEncodings = ['utf-16le', 'utf-16be', 'shift_jis', 'utf-8', 'euc-jp'];
      const candidates = [];

      for (const enc of tryEncodings) {
        try {
          const dec = new TextDecoder(enc, { fatal: false });
          const text = dec.decode(buffer);
          let score = 0;
          if (/\b(学籍|学籍番号|氏名|出席|学生|学生番号|出席番号|名前|所属)\b/.test(text)) score += 50;
          // TSV対応: タブ文字もカウント（カンマ区切りとタブ区切りの両方に対応）
          score += (text.match(/,/g) || []).length;
          score += (text.match(/\t/g) || []).length;
          if (/\<\s*html/i.test(text)) score -= 1000;
          const replacementCount = (text.match(/\uFFFD/g) || []).length;
          // 置換文字がある場合は大幅に減点（1文字あたり -10点）
          score -= replacementCount * 10;
          console.log(`responseToText: エンコーディング=${enc}, スコア=${score}, 置換文字数=${replacementCount}, 長さ=${text.length}`);
          candidates.push({ enc, text, score, replacementCount });
        } catch (e) {
          console.log(`responseToText: エンコーディング=${enc} でデコード失敗`, e);
          // ignore
        }
      }

      candidates.sort((a, b) => b.score - a.score);
      if (candidates.length === 0) {
        console.log('responseToText: すべてのエンコーディングで失敗');
        throw new Error('レスポンスをテキストに変換できませんでした（対応エンコーディングなし）');
      }
      const best = candidates[0];
      console.log('responseToText: 最良候補 =', best.enc, 'スコア=', best.score, '置換文字数=', best.replacementCount);
      // デコード結果に置換文字(U+FFFD)が含まれる場合は、バイナリ誤解釈の可能性があるため失敗扱いにする
      if (best.replacementCount > 0) {
        console.log('responseToText: 置換文字を検出、エラー');
        throw new Error('デコードに失敗しました（置換文字を検出）');
      }
      if (/\<\s*html/i.test(best.text)) {
        console.log('responseToText: HTML検出、エラー');
        throw new Error('サーバがHTMLを返しました（認証切れやエラーページの可能性があります）');
      }
      console.log('responseToText: テキスト返却（複数エンコーディング経由、先頭100文字=', best.text.slice(0, 100), ')');
      return best.text;
    } catch (e) {
      console.log('responseToText: メイン処理で例外、フォールバック blob.text() を試行', e.message);
      // フォールバック: blob.text()
      try {
        const blob = await resp.blob();
        const txt = await blob.text();
        console.log('responseToText: blob.text() 成功、長さ=', txt.length);
        if (/\<\s*html/i.test(txt)) {
          console.log('responseToText: blob.text() でHTML検出、エラー');
          throw new Error('サーバがHTMLを返しました（認証切れやエラーページの可能性があります）');
        }
        console.log('responseToText: テキスト返却（blob.text経由）');
        return txt;
      } catch (e2) {
        console.error('responseToText: blob.text() も失敗、完全にエラー', e2.message);
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
