'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useState, useMemo, useRef, useCallback, useEffect, Suspense } from 'react'
import * as THREE from 'three'
import PerformanceOverlay from '@/components/test/PerformanceOverlay'
import DebugTools from '@/components/DebugTools'
import Loader3D from '@/components/ui/Loader3D'

// ─────────────────────────────────────────────
// PARÁMETROS DEL TEST (deben ser idénticos en Babylon)
// ─────────────────────────────────────────────
// Geometría: N esferas moviéndose en 3D (N draw calls, 1 por esfera)
// Raycasting: manual en useFrame contra N meshes reales
// Intersection Time: medido con performance.now() alrededor del cast real
// Click: elimina target + suma score
// ─────────────────────────────────────────────

const SPHERE_SEGMENTS = 16
const ARENA_SIZE = 20

const sharedGeometry = new THREE.SphereGeometry(1, SPHERE_SEGMENTS, SPHERE_SEGMENTS)

interface TargetData {
  id: number
  position: THREE.Vector3
  velocity: THREE.Vector3
  scale: number
  color: THREE.Color
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
    color: new THREE.Color().setHSL(Math.random(), 0.9, 0.6),
  }
}

// ─────────────────────────────────────────────
// TARGET
// ─────────────────────────────────────────────
function Target({
  data,
  onHit,
  meshRegistry,
}: {
  data: TargetData
  onHit: (id: number) => void
  meshRegistry: React.MutableRefObject<Map<number, THREE.Mesh>>
}) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const matRef = useRef<THREE.MeshStandardMaterial>(null!)
  const isHovered = useRef(false)
  const pos = useRef(data.position.clone())
  const vel = useRef(data.velocity.clone())

  // ✅ Registrar el mesh en el mapa global para el raycaster manual
  useEffect(() => {
    if (meshRef.current) {
      meshRegistry.current.set(data.id, meshRef.current)
    }
    return () => {
      meshRegistry.current.delete(data.id)
    }
  }, [data.id, meshRegistry])

  useFrame((_, delta) => {
    if (!meshRef.current) return

    pos.current.addScaledVector(vel.current, delta)
    if (Math.abs(pos.current.x) > ARENA_SIZE) vel.current.x *= -1
    if (pos.current.y < 0.5 || pos.current.y > 15) vel.current.y *= -1
    if (Math.abs(pos.current.z) > ARENA_SIZE) vel.current.z *= -1
    meshRef.current.position.copy(pos.current)

    const targetScale = isHovered.current ? data.scale * 1.3 : data.scale
    meshRef.current.scale.lerp(
      new THREE.Vector3(targetScale, targetScale, targetScale),
      0.2
    )

    matRef.current.emissiveIntensity = THREE.MathUtils.lerp(
      matRef.current.emissiveIntensity,
      isHovered.current ? 0.8 : 0.1,
      0.2
    )
  })

  return (
    <mesh
      ref={meshRef}
      geometry={sharedGeometry}
      onPointerOver={(e) => { e.stopPropagation(); isHovered.current = true }}
      onPointerOut={() => { isHovered.current = false }}
      onClick={(e) => { e.stopPropagation(); onHit(data.id) }}
    >
      <meshStandardMaterial
        ref={matRef}
        color={data.color}
        emissive={data.color}
        roughness={0.3}
        metalness={0.4}
      />
    </mesh>
  )
}

// ─────────────────────────────────────────────
// RAYCAST MONITOR MANUAL
// ✅ Hace un raycast real contra los meshes registrados
// y mide el tiempo exacto con performance.now()
// Esto sí se ejecuta y mide lo que queremos
// ─────────────────────────────────────────────
function RaycastMonitor({
  meshRegistry,
  onUpdate,
}: {
  meshRegistry: React.MutableRefObject<Map<number, THREE.Mesh>>
  onUpdate: (ms: number) => void
}) {
  const { camera, raycaster, pointer } = useThree()

  // Suavizado de la métrica para que no salte tanto
  const smoothedTime = useRef(0)

  useFrame(() => {
    const meshes = Array.from(meshRegistry.current.values())
    if (meshes.length === 0) return

    // ✅ Actualizar el raycaster con la posición actual del mouse
    raycaster.setFromCamera(pointer, camera)

    // ✅ Medir el tiempo del cast contra los meshes reales
    const start = performance.now()
    raycaster.intersectObjects(meshes, false) // false = no recursivo, más rápido
    const elapsed = performance.now() - start

    // Suavizado exponencial para UI más estable
    smoothedTime.current = smoothedTime.current * 0.85 + elapsed * 0.15
    onUpdate(smoothedTime.current)
  })

  return null
}

// ─────────────────────────────────────────────
// ARENA
// ─────────────────────────────────────────────
function Arena() {
  return (
    <>
      {/* raycast={() => null} → excluye del raycaster, no interfiere en la medición */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow raycast={() => null}>
        <circleGeometry args={[ARENA_SIZE, 64]} />
        <meshStandardMaterial color="#0d0d1a" roughness={0.8} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 0]} raycast={() => null}>
        <ringGeometry args={[ARENA_SIZE - 0.3, ARENA_SIZE, 64]} />
        <meshBasicMaterial color="#6366f1" opacity={0.5} transparent />
      </mesh>
    </>
  )
}

// ─────────────────────────────────────────────
// HUD
// ─────────────────────────────────────────────
function GameHUD({
  score,
  missed,
  count,
  intersectionTime,
}: {
  score: number
  missed: number
  count: number
  intersectionTime: number
}) {
  const accuracy = score + missed > 0
    ? Math.round((score / (score + missed)) * 100)
    : 100

  // Color de la métrica según el tiempo
  const timeColor =
    intersectionTime < 0.1 ? 'text-emerald-400' :
    intersectionTime < 0.5 ? 'text-yellow-400' :
    'text-red-400'

  const stats = useRef({ sum: 0, count: 0 })

  useEffect(() => {
    stats.current.sum += intersectionTime
    stats.current.count++
  }, [intersectionTime])

  useEffect(() => {
    const interval = setInterval(() => {
      if (stats.current.count > 0) {
        const avg = stats.current.sum / stats.current.count
        console.log(`%c[Average 5s] Intersection: ${avg.toFixed(4)}ms`, 'color: #fb7185; font-weight: bold;')
        stats.current.sum = 0
        stats.current.count = 0
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 min-w-[160px]">
      <div className="bg-black/80 backdrop-blur-xl border border-emerald-500/40 px-5 py-3 rounded-xl">
        <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Score</p>
        <p className="text-3xl font-mono font-black text-emerald-400">{score}</p>
      </div>

      <div className="bg-black/80 backdrop-blur-xl border border-blue-500/40 px-5 py-3 rounded-xl">
        <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Precisión</p>
        <p className="text-2xl font-mono font-black text-blue-400">{accuracy}%</p>
      </div>

      <div className="bg-black/80 backdrop-blur-xl border border-purple-500/40 px-5 py-3 rounded-xl">
        <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Targets</p>
        <p className="text-2xl font-mono font-black text-purple-400">{count}</p>
      </div>

      {/* ✅ Intersection Time real */}
      <div className="bg-black/80 backdrop-blur-xl border border-red-500/40 px-5 py-3 rounded-xl">
        <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Intersección</p>
        <p className={`text-2xl font-mono font-black ${timeColor}`}>
          {intersectionTime.toFixed(3)}
          <span className="text-xs text-gray-500 ml-1">ms</span>
        </p>
        <p className="text-gray-600 text-[10px] mt-1">raycast/frame</p>
      </div>
    </div>
  )
}

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

// ─────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────
export default function RaycastTest() {
  const [count, setCount] = useState(50)
  const [score, setScore] = useState(0)
  const [missed, setMissed] = useState(0)
  const [intersectionTime, setIntersectionTime] = useState(0)
  const nextId = useRef(0)
  const isHittingTarget = useRef(false)

  // Mapa global de meshes para el RaycastMonitor
  const meshRegistry = useRef<Map<number, THREE.Mesh>>(new Map())

  const [targets, setTargets] = useState<TargetData[]>(() =>
    Array.from({ length: 50 }, () => createTarget(nextId.current++))
  )

  useEffect(() => {
    nextId.current = 0
    meshRegistry.current.clear()
    setTargets(Array.from({ length: count }, () => createTarget(nextId.current++)))
    setScore(0)
    setMissed(0)
  }, [count])

  const handleHit = useCallback((id: number) => {
    isHittingTarget.current = true
    setScore((s) => s + 1)
    setTargets((prev) =>
      prev.map((t) => (t.id === id ? createTarget(nextId.current++) : t))
    )
  }, [])

  // ✅ Solo contar missed si NO se acertó un target
  const handlePointerDown = useCallback(() => {
    if (!isHittingTarget.current) {
      setMissed((m) => m + 1)
    }
    isHittingTarget.current = false
  }, [])

  return (
    <main
      className="relative w-full h-screen bg-[#050505] overflow-hidden"
      style={{ cursor: 'crosshair' }}
      onPointerDown={handlePointerDown}
    >
      <PerformanceOverlay
        title={`Raycasting: ${count} Targets`}
        input={true}
        count={count}
        setCount={setCount}
        inputConfig={{ unit: 'normal', type: 'values', values: [50, 200, 500, 1000] }}
      />

      <GameHUD
        score={score}
        missed={missed}
        count={count}
        intersectionTime={intersectionTime}
      />

      <Crosshair />

      <Canvas
        shadows
        camera={{ position: [0, 15, 35], fov: 60 }}
        raycaster={{ params: {
            Line: { threshold: 0 }, Points: { threshold: 0 },
            Mesh: undefined,
            LOD: undefined,
            Sprite: undefined
        } }}
      >
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={1.5} />

        {/* ✅ Monitor con raycast manual y medición real */}
        <RaycastMonitor meshRegistry={meshRegistry} onUpdate={setIntersectionTime} />

        <Suspense fallback={null}>
          <Arena />
          {targets.map((t) => (
            <Target key={t.id} data={t} onHit={handleHit} meshRegistry={meshRegistry} />
          ))}
        </Suspense>

        <DebugTools title="Raycasting Dinámico" entityCount={count} />
      </Canvas>
    </main>
  )
}