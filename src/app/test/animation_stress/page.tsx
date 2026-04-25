'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { useRef, useMemo, useState, useCallback, Suspense, useEffect } from 'react'
import * as THREE from 'three'
import PerformanceOverlay from '@/components/test/PerformanceOverlay'
import DebugTools from '@/components/DebugTools'
import Loader3D from '@/components/ui/Loader3D'
import { OrbitControls } from '@react-three/drei'

// ─────────────────────────────────────────────
// PARÁMETROS DEL TEST (deben ser idénticos en Babylon)
// ─────────────────────────────────────────────
// Objetivo: medir costo de N useFrame callbacks + N materiales únicos
// Geometría compartida: 1 IcosahedronGeometry (sin GC overhead)
// Materiales: 1 por esfera (mide Material Management de Three.js)
// Animación: posición Y + escala + rotación por ref directa (sin React state)
// ─────────────────────────────────────────────

// Geometría compartida: evita que el test falle por memoria en lugar de por lógica
const sphereGeometry = new THREE.IcosahedronGeometry(0.3, 1)

// ─────────────────────────────────────────────
// MÉTRICAS DE RENDIMIENTO
// Buffer circular de los últimos N frame times para calcular jitter
// ─────────────────────────────────────────────
const JITTER_SAMPLE_SIZE = 60 // Ventana de 1 segundo a 60fps

interface AnimMetrics {
  jitter: number        // Desviación estándar del frame time (ms)
  frameBudget: number   // % del presupuesto de 16.67ms usado
  frameTime: number     // Frame time promedio (ms)
}

// Calculador de métricas fuera del componente para no crear closures en cada render
const metricsCalculator = {
  samples: new Float32Array(JITTER_SAMPLE_SIZE),
  index: 0,
  filled: 0,

  push(delta: number) {
    const ms = delta * 1000
    this.samples[this.index] = ms
    this.index = (this.index + 1) % JITTER_SAMPLE_SIZE
    this.filled = Math.min(this.filled + 1, JITTER_SAMPLE_SIZE)
  },

  compute(): AnimMetrics {
    if (this.filled < 2) return { jitter: 0, frameBudget: 0, frameTime: 0 }

    const n = this.filled
    let sum = 0
    for (let i = 0; i < n; i++) sum += this.samples[i]
    const mean = sum / n

    let variance = 0
    for (let i = 0; i < n; i++) {
      const diff = this.samples[i] - mean
      variance += diff * diff
    }
    const jitter = Math.sqrt(variance / n)
    const frameBudget = (mean / 16.667) * 100

    return {
      jitter: Math.round(jitter * 100) / 100,
      frameBudget: Math.round(frameBudget * 10) / 10,
      frameTime: Math.round(mean * 100) / 100,
    }
  },
}

// ─────────────────────────────────────────────
// COLLECTOR: 1 useFrame que mide y reporta métricas
// Separado de los objetos para no contaminar la medición
// ─────────────────────────────────────────────
function MetricsCollector({ onUpdate }: { onUpdate: (m: AnimMetrics) => void }) {
  const frameCount = useRef(0)

  useFrame((_, delta) => {
    metricsCalculator.push(delta)
    frameCount.current++

    // Reportar cada 10 frames para no saturar React state
    if (frameCount.current % 10 === 0) {
      onUpdate(metricsCalculator.compute())
    }
  })

  return null
}

// ─────────────────────────────────────────────
// ESFERA INDIVIDUAL
// Cada una registra su propio useFrame → mide overhead de N callbacks
// Material único por esfera → mide Material Management de Three.js
// ─────────────────────────────────────────────
function AnimatedSphere({
  position,
  phase,
}: {
  position: [number, number, number]
  phase: number
}) {
  const ref = useRef<THREE.Mesh>(null!)

  useFrame((state) => {
    const t = state.clock.getElapsedTime() + phase
    ref.current.position.y = position[1] + Math.sin(t * 2) * 1.5
    ref.current.scale.setScalar(0.8 + Math.sin(t * 3) * 0.3)
    ref.current.rotation.x = t * 0.5
    ref.current.rotation.z = t * 0.3
  })

  // Hue estable: calculado del phase, no de delay*50 que crece sin límite
  const hue = Math.round((phase / (Math.PI * 2)) * 360)

  return (
    <mesh ref={ref} position={position} geometry={sphereGeometry}>
      <meshStandardMaterial
        color={`hsl(${hue}, 70%, 50%)`}
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
        // ✅ Phase distribuida en [0, 2π], no delay*0.15 que crece sin límite
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
// HUD DE MÉTRICAS ABAJO A LA DERECHA
// ─────────────────────────────────────────────
function AnimMetricsHUD({
  metrics,
  count,
}: {
  metrics: AnimMetrics
  count: number
}) {
  // Colores según severidad
  const jitterColor =
    metrics.jitter < 1 ? 'text-emerald-400' :
    metrics.jitter < 3 ? 'text-yellow-400' :
    'text-red-400'

  const budgetColor =
    metrics.frameBudget < 50 ? 'text-emerald-400' :
    metrics.frameBudget < 80 ? 'text-yellow-400' :
    'text-red-400'

  const stats = useRef({
    ftSum: 0,
    jSum: 0,
    bSum: 0,
    samples: 0
  })

  useEffect(() => {
    stats.current.ftSum += metrics.frameTime
    stats.current.jSum += metrics.jitter
    stats.current.bSum += metrics.frameBudget
    stats.current.samples++
  }, [metrics])

  useEffect(() => {
    const interval = setInterval(() => {
      if (stats.current.samples > 0) {
        const n = stats.current.samples
        const avgFT = stats.current.ftSum / n
        const avgJ = stats.current.jSum / n
        const avgB = stats.current.bSum / n
        
        console.log(
          `%c[5s Avg] FT: ${avgFT.toFixed(2)}ms | Jitter: ${avgJ.toFixed(2)}ms | Budget: ${avgB.toFixed(1)}% | Loops: ${count + 1}`,
          'color: #a78bfa; font-weight: bold;'
        )
        
        stats.current.ftSum = 0
        stats.current.jSum = 0
        stats.current.bSum = 0
        stats.current.samples = 0
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [count])

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 min-w-[170px]">

      {/* Frame Time */}
      <div className="bg-black/80 backdrop-blur-xl border border-slate-500/40 px-4 py-3 rounded-xl">
        <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Frame Time</p>
        <p className="text-2xl font-mono font-black text-slate-300">
          {metrics.frameTime.toFixed(2)}
          <span className="text-xs text-gray-500 ml-1">ms</span>
        </p>
        <p className="text-gray-600 text-[10px]">promedio últimos 60 frames</p>
      </div>

      {/* Jitter */}
      <div className="bg-black/80 backdrop-blur-xl border border-orange-500/40 px-4 py-3 rounded-xl">
        <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Jitter</p>
        <p className={`text-2xl font-mono font-black ${jitterColor}`}>
          {metrics.jitter.toFixed(2)}
          <span className="text-xs text-gray-500 ml-1">ms</span>
        </p>
        <p className="text-gray-600 text-[10px]">desv. estándar frame time</p>
      </div>

      {/* Frame Budget */}
      <div className="bg-black/80 backdrop-blur-xl border border-blue-500/40 px-4 py-3 rounded-xl">
        <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Frame Budget</p>
        <p className={`text-2xl font-mono font-black ${budgetColor}`}>
          {metrics.frameBudget.toFixed(1)}
          <span className="text-xs text-gray-500 ml-1">%</span>
        </p>
        <p className="text-gray-600 text-[10px]">de 16.67ms (60fps target)</p>
      </div>

      {/* useFrame callbacks */}
      <div className="bg-black/80 backdrop-blur-xl border border-violet-500/40 px-4 py-3 rounded-xl">
        <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">useFrame loops</p>
        <p className="text-2xl font-mono font-black text-violet-400">
          {count + 1}
        </p>
        <p className="text-gray-600 text-[10px]">{count} esferas + 1 monitor</p>
      </div>

    </div>
  )
}

// ─────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────
export default function AnimationStressTest() {
  const [count, setCount] = useState(64)
  const [metrics, setMetrics] = useState<AnimMetrics>({
    jitter: 0,
    frameBudget: 0,
    frameTime: 0,
  })

  const handleMetricsUpdate = useCallback((m: AnimMetrics) => {
    setMetrics(m)
  }, [])

  return (
    <main className="relative w-full h-screen bg-[#050505] overflow-hidden">
      <PerformanceOverlay
        title={`${count} Refs Independientes`}
        input={true}
        count={count}
        setCount={setCount}
        inputConfig={{ unit: 'normal', type: 'power', min: 0, max: 14 }}
      />

      <AnimMetricsHUD metrics={metrics} count={count} />

      <Canvas camera={{ position: [0, 15, 25], fov: 50 }} dpr={[1, 2]}>
        <DebugTools title="Animación (useFrame × N)" entityCount={count} />

        {/* Collector fuera del Suspense: mide desde el primer frame */}
        <MetricsCollector onUpdate={handleMetricsUpdate} />

        <Suspense fallback={<Loader3D />}>
          <OrbitControls makeDefault />
          <AnimationScene count={count} />
        </Suspense>
      </Canvas>
    </main>
  )
}