'use client'

import React, { Suspense, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF, useAnimations, Environment, ContactShadows } from '@react-three/drei'
import { useControls } from 'leva'
import Castle from './models/castle'
import Character from './models/Character'

function Cubone() {
  const { scene } = useGLTF('/models/sims/Cubone.glb')
  useEffect(() => {
    scene.traverse((child: any) => {
      if (child.isMesh) child.castShadow = true
    })
  }, [scene])
  return <primitive object={scene} position={[2, 0, 0]} />
}

// 3 models from Cube World Kit
function Dog() {
  const { scene } = useGLTF('/models/sims/Cube World Kit-glb/Dog.glb')
  useEffect(() => {
    scene.traverse((child: any) => {
      if (child.isMesh) child.castShadow = true
    })
  }, [scene])
  return <primitive object={scene} position={[-2, 0, 1]} />
}

function Cat() {
  const { scene } = useGLTF('/models/sims/Cube World Kit-glb/Cat.glb')
  useEffect(() => {
    scene.traverse((child: any) => {
      if (child.isMesh) child.castShadow = true
    })
  }, [scene])
  return <primitive object={scene} position={[2, 0, -2]} />
}

function Tree() {
  const { scene } = useGLTF('/models/sims/Cube World Kit-glb/Tree.glb')
  useEffect(() => {
    scene.traverse((child: any) => {
      if (child.isMesh) child.castShadow = true
    })
  }, [scene])
  return <primitive object={scene} position={[-3, 0, -3]} />
}

export default function SimsPage() {
  return (
    <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0 }}>
      <Canvas shadows camera={{ position: [8, 5, 8], fov: 50 }}>
        <color attach="background" args={['#87CEEB']} />
        
        <ambientLight intensity={0.6} />
        <directionalLight 
          position={[10, 20, 10]} 
          intensity={1.5} 
          castShadow 
          shadow-mapSize={2048}
          shadow-bias={-0.0001}
        />
        <Environment preset="sunset" />

        <Suspense fallback={null}>
          <Castle scale={20}/>
          <Character />
          <Cubone />
          <Dog />
          <Cat />
          <Tree />
          <ContactShadows position={[0, -0.49, 0]} opacity={0.5} scale={20} blur={2} far={4} />
        </Suspense>

        <OrbitControls makeDefault />
      </Canvas>
    </div>
  )
}

useGLTF.preload('/models/sims/Castle.glb')
useGLTF.preload('/models/sims/Character Animated.glb')
useGLTF.preload('/models/sims/Cubone.glb')
useGLTF.preload('/models/sims/Cube World Kit-glb/Dog.glb')
useGLTF.preload('/models/sims/Cube World Kit-glb/Cat.glb')
useGLTF.preload('/models/sims/Cube World Kit-glb/Tree.glb')
