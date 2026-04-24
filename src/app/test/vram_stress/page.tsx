'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { useState, useMemo, useRef, Suspense } from 'react'
import * as THREE from 'three'
import PerformanceOverlay from '@/components/test/PerformanceOverlay'
import DebugTools from '@/components/DebugTools'
import Loader3D from '@/components/ui/Loader3D'
import { OrbitControls, Environment, MeshTransmissionMaterial } from '@react-three/drei'

// 1. Geometrías pre-calculadas para evitar basura en el GC
const torusKnotGeom = new THREE.TorusKnotGeometry(1, 0.3, 128, 32)
const sphereGeom = new THREE.SphereGeometry(1, 64, 64)

function ComplexMaterials({ count }: { count: number }) {
  const objects = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => ({
      position: [
        (Math.random() - 0.5) * 25,
        (Math.random() - 0.5) * 25,
        (Math.random() - 0.5) * 25
      ] as [number, number, number],
      rotation: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI] as [number, number, number],
      scale: Math.random() * 1.5 + 0.5,
      color: new THREE.Color().setHSL(Math.random(), 0.7, 0.5),
      type: i % 3 // Distribuimos equitativamente los 3 tipos
    }))
  }, [count])

  const groupRef = useRef<THREE.Group>(null!)
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.05
    }
  })

  return (
    <group ref={groupRef}>
      {objects.map((obj, i) => (
        <mesh 
          key={i} 
          position={obj.position} 
          rotation={obj.rotation} 
          scale={obj.scale}
          geometry={i % 2 === 0 ? torusKnotGeom : sphereGeom}
        >
          {/* TIPO 0: TRANSMISIÓN (El más pesado) */}
          {obj.type === 0 && (
            <MeshTransmissionMaterial 
              backside
              samples={8} // Bajamos samples para que sea comparable a un setup estándar
              thickness={1.5}
              roughness={0.1}
              transmission={1}
              ior={1.2}
              chromaticAberration={0.05}
              color={obj.color}
            />
          )}
          
          {/* TIPO 1: METAL PURO (Reflejos HDRI) */}
          {obj.type === 1 && (
            <meshPhysicalMaterial 
              color={obj.color}
              metalness={1}
              roughness={0.05}
              clearcoat={1}
            />
          )}
          
          {/* TIPO 2: CLEARCOAT COMPLEJO (Sheen + Coat) */}
          {obj.type === 2 && (
            <meshPhysicalMaterial 
              color={obj.color}
              metalness={0.1}
              roughness={0.4}
              clearcoat={1}
              clearcoatRoughness={0.1}
              sheen={1}
              sheenRoughness={0.5}
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
    <main className="relative w-full h-screen bg-[#050505]">
      <PerformanceOverlay 
        title={`PBR Stress: ${count} Shaders Complejos`} 
        input={true} 
        count={count} 
        setCount={setCount} 
        inputConfig={{ unit: 'normal', type: 'power', min: 0, max: 12 }}
      />

      <Canvas 
        shadows={false} // Desactivamos sombras para aislar el costo del material
        camera={{ position: [0, 0, 40], fov: 45 }}
        gl={{ 
            antialias: true, 
            powerPreference: "high-performance" 
        }}
      >
        <DebugTools title="PBR / Transmission Stress" entityCount={count} />
        
        <Suspense fallback={<Loader3D />}>
          <OrbitControls makeDefault />
          
          {/* Environment es obligatorio para PBR. Preset 'studio' es neutro */}
          <Environment preset="studio" background blur={0.5} />
          
          <ComplexMaterials count={count} />
        </Suspense>
      </Canvas>
    </main>
  )
}