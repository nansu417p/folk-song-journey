import React from 'react';

const GameContainer = ({ activeGame }) => {
  if (!activeGame) return null;

  return (
    <div className="w-full max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow-2xl min-h-[500px] border-8 border-folk-gold">
      <div className="text-center mb-6 border-b-2 border-dashed border-gray-300 pb-4">
        <h2 className="text-3xl font-bold text-folk-dark">{activeGame.title}</h2>
        <p className="text-gray-500">正在體驗：{activeGame.gameType === 'lyrics' ? '歌詞拼貼' : activeGame.gameType === 'ar' ? 'AR 互動' : 'AI 封面'}</p>
      </div>
      
      <div className="game-content-area">
        {activeGame.gameType === 'lyrics' && <div className="text-center p-10 bg-gray-100 rounded">這裡將載入「拜訪春天」歌詞拖曳遊戲...</div>}
        {activeGame.gameType === 'ar' && <div className="text-center p-10 bg-gray-100 rounded">這裡將開啟攝影機進行 AR 互動...</div>}
        {activeGame.gameType === 'ai' && <div className="text-center p-10 bg-gray-100 rounded">這裡將顯示 AI 生成介面...</div>}
      </div>
    </div>
  );
};

export default GameContainer;