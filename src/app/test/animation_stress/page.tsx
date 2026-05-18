'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { useRef, useMemo, useState, useCallback, Suspense, useEffect } from 'react'
import * as THREE from 'three'
import { Perf, getPerf } from 'r3f-perf'
import PerformanceOverlay from '@/components/test/PerformanceOverlay'
import Loader3D from '@/components/ui/Loader3D'
import { OrbitControls } from '@react-three/drei'

// ─────────────────────────────────────────────
// PARÁMETROS DEL TEST
// ─────────────────────────────────────────────
const sphereGeometry = new THREE.IcosahedronGeometry(0.3, 1)
const SAMPLE_SIZE = 120 // ~2 segundos a 60fps para un 1% Low confiable

interface AnimMetrics {
  motor: string
  entidades: number
  fps: number
  onePercentLow: number
  cpuMs: number
  frameTime: number
  frameBudget: number
  useFrameLoops: number
}

// Calculador matemático estricto
const metricsCalculator = {
  samples: new Float32Array(SAMPLE_SIZE),
  index: 0,
  filled: 0,

  push(delta: number) {
    const ms = delta * 1000
    this.samples[this.index] = ms
    this.index = (this.index + 1) % SAMPLE_SIZE
    this.filled = Math.min(this.filled + 1, SAMPLE_SIZE)
  },

  compute(count: number, cpuTime: number): AnimMetrics {
    if (this.filled < 10) {
      return {
        motor: 'React Three Fiber', entidades: count, fps: 0, onePercentLow: 0,
        cpuMs: cpuTime, frameTime: 0, frameBudget: 0, useFrameLoops: count
      }
    }

    const n = this.filled
    let sum = 0
    for (let i = 0; i < n; i++) sum += this.samples[i]
    const meanTime = sum / n
    const currentFps = meanTime > 0 ? 1000 / meanTime : 0

    // Cálculo del 1% Low (los peores frames = los tiempos más altos)
    const sortedSamples = Float32Array.from(this.samples.slice(0, n)).sort()
    // Tomamos el percentil 99 (el 1% de frames más lentos)
    const p99Index = Math.floor(n * 0.99)
    const worstFrameTime = sortedSamples[p99Index]
    const onePercentLowFps = worstFrameTime > 0 ? 1000 / worstFrameTime : 0

    return {
      motor: 'React Three Fiber',
      entidades: count,
      fps: Math.round(currentFps),
      onePercentLow: Math.round(onePercentLowFps),
      cpuMs: cpuTime,
      frameTime: Math.round(meanTime * 100) / 100,
      frameBudget: Math.round((meanTime / 16.667) * 100),
      useFrameLoops: count // 1 loop exacto por cada entidad en este test
    }
  },
  reset() {
    this.index = 0
    this.filled = 0
  }
}

// ─────────────────────────────────────────────
// COLLECTOR
// ─────────────────────────────────────────────
function MetricsCollector({ onUpdate, count }: { onUpdate: (m: AnimMetrics) => void, count: number }) {
  const frameCount = useRef(0)
  const lastLogTime = useRef(performance.now() - 2000)
  const lastCount = useRef(count)

  if (lastCount.current !== count) {
    lastCount.current = count
    frameCount.current = 0
    metricsCalculator.reset()
    lastLogTime.current = performance.now() - 2000 // Forzar log inmediato al cambiar
  }

  useFrame((_, delta) => {
    metricsCalculator.push(delta)
    frameCount.current++

    const perfState = getPerf ? getPerf() : null
    const cpuTime = perfState?.log?.cpu ?? 0

    // Actualizar UI cada 10 frames para no ahogar a React
    if (frameCount.current % 10 === 0) {
      onUpdate(metricsCalculator.compute(count, cpuTime))
    }

    const now = performance.now()
    // Imprimir en consola cada 2 segundos
    if (now - lastLogTime.current >= 10000) {
      const metrics = metricsCalculator.compute(count, cpuTime)
      
      console.log(
        `%c[Animación & Materiales] ${count.toLocaleString()} Entidades`,
        'color:#c084fc;font-weight:bold;font-size:12px'
      )
      console.log(`%cMotor%c ${metrics.motor}`, 'color:#94a3b8', 'color:#e2e8f0;font-weight:600')
      console.log(`%cFPS%c ${metrics.fps}`, 'color:#94a3b8', 'color:#e2e8f0;font-weight:600')
      console.log(`%c1% Low (FPS)%c ${metrics.onePercentLow}`, 'color:#94a3b8', 'color:#f87171;font-weight:600')
      console.log(`%cCPU (ms)%c ${metrics.cpuMs.toFixed(2)} ms`, 'color:#94a3b8', 'color:#38bdf8;font-weight:600')
      console.log(`%cFrame Time%c ${metrics.frameTime.toFixed(2)} ms`, 'color:#94a3b8', 'color:#e2e8f0;font-weight:600')
      console.log(`%cFrame Budget%c ${metrics.frameBudget}%`, 'color:#94a3b8', 'color:#fbbf24;font-weight:600')
      console.log(`%cuseFrame loops%c ${metrics.useFrameLoops.toLocaleString()}`, 'color:#94a3b8', 'color:#e2e8f0;font-weight:600')
      console.log('--------------------------------------------------')
      
      lastLogTime.current = now
    }
  })

  return null
}

// ─────────────────────────────────────────────
// ESFERA INDIVIDUAL
// ─────────────────────────────────────────────
function AnimatedSphere({ position, phase }: { position: [number, number, number]; phase: number }) {
  const ref = useRef<THREE.Mesh>(null!)

  useFrame((state) => {
    const t = state.clock.getElapsedTime() + phase
    ref.current.position.y = position[1] + Math.sin(t * 2) * 1.5
    ref.current.scale.setScalar(0.8 + Math.sin(t * 3) * 0.3)
    ref.current.rotation.x = t * 0.5
    ref.current.rotation.z = t * 0.3
  })

  const hue = Math.round((phase / (Math.PI * 2)) * 360)

  return (
    <mesh ref={ref} position={position} geometry={sphereGeometry}>
      <meshStandardMaterial
        color={`hsl(${hue}, 70%, 50%)`}
        color-convert-colorspace={false}
        emissive={`hsl(${hue}, 70%, 30%)`}
        roughness={0.3}
        metalness={0.7}
      />
    </mesh>
  )
}

function AnimationScene({ count }: { count: number }) {
  const spheres = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const theta = (i / count) * Math.PI * 8
      const ring = Math.floor(i / 50)
      const r = 3 + ring * 1.0

      return {
        position: [Math.cos(theta) * r, 0, Math.sin(theta) * r] as [number, number, number],
        phase: (i / count) * Math.PI * 2,
      }
    })
  }, [count])

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1.5} />
      {spheres.map((s, i) => (
        <AnimatedSphere key={i} position={s.position} phase={s.phase} />
      ))}
    </>
  )
}

// ─────────────────────────────────────────────
// HUD DE MÉTRICAS EXCLUSIVAS
// ─────────────────────────────────────────────
function MetricsHUD({ metrics }: { metrics: AnimMetrics }) {
  // Color dinámico para el 1% Low: Rojo si baja de 30, Amarillo si baja de 50
  const lowColor = metrics.onePercentLow < 30 ? 'text-red-400' : metrics.onePercentLow < 50 ? 'text-yellow-400' : 'text-emerald-400'
  const budgetColor = metrics.frameBudget > 100 ? 'text-red-400' : metrics.frameBudget > 80 ? 'text-yellow-400' : 'text-emerald-400'

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 min-w-[240px] bg-black/80 backdrop-blur-xl border border-white/10 p-4 rounded-xl font-mono text-sm">
      <div className="flex justify-between border-b border-white/10 pb-1 mb-2 text-xs uppercase tracking-wider text-gray-400 font-bold">
        <span>Estrés R3F</span>
      </div>
      <div className="flex justify-between">
        <span>Motor:</span>
        <span className="text-white font-bold">{metrics.motor}</span>
      </div>
      <div className="flex justify-between">
        <span>Entidades:</span>
        <span className="text-purple-400 font-bold">{metrics.entidades.toLocaleString()}</span>
      </div>
      <div className="flex justify-between mt-2">
        <span>FPS:</span>
        <span className="font-bold text-sky-400">{metrics.fps}</span>
      </div>
      <div className="flex justify-between font-bold">
        <span className="text-gray-300">1% Low (FPS):</span>
        <span className={lowColor}>{metrics.onePercentLow}</span>
      </div>
      <div className="flex justify-between mt-2">
        <span>CPU:</span>
        <span className="text-sky-400">{metrics.cpuMs.toFixed(2)} ms</span>
      </div>
      <div className="flex justify-between">
        <span>Frame Time:</span>
        <span className="text-white">{metrics.frameTime.toFixed(2)} ms</span>
      </div>
      <div className="flex justify-between">
        <span>Frame Budget:</span>
        <span className={budgetColor}>{metrics.frameBudget}%</span>
      </div>
      <div className="flex justify-between border-t border-white/10 mt-2 pt-2">
        <span className="text-gray-400">useFrame loops/frame:</span>
        <span className="text-purple-400">{metrics.useFrameLoops.toLocaleString()}</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// VISTA PRINCIPAL
// 64
// 256
// 1.000
// 4.000
// 16.000
// ─────────────────────────────────────────────
export default function AnimationStressTest() {
  const [count, setCount] = useState(16384)
  const [metrics, setMetrics] = useState<AnimMetrics>({
    motor: 'React Three Fiber', entidades: 0, fps: 0, onePercentLow: 0,
    cpuMs: 0, frameTime: 0, frameBudget: 0, useFrameLoops: 0
  })

  return (
    <main className="relative w-full h-screen bg-[#050505] overflow-hidden">
      <PerformanceOverlay
        title="Overhead: Loops & Materiales"
        input={true}
        count={count}
        setCount={setCount}
        inputConfig={{ unit: 'normal', type: 'values', values: [64, 256, 1000, 4000, 16000] }}
      />

      <MetricsHUD metrics={metrics} />

      <Canvas camera={{ position: [0, 15, 25], fov: 50 }} dpr={[1, 2]} gl={{ antialias: false, powerPreference: "high-performance" }}>
        
        {/* Recolector de telemetría oculto */}
        <Perf minimal style={{ display: 'none' }} />
        
        <MetricsCollector onUpdate={setMetrics} count={count} />

        <Suspense fallback={<Loader3D />}>
          <AnimationScene count={count} />
        </Suspense>
      </Canvas>
    </main>
  )
}