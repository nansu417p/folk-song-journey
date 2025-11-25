import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';

// 資料
import { folkSongs } from './data/folkSongs';

// 元件
import TrainPage from './components/Train/TrainPage';
import LyricsGame from './components/Games/LyricsGame/LyricsGame';
import ArGame from './components/Games/ArGame/ArGame'; 

function App() {
  const [activeMode, setActiveMode] = useState(null); // 'lyrics', 'ar', 'ai'
  const [lyricsGameSong, setLyricsGameSong] = useState(null); 

  // 捲動 Ref
  const trainSectionRef = useRef(null);
  const gameSectionRef = useRef(null);

  const scrollTo = (ref) => {
    ref.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 選擇模式
  const handleModeSelect = (mode) => {
    if (mode.locked) return;
    setActiveMode(mode.id);
    
    if (mode.id === 'ar') {
      setLyricsGameSong(null);
      setTimeout(() => scrollTo(gameSectionRef), 100);
    } 
    else if (mode.id === 'lyrics') {
      setLyricsGameSong(null); 
      setTimeout(() => scrollTo(gameSectionRef), 100);
    }
    else if (mode.id === 'ai') {
      setTimeout(() => scrollTo(gameSectionRef), 100);
    }
  };

  // 歌詞遊戲：選擇歌曲
  const handleLyricsSongSelect = (song) => {
    setLyricsGameSong(song);
  };

  return (
    // 修改這裡：改用 w-screen 確保強制滿版，min-h-screen 確保高度
    <div className="w-screen min-h-screen bg-folk-bg text-folk-dark font-serif overflow-x-hidden flex flex-col m-0 p-0">
      
      {/* --- Section 1: 首頁 --- */}
      <section className="h-screen w-full flex flex-col items-center justify-center relative bg-folk-bg shrink-0">
        <motion.div 
          initial={{ opacity: 0, y: 30 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="text-center flex flex-col items-center"
        >
          <h1 className="text-7xl font-bold tracking-widest mb-8 text-folk-dark">民歌旅程</h1>
          <p className="text-2xl text-gray-600 tracking-wider mb-12">那年，我們唱自己的歌</p>
          <button 
            onClick={() => scrollTo(trainSectionRef)}
            className="px-8 py-3 bg-folk-dark text-white border-2 border-folk-dark rounded-full hover:bg-white hover:text-folk-dark transition-all text-lg font-bold tracking-widest shadow-lg"
          >
            開啟旅程 ↓
          </button>
        </motion.div>
      </section>

      {/* --- Section 2: 火車模式選擇 --- */}
      <section ref={trainSectionRef} className="h-screen w-full relative shrink-0">
        <TrainPage 
          onSelectMode={handleModeSelect} 
          onBack={() => window.scrollTo({top: 0, behavior: 'smooth'})} 
        />
      </section>

      {/* --- Section 3: 互動/遊戲區 --- */}
      <section ref={gameSectionRef} className="h-screen w-full bg-gray-900 flex flex-col items-center justify-center relative shrink-0 overflow-hidden">
        
        {!activeMode && (
          <div className="text-gray-500 text-2xl tracking-widest">
            請先在上方火車選擇一種體驗...
          </div>
        )}

        {/* AR 遊戲 */}
        {activeMode === 'ar' && (
           <div className="w-full h-full relative">
             <button 
               onClick={() => scrollTo(trainSectionRef)}
               className="absolute top-6 left-6 z-50 px-6 py-2 bg-black text-white border border-white/30 rounded-full hover:bg-white hover:text-black transition font-bold shadow-lg"
             >
               ↑ 返回火車
             </button>
             <ArGame />
           </div>
        )}

        {/* 歌詞遊戲 */}
        {activeMode === 'lyrics' && (
          <div className="w-full h-full flex flex-col items-center justify-center">
            {!lyricsGameSong ? (
              <div className="w-full max-w-6xl px-4 z-10 flex flex-col items-center">
                 <button onClick={() => scrollTo(trainSectionRef)} className="self-start text-white mb-6 hover:underline text-lg">↑ 返回火車</button>
                 <h2 className="text-4xl text-white font-bold mb-12 tracking-wider">請選擇一首歌曲進行填詞</h2>
                 
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
                    {folkSongs.map((song) => (
                      <div 
                        key={song.id}
                        onClick={() => handleLyricsSongSelect(song)}
                        className="bg-white rounded-xl hover:bg-yellow-50 cursor-pointer transition-transform hover:-translate-y-2 shadow-2xl flex overflow-hidden h-40 border-4 border-transparent hover:border-yellow-400"
                      >
                        <div className={`w-6 h-full ${['bg-red-500', 'bg-blue-500', 'bg-green-500'][Math.floor(Math.random()*3)]}`}></div>
                        <div className="p-6 flex flex-col justify-center flex-1">
                          <h3 className="text-2xl font-bold text-gray-800">{song.title}</h3>
                          <p className="text-gray-500 text-lg mt-1">{song.singer}</p>
                        </div>
                        <div className="w-24 bg-gray-100 flex items-center justify-center border-l border-dashed border-gray-300">
                           <div className="flex gap-2">
                             <div className="w-3 h-3 bg-gray-800 rounded-full animate-spin-slow"></div>
                             <div className="w-3 h-3 bg-gray-800 rounded-full animate-spin-slow"></div>
                           </div>
                        </div>
                      </div>
                    ))}
                 </div>
              </div>
            ) : (
              <div className="w-full h-full relative">
                 <button 
                   onClick={() => setLyricsGameSong(null)}
                   className="absolute top-6 left-6 z-50 px-6 py-2 bg-black text-white border border-white/30 rounded-full hover:bg-white hover:text-black transition font-bold shadow-lg"
                 >
                   ← 重選歌曲
                 </button>
                 <LyricsGame song={lyricsGameSong} onRestart={() => setLyricsGameSong(null)} />
              </div>
            )}
          </div>
        )}

        {activeMode === 'ai' && (
           <div className="text-white text-2xl">AI 封面功能開發中...</div>
        )}

      </section>

    </div>
  );
}

export default App;