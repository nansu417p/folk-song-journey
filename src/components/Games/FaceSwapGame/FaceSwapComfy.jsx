import React, { useRef, useState } from 'react';
import Webcam from 'react-webcam';
// ★★★ 關鍵修正：引入你上傳的 JSON 檔名 ★★★
import reactorWorkflow from './ReActor.json';

// !!! 填入你的 Ngrok (ComfyUI Port 8188) 網址 !!!
const COMFY_API_URL = "https://cory-uninduced-ozell.ngrok-free.dev ";

const FaceSwapComfy = ({ onBack }) => {
  const webcamRef = useRef(null);
  const [step, setStep] = useState('capture'); 
  const [resultImage, setResultImage] = useState(null);

  // 上傳圖片
  const uploadImage = async (imageFile, name) => {
    const formData = new FormData();
    formData.append("image", imageFile);
    formData.append("overwrite", "true");
    
    // 如果是 Base64 (Webcam)
    if (typeof imageFile === 'string' && imageFile.startsWith('data:')) {
        const res = await fetch(imageFile);
        const blob = await res.blob();
        formData.set("image", blob, name); 
    }

    const response = await fetch(`${COMFY_API_URL}/upload/image`, {
      method: "POST",
      body: formData
    });
    return await response.json(); 
  };

  // 執行換臉
  const handleSwap = async () => {
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;

    setStep('processing');

    try {
      // A. 上傳「你的臉」
      const sourceUpload = await uploadImage(imageSrc, "user_face.png");

      // B. 上傳「封面圖」 (這裡先用寫死的拜訪春天做示範，你可以改成動態)
      const coverRes = await fetch('/images/cover-spring.jpg');
      const coverBlob = await coverRes.blob();
      const targetUpload = await uploadImage(coverBlob, "target_cover.jpg");

      // C. 修改 Workflow
      const workflow = JSON.parse(JSON.stringify(reactorWorkflow));

      // ★★★ 根據你上傳的 ReActor.json 修改節點 ID ★★★
      // Node 3 是 Source Image (你的臉)
      if (workflow["3"]) workflow["3"].inputs.image = sourceUpload.name;
      // Node 2 是 Input Image (封面)
      if (workflow["2"]) workflow["2"].inputs.image = targetUpload.name;

      // D. 發送請求
      const queueRes = await fetch(`${COMFY_API_URL}/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: workflow })
      });
      const { prompt_id } = await queueRes.json();

      // E. 輪詢結果
      let filename = '';
      while (!filename) {
        await new Promise(r => setTimeout(r, 1000));
        const historyRes = await fetch(`${COMFY_API_URL}/history/${promptId}`);
        const historyData = await historyRes.json();

        if (historyData[prompt_id]?.outputs) {
           // 找尋 ReActor 的輸出
           const outputs = historyData[prompt_id].outputs;
           const targetNode = Object.values(outputs)[0];
           if (targetNode?.images?.length > 0) {
             filename = targetNode.images[0].filename;
           }
        }
      }

      // F. 取得結果
      const imageRes = await fetch(`${COMFY_API_URL}/view?filename=${filename}&type=output`);
      const imageBlob = await imageRes.blob();
      setResultImage(URL.createObjectURL(imageBlob));
      setStep('result');

    } catch (error) {
      console.error(error);
      alert("換臉失敗: " + error.message);
      setStep('capture');
    }
  };

  return (
    <div className="w-full h-full bg-black flex flex-col items-center justify-center p-4 text-white">
      {step === 'capture' && (
        <>
          <button onClick={onBack} className="absolute top-4 left-4 z-50 px-6 py-2 bg-white text-black rounded-full font-bold">← 返回</button>
          <Webcam ref={webcamRef} screenshotFormat="image/jpeg" width={640} className="rounded-lg border-4 border-white"/>
          <button onClick={handleSwap} className="mt-6 px-8 py-3 bg-rose-600 rounded-full font-bold text-xl">📸 拍照並換臉 (ComfyUI)</button>
        </>
      )}
      
      {step === 'processing' && <div className="text-2xl animate-pulse">🤖 AI 正在合成中...</div>}
      
      {step === 'result' && resultImage && (
        <>
          <button onClick={onBack} className="absolute top-4 left-4 z-50 px-6 py-2 bg-white text-black rounded-full font-bold">← 返回</button>
          <img src={resultImage} className="max-h-[70vh] rounded-lg shadow-2xl border-4 border-white" />
          <button onClick={() => setStep('capture')} className="mt-6 px-8 py-3 bg-gray-700 rounded-full">🔄 重試</button>
        </>
      )}
    </div>
  );
};

export default FaceSwapComfy;