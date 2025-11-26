import React, { useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { FilesetResolver, ImageSegmenter } from '@mediapipe/tasks-vision';

const STYLES = [
  {
    id: 'classic',
    name: '木棉道',
    // 背景圖片 URL
    bgImageUrl: 'https://images.unsplash.com/photo-1618588507085-c79565432917?q=80&w=1000&auto=format&fit=crop',
    overlayText: '木棉道・民歌經典',
    propType: 'mic', 
    // 整體濾鏡 (人跟背景都會套用，營造統一感)
    filter: 'sepia(0.6) contrast(1.2) brightness(0.9)' 
  },
  {
    id: 'rain',
    name: '季節雨',
    bgImageUrl: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?q=80&w=1000&auto=format&fit=crop',
    overlayText: '季節雨・青春印記',
    propType: 'umbrella', 
    filter: 'grayscale(0.7) brightness(1.1)'
  },
  {
    id: 'morning',
    name: '風中早晨',
    bgImageUrl: 'https://images.unsplash.com/photo-1588072432836-e10032774350?q=80&w=1000&auto=format&fit=crop',
    overlayText: '風中的早晨・校園',
    propType: 'guitar', 
    filter: 'saturate(1.5) sepia(0.3)'
  }
];

const PhotoBoothGame = ({ onBack }) => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  // 暫存畫布：用來讀取背景圖片的像素資料
  const tempBgCanvasRef = useRef(document.createElement('canvas'));

  const [segmenter, setSegmenter] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentStyle, setCurrentStyle] = useState(STYLES[0]);
  const [countdown, setCountdown] = useState(null);
  const [camReady, setCamReady] = useState(false);
  // 儲存載入好的背景圖片物件
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

  // 背景圖片載入器
  useEffect(() => {
    setBgImageObj(null); // 切換風格時先清空
    const img = new Image();
    img.crossOrigin = "anonymous"; // 重要：跨域設定
    img.src = currentStyle.bgImageUrl;
    img.onload = () => setBgImageObj(img);
    img.onerror = () => {
        console.warn("背景圖載入失敗");
    };
  }, [currentStyle]);

  // 2. 渲染迴圈
  useEffect(() => {
    let animationFrameId;
    
    const renderLoop = () => {
      if (
        webcamRef.current && 
        webcamRef.current.video &&
        webcamRef.current.video.readyState === 4 &&
        canvasRef.current &&
        segmenter
      ) {
        const video = webcamRef.current.video;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        // 同步尺寸
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            // 同步暫存畫布尺寸
            tempBgCanvasRef.current.width = video.videoWidth;
            tempBgCanvasRef.current.height = video.videoHeight;
        }

        const width = canvas.width;
        const height = canvas.height;
        const startTimeMs = performance.now();

        // 執行去背運算
        segmenter.segmentForVideo(video, startTimeMs, (result) => {
            const mask = result.categoryMask;
            
            // 1. 清空主畫布
            ctx.clearRect(0, 0, width, height);

            // 2. 先畫上原始視訊 (鏡像) - 保證人像一定在
            ctx.save();
            ctx.scale(-1, 1);
            ctx.translate(-width, 0);
            ctx.drawImage(video, 0, 0, width, height);
            ctx.restore();

            // 3. 處理遮罩：用圖片像素替換背景
            // 只有在遮罩存在且背景圖已載入時才執行
            if (mask && bgImageObj) {
                // A. 準備背景圖資料
                const tempBgCtx = tempBgCanvasRef.current.getContext('2d', { willReadFrequently: true });
                tempBgCtx.drawImage(bgImageObj, 0, 0, width, height);
                // 取得背景圖的所有像素資料
                const bgData = tempBgCtx.getImageData(0, 0, width, height).data;

                // B. 準備主畫布資料 (目前畫布上是鏡像視訊)
                const imageData = ctx.getImageData(0, 0, width, height);
                const pixels = imageData.data;
                const maskPixels = mask.getAsUint8Array();
                
                // C. 鏡像遍歷像素進行替換
                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        // 讀取鏡像位置的遮罩索引 (配合已鏡像的視訊)
                        const maskIndex = y * width + (width - 1 - x);
                        const pixelIndex = (y * width + x) * 4;

                        // --- 關鍵修正 ---
                        // 這裡的邏輯反轉了：如果 mask 值「不是 0」，代表這一點是背景區域
                        // 我們就把這一點的像素替換成背景圖片的像素
                        if (maskPixels[maskIndex] !== 0) {
                            pixels[pixelIndex] = bgData[pixelIndex];     // R from BG image
                            pixels[pixelIndex + 1] = bgData[pixelIndex + 1]; // G from BG image
                            pixels[pixelIndex + 2] = bgData[pixelIndex + 2]; // B from BG image
                            pixels[pixelIndex + 3] = 255; // Alpha 強制不透明
                        }
                        // 如果 mask 值是 0 (代表是人)，我們就不動它，保留原本畫上去的視訊像素
                    }
                }
                // D. 把處理完的像素放回主畫布
                ctx.putImageData(imageData, 0, 0);
            }

            // 4. 畫裝飾 (文字/邊框)
            drawOverlay(ctx, width, height);
        });
      } else if (canvasRef.current && webcamRef.current?.video?.readyState === 4) {
         // 保底渲染 (無 AI 或圖片未載入時，直接顯示鏡像視訊)
         const video = webcamRef.current.video;
         const canvas = canvasRef.current;
         const ctx = canvas.getContext('2d');
         canvas.width = video.videoWidth;
         canvas.height = video.videoHeight;
         
         ctx.save();
         ctx.scale(-1, 1);
         ctx.translate(-canvas.width, 0);
         ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
         ctx.restore();
         drawOverlay(ctx, canvas.width, canvas.height);
      }

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    renderLoop();
    return () => cancelAnimationFrame(animationFrameId);
  }, [segmenter, currentStyle, bgImageObj]);

  const drawOverlay = (ctx, width, height) => {
      ctx.save();
      
      // 雜訊濾鏡 (增加復古感)
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = "rgba(0,0,0,0.15)";
      for(let i=0; i<50; i++) ctx.fillRect(Math.random()*width, Math.random()*height, 2, 2);
      ctx.globalCompositeOperation = 'source-over';

      // 邊框
      ctx.strokeStyle = '#FDFBF7';
      ctx.lineWidth = 30;
      ctx.strokeRect(15, 15, width - 30, height - 30);

      // 文字
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#FFF';
      ctx.font = 'bold 48px "Noto Serif TC", serif';
      ctx.textAlign = 'center';
      ctx.fillText(currentStyle.overlayText, width / 2, height - 60);
      
      // 道具
      ctx.font = '120px serif';
      ctx.shadowBlur = 0;
      if (currentStyle.propType === 'mic') {
          ctx.fillText('🎙️', 100, height - 80); 
      } else if (currentStyle.propType === 'guitar') {
          ctx.fillText('🎸', width - 100, height - 80);
      } else {
          ctx.fillText('☂️', width - 100, height - 80);
      }

      ctx.restore();
  };

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

  const downloadPhoto = () => {
    if (canvasRef.current) {
      const link = document.createElement('a');
      link.download = 'folk-cover.png';
      link.href = canvasRef.current.toDataURL('image/png');
      link.click();
    }
  };

  return (
    <div className="w-full h-full bg-gray-900 relative flex flex-col items-center justify-center overflow-hidden">
      
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
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black text-white">
          <p className="animate-pulse text-xl">📷 佈景準備中...</p>
        </div>
      )}

      <div className="relative shadow-2xl border-8 border-white bg-black rounded-lg overflow-hidden max-h-[70vh] aspect-video">
        <canvas 
          ref={canvasRef} 
          className="block w-full h-full object-contain"
          // 使用 CSS filter 來做最後的風格化，讓整張合成圖色調統一
          style={{ filter: currentStyle.filter }} 
        />
        {countdown && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
            <span className="text-9xl font-bold text-white animate-ping">{countdown}</span>
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-col items-center gap-4 z-10">
        <div className="flex gap-4">
          {STYLES.map(style => (
            <button
              key={style.id}
              onClick={() => setCurrentStyle(style)}
              className={`px-4 py-2 rounded-full font-bold transition border-2 
                ${currentStyle.id === style.id ? 'bg-white text-black border-white' : 'bg-transparent text-white border-white/50 hover:border-white'}
              `}
            >
              {style.name}
            </button>
          ))}
        </div>

        <div className="flex gap-4 items-center">
           <button onClick={onBack} className="px-6 py-3 bg-gray-700 text-white rounded-full font-bold hover:bg-gray-600">← 返回</button>
           <button onClick={handleTakePhoto} disabled={!!countdown || !isLoaded || !bgImageObj} className="px-10 py-4 bg-teal-600 text-white text-xl rounded-full font-bold shadow-xl hover:bg-teal-500 hover:scale-105 transition flex items-center gap-2 disabled:opacity-50">📸 拍攝封面</button>
        </div>
      </div>
    </div>
  );
};

export default PhotoBoothGame;