'use client'

import { Canvas } from '@react-three/fiber'
import { useRef, useEffect, useState, Suspense } from 'react'
import * as THREE from 'three'
import PerformanceOverlay from '@/components/test/PerformanceOverlay'
import DebugTools from '@/components/DebugTools'
import { OrbitControls } from '@react-three/drei'

import Loader3D from '@/components/ui/Loader3D'

function InstancedTriangles({ count = 10000 }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const tempObject = new THREE.Object3D()

  useEffect(() => {
    for (let i = 0; i < count; i++) {
      const radius = 10 + Math.random() * 40
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      
      tempObject.position.set(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
      )
      
      tempObject.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)
      tempObject.updateMatrix()
      meshRef.current.setMatrixAt(i, tempObject.matrix)
      
      // Random colors for aesthetics
      meshRef.current.setColorAt(i, new THREE.Color(`hsl(${Math.random() * 50 + 200}, 80%, 50%)`))
    }
    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true
  }, [count])
 

  return (
    <instancedMesh ref={meshRef} args={[null!, null!, count]}>
      <coneGeometry args={[0.2, 0.4, 8]} />
      <meshStandardMaterial />
    </instancedMesh>
  )
}

export default function TrianglesStaticTest() {
  const [count, setCount] = useState(32000)

  return (
    <main className="relative w-full h-screen bg-[#050505] overflow-hidden">
      <PerformanceOverlay 
        title={`${count} Triángulos Estáticos`} 
        input={true} 
        count={count} 
        setCount={setCount} 
      />

      <Canvas camera={{ position: [20, 20, 20], fov: 50 }}>
          <DebugTools title="Triángulos Estáticos" entityCount={count} />

          <Suspense fallback={<Loader3D />}>
            <OrbitControls makeDefault />
            
            <ambientLight intensity={1} />
            <InstancedTriangles count={count} />
          </Suspense>
      </Canvas>
    </main>
  )
}
