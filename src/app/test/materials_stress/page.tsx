'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { useState, useMemo, useRef, Suspense } from 'react'
import * as THREE from 'three'
import PerformanceOverlay from '@/components/test/PerformanceOverlay'
import DebugTools from '@/components/DebugTools'
import Loader3D from '@/components/ui/Loader3D'
import { OrbitControls, Environment, MeshTransmissionMaterial } from '@react-three/drei'

function ComplexMaterials({ count }: { count: number }) {
  const objects = useMemo(() => {
    const list = []
    for (let i = 0; i < count; i++) {
      list.push({
        position: [
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 20
        ] as [number, number, number],
        rotation: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI] as [number, number, number],
        scale: Math.random() * 1.5 + 0.5,
        color: `hsl(${Math.random() * 360}, 80%, 60%)`,
        // Distribuimos distintos tipos de materiales pesados
        type: Math.floor(Math.random() * 3) // 0: Vidrio (Transmission), 1: Metálico, 2: Clearcoat
      })
    }
    return list
  }, [count])

  // Rotamos suavemente todo el grupo para ver reflejos dinámicos
  const groupRef = useRef<THREE.Group>(null!)
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.1
      groupRef.current.rotation.x = state.clock.getElapsedTime() * 0.05
    }
  })

  return (
    <group ref={groupRef}>
      {objects.map((obj, i) => (
        <mesh key={i} position={obj.position} rotation={obj.rotation} scale={obj.scale}>
          {/* Mezclamos geometrías para más variedad */}
          {i % 2 === 0 ? <torusKnotGeometry args={[1, 0.3, 128, 32]} /> : <sphereGeometry args={[1, 64, 64]} />}
          
          {obj.type === 0 && (
            <MeshTransmissionMaterial 
              backside 
              thickness={2} 
              roughness={0} 
              transmission={1} 
              ior={1.5} 
              chromaticAberration={0.06} 
              anisotropy={0.1}
              color={obj.color}
            />
          )}
          
          {obj.type === 1 && (
            <meshPhysicalMaterial 
              color={obj.color}
              metalness={1}
              roughness={0.1}
              clearcoat={1}
              clearcoatRoughness={0.1}
            />
          )}
          
          {obj.type === 2 && (
            <meshPhysicalMaterial 
              color={obj.color}
              metalness={0.2}
              roughness={0.8}
              clearcoat={1}
              clearcoatRoughness={0.2}
              sheen={1}
              sheenColor="#ffffff"
            />
          )}
        </mesh>
      ))}
    </group>
  )
}

export default function MaterialsStressTest() {
  const [count, setCount] = useState(32)

  return (
    <main className="relative w-full h-screen bg-[#050505] overflow-hidden">
      <PerformanceOverlay 
        title={`Estrés de Materiales: ${count} PBR`} 
        input={true} 
        count={count} 
        setCount={setCount} 
        unit="normal"
      />

      <Canvas camera={{ position: [0, 0, 35], fov: 45 }}>
        <DebugTools title="Estrés PBR" entityCount={count} />
        
        <Suspense fallback={<Loader3D />}>
          <OrbitControls makeDefault autoRotate autoRotateSpeed={0.5} />
          
          {/* El entorno HDRI es crucial para evaluar los materiales físicos (reflejos y refracción) */}
          <Environment preset="studio" background />
          
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 10]} intensity={2} />
          <directionalLight position={[-10, -10, -10]} intensity={1} color="#4f46e5" />

          <ComplexMaterials count={count} />
        </Suspense>
      </Canvas>
    </main>
  )
}
