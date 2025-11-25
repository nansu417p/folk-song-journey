import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Float, Stars } from '@react-three/drei';

// 3D 物件：收音機 (暫時用立方體代替)
const Radio = ({ position }) => {
  const mesh = useRef();
  const [hovered, setHover] = useState(false);
  const [active, setActive] = useState(false);

  // 讓它自轉
  useFrame((state, delta) => (mesh.current.rotation.y += delta * 0.5));

  return (
    <mesh
      position={position}
      ref={mesh}
      scale={active ? 1.2 : 1}
      onClick={() => setActive(!active)}
      onPointerOver={() => setHover(true)}
      onPointerOut={() => setHover(false)}
    >
      <boxGeometry args={[2, 1.5, 1]} />
      <meshStandardMaterial color={hovered ? 'hotpink' : 'orange'} />
      
      {/* 浮動文字標籤 */}
      {hovered && (
        <Text position={[0, 1.5, 0]} fontSize={0.5} color="white">
          點擊播放
        </Text>
      )}
    </mesh>
  );
};

// 3D 場景主體
const DormScene = () => {
  return (
    <>
      {/* 燈光 */}
      <ambientLight intensity={0.5} />
      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
      <pointLight position={[-10, -10, -10]} />

      {/* 星空背景 */}
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      {/* 漂浮的收音機 */}
      <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
        <Radio position={[0, 0, 0]} />
      </Float>

      {/* 文字說明 */}
      <Text position={[0, -2, 0]} fontSize={0.5} color="white" anchorX="center" anchorY="middle">
        歡迎來到 1980 時光宿舍 (3D 展示中)
      </Text>

      {/* 攝影機控制器 */}
      <OrbitControls enableZoom={true} />
    </>
  );
};

// 遊戲容器
const DormGame = ({ onBack }) => {
  return (
    <div className="w-full h-full relative bg-black">
      {/* 返回按鈕 */}
      <button 
        onClick={onBack}
        className="absolute top-4 left-4 z-50 px-4 py-2 bg-white/20 backdrop-blur text-white border border-white/30 rounded-full hover:bg-white hover:text-black transition font-bold"
      >
        ← 返回火車
      </button>

      {/* 3D 畫布 */}
      <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
        <DormScene />
      </Canvas>
      
      <div className="absolute bottom-4 left-0 w-full text-center text-white/50 text-sm pointer-events-none">
        使用滑鼠左鍵旋轉視角，滾輪縮放
      </div>
    </div>
  );
};

export default DormGame;