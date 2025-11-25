import React, { useState, useEffect } from 'react';
import { DndContext, useDraggable, useDroppable } from '@dnd-kit/core';
import { processLyricsForGame } from '../../../utils/lyricsParser'; // 引入剛剛寫的工具

// ... FloatingWord 和 DropZone 元件保持不變 (請複製上一次的代碼或保留原樣) ...
// 為了版面整潔，這裡只列出 LyricsGame 主體的修改

function FloatingWord({ id, word, position }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: id,
    data: { word }
  });
  
  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    top: position.top,
    left: position.left,
    position: 'absolute',
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...listeners} 
      {...attributes}
      className={`
        px-4 py-2 bg-white text-folk-dark border-2 border-folk-red font-bold rounded-lg shadow-lg cursor-grab z-50 touch-none select-none
        ${isDragging ? 'opacity-50 scale-125 rotate-3' : 'hover:scale-110 rotate-[-2deg]'}
      `}
    >
      {word}
    </div>
  );
}

function DropZone({ id, currentWord }) {
  const { isOver, setNodeRef } = useDroppable({
    id: id,
  });

  return (
    <span 
      ref={setNodeRef}
      className={`
        inline-flex items-center justify-center min-w-[80px] h-8 mx-1 border-b-2 
        transition-all duration-300 px-2 vertical-align-middle mb-2
        ${currentWord 
          ? 'bg-transparent text-folk-red font-bold border-folk-red' 
          : 'border-dashed border-gray-400 bg-gray-100'}
        ${isOver && !currentWord ? 'bg-yellow-100 scale-110' : ''}
      `}
    >
      {currentWord || "____"}
    </span>
  );
}


const LyricsGame = ({ song, onRestart }) => {
  const [gameData, setGameData] = useState([]); // 儲存解析後的遊戲資料
  const [level, setLevel] = useState(0); 
  const [currentAnswers, setCurrentAnswers] = useState({});
  const [floatingWords, setFloatingWords] = useState([]);
  const [showEndScreen, setShowEndScreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 初始化：解析歌詞
  useEffect(() => {
    if (song) {
      setIsLoading(true);
      const processed = processLyricsForGame(song.lyrics);
      setGameData(processed);
      setIsLoading(false);
      setLevel(0);
      setShowEndScreen(false);
    }
  }, [song]);

  // 當關卡變動時，設定當前的漂浮字
  useEffect(() => {
    if (gameData.length > 0 && level < gameData.length) {
      const currentLevelData = gameData[level];
      
      const words = currentLevelData.answers.map((ans, idx) => ({
        id: `word-${level}-${idx}-${ans}`, // 加上 ans 避免 key 重複
        word: ans,
        pos: getRandomPosition()
      }));
      
      setFloatingWords(words);
      setCurrentAnswers({});
    } else if (gameData.length > 0 && level >= gameData.length) {
      setShowEndScreen(true);
    }
  }, [level, gameData]);

  const getRandomPosition = () => {
    const edge = Math.random() > 0.5 ? 'width' : 'height';
    const isStart = Math.random() > 0.5;
    return {
      top: edge === 'height' ? (isStart ? `${5 + Math.random() * 15}%` : `${80 + Math.random() * 15}%`) : `${15 + Math.random() * 70}%`,
      left: edge === 'width' ? (isStart ? `${5 + Math.random() * 15}%` : `${80 + Math.random() * 15}%`) : `${5 + Math.random() * 90}%`,
    };
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;

    // over.id 是洞的 ID (例如 p0-l1-s2)
    // 我們需要找到這個洞原本的正確文字
    const currentLevelData = gameData[level];
    
    // 從資料中反查這個 gap id 對應的正確文字
    let correctAnswer = null;
    currentLevelData.lines.forEach(line => {
      line.forEach(segment => {
        if (segment.id === over.id) correctAnswer = segment.text;
      });
    });

    const draggedWord = active.data.current.word;

    // 判斷正確
    if (draggedWord === correctAnswer) {
      // 1. 更新填空
      const newAnswers = { ...currentAnswers, [over.id]: draggedWord };
      setCurrentAnswers(newAnswers);

      // 2. 移除字卡
      setFloatingWords(prev => prev.filter(w => w.id !== active.id));

      // 3. 檢查過關 (該段落所有 gap 都有值)
      const totalGaps = currentLevelData.answers.length;
      if (Object.keys(newAnswers).length === totalGaps) {
        setTimeout(() => setLevel(prev => prev + 1), 800);
      }
    }
  };

  // 渲染歌詞區域邏輯 (稍微複雜因為要處理換行)
  const renderLyricsContent = () => {
    if (level >= gameData.length) return null;
    const currentLevelLines = gameData[level].lines;

    return (
      <div className="flex flex-col gap-2 items-center text-center">
        {currentLevelLines.map((line, lIdx) => (
          <div key={lIdx} className="text-lg md:text-xl font-serif text-gray-800 leading-loose">
            {line.map((seg, sIdx) => {
              if (seg.isGap) {
                return (
                  <DropZone 
                    key={seg.id} 
                    id={seg.id}
                    currentWord={currentAnswers[seg.id]}
                  />
                );
              }
              return <span key={sIdx}>{seg.text} </span>;
            })}
          </div>
        ))}
      </div>
    );
  };

  if (isLoading) return <div className="text-white">載入歌詞中...</div>;

  if (showEndScreen) {
    return (
      <div className="text-white text-center flex flex-col items-center justify-center h-full">
        <h2 className="text-5xl font-bold mb-4">🎵 演奏完畢</h2>
        <p className="text-xl mb-8">《{song.title}》的記憶已修復</p>
        <button 
          onClick={onRestart}
          className="px-8 py-3 bg-white text-folk-dark rounded-full hover:bg-yellow-300 transition font-bold"
        >
          選擇下一首歌
        </button>
      </div>
    );
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
        {/* 背景紋理 */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" 
             style={{backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '30px 30px'}}>
        </div>

        {/* 卡帶本體 */}
        <div className="relative w-[80%] max-w-[700px] h-[500px] bg-[#E0D8C3] rounded-3xl shadow-2xl flex flex-col items-center p-6 border-b-8 border-r-8 border-[#B0A893]">
           {/* 卡帶上半部標籤 */}
           <div className="w-full bg-[#D64F3E] rounded-t-xl p-4 flex justify-between items-center shadow-md">
             <span className="text-white/80 font-bold">SIDE A</span>
             <h2 className="text-white text-2xl font-bold tracking-widest">{song.title}</h2>
             <span className="text-white/80 text-sm">DOLBY SYSTEM</span>
           </div>

           {/* 歌詞顯示視窗 (原本是透明窗，現在變大用來放歌詞) */}
           <div className="flex-1 w-full bg-white/90 m-4 rounded-lg shadow-inner p-6 overflow-y-auto relative flex items-center justify-center">
              {/* 背景轉軸裝飾 */}
              <div className="absolute w-full flex justify-between px-16 opacity-10 pointer-events-none">
                 <div className="w-32 h-32 rounded-full border-8 border-black flex items-center justify-center"><div className="w-24 h-24 bg-black rounded-full"></div></div>
                 <div className="w-32 h-32 rounded-full border-8 border-black flex items-center justify-center"><div className="w-24 h-24 bg-black rounded-full"></div></div>
              </div>
              
              {/* 歌詞內容 */}
              <div className="z-10 w-full">
                <p className="text-center text-gray-400 text-sm mb-4">--- 第 {level + 1} 段 ---</p>
                {renderLyricsContent()}
              </div>
           </div>
        </div>

        {/* 漂浮字卡 */}
        {floatingWords.map((item) => (
          <FloatingWord 
            key={item.id} 
            id={item.id} 
            word={item.word} 
            position={item.pos}
          />
        ))}

      </div>
    </DndContext>
  );
};

export default LyricsGame;