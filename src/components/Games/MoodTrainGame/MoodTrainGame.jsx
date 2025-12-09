import React, { useRef, useState, Suspense, useEffect } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { 
  OrbitControls, 
  Text, 
  Float, 
  RoundedBox, 
  Environment, 
  ContactShadows, 
  useFBX, // 改用 useFBX
  Html,
  useProgress
} from '@react-three/drei';
import * as THREE from 'three';
import Webcam from 'react-webcam';
import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision';

// --- 0. 載入畫面 ---
function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="text-white text-xl font-bold bg-black/50 px-4 py-2 rounded">
        載入模型中: {progress.toFixed(0)} %
      </div>
    </Html>
  );
}

// --- 1. 火車模型 (使用 FBX) ---
const ImportedTrain = () => {
  // 讀取 FBX 檔案
  // 如果貼圖(png)在同一個資料夾，通常會自動載入
  const fbx = useFBX('/models/electrictrain.fbx');

  return (
    <primitive 
      object={fbx} 
      // ★★★ FBX 縮放關鍵 ★★★
      // FBX 單位通常是公分，WebGL 是公尺，所以通常要縮小 100 倍 (0.01)
      // 如果還是太大/太小，請調整這裡
      scale={0.01} 
      position={[0, -2.5, 0]} 
      // 根據模型原始方向旋轉，這裡預設轉 180 度
      rotation={[0, Math.PI, 0]} 
    />
  );
};

// --- 2. 動態風景 (隨心情改變) ---
const MovingLandscape = ({ mood }) => {
  const mesh = useRef();
  
  // 根據心情切換風景圖
  // happy: 晴朗田野 (Unsplash)
  // sad/neutral: 雨天窗景 (Unsplash)
  const textureUrl = mood === 'happy' 
    ? 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=2000&auto=format&fit=crop' 
    : 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?q=80&w=2000&auto=format&fit=crop'; 
    
  const texture = useLoader(THREE.TextureLoader, textureUrl);
  texture.wrapS = THREE.RepeatWrapping;
  texture.repeat.set(4, 1); 

  useFrame((state, delta) => {
    if (mesh.current) {
      // 讓風景向後跑，模擬火車向前開
      // 開心時跑快一點 (0.08)，悲傷時慢一點 (0.02)
      texture.offset.x += delta * (mood === 'happy' ? 0.08 : 0.02); 
    }
  });

  return (
    <group position={[0, 0, 0]}>
      <mesh ref={mesh}>
         {/* 巨大的圓筒包圍整個車廂 */}
         <cylinderGeometry args={[25, 25, 20, 32, 1, true]} />
         {/* 根據心情調整亮度 */}
         <meshBasicMaterial 
            map={texture} 
            side={THREE.BackSide} 
            toneMapped={false} 
            color={mood === 'happy' ? '#ffffff' : '#888888'} 
         /> 
      </mesh>
    </group>
  );
};

// --- 3. 心情收音機 (互動按鈕) ---
const MoodRadio = ({ onClick, status }) => {
  const [hovered, setHover] = useState(false);

  return (
    <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
      {/* 調整位置放在桌上，請依據你的火車模型桌子位置微調 */}
      <group 
        position={[0.5, -1, 1.5]} 
        rotation={[0, -0.5, 0]}
        onPointerOver={() => setHover(true)}
        onPointerOut={() => setHover(false)}
        onClick={onClick}
        scale={0.8}
      >
         {/* 機身 */}
         <RoundedBox args={[1.2, 0.6, 0.4]} radius={0.05} smoothness={4}>
           <meshStandardMaterial 
              color={status === 'scanning' ? "#FFEB3B" : (hovered ? "#FF5252" : "#BF360C")} 
              emissive={status === 'scanning' ? "#FFFF00" : (hovered ? "#FF8A80" : "#000")}
              emissiveIntensity={status === 'scanning' ? 0.5 : 0.1}
           />
         </RoundedBox>
         {/* 旋鈕 */}
         <mesh position={[0.4, 0.1, 0.2]} rotation={[Math.PI/2, 0, 0]}>
           <cylinderGeometry args={[0.1, 0.1, 0.1]} />
           <meshStandardMaterial color="#EEE" />
         </mesh>
         {/* 喇叭 */}
         <mesh position={[-0.2, 0, 0.21]}>
           <circleGeometry args={[0.2, 32]} />
           <meshStandardMaterial color="#111" />
         </mesh>
         
         <Text position={[0, 0.5, 0]} fontSize={0.15} color="white" anchorX="center" anchorY="middle" outlineWidth={0.01} outlineColor="black">
           {status === 'scanning' ? "偵測中..." : "點擊讀取心情"}
         </Text>
      </group>
    </Float>
  );
};

// --- 4. 主場景 (整合 Face API) ---
const MoodTrainGame = ({ onBack }) => {
  const [mood, setMood] = useState('neutral'); // neutral, happy, sad
  const [scanStatus, setScanStatus] = useState('idle'); // idle, scanning, done
  
  const webcamRef = useRef(null);
  const [faceLandmarker, setFaceLandmarker] = useState(null);

  // A. 初始化 AI 模型
  useEffect(() => {
    const init = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.2/wasm"
      );
      const landmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numFaces: 1,
        outputFaceBlendshapes: true // 重要：這會回傳表情數值
      });
      setFaceLandmarker(landmarker);
    };
    init();
  }, []);

  // B. 開始掃描心情
  const startMoodScan = () => {
    if (!faceLandmarker || !webcamRef.current?.video) {
        alert("AI 正在暖機中，請稍候...");
        return;
    }
    
    setScanStatus('scanning');

    let scanCount = 0;
    let smileScore = 0;
    
    // 每 100ms 偵測一次，持續 3 秒
    const interval = setInterval(() => {
       const video = webcamRef.current.video;
       if(video.readyState === 4) {
           const startTimeMs = performance.now();
           const result = faceLandmarker.detectForVideo(video, startTimeMs);
           
           if (result.faceBlendshapes && result.faceBlendshapes.length > 0) {
               const shapes = result.faceBlendshapes[0].categories;
               // 取得微笑指數
               const smileL = shapes.find(s => s.categoryName === 'mouthSmileLeft')?.score || 0;
               const smileR = shapes.find(s => s.categoryName === 'mouthSmileRight')?.score || 0;
               const currentSmile = (smileL + smileR) / 2;
               
               smileScore += currentSmile;
               scanCount++;
           }
       }
    }, 100);

    // 3秒後結算
    setTimeout(() => {
        clearInterval(interval);
        const avgSmile = scanCount > 0 ? smileScore / scanCount : 0;
        
        // 判斷：微笑超過 0.4 算開心，否則算平靜/悲傷
        const newMood = avgSmile > 0.4 ? 'happy' : 'sad';
        setMood(newMood);
        setScanStatus('done');
        
        setTimeout(() => setScanStatus('idle'), 3000);
    }, 3000);
  };

  return (
    <div className="w-full h-full relative bg-black">
      
      {/* 隱藏的 Webcam (AI 之眼) */}
      <Webcam
        ref={webcamRef}
        audio={false}
        width={640}
        height={480}
        className="absolute opacity-0 pointer-events-none"
      />

      {/* UI 介面 */}
      <div className="absolute top-0 left-0 w-full p-6 z-50 flex justify-between items-start pointer-events-none">
        <button 
          onClick={onBack}
          className="px-6 py-2 bg-white/10 backdrop-blur text-white border border-white/30 rounded-full hover:bg-white hover:text-black transition font-bold pointer-events-auto"
        >
          ← 離開座位
        </button>
        <div className="text-right text-white/90 drop-shadow-md">
           <h2 className="text-2xl font-bold">心情列車</h2>
           <p className="text-sm">
             車廂氛圍：
             {mood === 'neutral' && "☁️ 陰天 (預設)"}
             {mood === 'happy' && "☀️ 晴朗 (偵測到微笑)"}
             {mood === 'sad' && "🌧️ 雨天 (偵測到平靜)"}
           </p>
        </div>
      </div>

      {/* 掃描中的提示 */}
      {scanStatus === 'scanning' && (
          <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
             <div className="bg-black/60 backdrop-blur-md p-8 rounded-2xl border border-yellow-400/50 text-center animate-pulse">
                <p className="text-3xl text-yellow-300 font-bold mb-2">正在讀取表情...</p>
                <p className="text-white/80">請對著鏡頭微笑，或保持平靜</p>
             </div>
          </div>
      )}

      {/* 3D 場景 */}
      <Canvas camera={{ position: [0, 1, 4], fov: 50 }} shadows>
        <Suspense fallback={<Loader />}>
            
            {/* 環境光與氛圍：隨心情改變 */}
            {mood === 'happy' && <Environment preset="sunset" />}
            {mood === 'sad' && <Environment preset="night" />}
            {mood === 'neutral' && <Environment preset="city" />}

            <ambientLight intensity={mood === 'sad' ? 0.2 : 0.6} />
            
            <pointLight 
                position={[0, 2, 0]} 
                intensity={mood === 'sad' ? 0.5 : 1.5} 
                color={mood === 'happy' ? "#FFF3E0" : (mood === 'sad' ? "#E0F7FA" : "#FFF")} 
                distance={10} 
                castShadow 
            />
            
            {/* 場景物件 */}
            <MovingLandscape mood={mood} />
            <ImportedTrain />
            <MoodRadio onClick={startMoodScan} status={scanStatus} />

            <ContactShadows position={[0, -2.5, 0]} opacity={0.5} scale={20} blur={2} far={4} />

            <OrbitControls 
              enableZoom={true} 
              enablePan={false} 
              maxPolarAngle={Math.PI / 1.9} 
              minPolarAngle={Math.PI / 4}
              maxDistance={12}
            />
        </Suspense>
      </Canvas>

      <div className="absolute bottom-8 left-0 w-full text-center text-white/40 text-sm pointer-events-none">
         拖曳畫面查看 • 點擊桌上的收音機啟動 AI
      </div>
    </div>
  );
};

export default MoodTrainGame;