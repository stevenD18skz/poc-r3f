'use client'

import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { Environment, OrbitControls } from '@react-three/drei'
import RoomGenerator from '@/components/gen/RoomGenerator'
import PerformanceOverlay from '@/components/test/PerformanceOverlay'
import DebugTools from '@/components/DebugTools'

export default function SceneIdleTest() {
  return (
    <main className="w-full h-screen bg-[#050505] overflow-hidden">
      <PerformanceOverlay title="Escena Idle (60s)" />
      
      <Canvas
        camera={{ position: [5, 1.6, 5], fov: 50 }}
        shadows
        gl={{ antialias: true }}
      >
        <DebugTools />
        
        <OrbitControls enablePan={false} enableZoom={false} enableRotate={false} />
        
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} castShadow />
        
        <Environment preset="forest" background />
        
        <Suspense fallback={null}>
          
        </Suspense>
      </Canvas>

      <div className="fixed bottom-0 left-0 w-full p-8 text-white/10 text-[10px] pointer-events-none text-center font-mono">
        STABLE MAPPED GEOMETRY - IDLE NO-INPUT MODE
      </div>
    </main>
  )
}
