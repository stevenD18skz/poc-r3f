'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { useRef, useMemo } from 'react'
import * as THREE from 'three'
import PerformanceOverlay from '@/components/test/PerformanceOverlay'
import DebugTools from '@/components/DebugTools'
import { OrbitControls } from '@react-three/drei'

function MovingLight({ initialPosition, color, speed }: { initialPosition: [number, number, number], color: string, speed: number }) {
  const ref = useRef<THREE.PointLight>(null!)

  useFrame((state) => {
    const t = state.clock.getElapsedTime() * speed
    ref.current.position.x = initialPosition[0] + Math.sin(t) * 4
    ref.current.position.z = initialPosition[2] + Math.cos(t * 0.7) * 4
    ref.current.position.y = initialPosition[1] + Math.sin(t * 1.3) * 2
  })

  return <pointLight ref={ref} color={color} intensity={3} distance={12} castShadow />
}

function Floor() {
  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow>
      <planeGeometry args={[60, 60]} />
      <meshStandardMaterial color="#1a1a2e" roughness={0.8} metalness={0.2} />
    </mesh>
  )
}

function Pillars() {
  const pillars = useMemo(() => {
    const list = []
    for (let x = -20; x <= 20; x += 5) {
      for (let z = -20; z <= 20; z += 5) {
        list.push({ position: [x, 2, z] as [number, number, number] })
      }
    }
    return list
  }, [])

  return (
    <>
      {pillars.map((p, i) => (
        <mesh key={i} position={p.position} castShadow receiveShadow>
          <cylinderGeometry args={[0.3, 0.3, 4, 8]} />
          <meshStandardMaterial color="#2a2a4a" roughness={0.5} metalness={0.6} />
        </mesh>
      ))}
    </>
  )
}

function DynamicLightsScene({ count }: { count: number }) {
  const lights = useMemo(() => {
    const list = []
    for (let i = 0; i < count; i++) {
      list.push({
        position: [(Math.random() - 0.5) * 30, 2 + Math.random() * 4, (Math.random() - 0.5) * 30] as [number, number, number],
        color: `hsl(${(i / count) * 360}, 80%, 60%)`,
        speed: 0.3 + Math.random() * 1.5
      })
    }
    return list
  }, [count])

  return (
    <>
      <ambientLight intensity={0.05} />
      <Floor />
      <Pillars />
      {lights.map((l, i) => (
        <MovingLight key={i} initialPosition={l.position} color={l.color} speed={l.speed} />
      ))}
    </>
  )
}

export default function DynamicLightsTest() {
  return (
    <main className="w-full h-screen bg-[#050505] overflow-hidden">
      <PerformanceOverlay title="50 Luces Dinámicas + Sombras" />

      <Canvas camera={{ position: [15, 15, 15], fov: 50 }} shadows>
        <DebugTools />
        <OrbitControls makeDefault />
        <DynamicLightsScene count={50} />
      </Canvas>

      <div className="fixed bottom-0 left-0 w-full p-8 text-white/30 text-xs pointer-events-none text-center font-mono">
        SHADER STRESS - DYNAMIC POINT LIGHTS WITH SHADOW MAPS
      </div>
    </main>
  )
}
