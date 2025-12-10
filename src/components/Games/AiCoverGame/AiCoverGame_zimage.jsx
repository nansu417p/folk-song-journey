import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';

// !!! 請填入你的 Stable Diffusion Forge Neo 的網址 !!!
const API_URL = "https://cory-uninduced-ozell.ngrok-free.dev"; 

const PROMPT_OPTIONS = {
  seasons: [
    { label: "春日暖陽", value: "spring season, warm sunlight, blooming flowers, gentle breeze" },
    { label: "夏日午後", value: "summer afternoon, intense sunlight, cicadas, vibrant green trees" },
    { label: "秋季落葉", value: "autumn season, maple leaves, golden hour, melancholic atmosphere" },
    { label: "冬雨綿綿", value: "winter cold rain, misty grey sky, lonely street reflection" }
  ],
  elements: [
    { label: "木吉他", value: "a wooden acoustic guitar leaning on a tree" },
    { label: "舊窗台", value: "view from an old wooden window frame" },
    { label: "紅磚校園", value: "university campus, old red brick building background" },
    { label: "遼闊大海", value: "calm ocean waves, horizon, sandy beach" },
    { label: "水墨山嵐", value: "foggy mountains, chinese ink painting style background" }
  ],
  styles: [
    { label: "水彩畫", value: "watercolor painting style, soft brush strokes, artistic" },
    { label: "油畫", value: "impasto oil painting texture, rich colors" },
    { label: "復古底片", value: "1970s vintage film photography, film grain, nostalgic vignette" },
    { label: "極簡線條", value: "minimalist line art, vector illustration, clean lines" }
  ]
};

// Z-Image 的觸發詞與高品質詞
const BASE_PROMPT = "no humans, still life, high quality, masterpiece, best quality, (photorealistic:1.2)";

const AiCoverGame_zimage = ({ song, onBack }) => {
  const [selections, setSelections] = useState({
    season: PROMPT_OPTIONS.seasons[0],
    element: PROMPT_OPTIONS.elements[0],
    style: PROMPT_OPTIONS.styles[0]
  });
  
  const [generatedImage, setGeneratedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const resultRef = useRef(null);

  const handleSelect = (category, item) => {
    setSelections(prev => ({ ...prev, [category]: item }));
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    setGeneratedImage(null);

    // 1. 構建 Prompt
    // Z-Image 特別擅長處理文字，格式通常是：主體描述, text "文字內容", 風格描述
    // 我們將歌名放入 Prompt 中，讓 AI 嘗試寫出繁體中文
    const prompt = `
      ${BASE_PROMPT}, 
      a vintage cassette tape object, close up view,
      painted with (${selections.season.value}) and (${selections.element.value}),
      text "${song.title}" written on the cassette label in Traditional Chinese calligraphy font,
      ${selections.style.value}, 
      highly detailed, 8k resolution
    `.replace(/\s+/g, ' ').trim();

    const negativePrompt = "worst quality, low quality, normal quality, lowres, watermark, blurry, deformed, ugly, bad anatomy, text error, typo";

    // 2. 設定 API Payload (對應你的 Forge 設定)
    const payload = {
      prompt: prompt,
      negative_prompt: negativePrompt,
      steps: 8,                    // 你要求的 Sampling steps
      sampler_name: "Euler",       // 你要求的 Sampling method
      scheduler: "beta",           // 你要求的 Schedule type (Forge 支援)
      cfg_scale: 3.5,              // Z-Image / Flux 通常 CFG 低一點比較自然
      width: 1024,                 // Z-Image 建議 1024x1024
      height: 1024,
      batch_size: 1,
      
      // ★ 強制指定模型與 VAE (如果伺服器有這些檔案)
      override_settings: {
        sd_model_checkpoint: "z_image_turbo_bf16.safetensors",
        sd_vae: "ae.safetensors",
      },
      override_settings_restore_afterwards: false
    };

    try {
      console.log("正在發送請求至 Forge Neo...", payload);

      const response = await fetch(`${API_URL}/sdapi/v1/txt2img`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': '69420' // 避開 Ngrok 警告
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("API Error:", errText);
        throw new Error(`生成失敗: ${response.status}`);
      }

      const data = await response.json();

      if (data.images && data.images.length > 0) {
        // Forge API 直接回傳 Base64 字串，不需要再去抓檔案路徑，超方便！
        const base64Image = `data:image/png;base64,${data.images[0]}`;
        setGeneratedImage(base64Image);
        console.log("圖片生成成功！");
      } else {
        throw new Error("API 沒有回傳圖片資料");
      }

    } catch (error) {
      console.error("流程錯誤:", error);
      alert(`發生錯誤: ${error.message}\n請確認 Forge 已啟動且 API 網址正確。`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (resultRef.current) {
      try {
        await document.fonts.ready;
        const canvas = await html2canvas(resultRef.current, { useCORS: true, scale: 2 });
        const link = document.createElement('a');
        link.download = `${song.title}_custom_tape.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="w-full h-full bg-gray-900 flex flex-col lg:flex-row items-center justify-center p-4">
      <button onClick={onBack} className="absolute top-4 left-4 z-50 px-6 py-2 bg-white text-black rounded-full font-bold">← 重選歌曲</button>
      
      {/* 左側面板 */}
      <div className="w-full lg:w-1/3 bg-black/40 backdrop-blur-md p-6 rounded-xl border border-white/10 flex flex-col gap-6 z-10">
         <h2 className="text-3xl font-bold text-white mb-2">卡帶封面設計師</h2>
         <p className="text-gray-400 text-sm">核心：Z-Image Turbo (Forge Neo)</p>

         {[
           { id: 'seasons', title: '季節氛圍' },
           { id: 'elements', title: '核心元素' },
           { id: 'styles', title: '藝術風格' }
         ].map((group) => (
           <div key={group.id}>
             <h3 className="text-yellow-400 font-bold mb-3 text-sm uppercase">{group.title}</h3>
             <div className="flex flex-wrap gap-2">
               {PROMPT_OPTIONS[group.id].map(item => (
                 <button key={item.label} onClick={() => handleSelect(group.id.slice(0, -1), item)}
                   className={`px-3 py-2 text-sm rounded-lg border ${selections[group.id.slice(0, -1)]?.label === item.label ? 'bg-white text-black font-bold' : 'bg-transparent text-gray-300'}`}>
                   {item.label}
                 </button>
               ))}
             </div>
           </div>
         ))}
         <button onClick={handleGenerate} disabled={isLoading} className="mt-4 w-full py-4 bg-gradient-to-r from-teal-600 to-emerald-500 text-white font-bold rounded-xl shadow-xl hover:scale-[1.02] disabled:opacity-50">
           {isLoading ? "🎨 AI 繪製中..." : "✨ 生成卡帶"}
         </button>
      </div>

      {/* 右側預覽區 */}
      <div className="w-full lg:w-2/3 flex flex-col items-center justify-center p-8">
         <div ref={resultRef} className="relative aspect-square w-full max-w-[500px] shadow-2xl bg-[#FDFBF7] flex flex-col rounded-sm">
            <div className="flex-1 relative bg-gray-200 overflow-hidden flex items-center justify-center">
                {isLoading ? (
                   <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 gap-4">
                      <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                      <p>正在透過 Z-Image 繪製...</p>
                   </div>
                ) : generatedImage ? (
                   <img src={generatedImage} className="w-full h-full object-cover" crossOrigin="anonymous" alt="AI Generated Tape" />
                ) : (
                   <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                     <p>請選擇風格並生成您的專屬卡帶</p>
                   </div>
                )}
            </div>
            {/* 卡帶底部資訊欄 (模擬實體質感) */}
            <div className="h-20 bg-zinc-800 flex items-center justify-between px-6 border-t-4 border-zinc-600">
               <div><h1 className="text-2xl font-bold text-white font-serif tracking-widest">{song.title}</h1><p className="text-gray-400 text-xs mt-1">SIDE A</p></div>
               <div className="flex flex-col items-end opacity-80"><div className="w-8 h-8 border-2 border-white rounded-full flex items-center justify-center text-xs font-bold text-white">民</div></div>
            </div>
         </div>
         {generatedImage && !isLoading && <button onClick={handleDownload} className="mt-8 px-8 py-3 bg-white text-black rounded-full font-bold shadow-lg">⬇ 下載設計圖</button>}
      </div>
    </div>
  );
};

export default AiCoverGame_zimage;