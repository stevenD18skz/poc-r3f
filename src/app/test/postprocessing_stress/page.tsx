'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { useState, useMemo, useRef, Suspense } from 'react'
import * as THREE from 'three'
import PerformanceOverlay from '@/components/test/PerformanceOverlay'
import DebugTools from '@/components/DebugTools'
import Loader3D from '@/components/ui/Loader3D'
import { OrbitControls, Environment, Sphere } from '@react-three/drei'
import { EffectComposer, Bloom, SSAO, Vignette, Noise, BrightnessContrast, Scanline } from '@react-three/postprocessing'

function PostProcessingScene({ count }: { count: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const tempObject = new THREE.Object3D()

  const objects = useMemo(() => {
    const list = []
    for (let i = 0; i < count; i++) {
      list.push({
        position: [
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 20
        ] as [number, number, number],
        scale: Math.random() * 0.5 + 0.2,
        color: new THREE.Color(`hsl(${Math.random() * 360}, 80%, 60%)`),
        emissiveIntensity: Math.random() * 5 + 2 // Emisivo alto para activar el Bloom
      })
    }
    return list
  }, [count])

  useFrame((state) => {
    if (!meshRef.current) return
    const t = state.clock.getElapsedTime()
    objects.forEach((obj, i) => {
      tempObject.position.set(
        obj.position[0],
        obj.position[1] + Math.sin(t + i) * 1,
        obj.position[2]
      )
      tempObject.scale.setScalar(obj.scale)
      tempObject.updateMatrix()
      meshRef.current.setMatrixAt(i, tempObject.matrix)
      // Actualizamos color emisivo dinámicamente si fuera necesario
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[null!, null!, count]}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial 
        roughness={0} 
        metalness={1} 
        emissive="#ffffff" 
        emissiveIntensity={2}
      />
    </instancedMesh>
  )
}

export default function PostProcessingStressTest() {
  const [count, setCount] = useState(64)

  return (
    <main className="relative w-full h-screen bg-[#050505] overflow-hidden">
      <PerformanceOverlay 
        title={`Post-Procesado: ${count} Emisores`} 
        input={true} 
        count={count} 
        setCount={setCount} 
        inputConfig={{
          unit: 'normal',
          type: 'power',
          min: 0,
          max: 12
        }}
      />

      <Canvas camera={{ position: [0, 0, 30], fov: 45 }} shadows>
        <DebugTools title="Post-Procesado" entityCount={count} />
        
        <Suspense fallback={<Loader3D />}>
          <OrbitControls makeDefault />
          <Environment preset="night" />
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={10} color="#3b82f6" />
          
          <PostProcessingScene count={count} />

          {/* Capa de Post-procesado Pesado */}
          <EffectComposer>
            <SSAO 
              intensity={20}
              luminanceInfluence={0.5}
              radius={0.4}
              bias={0.035}
            />
            <Bloom 
              intensity={1.5} 
              luminanceThreshold={0.5} 
              luminanceSmoothing={0.9} 
              height={300} 
            />
            <Noise opacity={0.05} />
            <Vignette eskil={false} offset={0.1} darkness={1.1} />
            <BrightnessContrast brightness={0.05} contrast={0.1} />
          </EffectComposer>

          {/* Suelo para ver SSAO */}
          <mesh rotation-x={-Math.PI / 2} position={[0, -10, 0]} receiveShadow>
            <planeGeometry args={[100, 100]} />
            <meshStandardMaterial color="#111" roughness={0.5} />
          </mesh>
        </Suspense>
      </Canvas>
    </main>
  )
}
