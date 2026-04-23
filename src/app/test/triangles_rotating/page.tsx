'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { useRef, useEffect, useState, Suspense, useMemo } from 'react'
import * as THREE from 'three'
import PerformanceOverlay from '@/components/test/PerformanceOverlay'
import DebugTools from '@/components/DebugTools'
import { OrbitControls } from '@react-three/drei'

import Loader3D from '@/components/ui/Loader3D'

function InstancedRotatingTriangles({ count = 1000 }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const tempObject = new THREE.Object3D()
  
  // Create static data for positions and rotation speeds
  const particles = useMemo(() => {
    const temp = []
    for (let i = 0; i < count; i++) {
        const radius = 10 + Math.random() * 40
        const theta = Math.random() * Math.PI * 2
        const phi = Math.random() * Math.PI
        
        const x = radius * Math.sin(phi) * Math.cos(theta)
        const y = radius * Math.sin(phi) * Math.sin(theta)
        const z = radius * Math.cos(phi)
        
        const rotationSpeed = (Math.random() - 0.5) * 2
        const color = new THREE.Color(`hsl(${Math.random() * 70 + 150}, 80%, 50%)`)
        
        temp.push({ x, y, z, rotationSpeed, color })
    }
    return temp
  }, [count])

  // Initial setup: position and colors
  useEffect(() => {
    particles.forEach((p, i) => {
      tempObject.position.set(p.x, p.y, p.z)
      tempObject.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)
      tempObject.updateMatrix()
      meshRef.current.setMatrixAt(i, tempObject.matrix)
      meshRef.current.setColorAt(i, p.color)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true
  }, [particles, count])

  // Individual rotation per frame
  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    particles.forEach((p, i) => {
      tempObject.position.set(p.x, p.y, p.z)
      // Rotate individually based on their speed and time
      tempObject.rotation.set(
        t * p.rotationSpeed,
        t * (p.rotationSpeed / 2),
        t * (p.rotationSpeed * 0.8)
      )
      tempObject.updateMatrix()
      meshRef.current.setMatrixAt(i, tempObject.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[null!, null!, count]}>
      <coneGeometry args={[0.2, 0.4, 8]} />
      <meshStandardMaterial />
    </instancedMesh>
  )
}

export default function TrianglesRotatingTest() {
  const [count, setCount] = useState(32000)

  return (
    <main className="relative w-full h-screen bg-[#050505] overflow-hidden">
      <PerformanceOverlay 
        title={`${count} Triángulos Rotando`} 
        input={true} 
        count={count} 
        setCount={setCount}
        inputConfig={{
          unit: 'thousands',
          type: 'power',
          min: 0,
          max: 12
        }}
      />

      <Canvas
      camera={{ position: [120, 0, 0], fov: 50 }}
      >
          <DebugTools title="Triángulos Rotando" entityCount={count} />

          <Suspense fallback={<Loader3D />}>
            <OrbitControls makeDefault />
            <ambientLight intensity={1} />
            <InstancedRotatingTriangles count={count} />
          </Suspense>
      </Canvas>
    </main>
  )
}
