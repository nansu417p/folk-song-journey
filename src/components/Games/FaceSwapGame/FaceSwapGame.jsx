import React, { useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';

// !!! 記得填入新的 Ngrok 網址 !!!
const API_URL = "https://cory-uninduced-ozell.ngrok-free.dev"; 

const TEMPLATES = [
  {
    id: 'spring',
    title: '拜訪春天',
    singer: '施孝榮',
    imgSrc: '/images/cover-spring.jpg', 
  },
  {
    id: 'wood',
    title: '木棉道',
    singer: '王夢麟',
    imgSrc: '/images/cover-wood.jpg', 
  }
];

const FaceSwapGame = ({ onBack }) => {
  const webcamRef = useRef(null);
  const [step, setStep] = useState('select'); 
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [resultImage, setResultImage] = useState(null);
  const [base64Template, setBase64Template] = useState(null);
  const [debugImage, setDebugImage] = useState(null);

  // 1. 載入模板
  const handleSelectTemplate = async (template) => {
    setSelectedTemplate(template);
    try {
      const response = await fetch(template.imgSrc);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        setBase64Template(reader.result.split(',')[1]);
        setStep('capture');
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error("圖片載入失敗", err);
      alert("無法載入封面圖");
    }
  };

  // 2. 拍照
  const capture = async () => {
    const imageSrc = webcamRef.current.getScreenshot({width: 512, height: 512}); // 強制截取 512x512
    
    if (imageSrc && base64Template) {
      setDebugImage(imageSrc); 
      setStep('processing');
      
      const userFaceBase64 = imageSrc.split(',')[1]; 
      
      try {
        await swapFace(userFaceBase64, base64Template);
      } catch (error) {
        console.error(error);
        alert(`換臉失敗: ${error.message}\n請檢查後端 Log`);
        setStep('capture');
      }
    }
  };

  // 3. 呼叫後端 API (改用 ReActor 獨立接口)
  const swapFace = async (source, target) => {
    
    // --- 設定多臉替換策略 ---
    // 假設封面最多有 6 張臉 (拜訪春天有 4 張)，我們就準備 6 個指令
    // source_faces_index: [0,0,0,0,0,0] -> 全部都用你的臉 (第0號臉)
    // face_index: [0,1,2,3,4,5] -> 依序換掉封面上的第 0 到第 5 張臉
    
    const payload = {
      source_image: source,       
      target_image: target,       
      
      // ★★★ 關鍵修改：從單一 [0] 改為多對應陣列 ★★★
      source_faces_index: [0, 0, 0, 0, 0, 0], 
      face_index: [0, 1, 2, 3, 4, 5],            
      
      upscaler: "None",           
      scale: 1,
      codeformer_fidelity: 0.5,   
      restore_face: true,         
      gender_source: 0,           
      gender_target: 0
    };

    console.log("正在發送請求至:", `${API_URL}/reactor/image`);

    const response = await fetch(`${API_URL}/reactor/image`, {
      method: "POST",
      mode: 'cors', 
      headers: { 
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "69420" 
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error Details:", errorText);
        throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.image) {
        throw new Error("後端處理完成但沒有回傳圖片");
    }

    const finalImage = `data:image/png;base64,${data.image}`;
    setResultImage(finalImage);
    setStep('result');
  };
  return (
    <div className="w-full h-full bg-gray-900 flex flex-col items-center justify-center relative p-4 text-white">
      
      <button onClick={onBack} className="absolute top-4 left-4 z-50 px-6 py-2 bg-white text-black rounded-full font-bold">← 返回</button>

      {/* 步驟 1: 選擇 */}
      {step === 'select' && (
        <div className="flex flex-col items-center gap-8 max-w-5xl">
          <h2 className="text-4xl font-bold mb-4">請選擇一張經典封面</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {TEMPLATES.map(t => (
              <div 
                key={t.id} 
                onClick={() => handleSelectTemplate(t)}
                className="bg-black rounded-xl overflow-hidden cursor-pointer hover:scale-105 transition border-4 border-transparent hover:border-rose-500"
              >
                <img src={t.imgSrc} alt={t.title} className="w-full h-64 object-cover" />
                <div className="p-4 text-center">
                  <h3 className="text-2xl font-bold">{t.title}</h3>
                  <p className="text-gray-400">{t.singer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 步驟 2: 拍照 */}
      {step === 'capture' && (
        <div className="flex flex-col items-center gap-6 w-full max-w-4xl">
          <div className="relative border-8 border-white/20 bg-black rounded-lg overflow-hidden w-full aspect-video max-w-2xl">
            <Webcam
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              width={512} // 配合 API 需求，統一尺寸
              height={512}
              className="w-full h-full object-cover"
              mirrored={true}
              videoConstraints={{ facingMode: "user" }}
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
               <div className="w-48 h-64 border-4 border-white/50 border-dashed rounded-[50%]"></div>
            </div>
            <p className="absolute bottom-4 w-full text-center text-white/80 text-lg shadow-black drop-shadow-md">請將臉部對準框框</p>
          </div>
          
          <button onClick={capture} className="px-12 py-4 bg-rose-600 text-white text-2xl rounded-full font-bold shadow-xl hover:bg-rose-500 hover:scale-105 transition">
            📸 變身主角 (AI 換臉)
          </button>
        </div>
      )}

      {/* 步驟 3: 處理中 */}
      {step === 'processing' && (
        <div className="text-center flex flex-col items-center">
          <div className="w-24 h-24 border-8 border-t-rose-500 border-white/20 rounded-full animate-spin mb-8"></div>
          <h2 className="text-4xl font-bold mb-4">AI 正在融合五官...</h2>
          
          <div className="flex gap-4 justify-center mt-4 opacity-50">
             <div className="text-center">
               <p className="text-xs mb-1">來源臉部</p>
               {debugImage && <img src={debugImage} className="w-32 h-auto border border-white/50" alt="debug" />}
             </div>
          </div>
        </div>
      )}

      {/* 步驟 4: 結果 */}
      {step === 'result' && resultImage && (
        <div className="flex flex-col items-center gap-8 animate-fade-in w-full max-w-4xl">
          <h2 className="text-3xl font-bold text-white">換臉完成！</h2>
          
          <div className="flex gap-8 items-center">
             <div className="hidden md:block opacity-50 scale-75">
                <p className="text-center mb-2">原版</p>
                <img src={selectedTemplate.imgSrc} className="h-64 rounded shadow-lg" alt="Original" />
             </div>
             <div className="hidden md:block text-4xl text-rose-500">➔</div>
             <div className="relative shadow-2xl border-8 border-white rounded-lg overflow-hidden max-h-[60vh]">
                <img src={resultImage} alt="Face Swap Result" className="max-h-full object-contain" />
             </div>
          </div>

          <div className="flex gap-6">
             <button onClick={() => setStep('select')} className="px-8 py-3 bg-gray-700 text-white rounded-full font-bold hover:bg-gray-600 text-lg">
               🔄 換一張
             </button>
             <a href={resultImage} download={`faceswap-${selectedTemplate.id}.png`} className="px-12 py-3 bg-rose-600 text-white rounded-full font-bold hover:bg-rose-500 shadow-lg flex items-center gap-2 text-lg">
               💾 下載圖片
             </a>
          </div>
        </div>
      )}

    </div>
  );
};

export default FaceSwapGame;