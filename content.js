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
  
})();
