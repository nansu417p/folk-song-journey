import React, { useRef, useState } from 'react';
import Webcam from 'react-webcam';

// !!! 請填入你的 Stable Diffusion Forge Neo 的網址 !!!
const API_URL = "https://cory-uninduced-ozell.ngrok-free.dev"; 

const TEMPLATES = [
  {
    id: 'spring',
    title: '拜訪春天',
    singer: '施孝榮',
    imgSrc: '/images/cover-spring.jpg',
    faceCount: 4, // ★ 設定這張圖有 4 張臉
  },
  {
    id: 'wood',
    title: '木棉道',
    singer: '王夢麟',
    imgSrc: '/images/cover-wood.jpg',
    faceCount: 1, // ★ 設定這張圖只有 1 張臉
  }
];

const FaceSwapGame = ({ onBack }) => {
  const webcamRef = useRef(null);
  const [step, setStep] = useState('select'); 
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [resultImage, setResultImage] = useState(null);
  const [base64Template, setBase64Template] = useState(null);
  const [debugImage, setDebugImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // 1. 載入模板
  const handleSelectTemplate = async (template) => {
    setSelectedTemplate(template);
    try {
      const response = await fetch(template.imgSrc);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result.split(',')[1];
        setBase64Template(base64String);
        setStep('capture');
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error("圖片載入失敗", err);
      alert("無法載入封面圖，請確認圖片路徑是否正確");
    }
  };

  // 2. 拍照
  const capture = async () => {
    const imageSrc = webcamRef.current.getScreenshot({width: 512, height: 512}); 
    
    if (imageSrc && base64Template) {
      setDebugImage(imageSrc); 
      setStep('processing');
      setIsLoading(true);
      
      const userFaceBase64 = imageSrc.split(',')[1]; 
      
      try {
        await swapFace(userFaceBase64, base64Template);
      } catch (error) {
        console.error(error);
        alert(`換臉失敗: ${error.message}\n請確認 SD Forge 是否啟動且 ReActor 插件運作正常。`);
        setStep('capture');
      } finally {
        setIsLoading(false);
      }
    }
  };

  // 3. 呼叫 SD Forge ReActor API
  const swapFace = async (source, target) => {
    
    // ★★★ 關鍵修改：根據模板定義的臉部數量，動態生成指令 ★★★
    const count = selectedTemplate.faceCount || 1; // 預設 1 張
    
    // 產生來源臉部索引：全部都是 0 (因為只有你一張臉)
    // 例如 4 張臉: [0, 0, 0, 0]
    const sourceFacesIndex = Array(count).fill(0);
    
    // 產生目標臉部索引：0, 1, 2, 3...
    // 例如 4 張臉: [0, 1, 2, 3]
    const targetFacesIndex = Array.from({length: count}, (_, i) => i);

    console.log(`正在替換 ${count} 張臉...`);

    const payload = {
      source_image: source,       
      target_image: target,       
      
      source_faces_index: sourceFacesIndex,
      face_index: targetFacesIndex,         
      
      upscaler: "None",           
      scale: 1,
      codeformer_fidelity: 0.5,   
      restore_face: true,         
      gender_source: 0,           
      gender_target: 0
    };

    try {
      const response = await fetch(`${API_URL}/reactor/image`, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "69420" 
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
          const errorText = await response.text();
          console.error("API Error Details:", errorText);
          throw new Error(`API Error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.image) {
          throw new Error("後端處理完成但沒有回傳圖片");
      }

      const finalImage = `data:image/png;base64,${data.image}`;
      setResultImage(finalImage);
      setStep('result');

    } catch (error) {
      throw error;
    }
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
                  {/* 顯示這張圖有幾個人 */}
                  <span className="text-xs bg-gray-700 px-2 py-1 rounded-full mt-2 inline-block">
                     👥 {t.faceCount} 人合唱
                  </span>
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
              width={512} 
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
          <p className="text-gray-400">正在處理 {selectedTemplate.faceCount} 張臉孔</p>
          
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
          
          <div className="flex gap-8 items-center justify-center flex-wrap">
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