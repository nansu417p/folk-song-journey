import React, { useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { FilesetResolver, ImageSegmenter } from '@mediapipe/tasks-vision';
import html2canvas from 'html2canvas'; // 記得確認有安裝 npm install html2canvas

// --- 風格定義 (加入背景圖與配色) ---
const STYLES = [
  {
    id: 'classic',
    name: '拜訪春天',
    // 背景圖：夕陽校園
    bgImageUrl: 'https://images.unsplash.com/photo-1618588507085-c79565432917?q=80&w=1000&auto=format&fit=crop',
    // 文字配色
    songTitle: '拜訪\n春天', 
    artist: '施孝榮',
    themeColor: '#9B8EA9', // 紫藕色
    titleColor: '#5FFFFF', // 亮青色
    // 濾鏡：泛黃高對比
    filter: 'sepia(0.4) contrast(1.2) brightness(1.1) saturate(1.3)'
  },
  {
    id: 'wood',
    name: '木棉道',
    // 背景圖：林蔭大道
    bgImageUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1000&auto=format&fit=crop',
    songTitle: '木棉\n道',
    artist: '王夢麟',
    themeColor: '#D64F3E', // 磚紅
    titleColor: '#FFEDA0', // 鵝黃
    filter: 'sepia(0.6) contrast(1.1) brightness(1.0)'
  },
  {
    id: 'morning',
    name: '風中早晨',
    // 背景圖：清晨窗景
    bgImageUrl: 'https://images.unsplash.com/photo-1588072432836-e10032774350?q=80&w=1000&auto=format&fit=crop',
    songTitle: '風中\n早晨',
    artist: '王新蓮',
    themeColor: '#E9C46A', // 黃色
    titleColor: '#FFFFFF', // 白
    filter: 'saturate(1.5) sepia(0.2)'
  }
];

const PhotoBoothGame = ({ onBack }) => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const resultRef = useRef(null); // 用於截圖整個排版
  
  // 暫存畫布：用來讀取背景圖片像素
  const tempBgCanvasRef = useRef(document.createElement('canvas'));

  const [segmenter, setSegmenter] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentStyle, setCurrentStyle] = useState(STYLES[0]);
  const [countdown, setCountdown] = useState(null);
  const [camReady, setCamReady] = useState(false);
  
  // 背景圖片物件
  const [bgImageObj, setBgImageObj] = useState(null);

  // 1. 初始化模型
  useEffect(() => {
    const init = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.2/wasm"
        );
        const newSegmenter = await ImageSegmenter.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          outputCategoryMask: true,
          outputConfidenceMasks: false
        });
        setSegmenter(newSegmenter);
        setIsLoaded(true);
      } catch (error) {
        console.error("模型失敗:", error);
        setIsLoaded(true);
      }
    };
    init();
  }, []);

  // 2. 載入背景圖片
  useEffect(() => {
    setBgImageObj(null);
    const img = new Image();
    img.crossOrigin = "anonymous"; // 允許跨域
    img.src = currentStyle.bgImageUrl;
    img.onload = () => setBgImageObj(img);
  }, [currentStyle]);

  // 3. 渲染迴圈 (核心邏輯：像素替換)
  useEffect(() => {
    let animationFrameId;
    
    const renderLoop = () => {
      if (
        webcamRef.current && 
        webcamRef.current.video &&
        webcamRef.current.video.readyState === 4 &&
        canvasRef.current
      ) {
        const video = webcamRef.current.video;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        // 同步尺寸
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            tempBgCanvasRef.current.width = video.videoWidth;
            tempBgCanvasRef.current.height = video.videoHeight;
        }

        const width = canvas.width;
        const height = canvas.height;
        const startTimeMs = performance.now();

        // 步驟 A: 先畫鏡像視訊 (確保人一定在)
        ctx.save();
        ctx.scale(-1, 1);
        ctx.translate(-width, 0);
        ctx.drawImage(video, 0, 0, width, height);
        ctx.restore();

        // 步驟 B: 執行去背並替換背景
        // 只有當 AI 模型好且背景圖好時才執行，否則就只顯示視訊
        if (segmenter && bgImageObj) {
            segmenter.segmentForVideo(video, startTimeMs, (result) => {
                const mask = result.categoryMask;
                
                if (mask) {
                    // 1. 準備背景圖數據
                    const bgCtx = tempBgCanvasRef.current.getContext('2d', { willReadFrequently: true });
                    // 將背景圖畫滿並拉伸
                    bgCtx.drawImage(bgImageObj, 0, 0, width, height);
                    const bgData = bgCtx.getImageData(0, 0, width, height).data;

                    // 2. 準備目前畫面數據 (人像)
                    const imageData = ctx.getImageData(0, 0, width, height);
                    const pixels = imageData.data;
                    const maskPixels = mask.getAsUint8Array();

                    // 3. 像素替換迴圈
                    for (let y = 0; y < height; y++) {
                        for (let x = 0; x < width; x++) {
                            // 因為畫面是鏡像的，遮罩要讀取鏡像位置
                            const maskIndex = y * width + (width - 1 - x);
                            const pixelIndex = (y * width + x) * 4;

                            // 如果 mask !== 0 (代表不是背景，即人)，我們保留 (不做事)
                            // 如果 mask === 0 (代表是背景)，我們填入背景圖的顏色
                            
                            // 注意：selfie_segmenter 0=背景, 1=人
                            // 之前測試 maskPixels[maskIndex] !== 0 成功替換背景，代表
                            // AI 認為 maskIndex 的值在背景處是非0 (可能是反的，或模型特性)
                            // 我們沿用你測試成功的邏輯：
                            if (maskPixels[maskIndex] !== 0) { 
                                pixels[pixelIndex] = bgData[pixelIndex];     // R
                                pixels[pixelIndex + 1] = bgData[pixelIndex + 1]; // G
                                pixels[pixelIndex + 2] = bgData[pixelIndex + 2]; // B
                                pixels[pixelIndex + 3] = 255; // Alpha
                            }
                        }
                    }
                    // 4. 更新畫面
                    ctx.putImageData(imageData, 0, 0);
                }
            });
        }
      }
      animationFrameId = requestAnimationFrame(renderLoop);
    };

    renderLoop();
    return () => cancelAnimationFrame(animationFrameId);
  }, [segmenter, currentStyle, bgImageObj]);

  const handleTakePhoto = () => {
    setCountdown(3);
    let count = 3;
    const timer = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(timer);
        setCountdown(null);
        downloadPhoto();
      } else {
        setCountdown(count);
      }
    }, 1000);
  };

  const downloadPhoto = async () => {
    if (resultRef.current) {
      try {
        await document.fonts.ready;
        const canvas = await html2canvas(resultRef.current, {
            scale: 2,
            useCORS: true,
            backgroundColor: null
        });
        const link = document.createElement('a');
        link.download = `folk-album-${currentStyle.id}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      } catch (err) {
        console.error("截圖失敗", err);
      }
    }
  };

  return (
    <div className="w-full h-full bg-gray-900 relative flex flex-col items-center justify-center overflow-hidden p-4">
      
      {/* 隱藏 Webcam */}
      <Webcam
        ref={webcamRef}
        audio={false}
        width={640}
        height={480}
        className="absolute top-0 left-0 opacity-0 pointer-events-none" 
        mirrored={false} 
        onUserMedia={() => setCamReady(true)}
      />

      {(!isLoaded || !bgImageObj) && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 text-white">
          <p className="animate-pulse text-xl">📷 佈景準備中...</p>
        </div>
      )}

      {/* ================= 核心排版區 (模仿拜訪春天專輯) ================= */}
      {/* 使用 Flexbox 模仿三欄式佈局 */}
      <div 
        ref={resultRef}
        className="relative w-full max-w-5xl aspect-[2/1] shadow-2xl bg-white flex overflow-hidden rounded-lg border-4 border-white"
      >
        
        {/* 1. 左側：連拍裝飾 (15%) */}
        <div className="w-[15%] h-full bg-[#D8CDB5] flex flex-col border-r-4 border-white relative overflow-hidden">
            {/* 這裡我們簡單放幾個色塊或縮小的 Canvas 副本來模擬膠捲感 */}
            {/* 為了效能，我們這裡用 CSS 濾鏡處理背景圖示意，或者留白 */}
            <div className="flex-1 bg-gray-800 border-b-4 border-white relative">
               <div className="absolute inset-0 opacity-50 mix-blend-overlay bg-red-500"></div>
            </div>
            <div className="flex-1 bg-gray-700 border-b-4 border-white relative">
               <div className="absolute inset-0 opacity-50 mix-blend-overlay bg-blue-500"></div>
            </div>
            <div className="flex-1 bg-gray-600 relative">
               <div className="absolute inset-0 opacity-50 mix-blend-overlay bg-green-500"></div>
            </div>
        </div>

        {/* 2. 中間：大字標題 (35%) */}
        <div 
            className="w-[35%] h-full flex flex-col justify-center items-center text-center p-4 relative"
            style={{ backgroundColor: currentStyle.themeColor }}
        >
            <h1 
                className="text-7xl font-black tracking-widest leading-tight drop-shadow-md font-serif whitespace-pre-line"
                style={{ 
                    color: currentStyle.titleColor,
                    writingMode: 'vertical-rl', 
                    textOrientation: 'upright'
                }}
            >
                {currentStyle.songTitle}
            </h1>
        </div>

        {/* 3. 右側：人物特寫 (50%) */}
        <div className="w-[50%] h-full relative bg-black overflow-hidden">
            {/* 這就是我們辛苦做出來的 Canvas (人像+背景圖) */}
            <canvas 
                ref={canvasRef} 
                className="w-full h-full object-cover"
                style={{ filter: currentStyle.filter }} // 套用懷舊濾鏡
            />
            
            {/* 疊加文字 (歌手名) */}
            <div className="absolute top-0 right-0 bottom-0 w-24 bg-transparent flex flex-col py-10 pr-4 items-end pointer-events-none">
                <div className="writing-vertical-rl text-black font-black text-4xl tracking-widest drop-shadow-sm bg-white/30 p-2 backdrop-blur-sm mb-4">
                    {currentStyle.artist}
                </div>
                <div className="writing-vertical-rl text-white font-bold text-sm drop-shadow-md tracking-widest h-32 flex items-center border-l border-white/50 pl-2">
                    民歌經典復刻
                </div>
            </div>

            {/* 疊加紋理 */}
            <div className="absolute inset-0 pointer-events-none mix-blend-multiply opacity-30"
                 style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }}
            ></div>
        </div>

        {/* 倒數計時 */}
        {countdown && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50">
            <span className="text-9xl font-bold text-white animate-ping">{countdown}</span>
          </div>
        )}

      </div>

      {/* 控制列 */}
      <div className="mt-8 flex flex-col items-center gap-4 z-10">
        <div className="flex gap-4">
          {STYLES.map(style => (
            <button
              key={style.id}
              onClick={() => setCurrentStyle(style)}
              className={`px-6 py-2 rounded-full font-bold transition border-2 
                ${currentStyle.id === style.id ? 'bg-white text-black border-white scale-105' : 'bg-transparent text-white border-white/50 hover:border-white'}
              `}
            >
              {style.name}
            </button>
          ))}
        </div>

        <div className="flex gap-4 items-center">
           <button onClick={onBack} className="px-6 py-3 bg-gray-700 text-white rounded-full font-bold hover:bg-gray-600">← 返回</button>
           <button onClick={handleTakePhoto} disabled={!!countdown || !isLoaded || !bgImageObj} className="px-10 py-4 bg-teal-600 text-white text-xl rounded-full font-bold shadow-xl hover:bg-teal-500 hover:scale-105 transition flex items-center gap-2 disabled:opacity-50">📸 製作封面</button>
        </div>
      </div>
    </div>
  );
};

export default PhotoBoothGame;