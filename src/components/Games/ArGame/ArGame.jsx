import React, { useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { folkSongs } from '../../../data/folkSongs';

const ArGame = () => {
  const webcamRef = useRef(null);
  const audioRef = useRef(null); // 音樂播放器 Ref
  const [handLandmarker, setHandLandmarker] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // 遊戲元件狀態
  const [elements, setElements] = useState(() => {
    const colors = ["bg-[#D64F3E]", "bg-[#2A9D8F]", "bg-[#E9C46A]", "bg-[#F4A261]", "bg-[#264653]"];
    return folkSongs.map((song, index) => ({
      id: song.id,
      title: song.title,
      audioFile: song.audioFileName, // 綁定音樂檔名
      color: colors[index % colors.length],
      x: Math.random() > 0.5 ? (10 + Math.random() * 20) : (70 + Math.random() * 20),
      y: 15 + Math.random() * 50
    }));
  });

  const [grabbedId, setGrabbedId] = useState(null); 
  const [fingerPos, setFingerPos] = useState({ x: 0, y: 0 }); 
  const [playingSongTitle, setPlayingSongTitle] = useState(null);
  const [showHint, setShowHint] = useState(true);

  // 初始化 AI
  useEffect(() => {
    const initLandmarker = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
      );
      const landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 1
      });
      setHandLandmarker(landmarker);
      setIsLoading(false);
      setTimeout(() => setShowHint(false), 5000);
    };
    initLandmarker();
  }, []);

  // 遊戲迴圈
  useEffect(() => {
    let animationFrameId;
    const loop = () => {
      if (webcamRef.current && webcamRef.current.video && handLandmarker) {
        const video = webcamRef.current.video;
        if (video.readyState === 4) {
          const startTimeMs = performance.now();
          const result = handLandmarker.detectForVideo(video, startTimeMs);

          if (result.landmarks && result.landmarks.length > 0) {
            const indexTip = result.landmarks[0][8];
            setFingerPos({ 
              x: (1 - indexTip.x) * 100, 
              y: indexTip.y * 100 
            });
            updateGamePhysics((1 - indexTip.x) * 100, indexTip.y * 100);
          }
        }
      }
      animationFrameId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(animationFrameId);
  }, [handLandmarker, elements, grabbedId]);

  // 物理與互動邏輯
  const updateGamePhysics = (fx, fy) => {
    const isInPlayerZone = (fx > 35 && fx < 65 && fy > 70);

    if (grabbedId) {
      setElements(prev => prev.map(el => 
        el.id === grabbedId ? { ...el, x: fx, y: fy } : el
      ));

      if (isInPlayerZone) {
        const song = elements.find(el => el.id === grabbedId);
        playMusic(song); // 播放音樂
        setGrabbedId(null);
        // 放開後彈回上方
        setElements(prev => prev.map(el => 
          el.id === grabbedId ? { ...el, x: Math.random() * 80 + 10, y: Math.random() * 40 + 10 } : el
        ));
      }
    } else {
      const hitElement = elements.find(el => Math.hypot(el.x - fx, el.y - fy) < 8);
      if (hitElement) setGrabbedId(hitElement.id);
    }
  };

  // 播放音樂函式
  const playMusic = (song) => {
    if (audioRef.current) {
      // 設定音檔路徑 (假設放在 public/music/ 資料夾)
      audioRef.current.src = `/music/${song.audioFile}`; 
      audioRef.current.play().catch(e => console.log("播放失敗:", e));
      setPlayingSongTitle(song.title);
    }
  };

  return (
    <div className="relative w-full h-full bg-black overflow-hidden select-none">
      {/* 隱藏的 Audio 標籤 */}
      <audio ref={audioRef} loop />

      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black text-white">
          <p className="animate-pulse">AR 引擎啟動中...</p>
        </div>
      )}

      <Webcam
        ref={webcamRef}
        className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]"
        audio={false}
      />

      {/* 介面層 */}
      <div className="absolute inset-0 pointer-events-none">
        {showHint && (
          <div className="absolute top-20 left-0 w-full text-center animate-bounce z-40">
            <span className="bg-black/60 text-white px-4 py-2 rounded-full">👆 食指觸碰方塊，拖入下方播放</span>
          </div>
        )}

        {elements.map(el => (
          <div
            key={el.id}
            className={`absolute transition-transform duration-100 flex flex-col items-center justify-center
              ${grabbedId === el.id ? 'z-50 scale-110' : 'z-10 scale-100'}
            `}
            style={{ left: `${el.x}%`, top: `${el.y}%`, transform: 'translate(-50%, -50%)' }}
          >
            <div className={`w-24 h-14 ${el.color} rounded border-2 border-white shadow-xl flex items-center justify-center`}>
              <span className="text-white font-bold text-xs drop-shadow-md">{el.title}</span>
            </div>
          </div>
        ))}

        {!isLoading && (
          <div 
            className={`absolute w-4 h-4 rounded-full border-2 border-white -translate-x-1/2 -translate-y-1/2 transition-colors
              ${grabbedId ? 'bg-yellow-400' : 'bg-red-500/80'}
            `}
            style={{ left: `${fingerPos.x}%`, top: `${fingerPos.y}%` }}
          ></div>
        )}

        {/* 錄音機播放器 */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-[320px] h-[160px]">
          <div className="w-full h-full bg-gray-800 rounded-t-3xl border-4 border-gray-600 flex flex-col items-center justify-end pb-4 shadow-2xl relative">
            <div className={`w-48 h-20 border-4 rounded-lg flex items-center justify-center transition-all duration-300 relative overflow-hidden
              ${playingSongTitle ? 'bg-green-900 border-green-500' : 'bg-gray-900 border-gray-500'}
            `}>
              {playingSongTitle ? (
                <div className="z-10 text-center animate-pulse">
                  <div className="text-green-400 text-xs">NOW PLAYING</div>
                  <div className="text-white font-bold text-lg">{playingSongTitle}</div>
                </div>
              ) : (
                <div className="text-gray-500 font-bold text-sm">請放入歌曲</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArGame;