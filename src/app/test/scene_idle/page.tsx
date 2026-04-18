'use client'

import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { Environment, OrbitControls } from '@react-three/drei'
import PerformanceOverlay from '@/components/test/PerformanceOverlay'
import DebugTools from '@/components/DebugTools'
import Loader3D from '@/components/ui/Loader3D'

export default function SceneIdleTest() {
  return (
    <main className="w-full h-screen bg-[#050505] overflow-hidden">
      <PerformanceOverlay title="Escena Idle (60s)" />
      
      <Canvas
        camera={{ position: [120, 0, 0], fov: 50 }}
      >
        <DebugTools title="Escena Idle (60s)" />

        <Suspense fallback={<Loader3D />}> 
          <OrbitControls makeDefault />
          <Environment preset="forest" background />
        </Suspense>
      </Canvas>
    </main>
  )
}
