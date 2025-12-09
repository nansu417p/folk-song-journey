import React, { useState } from 'react';

// 輔助函式：將專案內的 MP3 檔案轉為 Base64 字串
const fetchAudioAsBase64 = async (url) => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Audio not found");
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result); 
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error("音訊轉換失敗:", e);
    return null;
  }
};

// HTML 模板生成器
const generateHTMLContent = (song, audioData) => {
  const formattedLyrics = song.lyrics.replace(/\n/g, '<br/>');
  
  const getCoverColor = (title) => {
      if(title.includes("木棉")) return "linear-gradient(135deg, #D64F3E 0%, #FF8C00 100%)"; 
      if(title.includes("雨")) return "linear-gradient(135deg, #2A9D8F 0%, #264653 100%)"; 
      if(title.includes("風")) return "linear-gradient(135deg, #E9C46A 0%, #F4A261 100%)"; 
      return "linear-gradient(135deg, #9B8EA9 0%, #564E5E 100%)"; 
  };

  return `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${song.title} - 民歌回憶膠囊</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;700;900&display=swap');
        
        body {
            margin: 0;
            padding: 0;
            background-color: #1a1a1a;
            background-image: radial-gradient(circle at 50% 50%, #2a2a2a 0%, #000000 100%);
            height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            font-family: 'Noto Serif TC', serif;
            overflow: hidden;
            perspective: 1500px;
        }

        .folder {
            width: 320px;
            height: 480px;
            position: relative;
            transform-style: preserve-3d;
            transition: transform 0.8s cubic-bezier(0.25, 0.8, 0.25, 1);
            cursor: pointer;
        }

        /* 打開狀態：翻轉 180 度並稍微左移 */
        .folder.open {
            transform: translateX(-80px) rotateY(-180deg) !important; /* 加 !important 確保權重 */
        }

        .face {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border-radius: 10px;
            backface-visibility: hidden; 
            box-shadow: 5px 5px 20px rgba(0,0,0,0.5);
            overflow: hidden;
        }

        .front {
            background: #FDFBF7;
            z-index: 2;
            display: flex;
            flex-direction: column;
        }

        .cover-art {
            flex: 2;
            background: ${getCoverColor(song.title)};
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .cover-title {
            font-size: 3.5rem;
            color: white;
            font-weight: 900;
            text-shadow: 2px 2px 10px rgba(0,0,0,0.3);
            writing-mode: vertical-rl;
            letter-spacing: 0.2em;
            border: 4px solid white;
            padding: 10px;
        }

        .cover-info {
            flex: 1;
            padding: 20px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            background: #FDFBF7;
            color: #333;
            border-top: 4px double #ccc;
        }

        .back {
            background: #eee;
            transform: rotateY(180deg); 
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 20px;
            box-sizing: border-box;
        }

        .vinyl {
            width: 180px;
            height: 180px;
            background: #111;
            border-radius: 50%;
            margin-top: 20px;
            position: relative;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 1s;
            background: repeating-radial-gradient(#111, #111 2px, #222 3px);
        }
        
        .vinyl.playing {
            animation: spin 4s linear infinite;
        }
        
        @keyframes spin { 100% { transform: rotate(360deg); } }

        .vinyl-label {
            width: 70px;
            height: 70px;
            background: #D64F3E;
            border-radius: 50%;
            border: 3px solid #fff;
        }

        .controls {
            margin-top: 20px;
            display: flex;
            gap: 10px;
        }

        button {
            padding: 8px 20px;
            background: #333;
            color: white;
            border: none;
            cursor: pointer;
            border-radius: 20px;
            font-family: 'Noto Serif TC', serif;
            font-weight: bold;
        }

        .lyrics-box {
            margin-top: 20px;
            width: 100%;
            flex: 1;
            overflow-y: auto;
            background: white;
            padding: 15px;
            border: 1px solid #ccc;
            font-size: 0.9rem;
            line-height: 1.8;
            color: #444;
            border-radius: 5px;
            box-shadow: inset 0 2px 5px rgba(0,0,0,0.05);
        }

        .hint {
            position: absolute;
            bottom: 20px;
            width: 100%;
            text-align: center;
            color: rgba(255,255,255,0.5);
            font-size: 0.9rem;
            pointer-events: none;
            animation: bounce 2s infinite;
        }
        
        @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
        }
    </style>
</head>
<body>

    <div class="folder" id="card" onclick="toggleCard()">
        
        <div class="face front">
            <div class="cover-art">
                <div class="cover-title">${song.title}</div>
                <div style="position:absolute; inset:0; opacity:0.2; background:url('https://www.transparenttextures.com/patterns/cream-paper.png'); mix-blend-mode:multiply;"></div>
            </div>
            <div class="cover-info">
                <h2 style="margin:0; font-size:1.5rem;">${song.singer}</h2>
                <p style="margin:5px 0 0; color:#666; font-size:0.9rem;">民歌經典系列 • 數位典藏版</p>
            </div>
            <div style="position:absolute; bottom:10px; right:10px; font-size:0.8rem; color:#999;">⟳ 點擊翻面</div>
        </div>

        <div class="face back">
            <div class="vinyl" id="vinyl">
                <div class="vinyl-label"></div>
            </div>
            
            <div class="controls">
                <button onclick="toggleMusic(event)" id="playBtn">▶ 播放音樂</button>
            </div>

            <div class="lyrics-box" onclick="event.stopPropagation()">
                <h3 style="margin-top:0; text-align:center;">${song.title}</h3>
                ${formattedLyrics}
            </div>
        </div>

    </div>

    <div class="hint">點擊卡片查看詳細內容</div>

    <audio id="bgm" loop>
        <source src="${audioData || ''}" type="audio/mpeg">
    </audio>

    <script>
        let isOpen = false;
        let isPlaying = false;
        const card = document.getElementById('card');
        const vinyl = document.getElementById('vinyl');
        const audio = document.getElementById('bgm');
        const playBtn = document.getElementById('playBtn');

        function toggleCard() {
            isOpen = !isOpen;
            if(isOpen) {
                // ★★★ 關鍵修正：強制清除 inline style，讓 CSS class 生效 ★★★
                card.style.transform = ''; 
                card.classList.add('open');
            } else {
                card.classList.remove('open');
            }
        }

        function toggleMusic(e) {
            e.stopPropagation(); 
            
            if (!audio.currentSrc) {
                alert("抱歉，此卡片未包含音訊資料。");
                return;
            }

            if(isPlaying) {
                audio.pause();
                vinyl.classList.remove('playing');
                playBtn.innerText = "▶ 播放音樂";
                isPlaying = false;
            } else {
                audio.play().then(() => {
                    vinyl.classList.add('playing');
                    playBtn.innerText = "II 暫停音樂";
                    isPlaying = true;
                }).catch(err => {
                    console.error(err);
                    alert("播放失敗，請確認瀏覽器設定允許播放聲音。");
                });
            }
        }
        
        // 視差效果
        document.addEventListener('mousemove', (e) => {
            // ★★★ 關鍵修正：只有在沒打開時才執行視差，避免干擾翻轉 ★★★
            if(isOpen) return; 
            
            const x = (window.innerWidth / 2 - e.pageX) / 30;
            const y = (window.innerHeight / 2 - e.pageY) / 30;
            card.style.transform = \`rotateY(\${x}deg) rotateX(\${y}deg)\`;
        });
    </script>
</body>
</html>
  `;
};

const CapsuleGame = ({ song, onBack }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    setIsGenerating(true);
    
    const audioBase64 = await fetchAudioAsBase64(`/music/${song.audioFileName}`);
    const htmlContent = generateHTMLContent(song, audioBase64);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${song.title}_回憶膠囊.html`;
    link.href = url;
    link.click();
    
    URL.revokeObjectURL(url);
    setIsGenerating(false);
  };

  return (
    <div className="w-full h-full bg-amber-100 flex flex-col items-center justify-center relative p-4">
      
      <button onClick={onBack} className="absolute top-6 left-6 z-50 px-6 py-2 bg-amber-800 text-white rounded-full hover:bg-amber-700 transition font-bold shadow-lg">
        ← 返回
      </button>

      <div className="text-center mb-8">
         <h2 className="text-4xl font-bold text-amber-900 mb-4">時光膠囊工廠</h2>
         <p className="text-amber-700 text-lg">您選擇了：<span className="font-bold">{song.title}</span></p>
         <p className="text-amber-600 opacity-70 mt-2">我們正在為您燒錄一張數位黑膠唱片...</p>
      </div>

      <div className="w-64 h-80 bg-white rounded-lg shadow-2xl border-l-[12px] border-amber-700 flex flex-col items-center justify-center mb-8 transform -rotate-6 hover:rotate-0 transition duration-500 cursor-pointer" onClick={!isGenerating ? handleDownload : null}>
          {isGenerating ? (
             <div className="animate-spin text-6xl">💿</div>
          ) : (
             <>
               <div className="text-8xl mb-4">🎁</div>
               <div className="font-bold text-2xl text-gray-800">回憶膠囊</div>
               <div className="text-sm text-gray-500 mt-2">點擊封存</div>
             </>
          )}
      </div>

      <button 
        onClick={handleDownload}
        disabled={isGenerating}
        className={`px-10 py-4 text-white text-2xl rounded-full font-bold shadow-xl transition flex items-center gap-3
          ${isGenerating ? 'bg-gray-400 cursor-wait' : 'bg-amber-600 hover:bg-amber-500 hover:scale-105'}
        `}
      >
        {isGenerating ? "正在注入音訊數據..." : "📥 下載互動卡片 (.html)"}
      </button>

    </div>
  );
};

export default CapsuleGame;