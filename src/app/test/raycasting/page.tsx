'use client'

import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber'
import { useState, useMemo, useRef, useCallback, useEffect, Suspense } from 'react'
import * as THREE from 'three'
import PerformanceOverlay from '@/components/test/PerformanceOverlay'
import DebugTools from '@/components/DebugTools'
import Loader3D from '@/components/ui/Loader3D'

// ─────────────────────────────────────────────
// PARÁMETROS DEL TEST (deben ser idénticos en Babylon)
// ─────────────────────────────────────────────
// Geometría: N esferas moviéndose en 3D (N draw calls, 1 por esfera)
// Raycasting: hover continuo contra N objetos en movimiento
// Click: elimina target + suma score
// Lo que mides: costo de raycast contra N transforms dinámicos por frame
// ─────────────────────────────────────────────

const SPHERE_SEGMENTS = 16 // Mismo en Babylon: segments: 16
const ARENA_SIZE = 20       // Radio del espacio de juego

interface TargetData {
  id: number
  position: THREE.Vector3
  velocity: THREE.Vector3
  scale: number
  color: string
}

function createTarget(id: number): TargetData {
  const theta = Math.random() * Math.PI * 2
  const phi = Math.random() * Math.PI
  const r = 5 + Math.random() * (ARENA_SIZE - 5)

  return {
    id,
    position: new THREE.Vector3(
      r * Math.sin(phi) * Math.cos(theta),
      Math.random() * 12 + 1,
      r * Math.sin(phi) * Math.sin(theta)
    ),
    velocity: new THREE.Vector3(
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 4
    ),
    scale: 0.4 + Math.random() * 0.6,
    color: `hsl(${Math.random() * 360}, 90%, 60%)`,
  }
}

// Esfera individual interactiva con movimiento
function Target({
  data,
  onHit,
}: {
  data: TargetData
  onHit: (id: number) => void
}) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const [hovered, setHovered] = useState(false)

  // Posición actual en ref para no triggear re-renders
  const pos = useRef(data.position.clone())
  const vel = useRef(data.velocity.clone())

  useFrame((_, delta) => {
    if (!meshRef.current) return

    // Mover
    pos.current.addScaledVector(vel.current, delta)

    // Rebotar en los límites del arena
    if (Math.abs(pos.current.x) > ARENA_SIZE) vel.current.x *= -1
    if (pos.current.y < 0.5 || pos.current.y > 15) vel.current.y *= -1
    if (Math.abs(pos.current.z) > ARENA_SIZE) vel.current.z *= -1

    meshRef.current.position.copy(pos.current)

    // Rotación visual
    meshRef.current.rotation.x += delta * 0.5
    meshRef.current.rotation.y += delta * 0.8
  })

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    onHit(data.id)
  }, [data.id, onHit])

  return (
    <mesh
      ref={meshRef}
      position={data.position}
      scale={hovered ? data.scale * 1.2 : data.scale}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true) }}
      onPointerOut={() => setHovered(false)}
      onClick={handleClick}
    >
      <sphereGeometry args={[1, SPHERE_SEGMENTS, SPHERE_SEGMENTS]} />
      <meshStandardMaterial
        color={data.color}
        emissive={data.color}
        emissiveIntensity={hovered ? 0.6 : 0.1}
        roughness={0.3}
        metalness={0.4}
      />
    </mesh>
  )
}

// Anillo visual de "arena"
function Arena() {
  return (
    <>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[ARENA_SIZE, 64]} />
        <meshStandardMaterial color="#0d0d1a" roughness={0.8} metalness={0.3} />
      </mesh>
      {/* Borde del arena */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 0]}>
        <ringGeometry args={[ARENA_SIZE - 0.3, ARENA_SIZE, 64]} />
        <meshBasicMaterial color="#6366f1" opacity={0.5} transparent />
      </mesh>
    </>
  )
}

function RaycastScene({
  targets,
  onHit,
}: {
  targets: TargetData[]
  onHit: (id: number) => void
}) {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 20, 10]} intensity={1.0} />
      <pointLight position={[0, 15, 0]} intensity={20} color="#a5b4fc" />

      <Arena />

      {targets.map((t) => (
        <Target key={t.id} data={t} onHit={onHit} />
      ))}
    </>
  )
}

// HUD: información de rendimiento del juego
function GameHUD({
  score,
  missed,
  count,
  active,
}: {
  score: number
  missed: number
  count: number
  active: number
}) {
  const accuracy = score + missed > 0 ? Math.round((score / (score + missed)) * 100) : 100

  return (
    <div className="fixed top-6 right-6 z-50 flex flex-col gap-3">
      {/* Score */}
      <div className="bg-black/80 backdrop-blur-xl border border-emerald-500/40 px-5 py-3 rounded-xl">
        <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Score</p>
        <p className="text-3xl font-mono font-black text-emerald-400">{score}</p>
      </div>

      {/* Accuracy */}
      <div className="bg-black/80 backdrop-blur-xl border border-blue-500/40 px-5 py-3 rounded-xl">
        <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Precisión</p>
        <p className="text-2xl font-mono font-black text-blue-400">{accuracy}%</p>
      </div>

      {/* Targets activos */}
      <div className="bg-black/80 backdrop-blur-xl border border-purple-500/40 px-5 py-3 rounded-xl">
        <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Targets activos</p>
        <p className="text-2xl font-mono font-black text-purple-400">
          {active} <span className="text-gray-500 text-sm">/ {count}</span>
        </p>
      </div>
    </div>
  )
}

// Crosshair
function Crosshair() {
  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-40">
      <div className="relative w-8 h-8">
        <div className="absolute top-1/2 left-0 right-0 h-px bg-white/60 -translate-y-1/2" />
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/60 -translate-x-1/2" />
        <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80" />
      </div>
    </div>
  )
}

export default function RaycastTest() {
  const [count, setCount] = useState(50)
  const [score, setScore] = useState(0)
  const [missed, setMissed] = useState(0)
  const nextId = useRef(0)

  // Inicializar targets
  const [targets, setTargets] = useState<TargetData[]>(() =>
    Array.from({ length: 50 }, () => createTarget(nextId.current++))
  )

  // Resetear targets cuando cambia el count
  useEffect(() => {
    nextId.current = 0
    setTargets(Array.from({ length: count }, () => createTarget(nextId.current++)))
    setScore(0)
    setMissed(0)
  }, [count])

  // Click en el fondo = missed
  const handleMissed = useCallback(() => {
    setMissed((prev) => prev + 1)
  }, [])

  // Hit en un target: eliminar + reemplazar con uno nuevo
  const handleHit = useCallback((id: number) => {
    setScore((prev) => prev + 1)
    setTargets((prev) => {
      const filtered = prev.filter((t) => t.id !== id)
      // Reemplazar con un nuevo target para mantener el count
      return [...filtered, createTarget(nextId.current++)]
    })
  }, [])

  return (
    <main
      className="relative w-full h-screen bg-[#050505] overflow-hidden cursor-crosshair"
      onClick={handleMissed}
    >
      <PerformanceOverlay
        title={`Raycasting: ${count} Targets Dinámicos`}
        input={true}
        count={count}
        setCount={setCount}
        inputConfig={{
          unit: 'normal',
          type: 'increment',
          min: 1,
          max: 500
        }}
      />

      <GameHUD
        score={score}
        missed={missed}
        count={count}
        active={targets.length}
      />

      <Crosshair />

      <Canvas camera={{ position: [0, 15, 30], fov: 50 }}>
        <DebugTools title="Raycasting Dinámico" entityCount={count} />

        <Suspense fallback={<Loader3D />}>
          <RaycastScene targets={targets} onHit={handleHit} />
        </Suspense>
      </Canvas>

      {/* Info del test */}
      <div className="absolute bottom-6 left-6 bg-black bg-opacity-70 p-4 rounded-lg border border-indigo-500 text-white text-xs max-w-xs">
        <h3 className="font-bold text-indigo-400 mb-2">Especificaciones del test</h3>
        <ul className="space-y-1 text-gray-300">
          <li>• Targets: {count} esferas en movimiento</li>
          <li>• Geometría: esfera {SPHERE_SEGMENTS} segmentos</li>
          <li>• Draw calls: {count} (1 por target)</li>
          <li>• Raycast: hover continuo contra {count} transforms/frame</li>
          <li>• Cuello de botella: O(n) intersection tests por frame</li>
          <li>• Click izquierdo en fondo = missed</li>
        </ul>
      </div>
    </main>
  )
}