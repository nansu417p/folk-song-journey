import React, { useState, useEffect, useRef } from 'react';

const KaraokeGame = ({ song, onBack }) => {
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [volume, setVolume] = useState(0);
  
  // 將歌詞字串拆解成陣列
  const lyricsLines = React.useMemo(() => {
    return song.lyrics.split('\n').filter(line => line.trim() !== '');
  }, [song]);

  const recognitionRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const scrollRef = useRef(null);

  // 1. 初始化語音辨識
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true; 
      recognition.interimResults = true; 
      recognition.lang = 'zh-TW';

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        console.log("偵測到語音:", transcript);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // 2. 啟動麥克風 (名稱修正為 startListening)
  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
      
      setIsListening(true);
      recognitionRef.current?.start(); 
      
      detectVolume(); // 開始偵測音量
    } catch (err) {
      console.error("麥克風失敗:", err);
      alert("請允許麥克風權限以體驗互動");
    }
  };

  // 3. 音量偵測與歌詞推進
  const [energy, setEnergy] = useState(0);

  const detectVolume = () => {
    if (!analyserRef.current || !isListening) return; // isListening 為 false 時會自動停止

    analyserRef.current.getByteFrequencyData(dataArrayRef.current);
    let sum = 0;
    for(let i=0; i<dataArrayRef.current.length; i++) sum += dataArrayRef.current[i];
    const average = sum / dataArrayRef.current.length;
    
    setVolume(average);

    // 如果音量夠大，累積能量
    if (average > 15) {
      setEnergy(prev => {
        const newEnergy = prev + 1.5; 
        if (newEnergy >= 100) {
          // 能量滿了 -> 換下一句
          setCurrentLineIndex(idx => Math.min(idx + 1, lyricsLines.length - 1));
          return 0; 
        }
        return newEnergy;
      });
    }

    requestAnimationFrame(detectVolume);
  };

  // 自動捲動
  useEffect(() => {
    if (scrollRef.current) {
      const activeElement = scrollRef.current.children[currentLineIndex];
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentLineIndex]);

  // 停止
  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false); // 這會讓 detectVolume 迴圈停止
    setEnergy(0);
    setVolume(0);
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null; // 確保清空
    }
  };

  // 離開頁面時清理
  useEffect(() => {
    return () => stopListening();
  }, []);

  return (
    <div className="w-full h-full bg-gradient-to-b from-blue-900 to-black flex flex-col items-center justify-center relative text-white overflow-hidden">
      
      <button onClick={onBack} className="absolute top-6 left-6 z-50 px-6 py-2 bg-white/20 border border-white/50 rounded-full hover:bg-white hover:text-blue-900 transition font-bold">
        ← 返回
      </button>

      {/* 開場畫面 */}
      {!isListening && (
        <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center text-center px-4">
          <h2 className="text-4xl font-bold mb-6 text-yellow-400">用歌聲點亮記憶</h2>
          <p className="text-xl text-gray-300 mb-8 max-w-lg leading-relaxed">
            請對著麥克風跟著哼唱，<br/>
            您的聲音將會推動歌詞前進。
          </p>
          <button 
            onClick={startListening} // 這裡現在正確對應到 startListening 函式了
            className="px-10 py-4 bg-blue-600 text-white text-2xl rounded-full font-bold shadow-[0_0_30px_rgba(37,99,235,0.5)] hover:scale-105 transition animate-pulse"
          >
            🎙️ 開始歡唱
          </button>
        </div>
      )}

      {/* 歌詞顯示區 */}
      <div 
        ref={scrollRef}
        className="w-full max-w-3xl h-[70vh] overflow-y-hidden flex flex-col items-center gap-8 py-[40vh] relative z-10"
      >
        {lyricsLines.map((line, index) => {
          const isActive = index === currentLineIndex;
          const isPast = index < currentLineIndex;
          
          return (
            <div 
              key={index}
              className={`transition-all duration-500 ease-out transform text-center px-4
                ${isActive ? 'scale-110 opacity-100 text-yellow-300 font-bold' : 'scale-95 opacity-30 blur-[1px]'}
                ${isPast ? 'opacity-10 -translate-y-2' : ''}
              `}
            >
              <p className="text-3xl md:text-5xl leading-tight" style={{ textShadow: isActive ? '0 0 20px rgba(253, 224, 71, 0.6)' : 'none' }}>
                {line}
              </p>
              {isActive && (
                <div className="w-full max-w-md h-2 bg-gray-700 rounded-full mt-4 mx-auto overflow-hidden">
                  <div 
                    className="h-full bg-yellow-400 transition-all duration-100"
                    style={{ width: `${energy}%` }}
                  ></div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 底部波形 */}
      <div className="absolute bottom-0 w-full h-32 flex items-end justify-center gap-1 pb-10 pointer-events-none">
         {[...Array(20)].map((_, i) => (
           <div 
             key={i} 
             className="w-3 bg-blue-400/50 rounded-t-lg transition-all duration-75"
             style={{ 
               height: `${Math.max(10, volume * (Math.sin(i)*0.5 + 1) * 2)}px`,
               opacity: isListening ? 1 : 0 
             }}
           ></div>
         ))}
      </div>

    </div>
  );
};

export default KaraokeGame;