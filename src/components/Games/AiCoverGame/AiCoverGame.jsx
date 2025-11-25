import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';

const AiCoverGame = ({ song, onBack }) => {
  const [inputText, setInputText] = useState("");
  const [generatedImage, setGeneratedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [useLocalDesign, setUseLocalDesign] = useState(false); // 保底模式狀態
  const coverRef = useRef(null); 

  // --- 核心功能 ---
  const handleGenerate = (keyword) => {
    setIsLoading(true);
    setGeneratedImage(null);
    setUseLocalDesign(false);

    // 1. 組合 Prompt (加入民歌風格描述)
    const prompt = `vintage vinyl record cover, 1970s Taiwan folk song style, ${keyword}, watercolor painting, nostalgic, artistic, high quality`;
    
    // 2. 產生隨機種子 (確保每次圖不一樣)
    const seed = Math.floor(Math.random() * 100000);
    
    // 3. 建構網址 (使用 Pollinations 的 Flux 模型，品質最好)
    // 技巧：直接將參數寫在網址裡，不透過 fetch，避開 CORS 問題
    const aiUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=600&height=600&seed=${seed}&model=flux&nologo=true`;

    // 4. 預載入圖片 (Image Preloading)
    const img = new Image();
    img.src = aiUrl;
    img.crossOrigin = "Anonymous"; // 允許跨域 (為了讓 canvas 可以下載)

    // A. 圖片載入成功
    img.onload = () => {
      setGeneratedImage(aiUrl);
      setIsLoading(false);
    };

    // B. 圖片載入失敗 (網路問題或伺服器掛掉) -> 切換到本地保底模式
    img.onerror = () => {
      console.warn("AI 伺服器忙碌，切換至本地設計模式");
      setUseLocalDesign(true); 
      setIsLoading(false);
    };
  };

  // 下載封面
  const handleDownload = async () => {
    if (coverRef.current) {
      try {
        await new Promise(resolve => setTimeout(resolve, 500)); // 等待渲染
        const canvas = await html2canvas(coverRef.current, { 
          useCORS: true, 
          scale: 2,
          backgroundColor: null 
        });
        const link = document.createElement('a');
        link.download = `${song.title}_民歌封面.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      } catch (err) {
        console.error("下載失敗:", err);
        alert("下載失敗，請稍後再試");
      }
    }
  };

  // 保底模式的漸層背景 (根據歌名產生固定顏色)
  const getGradient = (title) => {
    const gradients = [
      "from-[#D64F3E] to-[#E9C46A]", // 紅金
      "from-[#2A9D8F] to-[#264653]", // 綠藍
      "from-[#F4A261] to-[#E76F51]", // 橘紅
      "from-gray-700 to-gray-900",    // 黑灰
      "from-indigo-900 to-purple-800" // 紫藍
    ];
    let hash = 0;
    for (let i = 0; i < title.length; i++) hash += title.charCodeAt(i);
    return gradients[hash % gradients.length];
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 relative bg-gray-900 text-white">
      
      {/* 返回按鈕 */}
      <button 
        onClick={onBack}
        className="absolute top-4 left-4 z-50 px-4 py-2 bg-black text-white border border-white/30 rounded-full hover:bg-white hover:text-black transition font-bold"
      >
        ← 重選歌曲
      </button>

      <div className="flex flex-col lg:flex-row gap-8 items-center justify-center w-full max-w-6xl">
        
        {/* 左側：操作區 */}
        <div className="flex-1 flex flex-col gap-6 w-full max-w-md">
          <div className="text-left">
            <h2 className="text-3xl font-bold mb-2 text-yellow-400">AI 映像館</h2>
            <p className="text-gray-300">為《{song.title}》設計一張專屬的黑膠封面。<br/>系統將為您繪製歌詞意境。</p>
          </div>

          <div className="flex flex-wrap gap-3">
            {song.aiKeywords?.map((k, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setInputText(k.label);
                  handleGenerate(k.value);
                }}
                disabled={isLoading}
                className="px-4 py-2 bg-gray-800 border border-gray-600 rounded hover:bg-yellow-500 hover:text-black transition disabled:opacity-50"
              >
                {k.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input 
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="輸入英文關鍵字 (例如: guitar)..."
              className="flex-1 px-4 py-2 rounded bg-gray-800 border border-gray-600 focus:border-yellow-400 outline-none"
            />
            <button 
              onClick={() => handleGenerate(inputText)}
              disabled={isLoading || !inputText}
              className="px-6 py-2 bg-yellow-500 text-black font-bold rounded hover:bg-yellow-400 disabled:opacity-50"
            >
              {isLoading ? "繪製..." : "生成"}
            </button>
          </div>
        </div>

        {/* 右側：封面預覽區 */}
        <div className="flex-1 flex flex-col items-center">
          
          <div 
            ref={coverRef}
            className="w-[400px] h-[400px] bg-[#FDFBF7] relative shadow-2xl flex flex-col overflow-hidden group border-4 border-gray-800"
          >
            {/* 封面圖片層 */}
            <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
              {isLoading ? (
                <div className="text-gray-500 flex flex-col items-center animate-pulse">
                  <div className="w-12 h-12 border-4 border-gray-400 border-t-transparent rounded-full animate-spin mb-4"></div>
                  AI 畫師構圖中...
                </div>
              ) : generatedImage && !useLocalDesign ? (
                // 1. 顯示 AI 圖片
                <img 
                  src={generatedImage} 
                  alt="Cover" 
                  className="w-full h-full object-cover sepia-[0.3] contrast-110" 
                  crossOrigin="anonymous" 
                />
              ) : useLocalDesign ? (
                // 2. 顯示本地保底設計 (幾何圖形)
                <div className={`w-full h-full bg-gradient-to-br ${getGradient(song.title)} flex items-center justify-center relative`}>
                   <div className="absolute w-[300px] h-[300px] border border-white/20 rounded-full"></div>
                   <div className="absolute w-[250px] h-[250px] border border-white/20 rounded-full"></div>
                   <div className="text-center z-10 p-4 backdrop-blur-sm bg-black/10 w-full">
                      <h2 className="text-5xl font-bold text-white font-serif tracking-widest opacity-80">{song.title}</h2>
                   </div>
                </div>
              ) : (
                <div className="text-gray-400">請輸入關鍵字並按下生成</div>
              )}
            </div>

            {/* 文字層 */}
            <div className="absolute bottom-0 w-full p-6 bg-gradient-to-t from-black/90 to-transparent text-white pt-12">
               <h3 className="text-4xl font-bold tracking-widest font-serif mb-1 drop-shadow-lg">{song.title}</h3>
               <p className="text-xl tracking-wider font-light opacity-90">{song.singer}</p>
            </div>

            {/* 側標 */}
            <div className="absolute top-4 right-4 w-12 h-12 border-2 border-white/50 rounded-full flex items-center justify-center z-20">
               <span className="text-xs font-bold text-white/80">民歌<br/>經典</span>
            </div>
            
            {/* 紙質紋理 */}
            <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-multiply bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] z-30"></div>
          </div>

          {/* 下載按鈕 */}
          {(generatedImage || useLocalDesign) && !isLoading && (
            <div className="mt-6 flex flex-col items-center gap-2">
                <button 
                  onClick={handleDownload}
                  className="px-8 py-3 bg-white text-black rounded-full font-bold hover:scale-105 transition shadow-lg flex items-center gap-2"
                >
                  ⬇ 下載我的封面
                </button>
                {useLocalDesign && (
                   <span className="text-xs text-gray-500">AI 伺服器忙碌，已切換至經典設計風格</span>
                )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default AiCoverGame;