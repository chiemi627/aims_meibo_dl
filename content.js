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
  
  // ソートボタンを作成
  const sortButton = document.createElement('button');
  sortButton.textContent = '📚 授業科目名でソート';
  sortButton.style.position = 'fixed';
  sortButton.style.top = '20px';
  sortButton.style.right = '20px';
  sortButton.style.padding = '12px 20px';
  sortButton.style.backgroundColor = '#2196F3';
  sortButton.style.color = 'white';
  sortButton.style.fontSize = '16px';
  sortButton.style.fontWeight = 'bold';
  sortButton.style.border = 'none';
  sortButton.style.borderRadius = '8px';
  sortButton.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
  sortButton.style.cursor = 'pointer';
  sortButton.style.zIndex = '10000';
  
  // ホバー効果
  sortButton.onmouseover = function() {
    this.style.backgroundColor = '#1976D2';
  };
  sortButton.onmouseout = function() {
    this.style.backgroundColor = '#2196F3';
  };
  
  let isAscending = true; // 昇順/降順の状態
  
  // ソート機能
  sortButton.onclick = function() {
    console.log('ソート実行中...');
    
    const tbody = targetTable.querySelector('tbody') || targetTable;
    const rows = Array.from(tbody.querySelectorAll('tr'));
    
    if (rows.length === 0) {
      alert('ソート可能な行が見つかりませんでした');
      return;
    }
    
    // 授業科目名は3列目(インデックス2)
    const subjectColumnIndex = 2;
    
    console.log('ソート対象列:', subjectColumnIndex, '(3列目 = 授業科目名)');
    
    // ページネーション行を保存(「1～20件目」などを含む行)
    const paginationRows = [];
    const headerRowIndex = -1;
    let actualHeaderIndex = -1;
    
    // ヘッダー行を見つけ、ページネーション行も特定
    for (let i = 0; i < rows.length; i++) {
      const rowText = rows[i].textContent.trim();
      const firstCell = rows[i].querySelector('th, td');
      
      // ページネーション行(「1～20件目」や数字リンクを含む)
      if (rowText.match(/\d+～\d+件目/) || rowText.match(/^[\d\s次]+►?$/)) {
        paginationRows.push({ index: i, row: rows[i], position: 'top' });
        console.log('上部ページネーション行を発見:', i);
      }
      // ヘッダー行(「授業コード」を含む)
      else if (firstCell && firstCell.textContent.trim() === '授業コード') {
        actualHeaderIndex = i;
        console.log('ヘッダー行を発見:', i);
      }
    }
    
    if (actualHeaderIndex === -1) {
      alert('ヘッダー行が見つかりませんでした');
      return;
    }
    
    // ヘッダーより前の行(処理選択など)を保持
    const beforeHeaderRows = rows.slice(0, actualHeaderIndex);
    const headerRow = rows[actualHeaderIndex];
    
    // データ行をグループ化(授業情報行 + その直後のボタン行をセットにする)
    const rowGroups = [];
    const bottomPaginationRows = [];
    let i = actualHeaderIndex + 1;
    
    while (i < rows.length) {
      const currentRow = rows[i];
      const cells = currentRow.querySelectorAll('td');
      const rowText = currentRow.textContent.trim();
      
      // 下部のページネーション行をチェック
      if (rowText.match(/\d+～\d+件目/) || rowText.match(/^[\d\s次]+►?$/)) {
        bottomPaginationRows.push(currentRow);
        console.log('下部ページネーション行を発見:', i);
        i++;
        continue;
      }
      
      // 授業コードがある行(メイン行)
      if (cells.length >= 3 && cells[0].textContent.trim().match(/^\d/)) {
        const group = [currentRow];
        i++;
        
        // 次の行がボタン行かチェック
        while (i < rows.length) {
          const nextRow = rows[i];
          const hasButtons = nextRow.querySelector('input[type="button"]');
          const nextRowText = nextRow.textContent.trim();
          
          // ページネーションではなくボタン行の場合
          if (hasButtons && !nextRowText.match(/\d+～\d+件目/)) {
            group.push(nextRow);
            i++;
          } else {
            break;
          }
        }
        
        rowGroups.push(group);
      } else {
        i++;
      }
    }
    
    console.log('グループ数:', rowGroups.length);
    
    // グループごとにソート
    rowGroups.sort((groupA, groupB) => {
      const cellA = groupA[0].querySelectorAll('td')[subjectColumnIndex];
      const cellB = groupB[0].querySelectorAll('td')[subjectColumnIndex];
      
      if (!cellA || !cellB) return 0;
      
      const textA = cellA.textContent.trim();
      const textB = cellB.textContent.trim();
      
      if (isAscending) {
        return textA.localeCompare(textB, 'ja');
      } else {
        return textB.localeCompare(textA, 'ja');
      }
    });
    
    // テーブルを再構築
    // 既存の行を削除
    while (tbody.firstChild) {
      tbody.removeChild(tbody.firstChild);
    }
    
    // 上部ページネーション行を追加
    paginationRows.forEach(item => tbody.appendChild(item.row));
    
    // ヘッダーより前の行を追加(処理選択など)
    beforeHeaderRows.forEach(row => {
      // ページネーション行は既に追加済みなのでスキップ
      if (!paginationRows.find(item => item.row === row)) {
        tbody.appendChild(row);
      }
    });
    
    // ヘッダー行を追加
    tbody.appendChild(headerRow);
    
    // ソート済みのグループを追加
    rowGroups.forEach(group => {
      group.forEach(row => tbody.appendChild(row));
    });
    
    // 下部ページネーション行を追加
    bottomPaginationRows.forEach(row => tbody.appendChild(row));
    
    // ボタンのテキストを更新
    isAscending = !isAscending;
    sortButton.textContent = isAscending ? '📚 授業科目名でソート (昇順)' : '📚 授業科目名でソート (降順)';
    
    console.log('ソート完了!');
  };
  
  // ボタンをページに追加
  document.body.appendChild(sortButton);
  
  // 全ページ取得ボタンを作成
  const fetchAllButton = document.createElement('button');
  fetchAllButton.textContent = '📥 全ページ取得';
  fetchAllButton.style.position = 'fixed';
  fetchAllButton.style.top = '70px';  // ソートボタンの下
  fetchAllButton.style.right = '20px';
  fetchAllButton.style.padding = '12px 20px';
  fetchAllButton.style.backgroundColor = '#FF9800';
  fetchAllButton.style.color = 'white';
  fetchAllButton.style.fontSize = '16px';
  fetchAllButton.style.fontWeight = 'bold';
  fetchAllButton.style.border = 'none';
  fetchAllButton.style.borderRadius = '8px';
  fetchAllButton.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
  fetchAllButton.style.cursor = 'pointer';
  fetchAllButton.style.zIndex = '10000';
  
  fetchAllButton.onmouseover = function() {
    this.style.backgroundColor = '#F57C00';
  };
  fetchAllButton.onmouseout = function() {
    this.style.backgroundColor = '#FF9800';
  };
  
  // 全ページ取得機能(ASP.NET PostBack対応版)
  fetchAllButton.onclick = async function() {
    console.log('=== 全ページ取得を開始 ===');
    
    // ボタンを無効化
    fetchAllButton.disabled = true;
    fetchAllButton.style.opacity = '0.5';
    
    try {
      // ページネーションリンクを探す
      const paginationLinks = Array.from(document.querySelectorAll('a')).filter(link => {
        const text = link.textContent.trim();
        const href = link.href || link.getAttribute('href') || '';
        return text.match(/^\d+$/) && text !== '1';  // 数字のみで、1以外
      });
      
      console.log('ページネーションリンク数:', paginationLinks.length);
      
      if (paginationLinks.length === 0) {
        alert('他のページが見つかりませんでした(全データが既に表示されている可能性があります)');
        fetchAllButton.disabled = false;
        fetchAllButton.style.opacity = '1';
        fetchAllButton.textContent = '📥 全ページ取得';
        return;
      }
      
      // 現在のページのデータ行を保存
      const tbody = targetTable.querySelector('tbody') || targetTable;
      const currentRows = Array.from(tbody.querySelectorAll('tr'));
      
      // ヘッダー位置を特定
      let headerIndex = -1;
      for (let i = 0; i < currentRows.length; i++) {
        const firstCell = currentRows[i].querySelector('th, td');
        if (firstCell && firstCell.textContent.trim() === '授業コード') {
          headerIndex = i;
          break;
        }
      }
      
      // 現在表示中のデータ行を収集
      const allDataRows = [];
      if (headerIndex !== -1) {
        let i = headerIndex + 1;
        while (i < currentRows.length) {
          const row = currentRows[i];
          const rowText = row.textContent.trim();
          
          // ページネーション行で終了
          if (rowText.match(/\d+～\d+件目/) || rowText.match(/^[\d\s次]+►?$/)) {
            break;
          }
          
          const cells = row.querySelectorAll('td');
          if (cells.length >= 3 && cells[0].textContent.trim().match(/^\d/)) {
            allDataRows.push(row.cloneNode(true));
          } else if (row.querySelector('input[type="button"]')) {
            allDataRows.push(row.cloneNode(true));
          }
          i++;
        }
      }
      
      console.log('現在のページから取得:', allDataRows.length, '行');
      
      // 各ページのリンクをクリックしてデータを収集
      for (let i = 0; i < paginationLinks.length; i++) {
        const link = paginationLinks[i];
        const pageNum = link.textContent.trim();
        
        fetchAllButton.textContent = `📥 ${pageNum}ページ目へ移動中...`;
        console.log(`${pageNum}ページ目へ移動中...`);
        
        // リンクをクリック(ページ遷移)
        link.click();
        
        // ページ読み込みを待つ
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 新しいページのデータを取得
        const newTbody = targetTable.querySelector('tbody') || targetTable;
        const newRows = Array.from(newTbody.querySelectorAll('tr'));
        
        // ヘッダーを探す
        let newHeaderIndex = -1;
        for (let j = 0; j < newRows.length; j++) {
          const firstCell = newRows[j].querySelector('th, td');
          if (firstCell && firstCell.textContent.trim() === '授業コード') {
            newHeaderIndex = j;
            break;
          }
        }
        
        // データ行を収集
        if (newHeaderIndex !== -1) {
          let j = newHeaderIndex + 1;
          while (j < newRows.length) {
            const row = newRows[j];
            const rowText = row.textContent.trim();
            
            if (rowText.match(/\d+～\d+件目/) || rowText.match(/^[\d\s次]+►?$/)) {
              break;
            }
            
            const cells = row.querySelectorAll('td');
            if (cells.length >= 3 && cells[0].textContent.trim().match(/^\d/)) {
              allDataRows.push(row.cloneNode(true));
            } else if (row.querySelector('input[type="button"]')) {
              allDataRows.push(row.cloneNode(true));
            }
            j++;
          }
        }
        
        console.log(`${pageNum}ページ目取得完了。累計:`, allDataRows.length, '行');
      }
      
      console.log(`=== 合計 ${allDataRows.length} 行を取得 ===`);
      
      // 1ページ目に戻る
      fetchAllButton.textContent = '📥 1ページ目に戻ります...';
      const firstPageLink = document.querySelector('a[href*="Page$1"]');
      if (firstPageLink) {
        firstPageLink.click();
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // テーブルを再構築
      const finalTbody = targetTable.querySelector('tbody') || targetTable;
      const finalRows = Array.from(finalTbody.querySelectorAll('tr'));
      
      // ヘッダーとページネーションを保持
      let finalHeaderIndex = -1;
      const beforeHeaderRows = [];
      const paginationRows = [];
      
      for (let i = 0; i < finalRows.length; i++) {
        const row = finalRows[i];
        const firstCell = row.querySelector('th, td');
        const rowText = row.textContent.trim();
        
        if (firstCell && firstCell.textContent.trim() === '授業コード') {
          finalHeaderIndex = i;
        } else if (rowText.match(/\d+～\d+件目/) || rowText.match(/^[\d\s次]+►?$/)) {
          paginationRows.push(row);
        } else if (finalHeaderIndex === -1) {
          beforeHeaderRows.push(row);
        }
      }
      
      // テーブルをクリア
      while (finalTbody.firstChild) {
        finalTbody.removeChild(finalTbody.firstChild);
      }
      
      // 再構築
      beforeHeaderRows.forEach(row => finalTbody.appendChild(row));
      if (finalHeaderIndex !== -1) {
        finalTbody.appendChild(finalRows[finalHeaderIndex]);
      }
      allDataRows.forEach(row => finalTbody.appendChild(row));
      
      // ページネーション更新
      paginationRows.forEach(row => {
        const cells = row.querySelectorAll('td, th');
        cells.forEach(cell => {
          if (cell.textContent.match(/\d+～\d+件目/)) {
            const totalMatch = cell.textContent.match(/(\d+)件$/);
            if (totalMatch) {
              cell.textContent = `1～${totalMatch[1]}件目 / ${totalMatch[1]}件`;
            }
          }
        });
        
        // ページ番号リンクを非表示
        const links = row.querySelectorAll('a');
        links.forEach(link => {
          if (link.textContent.trim().match(/^\d+$/)) {
            link.style.display = 'none';
          }
        });
        
        finalTbody.appendChild(row);
      });
      
      fetchAllButton.textContent = '✅ 全ページ取得完了!';
      fetchAllButton.style.backgroundColor = '#4CAF50';
      
      console.log('全ページ取得完了!');
      
    } catch (error) {
      console.error('全ページ取得エラー:', error);
      alert('全ページ取得中にエラーが発生しました');
      fetchAllButton.disabled = false;
      fetchAllButton.style.opacity = '1';
      fetchAllButton.textContent = '📥 全ページ取得';
    }
  };
  
  document.body.appendChild(fetchAllButton);

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

  // 科目ボタンを作成する (ロード時・更新ボタンで呼ぶ)
  function buildSubjectButtons() {
    subjectList.innerHTML = '';

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

  const label = document.createElement('div');
  label.textContent = `${subject} (${groupsForSubject.length})`;
      label.style.flex = '1';
      label.style.marginRight = '6px';
      label.style.fontSize = '13px';
      label.title = subject;

  const btn = document.createElement('button');
  btn.textContent = '全てダウンロード';
  btn.style.flex = '0 0 auto';
  btn.onclick = () => handleSubjectDownload(subject, groupsForSubject, btn);

      wrapper.appendChild(label);
      wrapper.appendChild(btn);
      // 各グループ（科目番号）ごとの小さなボタンを追加
      const groupList = document.createElement('div');
      groupList.style.display = 'flex';
      groupList.style.flexDirection = 'column';
      groupList.style.marginTop = '6px';
      groupsForSubject.forEach((grp, gi) => {
        const sub = document.createElement('div');
        sub.style.display = 'flex';
        sub.style.justifyContent = 'space-between';
        sub.style.marginTop = '2px';
        const mainCells = grp.find(r => r.querySelectorAll('td').length >= 3).querySelectorAll('td');
        const classCode = (mainCells && mainCells[0] && mainCells[0].textContent.trim()) || (`${gi+1}`);
        const subLabel = document.createElement('div');
        subLabel.textContent = classCode;
        subLabel.style.fontSize = '12px';
        subLabel.style.flex = '1';
        const subBtn = document.createElement('button');
        subBtn.textContent = 'DL';
        subBtn.style.flex = '0 0 auto';
        subBtn.title = `${subject} - ${classCode}`;
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
        sub.appendChild(subLabel);
        sub.appendChild(subBtn);
        groupList.appendChild(sub);
      });
      wrapper.appendChild(groupList);
      subjectList.appendChild(wrapper);
    });
  }

  function getClassCodeFromGroup(groupRows) {
    const main = groupRows.find(r => r.querySelectorAll('td').length >= 3);
    if (!main) return null;
    const cells = main.querySelectorAll('td');
    return (cells && cells[0] && cells[0].textContent.trim()) || null;
  }

  async function downloadGroup(subject, groupRows, triggerBtn) {
    const safeSubject = subject.replace(/[\\/\:\*\?"<>\|]/g, '_').slice(0, 120);
    const classCode = getClassCodeFromGroup(groupRows) || 'unknown';
    try {
      const respText = await fetchCsvFromGroup(groupRows);
      if (respText && respText.trim().length > 0) {
        const filename = `${safeSubject}_${classCode}.csv`;
        const blob = new Blob([respText], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
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
        // main 行から科目コードを取得
        const mainCells = groupRows.find(r => r.querySelectorAll('td').length >= 3).querySelectorAll('td');
        const classCode = (mainCells && mainCells[0] && mainCells[0].textContent.trim()) || (`${g+1}`);
        const safeSubject = subject.replace(/[\\/\:\*\?"<>\|]/g, '_').slice(0, 120);

        if (respText && respText.trim().length > 0) {
          // テキストとして取得できた -> 個別ファイルを作ってダウンロード
          const filename = `${safeSubject}_${classCode}.csv`;
          const blob = new Blob([respText], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
          // 少し待つ
          await new Promise(res => setTimeout(res, 300));
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
            await downloadResponseBlob(resp, subjectFilenameSafe(groupRows));
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
        try { await downloadResponseBlob(resp, fallback); } catch(err) { console.error('postBackFetch: downloadResponseBlob で失敗しました', err); }
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
      // ensure safe
      filename = filename.replace(/[\\/\:\*\?"<>\|]/g, '_').slice(0, 120);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
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
