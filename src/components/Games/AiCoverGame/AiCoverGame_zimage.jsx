import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import workflowTemplate from './image_z_image_turbo.json'; 

// !!! 填入你的 Ngrok (ComfyUI Port 8188) 網址 !!!
const COMFY_API_URL = "https://cory-uninduced-ozell.ngrok-free.dev";

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

const BASE_STYLE = "album cover art, 1970s Taiwan vintage style, retro typography layout, high quality, artistic";

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

  // --- 🛠️ 核心修復邏輯：根據你提供的 JSON 結構強制重接線路 ---
  const fixWorkflowTopology = (workflow, seed, promptText) => {
    console.log("🔧 開始執行 Workflow 線路修復...");

    // 1. 定義節點 ID (基於你上傳的 JSON)
    const NODES = {
        saveImage: "9",
        clipLoader: "39",
        vaeLoader: "40",
        emptyLatent: "41",
        zeroOut: "42",
        vaeDecode: "43",
        kSampler: "44",
        textEncode: "45",
        unetLoader: "46",
        modelSampling: "47"
    };

    // 2. 注入變數 (Seed, Prompt)
    if (workflow[NODES.kSampler]) workflow[NODES.kSampler].inputs.seed = seed;
    if (workflow[NODES.textEncode]) workflow[NODES.textEncode].inputs.text = promptText;
    if (workflow[NODES.emptyLatent]) {
        workflow[NODES.emptyLatent].inputs.width = 512;
        workflow[NODES.emptyLatent].inputs.height = 512;
    }

    // 3. --- 重新接線 (Hard Rewiring) ---

    // [A] 模型鏈路: UNET (46) -> ModelSampling (47) -> KSampler (44)
    // 你的 JSON 原本指向不存在的 '37'，這裡修正為 '46'
    if (workflow[NODES.modelSampling]) {
        workflow[NODES.modelSampling].inputs.model = [NODES.unetLoader, 0];
    }
    
    // [B] CLIP 鏈路: CLIPLoader (39) -> TextEncode (45)
    // 你的 JSON 原本指向 '44' (KSampler)，這是錯的，修正為 '39'
    if (workflow[NODES.textEncode]) {
        workflow[NODES.textEncode].inputs.clip = [NODES.clipLoader, 0];
    }

    // [C] 負面提示 (ZeroOut): TextEncode (45) -> ZeroOut (42)
    // 你的 JSON 原本指向不存在的 '36'，這裡借用 '45' 的輸出做處理
    if (workflow[NODES.zeroOut]) {
        workflow[NODES.zeroOut].inputs.conditioning = [NODES.textEncode, 0];
    }

    // [D] KSampler (44) 總成
    if (workflow[NODES.kSampler]) {
        workflow[NODES.kSampler].inputs.model = [NODES.modelSampling, 0]; // 接 AuraFlow
        workflow[NODES.kSampler].inputs.positive = [NODES.textEncode, 0]; // 接 Prompt
        workflow[NODES.kSampler].inputs.negative = [NODES.zeroOut, 0];    // 接 Negative
        workflow[NODES.kSampler].inputs.latent_image = [NODES.emptyLatent, 0]; // 接空圖
    }

    // [E] VAE Decode (43): KSampler (44) + VAELoader (40) -> Decode
    // 你的 JSON 原本 VAE 接到 CLIPLoader (39)，這是類型錯誤，修正為 '40'
    // 原本 Samples 接到不存在的 '38'，修正為 '44'
    if (workflow[NODES.vaeDecode]) {
        workflow[NODES.vaeDecode].inputs.samples = [NODES.kSampler, 0];
        workflow[NODES.vaeDecode].inputs.vae = [NODES.vaeLoader, 0];
    }

    // [F] SaveImage (9)
    if (workflow[NODES.saveImage]) {
        workflow[NODES.saveImage].inputs.images = [NODES.vaeDecode, 0];
    }

    console.log("✅ Workflow 線路重接完成！");
    return workflow;
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    setGeneratedImage(null);

    const promptText = `${BASE_STYLE}, ${selections.season.value}, ${selections.element.value}, ${selections.style.value}`;
    const seed = Math.floor(Math.random() * 1000000000);

    try {
        console.log("1. 正在發送給 ComfyUI...");

        // --- 步驟 A: 準備 Workflow ---
        let workflow = JSON.parse(JSON.stringify(workflowTemplate));
        
        // 呼叫我們先前寫好的「智慧修復」函式 (確保這段程式碼還在你的檔案裡)
        // 如果你沒有把 fixWorkflowTopology 獨立出來，請確保這裡有執行修復邏輯
        workflow = fixWorkflowTopology(workflow, seed, promptText);

        // --- 步驟 B: 發送請求 ---
        const queueRes = await fetch(`${COMFY_API_URL}/prompt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: workflow })
        });

        if (!queueRes.ok) throw new Error("連線失敗，請檢查 Ngrok");
        const queueData = await queueRes.json();
        const promptId = queueData.prompt_id;
        console.log(`2. 任務已建立 ID: ${promptId}，開始輪詢結果...`);

        // --- 步驟 C: 輪詢並精準抓取圖片資訊 ---
        let imageData = null; // 儲存 { filename, subfolder, type }
        let retry = 0;
        
        while (!imageData && retry < 60) {
            await new Promise(r => setTimeout(r, 1000));
            retry++;
            
            try {
                const historyRes = await fetch(`${COMFY_API_URL}/history/${promptId}`);
                const historyData = await historyRes.json();
                
                // 檢查是否有這個 ID 的資料
                if (historyData[promptId] && historyData[promptId].outputs) {
                    const outputs = historyData[promptId].outputs;
                    
                    // 遍歷所有節點，尋找包含 'images' 的輸出
                    for (const nodeId in outputs) {
                        const nodeOutput = outputs[nodeId];
                        if (nodeOutput.images && nodeOutput.images.length > 0) {
                            // ★★★ 關鍵：完整抓取所有路徑資訊 ★★★
                            imageData = nodeOutput.images[0]; 
                            console.log("3. 找到圖片資訊:", imageData);
                            break; 
                        }
                    }
                }
            } catch (e) {
                console.warn("等待生成中...", e);
            }
        }

        if (!imageData) throw new Error("生成超時，ComfyUI 沒有回傳圖片路徑");

        // --- 步驟 D: 組合網址並下載 ---
        // 處理參數：如果 subfolder 是空的，就不要傳 undefined
        const { filename, subfolder, type } = imageData;
        const queryParams = new URLSearchParams({
            filename: filename,
            type: type || 'output',
            subfolder: subfolder || ''
        });

        const imageUrl = `${COMFY_API_URL}/view?${queryParams.toString()}`;
        console.log("4. 圖片原始網址:", imageUrl);

        // 下載為 Blob (為了避開跨域顯示問題，並支援後續 html2canvas 下載)
        const imageRes = await fetch(imageUrl);
        const imageBlob = await imageRes.blob();
        const localImageUrl = URL.createObjectURL(imageBlob);

        setGeneratedImage(localImageUrl);
        console.log("5. 圖片已成功載入至網頁！");

    } catch (error) {
        console.error("流程錯誤:", error);
        alert(`發生錯誤: ${error.message}`);
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
        link.download = `${song.title}_custom_cover.png`;
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
         <h2 className="text-3xl font-bold text-white mb-2">AI 封面工廠</h2>
         <p className="text-gray-400 text-sm">連線狀態：智慧線路修復 (Auto-Rewired)</p>

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
         <button onClick={handleGenerate} disabled={isLoading} className="mt-4 w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold rounded-xl shadow-xl hover:scale-[1.02] disabled:opacity-50">
           {isLoading ? "🚀 正在繪製中..." : "✨ 生成封面"}
         </button>
      </div>

      {/* 右側預覽區 */}
      <div className="w-full lg:w-2/3 flex flex-col items-center justify-center p-8">
         <div ref={resultRef} className="relative aspect-square w-full max-w-[500px] shadow-2xl bg-[#FDFBF7] flex flex-col rounded-sm">
            <div className="flex-1 relative bg-gray-200 overflow-hidden">
                {isLoading ? (
                   <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500"><p>GPU 正在運算...</p></div>
                ) : generatedImage ? (
                   <img src={generatedImage} className="w-full h-full object-cover" crossOrigin="anonymous" />
                ) : (
                   <div className="absolute inset-0 flex items-center justify-center text-gray-400">請選擇風格並生成</div>
                )}
            </div>
            <div className="h-24 bg-white flex items-center justify-between px-6 border-t-4 border-double border-gray-300">
               <div><h1 className="text-3xl font-black text-gray-900 font-serif">{song.title}</h1><p className="text-gray-500 text-sm mt-1">{song.singer}</p></div>
               <div className="flex flex-col items-end opacity-60"><div className="w-8 h-8 border-2 border-gray-800 rounded-full flex items-center justify-center text-xs font-bold">民</div><span className="text-[10px]">STEREO</span></div>
            </div>
         </div>
         {generatedImage && !isLoading && <button onClick={handleDownload} className="mt-8 px-8 py-3 bg-white text-black rounded-full font-bold shadow-lg">⬇ 下載封面</button>}
      </div>
    </div>
  );
};

export default AiCoverGame_zimage;