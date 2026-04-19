'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { useState, useMemo, useRef, Suspense } from 'react'
import * as THREE from 'three'
import PerformanceOverlay from '@/components/test/PerformanceOverlay'
import DebugTools from '@/components/DebugTools'
import Loader3D from '@/components/ui/Loader3D'
import { OrbitControls } from '@react-three/drei'

// ─────────────────────────────────────────────
// PARÁMETROS DEL TEST (deben ser idénticos en Babylon)
// ─────────────────────────────────────────────
// Geometría: N cajas estáticas (instanciadas, 1 draw call)
// Luces: 1 ambient + 3 SpotLights dinámicas con sombras
// SoftShadows: NO (no existe en Babylon)
// Variable: cantidad de objetos que reciben/lanzan sombra
// CPU overhead: mínimo (solo 3 movimientos de luz por frame)
// Lo que mides: costo GPU de recalcular shadow maps cada frame
// ─────────────────────────────────────────────

// Spotlight que se mueve, CPU cost: solo 1 operación por frame
function MovingSpotLight({
  index,
  total,
  height = 15,
}: {
  index: number
  total: number
  height?: number
}) {
  const lightRef = useRef<THREE.SpotLight>(null!)
  const targetRef = useRef<THREE.Object3D>(null!)
  const target = useMemo(() => new THREE.Object3D(), [])

  const baseAngle = (index / total) * Math.PI * 2
  const orbitRadius = 12
  const speed = 0.3 + index * 0.1

  useFrame((state) => {
    const t = state.clock.getElapsedTime() * speed
    lightRef.current.position.x = Math.cos(t + baseAngle) * orbitRadius
    lightRef.current.position.z = Math.sin(t + baseAngle) * orbitRadius
    lightRef.current.position.y = height

    // El foco apunta siempre al centro (0,0,0)
    target.position.set(0, 0, 0)
  })

  const color = `hsl(${(index / total) * 360}, 100%, 65%)`

  return (
    <>
      <spotLight
        ref={lightRef}
        color={color}
        intensity={80}
        angle={Math.PI / 5}
        penumbra={0.3}
        castShadow
        shadow-mapSize={[512, 512]} // Balance entre calidad y perf
        shadow-bias={-0.0005}
        target={target}
      />
      <primitive object={target} />

      {/* Esfera visual para ver la posición de la luz */}
      <mesh position={[0, height, 0]}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </>
  )
}

// Cajas instanciadas ESTÁTICAS - 1 draw call, no toca useFrame
// Los objetos no se mueven → CPU = 0 overhead
// Las sombras se recalculan igual porque las LUCES se mueven
function StaticBoxes({ count }: { count: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const tempObject = new THREE.Object3D()

  // Posiciones calculadas una sola vez
  const positions = useMemo(() => {
    const list = []
    for (let i = 0; i < count; i++) {
      list.push({
        x: (Math.random() - 0.5) * 24,
        y: Math.random() * 6 + 0.5,
        z: (Math.random() - 0.5) * 24,
        rx: Math.random() * Math.PI,
        ry: Math.random() * Math.PI,
        scale: 0.5 + Math.random() * 1.0,
      })
    }
    return list
  }, [count])

  // Solo se ejecuta cuando cambia count (no cada frame)
  // biome-ignore: positions es el trigger intencional
  const ref = useRef(false)
  useMemo(() => {
    ref.current = false
  }, [count])

  useFrame(() => {
    if (ref.current || !meshRef.current) return
    ref.current = true

    positions.forEach((p, i) => {
      tempObject.position.set(p.x, p.y, p.z)
      tempObject.rotation.set(p.rx, p.ry, 0)
      tempObject.scale.setScalar(p.scale)
      tempObject.updateMatrix()
      meshRef.current.setMatrixAt(i, tempObject.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, count]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#94a3b8" roughness={0.5} metalness={0.1} />
    </instancedMesh>
  )
}

function ShadowScene({ count }: { count: number }) {
  return (
    <>
      {/* Ambient mínimo para que se vea algo en sombra */}
      <ambientLight intensity={0.2} />

      {/* 3 SpotLights dinámicas con sombras */}
      <MovingSpotLight index={0} total={3} />
      <MovingSpotLight index={1} total={3} />
      <MovingSpotLight index={2} total={3} />

      {/* Objetos estáticos que lanzan y reciben sombra */}
      <StaticBoxes count={count} />

      {/* Piso que recibe sombras */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#1e293b" roughness={0.8} metalness={0.2} />
      </mesh>
    </>
  )
}

export default function ShadowsStressTest() {
  const [count, setCount] = useState(64)

  return (
    <main className="relative w-full h-screen bg-[#050505] overflow-hidden">
      <PerformanceOverlay
        title={`Sombras: ${count} Objetos Estáticos`}
        input={true}
        count={count}
        setCount={setCount}
        unit="normal"
      />

      <Canvas camera={{ position: [0, 20, 35], fov: 50 }} shadows>
        <DebugTools title="Estrés de Sombras" entityCount={count} />

        <Suspense fallback={<Loader3D />}>
          <OrbitControls makeDefault maxPolarAngle={Math.PI / 2 - 0.05} />
          <ShadowScene count={count} />
        </Suspense>
      </Canvas>

      {/* Info del test */}
      <div className="absolute bottom-6 left-6 bg-black bg-opacity-70 p-4 rounded-lg border border-yellow-500 text-white text-xs max-w-xs">
        <h3 className="font-bold text-yellow-400 mb-2">Especificaciones del test</h3>
        <ul className="space-y-1 text-gray-300">
          <li>• Objetos: {count} cajas estáticas (1 draw call)</li>
          <li>• Luces: 3 SpotLights dinámicas</li>
          <li>• Shadow maps: 512×512 por luz</li>
          <li>• Shadow renders por frame: 3</li>
          <li>• CPU overhead: mínimo (solo movimiento de luces)</li>
          <li>• Cuello de botella: GPU shadow rendering</li>
        </ul>
      </div>
    </main>
  )
}