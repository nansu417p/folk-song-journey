import React, { useState, useRef, useMemo } from 'react';
import Webcam from 'react-webcam';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

// --- 3D 粒子 ---
const MusicParticles = ({ analyzer }) => {
  const count = 800;
  const mesh = useRef();
  
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const t = Math.random() * 100;
      const factor = 20 + Math.random() * 100;
      const speed = 0.01 + Math.random() / 200;
      const x = (Math.random() - 0.5) * 15; 
      const y = (Math.random() - 0.5) * 15;
      const z = (Math.random() - 0.5) * 10;
      temp.push({ t, factor, speed, x, y, z });
    }
    return temp;
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(() => {
    if (!mesh.current) return;
    let scale = 1;
    let audioData = [];
    if (analyzer) {
      audioData = analyzer.getFrequencyData();
      let sum = 0;
      for(let i = 0; i < audioData.length; i++) sum += audioData[i];
      const average = sum / audioData.length;
      scale = 1 + average / 40;
    }
    particles.forEach((particle, i) => {
      let { t, factor, speed, x, y, z } = particle;
      t = particle.t += speed / 2;
      const s = Math.cos(t);
      const audioImpulse = audioData.length > 0 ? (audioData[i % audioData.length] / 255) : 0;
      dummy.position.set(
        x + Math.cos((t / 10) * factor) + (Math.sin(t * 1) * factor) / 10,
        y + Math.sin((t / 10) * factor) + (Math.cos(t * 2) * factor) / 10,
        z + (Math.sin(t) * factor) / 10
      );
      const finalScale = (Math.max(0.1, audioImpulse) * 1.5 * scale);
      dummy.scale.set(finalScale, finalScale, finalScale);
      dummy.rotation.set(s * 5, s * 5, s * 5);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <instancedMesh ref={mesh} args={[null, null, count]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color="#FFD700" emissive="#FF8C00" emissiveIntensity={1.5} transparent opacity={0.8}/>
      </instancedMesh>
    </Float>
  );
};

// --- 音訊分析 ---
class AudioAnalyzer {
  constructor(audioElement) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();
    this.source = this.ctx.createMediaElementSource(audioElement);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.source.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
  }
  getFrequencyData() {
    this.analyser.getByteFrequencyData(this.dataArray);
    return this.dataArray;
  }
  resume() { if (this.ctx.state === 'suspended') this.ctx.resume(); }
}

const AudioArGame = ({ song, onBack }) => {
  const webcamRef = useRef(null);
  const audioRef = useRef(null);
  const [analyzer, setAnalyzer] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = () => {
    if (audioRef.current) {
      if (!analyzer) {
        try {
          const newAnalyzer = new AudioAnalyzer(audioRef.current);
          setAnalyzer(newAnalyzer);
          newAnalyzer.resume();
        } catch (err) { console.error(err); }
      } else { analyzer.resume(); }
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: 'black', overflow: 'hidden' }}>
      
      {/* 音訊 */}
      <audio ref={audioRef} src={`/music/${song.audioFileName}`} crossOrigin="anonymous" loop onEnded={() => setIsPlaying(false)} />

      {/* 1. 攝影機 (z:0) */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
        <Webcam
          audio={false}
          style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
        />
      </div>

      {/* 2. 3D 畫布 (z:1) */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none' }}>
        <Canvas camera={{ position: [0, 0, 15], fov: 50 }} gl={{ alpha: true }} style={{ background: 'transparent' }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={2} />
          <MusicParticles analyzer={analyzer} />
        </Canvas>
      </div>

      {/* 3. UI (z:2) */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 2, pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        
        <div style={{ position: 'absolute', top: '20px', left: '20px', pointerEvents: 'auto' }}>
          <button onClick={onBack} style={{ padding: '10px 20px', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid white', borderRadius: '20px', cursor: 'pointer' }}>← 返回</button>
        </div>

        <div style={{ position: 'absolute', top: '20px', right: '20px', textAlign: 'right', color: 'white' }}>
           <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{song.title}</h2>
           <p>{song.singer}</p>
        </div>

        <div style={{ pointerEvents: 'auto' }}>
          <button onClick={handlePlay} style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'white', border: 'none', fontSize: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isPlaying ? 'II' : '▶'}
          </button>
        </div>

        <div style={{ position: 'absolute', bottom: '40px', color: 'white', background: 'rgba(0,0,0,0.5)', padding: '5px 15px', borderRadius: '15px' }}>
          {isPlaying ? "🎵 音樂粒子共鳴中..." : "點擊播放"}
        </div>
      </div>

    </div>
  );
};

export default AudioArGame;