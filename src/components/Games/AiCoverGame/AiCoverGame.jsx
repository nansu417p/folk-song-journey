import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';

// --- 1. 提示詞資料庫 ---
const PROMPT_OPTIONS = {
  seasons: [
    { label: "春日暖陽", value: "spring sunlight, blooming flowers, gentle breeze" },
    { label: "夏日午後", value: "summer afternoon, cicadas, vibrant green trees" },
    { label: "秋季落葉", value: "autumn maple leaves, golden hour, melancholic" },
    { label: "冬雨綿綿", value: "winter cold rain, misty grey sky, lonely street" }
  ],
  elements: [
    { label: "木吉他", value: "acoustic guitar leaning on a tree" },
    { label: "舊窗台", value: "view from an old wooden window" },
    { label: "校園", value: "university campus, red brick building" },
    { label: "大海", value: "calm ocean waves, horizon, sand" },
    { label: "山嵐", value: "foggy mountains, chinese ink painting style" }
  ],
  styles: [
    { label: "水彩畫", value: "watercolor painting style, soft strokes" },
    { label: "油畫", value: "oil painting texture, impasto" },
    { label: "老照片", value: "faded film photography, grain, vignette" },
    { label: "極簡線條", value: "minimalist line art, abstract shapes" }
  ]
};

// 基底風格咒語 (模擬民歌封面)
const BASE_STYLE = "album cover art, 1970s Taiwan vintage style, retro typography layout, high quality, artistic";

const AiCoverGame = ({ song, onBack }) => {
  const [selections, setSelections] = useState({
    season: PROMPT_OPTIONS.seasons[0],
    element: PROMPT_OPTIONS.elements[0],
    style: PROMPT_OPTIONS.styles[0]
  });
  
  const [generatedImage, setGeneratedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [useLocalDesign, setUseLocalDesign] = useState(false);
  const resultRef = useRef(null);

  // 處理選項點擊
  const handleSelect = (category, item) => {
    setSelections(prev => ({ ...prev, [category]: item }));
  };

  // --- 生成邏輯 ---
  const handleGenerate = () => {
    setIsLoading(true);
    setGeneratedImage(null);
    setUseLocalDesign(false);

    // 組合最終咒語
    const finalPrompt = `${BASE_STYLE}, ${selections.season.value}, ${selections.element.value}, ${selections.style.value}`;
    console.log("Generating with prompt:", finalPrompt);

    const seed = Math.floor(Math.random() * 100000);
    // 使用 Pollinations Flux 模型
    const aiUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(finalPrompt)}?width=800&height=800&seed=${seed}&model=flux&nologo=true`;

    const img = new Image();
    img.src = aiUrl;
    img.crossOrigin = "Anonymous";

    img.onload = () => {
      setGeneratedImage(aiUrl);
      setIsLoading(false);
    };

    img.onerror = () => {
      console.warn("AI 忙碌，切換保底");
      setUseLocalDesign(true);
      setIsLoading(false);
    };
  };

  // 下載
  const handleDownload = async () => {
    if (resultRef.current) {
      try {
        // 等待字型載入
        await document.fonts.ready;
        const canvas = await html2canvas(resultRef.current, {
           useCORS: true,
           scale: 2
        });
        const link = document.createElement('a');
        link.download = `${song.title}_custom_cover.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // 保底背景色
  const getGradient = () => {
    return "from-amber-700 to-yellow-600";
  };

  return (
    <div className="w-full h-full bg-gray-900 flex flex-col lg:flex-row items-center justify-center p-4 relative overflow-hidden">
      
      <button onClick={onBack} className="absolute top-4 left-4 z-50 px-6 py-2 bg-white text-black rounded-full font-bold">← 重選歌曲</button>

      {/* 左側：控制面板 */}
      <div className="w-full lg:w-1/3 bg-black/40 backdrop-blur-md p-6 rounded-xl border border-white/10 flex flex-col gap-6 z-10 max-h-[90vh] overflow-y-auto">
         <h2 className="text-3xl font-bold text-white mb-2">自定義封面設計</h2>
         <p className="text-gray-400 text-sm">為《{song.title}》選擇意境，AI 將為您繪製。</p>

         {/* 選項區塊 */}
         {[
           { id: 'seasons', title: '季節氛圍' },
           { id: 'elements', title: '核心元素' },
           { id: 'styles', title: '藝術風格' }
         ].map((group) => (
           <div key={group.id}>
             <h3 className="text-yellow-400 font-bold mb-3 text-sm tracking-wider uppercase">{group.title}</h3>
             <div className="flex flex-wrap gap-2">
               {PROMPT_OPTIONS[group.id].map(item => (
                 <button
                   key={item.label}
                   onClick={() => handleSelect(group.id.slice(0, -1), item)} // remove 's'
                   className={`px-3 py-2 text-sm rounded-lg border transition-all
                     ${selections[group.id.slice(0, -1)]?.label === item.label 
                       ? 'bg-white text-black border-white font-bold shadow-lg scale-105' 
                       : 'bg-transparent text-gray-300 border-gray-600 hover:border-white'}
                   `}
                 >
                   {item.label}
                 </button>
               ))}
             </div>
           </div>
         ))}

         <button 
           onClick={handleGenerate}
           disabled={isLoading}
           className="mt-4 w-full py-4 bg-gradient-to-r from-rose-600 to-orange-500 text-white text-xl font-bold rounded-xl shadow-xl hover:scale-[1.02] transition disabled:opacity-50"
         >
           {isLoading ? "🎨 AI 繪製中..." : "✨ 生成封面"}
         </button>
      </div>

      {/* 右側：預覽與成果 */}
      <div className="w-full lg:w-2/3 flex flex-col items-center justify-center p-8 h-full">
         
         {/* 這是要被截圖的區域 */}
         <div 
           ref={resultRef}
           className="relative aspect-square w-full max-w-[500px] shadow-2xl bg-[#FDFBF7] flex flex-col overflow-hidden rounded-sm group"
         >
            {/* 圖片層 */}
            <div className="flex-1 relative bg-gray-200 overflow-hidden">
                {isLoading ? (
                   <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
                      <div className="w-12 h-12 border-4 border-gray-400 border-t-transparent rounded-full animate-spin mb-4"></div>
                      <p>正在顯影記憶...</p>
                   </div>
                ) : generatedImage && !useLocalDesign ? (
                   <img src={generatedImage} className="w-full h-full object-cover" alt="AI" crossOrigin="anonymous" />
                ) : useLocalDesign ? (
                   <div className={`w-full h-full bg-gradient-to-br ${getGradient()}`}></div>
                ) : (
                   <div className="absolute inset-0 flex items-center justify-center text-gray-400 bg-gray-100">
                      請選擇風格並生成
                   </div>
                )}
                
                {/* 質感疊加 (紙紋 + 內陰影) */}
                <div className="absolute inset-0 pointer-events-none mix-blend-multiply opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]"></div>
                <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_50px_rgba(0,0,0,0.3)]"></div>
            </div>

            {/* 唱片排版層 (底部文字) */}
            <div className="h-24 bg-white flex items-center justify-between px-6 border-t-4 border-double border-gray-300">
               <div>
                  <h1 className="text-3xl font-black text-gray-900 tracking-widest font-serif">{song.title}</h1>
                  <p className="text-gray-500 text-sm tracking-wider mt-1">{song.singer}</p>
               </div>
               <div className="flex flex-col items-end opacity-60">
                  <div className="w-8 h-8 border-2 border-gray-800 rounded-full flex items-center justify-center text-xs font-bold">
                    民
                  </div>
                  <span className="text-[10px] mt-1">STEREO</span>
               </div>
            </div>
         </div>

         {/* 下載按鈕 */}
         {(generatedImage || useLocalDesign) && !isLoading && (
            <button 
              onClick={handleDownload}
              className="mt-8 px-8 py-3 bg-white text-black rounded-full font-bold shadow-lg hover:scale-105 transition"
            >
              ⬇ 下載這張封面
            </button>
         )}
      </div>

    </div>
  );
};

export default AiCoverGame;