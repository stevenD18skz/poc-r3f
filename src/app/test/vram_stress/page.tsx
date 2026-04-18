'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { useState, useMemo, useRef, Suspense } from 'react'
import * as THREE from 'three'
import PerformanceOverlay from '@/components/test/PerformanceOverlay'
import DebugTools from '@/components/DebugTools'
import Loader3D from '@/components/ui/Loader3D'
import { OrbitControls, Environment, Sphere, Text } from '@react-three/drei'

// Generador de texturas procedurales pesadas para simular VRAM
function VramObject({ index, count }: { index: number, count: number }) {
  // Crear una textura procedural "ruidosa" que sea única para cada objeto
  // Esto obliga al navegador a guardarlas por separado en la memoria de video
  const texture = useMemo(() => {
    const size = 1024 // Texturas de 1K
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    
    // Dibujo aleatorio complejo para forzar datos en memoria
    for (let i = 0; i < 500; i++) {
        ctx.fillStyle = `hsl(${Math.random() * 360}, 100%, 50%)`
        ctx.fillRect(Math.random() * size, Math.random() * size, size/10, size/10)
    }
    
    const tex = new THREE.CanvasTexture(canvas)
    tex.anisotropy = 16
    return tex
  }, [index])

  const position: [number, number, number] = [
    (Math.random() - 0.5) * 20,
    (Math.random() - 0.5) * 20,
    (Math.random() - 0.5) * 20
  ]

  return (
    <mesh position={position} rotation={[Math.random() * Math.PI, 0, 0]}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial map={texture} roughness={0.3} metalness={0.7} />
    </mesh>
  )
}

function VramManager({ numTextures }: { numTextures: number }) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 10]} />
      {Array.from({ length: numTextures }).map((_, i) => (
        <VramObject key={i} index={i} count={numTextures} />
      ))}
    </>
  )
}

export default function VramStressTest() {
  const [numTextures, setNumTextures] = useState(32)

  return (
    <main className="relative w-full h-screen bg-[#050505] overflow-hidden">
      <PerformanceOverlay 
        title={`Estrés VRAM: ${numTextures} Texturas 1K`} 
        input={true} 
        count={numTextures} 
        setCount={setNumTextures} 
        unit="normal"
      />

      <Canvas camera={{ position: [0, 0, 30], fov: 45 }}>
        <DebugTools title="Estrés de VRAM" entityCount={numTextures} />
        <Suspense fallback={<Loader3D />}>
          <OrbitControls makeDefault autoRotate autoRotateSpeed={0.5} />
          <VramManager numTextures={numTextures} />
        </Suspense>
      </Canvas>
    </main>
  )
}
