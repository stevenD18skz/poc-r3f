'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { useState, useMemo, useRef, Suspense } from 'react'
import * as THREE from 'three'
import PerformanceOverlay from '@/components/test/PerformanceOverlay'
import DebugTools from '@/components/DebugTools'
import Loader3D from '@/components/ui/Loader3D'
import { OrbitControls, SoftShadows, Environment } from '@react-three/drei'

function ShadowObjects({ count }: { count: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const tempObject = new THREE.Object3D()

  const positions = useMemo(() => {
    const list = []
    for (let i = 0; i < count; i++) {
      list.push({
        x: (Math.random() - 0.5) * 20,
        y: Math.random() * 10 + 2,
        z: (Math.random() - 0.5) * 20,
        rx: Math.random() * Math.PI,
        ry: Math.random() * Math.PI,
        rz: Math.random() * Math.PI,
        scale: Math.random() * 0.5 + 0.5
      })
    }
    return list
  }, [count])

  useFrame((state) => {
    if (!meshRef.current) return
    const t = state.clock.getElapsedTime()
    
    positions.forEach((p, i) => {
      tempObject.position.set(p.x, p.y + Math.sin(t + i) * 1.5, p.z)
      tempObject.rotation.set(p.rx + t * 0.5, p.ry + t * 0.3, p.rz)
      tempObject.scale.setScalar(p.scale)
      tempObject.updateMatrix()
      meshRef.current.setMatrixAt(i, tempObject.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[null!, null!, count]} castShadow receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#f87171" roughness={0.4} metalness={0.1} />
    </instancedMesh>
  )
}

function MovingLight({ position, color, radius, speed }: { position: [number, number, number], color: string, radius: number, speed: number }) {
  const lightRef = useRef<THREE.SpotLight>(null!)
  const target = useMemo(() => new THREE.Object3D(), [])

  useFrame((state) => {
    const t = state.clock.getElapsedTime() * speed
    if (lightRef.current) {
      lightRef.current.position.x = position[0] + Math.sin(t) * radius
      lightRef.current.position.z = position[2] + Math.cos(t) * radius
      target.position.x = Math.sin(t * 0.5) * 5
      target.position.z = Math.cos(t * 0.5) * 5
    }
  })

  return (
    <>
      <spotLight
        ref={lightRef}
        position={position}
        color={color}
        intensity={20}
        angle={Math.PI / 3}
        penumbra={1}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0001}
        target={target}
      />
      <primitive object={target} />
    </>
  )
}

export default function ShadowsStressTest() {
  const [count, setCount] = useState(500)

  return (
    <main className="relative w-full h-screen bg-[#050505] overflow-hidden">
      <PerformanceOverlay 
        title={`Estrés de Sombras: ${count} Objetos`} 
        input={true} 
        count={count} 
        setCount={setCount} 
        unit="normal"
      />

      <Canvas camera={{ position: [0, 15, 30], fov: 50 }} shadows>
        <DebugTools title="Estrés de Sombras" entityCount={count} />
        
        <Suspense fallback={<Loader3D />}>
          <SoftShadows size={20} samples={16} focus={0.5} />
          <OrbitControls makeDefault />
          <Environment preset="night" />
          
          <ambientLight intensity={0.2} />
          
          {/* Múltiples luces arrojando sombras simultáneamente */}
          <MovingLight position={[10, 15, 0]} color="#60a5fa" radius={10} speed={0.5} />
          <MovingLight position={[-10, 15, 0]} color="#fb923c" radius={10} speed={0.7} />
          <MovingLight position={[0, 15, 10]} color="#34d399" radius={10} speed={0.3} />

          <ShadowObjects count={count} />
          
          {/* Suelo que recibe todas las sombras */}
          <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]} receiveShadow>
            <planeGeometry args={[100, 100]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
        </Suspense>
      </Canvas>
    </main>
  )
}
