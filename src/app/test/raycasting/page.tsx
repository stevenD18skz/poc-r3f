'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useState, useMemo, useRef, useCallback, useEffect, Suspense } from 'react'
import * as THREE from 'three'
import { Perf, getPerf } from 'r3f-perf'
import PerformanceOverlay from '@/components/test/PerformanceOverlay'
import DebugTools from '@/components/DebugTools'
import Loader3D from '@/components/ui/Loader3D'

// ─────────────────────────────────────────────
// PARÁMETROS DEL TEST Y ESTRUCTURAS
// ─────────────────────────────────────────────
const SPHERE_SEGMENTS = 16
const ARENA_SIZE = 20
const JITTER_SAMPLE_SIZE = 120

const sharedGeometry = new THREE.SphereGeometry(1, SPHERE_SEGMENTS, SPHERE_SEGMENTS)

interface TargetData {
  id: number
  position: THREE.Vector3
  velocity: THREE.Vector3
  scale: number
  color: THREE.Color
}

interface PerformanceMetrics {
  fps: number
  cpuTime: number
  frameTime: number
  jitter: number
  intersectionTime: number
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

// Calculador matemático estricto para Deltas y Jitter
const deltaCalculator = {
  samples: new Float32Array(JITTER_SAMPLE_SIZE),
  index: 0,
  filled: 0,
  push(deltaMs: number) {
    this.samples[this.index] = deltaMs
    this.index = (this.index + 1) % JITTER_SAMPLE_SIZE
    this.filled = Math.min(this.filled + 1, JITTER_SAMPLE_SIZE)
  },
  mean() {
    if (this.filled < 1) return 0
    let sum = 0
    for (let i = 0; i < this.filled; i++) sum += this.samples[i]
    return sum / this.filled
  },
  jitter() {
    if (this.filled < 2) return 0
    const m = this.mean()
    let variance = 0
    for (let i = 0; i < this.filled; i++) {
      const diff = this.samples[i] - m
      variance += diff * diff
    }
    return Math.sqrt(variance / this.filled)
  },
  reset() {
    this.index = 0
    this.filled = 0
  }
}

// ─────────────────────────────────────────────
// COMPONENTES ESCENA (TARGET & ARENA)
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

  useEffect(() => {
    if (meshRef.current) meshRegistry.current.set(data.id, meshRef.current)
    return () => { meshRegistry.current.delete(data.id) }
  }, [data.id, meshRegistry])

  useFrame((_, delta) => {
    if (!meshRef.current) return

    pos.current.addScaledVector(vel.current, delta)
    if (Math.abs(pos.current.x) > ARENA_SIZE) vel.current.x *= -1
    if (pos.current.y < 0.5 || pos.current.y > 15) vel.current.y *= -1
    if (Math.abs(pos.current.z) > ARENA_SIZE) vel.current.z *= -1
    meshRef.current.position.copy(pos.current)

    const targetScale = isHovered.current ? data.scale * 1.3 : data.scale
    meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.2)

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
        color-convert-colorspace={false}
        emissive={data.color}
        roughness={0.3}
        metalness={0.4}
      />
    </mesh>
  )
}

function Arena() {
  return (
    <>
      <mesh rotation-x={-Math.PI / 2} receiveShadow raycast={() => null}>
        <circleGeometry args={[ARENA_SIZE, 64]} />
        <meshStandardMaterial color="#0d0d1a" roughness={0.8} />
      </mesh>
    </>
  )
}

// ─────────────────────────────────────────────
// CORE METRICS COLLECTOR + MANUAL RAYCAST
// ─────────────────────────────────────────────
function RaycastAndMetricsCollector({
  meshRegistry,
  onUpdate,
  count
}: {
  meshRegistry: React.MutableRefObject<Map<number, THREE.Mesh>>
  onUpdate: (m: PerformanceMetrics) => void
  count: number
}) {
  const { camera, raycaster, pointer } = useThree()
  const frameCount = useRef(0)
  const lastLogTime = useRef(performance.now())
  const lastCount = useRef(count)
  
  const smoothedIntersectionTime = useRef(0)

  if (lastCount.current !== count) {
    lastCount.current = count
    frameCount.current = 0
    deltaCalculator.reset()
  }

  useFrame((_, delta) => {
    frameCount.current++
    const now = performance.now()
    const deltaMs = delta * 1000
    deltaCalculator.push(deltaMs)

    // 1. Ejecutar y Medir Raycasting Manual Estricto
    const meshes = Array.from(meshRegistry.current.values())
    let elapsedRaycast = 0

    if (meshes.length > 0) {
      raycaster.setFromCamera(pointer, camera)
      const startRaycast = performance.now()
      raycaster.intersectObjects(meshes, false)
      elapsedRaycast = performance.now() - startRaycast
    }
    
    smoothedIntersectionTime.current = smoothedIntersectionTime.current * 0.85 + elapsedRaycast * 0.15

    // 2. Extraer datos crudos de r3f-perf
    const perfState = getPerf ? getPerf() : null
    const logData = perfState?.log
    const currentFps = logData?.fps ?? (deltaMs > 0 ? 1000 / deltaMs : 0)

    // Actualizar HUD cada 10 frames
    if (frameCount.current % 10 === 0) {
      onUpdate({
        fps: Math.round(currentFps),
        cpuTime: logData?.cpu ?? 0,
        frameTime: deltaCalculator.mean(),
        jitter: deltaCalculator.jitter(),
        intersectionTime: smoothedIntersectionTime.current
      })
    }

    // Reportar en consola estructuradamente cada 10 segundos
    if (now - lastLogTime.current >= 10000) {
      const meanFrameTime = deltaCalculator.mean()
      
      console.log(
        `%c[Raycasting Test] ${count.toLocaleString()} Targets - ${new Date().toLocaleTimeString()}`,
        'color:#6366f1;font-weight:bold;font-size:12px'
      )
      console.log(`%cFPS%c ${Math.round(1000 / meanFrameTime)}`, 'color:#94a3b8', 'color:#f1f5f9;font-weight:600')
      console.log(`%cCPU (ms)%c ${(logData?.cpu ?? 0).toFixed(2)} ms`, 'color:#94a3b8', 'color:#38bdf8;font-weight:600')
      console.log(`%cFrame Time (ms)%c ${meanFrameTime.toFixed(2)} ms`, 'color:#94a3b8', 'color:#f1f5f9;font-weight:600')
      console.log(`%cJitter (ms)%c ${deltaCalculator.jitter().toFixed(2)} ms`, 'color:#94a3b8', 'color:#fbbf24;font-weight:600')
      console.log(`%cIntersection Time (ms)%c ${smoothedIntersectionTime.current.toFixed(3)} ms`, 'color:#94a3b8', 'color:#f87171;font-weight:600')
      
      lastLogTime.current = now
    }
  })

  return null
}

// ─────────────────────────────────────────────
// HUD DE MÉTRICAS EXCLUSIVAS
// ─────────────────────────────────────────────
function GameHUD({
  score,
  missed,
  metrics
}: {
  score: number
  missed: number
  metrics: PerformanceMetrics
}) {
  const accuracy = score + missed > 0 ? Math.round((score / (score + missed)) * 100) : 100

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 min-w-[200px] bg-black/80 backdrop-blur-xl border border-white/10 p-4 rounded-xl font-mono text-sm">
      <div className="flex justify-between border-b border-white/10 pb-1 mb-2 text-xs uppercase tracking-wider text-gray-400 font-bold">
        <span>Gameplay</span>
        <span className="text-emerald-400">Acc: {accuracy}%</span>
      </div>
      <div className="flex justify-between"><span>Score:</span><span className="text-emerald-400 font-bold">{score}</span></div>
      <div className="flex justify-between mb-2"><span>Missed:</span><span className="text-red-400">{missed}</span></div>

      <div className="flex justify-between border-b border-white/10 pb-1 mb-2 text-xs uppercase tracking-wider text-gray-400 font-bold">
        <span>Métricas Test</span>
      </div>
      <div className="flex justify-between">
        <span>FPS:</span>
        <span className="font-bold text-sky-400">{metrics.fps}</span>
      </div>
      <div className="flex justify-between">
        <span>CPU (ms):</span>
        <span className="text-sky-400">{metrics.cpuTime.toFixed(2)}</span>
      </div>
      <div className="flex justify-between">
        <span>Frame Time:</span>
        <span className="text-white">{metrics.frameTime.toFixed(2)} ms</span>
      </div>
      <div className="flex justify-between">
        <span>Jitter:</span>
        <span className="text-yellow-400">{metrics.jitter.toFixed(2)} ms</span>
      </div>
      <div className="flex justify-between mt-1 pt-1 border-t border-white/5 font-bold">
        <span className="text-red-300">Intersection:</span>
        <span className="text-red-400">{metrics.intersectionTime.toFixed(3)} ms</span>
      </div>
    </div>
  )
}

function Crosshair() {
  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-40">
      <div className="relative w-4 h-4 border border-white/40 rounded-full" />
    </div>
  )
}

// ─────────────────────────────────────────────
// VISTA PRINCIPAL
// ─────────────────────────────────────────────
export default function RaycastTest() {
  const [count, setCount] = useState(400)
  const [score, setScore] = useState(0)
  const [missed, setMissed] = useState(0)
  
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0, cpuTime: 0, frameTime: 0, jitter: 0, intersectionTime: 0
  })

  const nextId = useRef(0)
  const isHittingTarget = useRef(false)
  const meshRegistry = useRef<Map<number, THREE.Mesh>>(new Map())

  const [targets, setTargets] = useState<TargetData[]>([])

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
    setTargets((prev) => prev.map((t) => (t.id === id ? createTarget(nextId.current++) : t)))
  }, [])

  const handlePointerDown = useCallback(() => {
    if (!isHittingTarget.current) setMissed((m) => m + 1)
    isHittingTarget.current = false
  }, [])

  return (
    <main
      className="relative w-full h-screen bg-[#050505] overflow-hidden select-none"
      style={{ cursor: 'crosshair' }}
      onPointerDown={handlePointerDown}
    >
      <PerformanceOverlay
        title="Benchmark Raycasting"
        input={true}
        count={count}
        setCount={setCount}
        inputConfig={{ unit: 'normal', type: 'values', values: [50, 200, 500, 1000, 5000] }}
      />

      <GameHUD score={score} missed={missed} metrics={metrics} />
      <Crosshair />

      <Canvas
        shadows={false}
        camera={{ position: [0, 15, 35], fov: 60 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 15, 10]} intensity={1} />

        {/* Instancia oculta para tracking de CPU mediante WebGL Hooks */}
        <Perf minimal style={{ display: 'none' }} />

        {/* Orquestador de Raycast manual y recolección limpia */}
        <RaycastAndMetricsCollector 
          meshRegistry={meshRegistry} 
          onUpdate={setMetrics} 
          count={count} 
        />

        <Suspense fallback={null}>
          <Arena />
          {targets.map((t) => (
            <Target key={t.id} data={t} onHit={handleHit} meshRegistry={meshRegistry} />
          ))}
        </Suspense>


      </Canvas>
    </main>
  )
}