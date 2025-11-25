import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { useDraggable } from 'react-use-draggable-scroll';
import { gameModes } from '../../data/gameModes';

const TrainPage = ({ onSelectMode, onBack }) => {
  const scrollRef = useRef();
  const { events } = useDraggable(scrollRef);

  return (
    <div className="w-full h-full bg-gradient-to-b from-[#FDFBF7] to-[#E5E5E5] flex flex-col justify-center overflow-hidden">
      
      {/* 修正按鈕樣式：黑底白字，圓角，加陰影 */}
      <div className="absolute top-10 left-10 z-20">
        <button 
          onClick={onBack} 
          className="px-6 py-2 bg-black text-white rounded-full font-bold shadow-lg hover:bg-gray-800 transition-colors"
        >
          ↑ 回首頁
        </button>
      </div>
      
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold mb-4 text-folk-dark">選擇你的旅程方式</h2>
        <p className="text-gray-500 text-lg">按住滑鼠左右拖曳火車，選擇一種體驗</p>
      </div>

      <div 
        className="w-full overflow-x-auto no-scrollbar cursor-grab active:cursor-grabbing relative py-20"
        {...events} 
        ref={scrollRef}
      >
        <div className="absolute top-[260px] left-0 w-[200%] h-4 border-t-4 border-b-4 border-gray-600 bg-gray-400/20 z-0"></div>
        <div className="absolute top-[260px] left-0 w-[200%] h-4 bg-[linear-gradient(90deg,transparent_40px,#555_40px,#555_50px)] bg-[length:50px_100%] z-0 opacity-50"></div>
        
        <div className="flex items-end px-20 min-w-max relative z-10 space-x-8">
          <div className="min-w-[220px] h-[220px] bg-black text-white rounded-r-3xl rounded-bl-2xl flex flex-col items-center justify-center shadow-2xl relative border-4 border-gray-800">
            <span className="text-5xl font-bold tracking-widest border-4 border-white p-4">民歌號</span>
            <div className="absolute -bottom-5 right-8 w-14 h-14 bg-gray-800 rounded-full border-4 border-gray-500 z-10"></div>
            <div className="absolute -bottom-5 right-28 w-14 h-14 bg-gray-800 rounded-full border-4 border-gray-500 z-10"></div>
            <div className="absolute -top-10 left-10 w-12 h-16 bg-black border-x-4 border-t-4 border-gray-800"></div>
            <div className="absolute -top-20 left-14 w-12 h-12 bg-gray-400 rounded-full opacity-50 blur-xl animate-pulse"></div>
          </div>

          {gameModes.map((mode) => (
            <motion.div
              key={mode.id}
              whileHover={{ scale: 1.05, y: -10 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSelectMode(mode)}
              className={`
                min-w-[240px] h-[180px] rounded-xl shadow-xl cursor-pointer relative border-4 border-white
                flex flex-col items-center justify-center text-white p-6 text-center
                ${mode.color} ${mode.locked ? 'opacity-50 cursor-not-allowed grayscale' : ''}
              `}
            >
              <div className="text-5xl mb-3">{mode.icon}</div>
              <h3 className="text-2xl font-bold tracking-wide">{mode.title}</h3>
              <p className="text-sm opacity-90 mt-1">{mode.description}</p>
              
              <div className="absolute top-1/2 -left-6 w-6 h-4 bg-gray-800 border-y-2 border-gray-600"></div>

              <div className="absolute -bottom-5 flex gap-12">
                <div className="w-12 h-12 bg-gray-800 rounded-full border-4 border-gray-400"></div>
                <div className="w-12 h-12 bg-gray-800 rounded-full border-4 border-gray-400"></div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TrainPage;