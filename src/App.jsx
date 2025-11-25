import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';

// 資料
import { folkSongs } from './data/folkSongs';

// 元件
import TrainPage from './components/Train/TrainPage';
import LyricsGame from './components/Games/LyricsGame/LyricsGame';
import ArGame from './components/Games/ArGame/ArGame'; 
import AiCoverGame from './components/Games/AiCoverGame/AiCoverGame'; 
import DormGame from './components/Games/DormGame/DormGame'; 
import AudioArGame from './components/Games/AudioArGame/AudioArGame'; 
import KaraokeGame from './components/Games/KaraokeGame/KaraokeGame'; // 1. 引入

function App() {
  const [activeMode, setActiveMode] = useState(null); 
  
  // 各遊戲的選歌狀態
  const [lyricsGameSong, setLyricsGameSong] = useState(null); 
  const [aiGameSong, setAiGameSong] = useState(null);
  const [audioArSong, setAudioArSong] = useState(null);
  const [karaokeSong, setKaraokeSong] = useState(null); // 2. 新增狀態

  const homeSectionRef = useRef(null);
  const trainSectionRef = useRef(null);
  const gameSectionRef = useRef(null);

  const scrollTo = (ref) => {
    ref.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleBackToHome = () => {
    scrollTo(homeSectionRef);
  };

  const handleModeSelect = (mode) => {
    if (mode.locked) return;
    setActiveMode(mode.id);
    
    // 重置所有狀態
    setLyricsGameSong(null);
    setAiGameSong(null);
    setAudioArSong(null);
    setKaraokeSong(null); // 重置接龍狀態

    setTimeout(() => scrollTo(gameSectionRef), 100);
  };

  // 通用選歌處理器 (為了讓程式碼乾淨一點)
  const handleSongSelect = (song, setSongState) => {
    setSongState(song);
  };

  return (
    <div className="w-full min-h-screen bg-folk-bg text-folk-dark font-serif overflow-x-hidden flex flex-col">
      
      {/* Section 1: 首頁 */}
      <section ref={homeSectionRef} className="h-screen w-full flex flex-col items-center justify-center relative bg-folk-bg shrink-0">
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

      {/* Section 2: 火車模式選擇 */}
      <section ref={trainSectionRef} className="h-screen w-full relative shrink-0">
        <TrainPage 
          onSelectMode={handleModeSelect} 
          onBack={handleBackToHome} 
        />
      </section>

      {/* Section 3: 互動/遊戲區 */}
      <section ref={gameSectionRef} className="h-screen w-full bg-gray-900 flex flex-col items-center justify-center relative shrink-0 overflow-hidden">
        
        {!activeMode && (
          <div className="text-gray-500 text-2xl tracking-widest">
            請先在上方火車選擇一種體驗...
          </div>
        )}

        {/* 模式 A: 手勢 AR */}
        {activeMode === 'ar' && (
           <div className="w-full h-full relative">
             <button onClick={() => scrollTo(trainSectionRef)} className="absolute top-6 left-6 z-50 px-6 py-2 bg-black text-white border border-white/30 rounded-full hover:bg-white hover:text-black transition font-bold shadow-lg">↑ 返回火車</button>
             <ArGame />
           </div>
        )}

        {/* 模式 B: 歌詞遊戲 */}
        {activeMode === 'lyrics' && (
          <div className="w-full h-full flex flex-col items-center justify-center">
            {!lyricsGameSong ? (
              <SongSelector title="請選擇一首歌曲進行填詞" onSelect={(s) => handleSongSelect(s, setLyricsGameSong)} onBack={() => scrollTo(trainSectionRef)} icon="📝" color="bg-red-500" />
            ) : (
              <div className="w-full h-full relative">
                 <button onClick={() => setLyricsGameSong(null)} className="absolute top-6 left-6 z-50 px-6 py-2 bg-black text-white border border-white/30 rounded-full hover:bg-white hover:text-black transition font-bold shadow-lg">← 重選歌曲</button>
                 <LyricsGame song={lyricsGameSong} onRestart={() => setLyricsGameSong(null)} />
              </div>
            )}
          </div>
        )}

        {/* 模式 C: AI 封面 */}
        {activeMode === 'ai' && (
           <div className="w-full h-full flex flex-col items-center justify-center">
             {!aiGameSong ? (
               <SongSelector title="請選擇要製作封面的歌曲" onSelect={(s) => handleSongSelect(s, setAiGameSong)} onBack={() => scrollTo(trainSectionRef)} icon="🎨" color="bg-purple-500" />
             ) : (
               <div className="w-full h-full relative">
                  <AiCoverGame song={aiGameSong} onBack={() => setAiGameSong(null)} />
               </div>
             )}
           </div>
        )}

        {/* 模式 D: 3D 時光宿舍 */}
        {activeMode === '3d' && (
           <div className="w-full h-full relative">
             <DormGame onBack={() => scrollTo(trainSectionRef)} />
           </div>
        )}

        {/* 模式 E: 聲音視覺化 AR */}
        {activeMode === 'audio-ar' && (
           <div className="w-full h-full flex flex-col items-center justify-center">
             {!audioArSong ? (
               <SongSelector title="請選擇要聆聽的歌曲" onSelect={(s) => handleSongSelect(s, setAudioArSong)} onBack={() => scrollTo(trainSectionRef)} icon="🎵" color="bg-pink-500" />
             ) : (
               <div className="w-full h-full relative">
                  <AudioArGame song={audioArSong} onBack={() => setAudioArSong(null)} />
               </div>
             )}
           </div>
        )}

        {/* 模式 F: 民歌接龍 (新增！) */}
        {activeMode === 'karaoke' && (
           <div className="w-full h-full flex flex-col items-center justify-center">
             {!karaokeSong ? (
               <SongSelector title="請選擇歌曲開始接龍" onSelect={(s) => handleSongSelect(s, setKaraokeSong)} onBack={() => scrollTo(trainSectionRef)} icon="🎙️" color="bg-blue-500" />
             ) : (
               <div className="w-full h-full relative">
                  <KaraokeGame song={karaokeSong} onBack={() => setKaraokeSong(null)} />
               </div>
             )}
           </div>
        )}

      </section>

    </div>
  );
}

// 為了讓程式碼更乾淨，我把重複的選歌介面提取出來了
const SongSelector = ({ title, onSelect, onBack, icon, color }) => (
  <div className="w-full max-w-6xl px-4 z-10 flex flex-col items-center">
    <button onClick={onBack} className="self-start text-white mb-6 hover:underline text-lg">↑ 返回火車</button>
    <h2 className="text-4xl text-white font-bold mb-12 tracking-wider">{title}</h2>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
      {folkSongs.map((song) => (
        <div key={song.id} onClick={() => onSelect(song)} className={`bg-white rounded-xl hover:bg-gray-100 cursor-pointer transition-transform hover:-translate-y-2 shadow-2xl flex overflow-hidden h-40 border-4 border-transparent hover:border-white`}>
          <div className={`w-6 h-full ${color}`}></div>
          <div className="p-6 flex flex-col justify-center flex-1"><h3 className="text-2xl font-bold text-gray-800">{song.title}</h3><p className="text-gray-500 text-lg mt-1">{song.singer}</p></div>
          <div className="w-24 bg-gray-100 flex items-center justify-center text-4xl">{icon}</div>
        </div>
      ))}
    </div>
  </div>
);

export default App;