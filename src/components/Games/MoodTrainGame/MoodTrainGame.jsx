import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Text, Float, useTexture } from '@react-three/drei';
import * as THREE from 'three';

// --- 1. 窗外飛逝的風景 (模擬速度感) ---
const MovingScenery = () => {
  const mesh = useRef();
  useFrame((state, delta) => {
    if (mesh.current) {
      // 讓星星向後移動，模擬火車向前開
      mesh.current.rotation.x += delta * 0.2;
    }
  });

  return (
    <group position={[10, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
      {/* 利用星空模擬窗外飛逝的燈光 */}
      <mesh ref={mesh}>
         <cylinderGeometry args={[20, 20, 60, 8, 1, true]} />
         <meshBasicMaterial color="#000" side={THREE.BackSide} /> 
         <Stars radius={18} depth={5} count={1000} factor={6} saturation={0} fade speed={5} />
      </mesh>
    </group>
  );
};

// --- 2. 車廂內部結構 ---
const Cabin = () => {
  return (
    <group>
      {/* 地板 */}
      <mesh position={[0, -2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#5D4037" roughness={0.8} /> {/* 深木頭色 */}
      </mesh>

      {/* 天花板 */}
      <mesh position={[0, 3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#D7CCC8" /> {/* 米色 */}
      </mesh>

      {/* 左牆 (有窗戶) */}
      <group position={[3, 0.5, 0]}>
        {/* 牆壁主體 (挖洞概念：用上下左右四塊拼起來) */}
        <mesh position={[0, -1.5, 0]}> {/* 下牆 */}
           <boxGeometry args={[0.2, 2, 10]} />
           <meshStandardMaterial color="#8D6E63" />
        </mesh>
        <mesh position={[0, 2, 0]}> {/* 上牆 */}
           <boxGeometry args={[0.2, 2, 10]} />
           <meshStandardMaterial color="#8D6E63" />
        </mesh>
        <mesh position={[0, 0.25, 3.5]}> {/* 側柱 */}
           <boxGeometry args={[0.2, 1.5, 3]} />
           <meshStandardMaterial color="#8D6E63" />
        </mesh>
        <mesh position={[0, 0.25, -3.5]}> {/* 側柱 */}
           <boxGeometry args={[0.2, 1.5, 3]} />
           <meshStandardMaterial color="#8D6E63" />
        </mesh>

        {/* 窗框 */}
        <mesh position={[0, 0.25, 0]}>
           <boxGeometry args={[0.1, 1.6, 4.2]} />
           <meshStandardMaterial color="#3E2723" />
        </mesh>
      </group>

      {/* 右牆 (封閉) */}
      <mesh position={[-3, 0.5, 0]}>
        <boxGeometry args={[0.2, 5, 10]} />
        <meshStandardMaterial color="#8D6E63" />
      </mesh>

      {/* 前牆 */}
      <mesh position={[0, 0.5, -5]}>
        <boxGeometry args={[6, 5, 0.2]} />
        <meshStandardMaterial color="#6D4C41" />
      </mesh>
      
      {/* 後牆 */}
      <mesh position={[0, 0.5, 5]}>
        <boxGeometry args={[6, 5, 0.2]} />
        <meshStandardMaterial color="#6D4C41" />
      </mesh>
    </group>
  );
};

// --- 3. 家具與物件 ---
const Furniture = () => {
  const [hovered, setHover] = useState(false);

  return (
    <group>
      {/* 桌子 */}
      <mesh position={[1.5, -0.8, 0]}>
        <boxGeometry args={[2, 0.1, 3]} />
        <meshStandardMaterial color="#3E2723" roughness={0.5} />
      </mesh>
      {/* 桌腳 */}
      <mesh position={[2.4, -1.5, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 1.4]} />
        <meshStandardMaterial color="#222" />
      </mesh>

      {/* 座椅 (你坐的位置) */}
      {/* 簡單用兩個方塊拼 */}
      <group position={[-1, -1.2, 0]} rotation={[0, Math.PI/2, 0]}>
         <mesh position={[0, 0, 0]}> {/* 椅墊 */}
            <boxGeometry args={[3, 0.3, 1.5]} />
            <meshStandardMaterial color="#2E7D32" /> {/* 復古綠絨布 */}
         </mesh>
         <mesh position={[0, 1, -0.7]}> {/* 椅背 */}
            <boxGeometry args={[3, 2, 0.2]} />
            <meshStandardMaterial color="#2E7D32" />
         </mesh>
      </group>

      {/* 對面座椅 */}
      <group position={[2.5, -1.2, 0]} rotation={[0, -Math.PI/2, 0]}>
         <mesh position={[0, 0, 0]}> 
            <boxGeometry args={[3, 0.3, 1.5]} />
            <meshStandardMaterial color="#2E7D32" /> 
         </mesh>
         <mesh position={[0, 1, -0.7]}> 
            <boxGeometry args={[3, 2, 0.2]} />
            <meshStandardMaterial color="#2E7D32" />
         </mesh>
      </group>

      {/* 心情收音機 (互動核心) */}
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
        <group 
          position={[1.5, -0.4, 0]} 
          rotation={[0, -Math.PI/2, 0]}
          onPointerOver={() => setHover(true)}
          onPointerOut={() => setHover(false)}
          onClick={() => alert("即將啟動表情辨識...")}
        >
           {/* 機身 */}
           <mesh>
             <boxGeometry args={[1.2, 0.6, 0.4]} />
             <meshStandardMaterial color={hovered ? "#FF5252" : "#D84315"} />
           </mesh>
           {/* 喇叭網格 */}
           <mesh position={[0.3, 0, 0.21]}>
             <circleGeometry args={[0.2, 32]} />
             <meshStandardMaterial color="#222" />
           </mesh>
           {/* 提示文字 */}
           <Text position={[0, 0.5, 0]} fontSize={0.15} color="white" anchorX="center" anchorY="middle">
             {hovered ? "點擊啟動心情" : "Old Radio"}
           </Text>
        </group>
      </Float>
    </group>
  );
};

// --- 4. 主場景 ---
const MoodTrainGame = ({ onBack }) => {
  return (
    <div className="w-full h-full relative bg-black">
      
      {/* UI 層 */}
      <div className="absolute top-0 left-0 w-full p-6 z-50 flex justify-between items-start pointer-events-none">
        <button 
          onClick={onBack}
          className="px-6 py-2 bg-white/10 backdrop-blur text-white border border-white/30 rounded-full hover:bg-white hover:text-black transition font-bold pointer-events-auto"
        >
          ← 離開座位
        </button>
        
        <div className="text-right text-white/80">
           <h2 className="text-2xl font-bold">心情列車</h2>
           <p className="text-sm">目前位置：民歌 1980 號線</p>
        </div>
      </div>

      {/* 3D Canvas */}
      <Canvas camera={{ position: [-0.5, 0, 0], fov: 60 }}>
        {/* 燈光氛圍 */}
        <ambientLight intensity={0.4} />
        <pointLight position={[0, 2, 0]} intensity={1.5} color="#FFF3E0" distance={5} /> {/* 車頂暖燈 */}
        <spotLight position={[3, 2, 0]} angle={0.5} intensity={2} castShadow /> {/* 窗外射入的光 */}

        {/* 場景物件 */}
        <MovingScenery />
        <Cabin />
        <Furniture />

        {/* 控制器：限制只能坐在位置上轉頭，不能亂跑 */}
        <OrbitControls 
          enableZoom={false} 
          enablePan={false} 
          maxPolarAngle={Math.PI / 1.8} // 不能看地板底下
          minPolarAngle={Math.PI / 3}   // 不能看天花板上面
          maxAzimuthAngle={Math.PI / 2} // 限制左右轉頭角度
          minAzimuthAngle={-Math.PI / 2}
        />
      </Canvas>

      <div className="absolute bottom-8 left-0 w-full text-center text-white/40 text-sm pointer-events-none">
         拖曳畫面查看車廂 • 點擊收音機
      </div>
    </div>
  );
};

export default MoodTrainGame;