export const processLyricsForGame = (rawLyrics) => {
  // 1. 依照空行分段 (Paragraphs)
  const rawParagraphs = rawLyrics.split(/\n\s*\n/);
  
  return rawParagraphs.map((para, pIndex) => {
    // 過濾掉太短的段落，並依照換行切成行
    const lines = para.split('\n').filter(line => line.trim().length > 0);
    
    // 將這一整段落合併成一個遊戲關卡
    // 我們需要把每一行拆解，隨機選詞挖空
    const processedLines = lines.map((line, lIndex) => {
      // 簡單的斷詞邏輯：依照空格切分，如果沒有空格，則每 N 個字切分
      // 這裡假設歌詞中有空格輔助斷詞 (如你提供的範例)，若無則當作整句
      let segments = line.split(' ').filter(s => s.trim() !== '');
      
      // 如果切出來太少(表示沒空格)，我們強制手動切幾個詞 (這裡簡化處理)
      if (segments.length === 1 && line.length > 5) {
        const mid = Math.floor(line.length / 2);
        segments = [line.slice(0, mid), line.slice(mid)];
      }

      // 隨機選 1 個詞挖空 (每行最多挖一個，避免太難)
      const gapIndex = Math.floor(Math.random() * segments.length);
      
      return segments.map((seg, sIndex) => {
        if (sIndex === gapIndex) {
          return { text: seg, isGap: true, id: `p${pIndex}-l${lIndex}-s${sIndex}` };
        }
        return { text: seg, isGap: false };
      });
    });

    // 扁平化結構以便 UI 渲染
    return {
      id: `level-${pIndex}`,
      lines: processedLines, // 二維陣列：行 -> 詞
      answers: processedLines.flatMap(line => line.filter(s => s.isGap).map(s => s.text))
    };
  });
};