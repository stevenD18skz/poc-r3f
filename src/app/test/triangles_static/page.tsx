'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { useRef, useEffect, useState, Suspense } from 'react'
import * as THREE from 'three'
import PerformanceOverlay from '@/components/test/PerformanceOverlay'
import DebugTools from '@/components/DebugTools'
import { OrbitControls } from '@react-three/drei'

// ─────────────────────────────────────────────
// PARÁMETROS DEL TEST (deben ser idénticos en Babylon)
// ─────────────────────────────────────────────
// Geometría: cono radio 0.2, altura 0.4, 8 segmentos (= ~16 triángulos)
// Instancias: N (1 draw call total)
// Animación: NINGUNA (GPU puro, sin overhead de CPU)
// Iluminación: ambientLight intensity=1 únicamente
// Fondo: color sólido #050505 (sin IBL)
// Lo que mides: rendimiento GPU de renderizado estático puro
// ─────────────────────────────────────────────

// ─── MÉTRICAS ────────────────────────────────────────────────────────────────
const JITTER_SAMPLE_SIZE = 60
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
  compute() {
    if (this.filled < 2) return { jitter: 0, frameTime: 0 }
    let sum = 0
    for (let i = 0; i < this.filled; i++) sum += this.samples[i]
    const mean = sum / this.filled
    let variance = 0
    for (let i = 0; i < this.filled; i++) {
      const diff = this.samples[i] - mean
      variance += diff * diff
    }
    return {
      jitter: Math.round(Math.sqrt(variance / this.filled) * 100) / 100,
      frameTime: Math.round(mean * 100) / 100,
    }
  },
}

function MetricsCollector({ onUpdate, count }: { onUpdate: (m: any) => void; count: number }) {
  const frameCount = useRef(0)
  const startTime = useRef(performance.now())
  const loadTime = useRef(0)
  const lastCount = useRef(count)

  if (lastCount.current !== count) {
    startTime.current = performance.now()
    lastCount.current = count
    frameCount.current = 0
    loadTime.current = 0
  }

  useFrame((_, delta) => {
    metricsCalculator.push(delta)
    frameCount.current++
    if (frameCount.current === 1) {
      loadTime.current = performance.now() - startTime.current
    }
    if (frameCount.current % 10 === 0) {
      onUpdate({ ...metricsCalculator.compute(), loadTime: loadTime.current })
    }
  })

  return null
}

function PerfMetricsHUD({ metrics }: { metrics: any }) {
  const jitterColor =
    metrics.jitter < 1 ? 'text-emerald-400' :
    metrics.jitter < 3 ? 'text-yellow-400' :
    'text-red-400'

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 min-w-[170px]">
      <div className="bg-black/80 backdrop-blur-xl border border-slate-500/40 px-4 py-3 rounded-xl">
        <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Frame Time</p>
        <p className="text-2xl font-mono font-black text-slate-300">
          {metrics.frameTime.toFixed(2)}<span className="text-xs text-gray-500 ml-1">ms</span>
        </p>
      </div>
      <div className="bg-black/80 backdrop-blur-xl border border-orange-500/40 px-4 py-3 rounded-xl">
        <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Jitter</p>
        <p className={`text-2xl font-mono font-black ${jitterColor}`}>
          {metrics.jitter.toFixed(2)}<span className="text-xs text-gray-500 ml-1">ms</span>
        </p>
      </div>
      <div className="bg-black/80 backdrop-blur-xl border border-blue-500/40 px-4 py-3 rounded-xl">
        <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Load Time</p>
        <p className="text-2xl font-mono font-black text-blue-400">
          {metrics.loadTime.toFixed(1)}<span className="text-xs text-gray-500 ml-1">ms</span>
        </p>
      </div>
    </div>
  )
}

// ─── GEOMETRÍA ────────────────────────────────────────────────────────────────
function InstancedTriangles({ count = 32000 }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  // ✅ tempObject estable: no se recrea en cada render de React
  const tempObject = useRef(new THREE.Object3D()).current

  useEffect(() => {
    if (!meshRef.current) return
    for (let i = 0; i < count; i++) {
      const radius = 10 + Math.random() * 15
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI

      tempObject.position.set(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
      )
      tempObject.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      )
      tempObject.updateMatrix()
      meshRef.current.setMatrixAt(i, tempObject.matrix)
      meshRef.current.setColorAt(i, new THREE.Color(`hsl(${Math.random() * 50 + 200}, 80%, 50%)`))
    }
    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true
  }, [count])

  // ✅ SIN useFrame: test estático, sin animación
  // Mide GPU puro sin overhead de actualización de matrices

  return (
    // ✅ undefined en lugar de null! para evitar warnings de TypeScript
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      {/* ✅ radio 0.2, altura 0.4, 8 segmentos = ~16 triángulos por instancia */}
      <coneGeometry args={[0.2, 0.4, 8]} />
      <meshStandardMaterial />
    </instancedMesh>
  )
}

export default function TrianglesStaticTest() {
  const [count, setCount] = useState(32000)
  const [metrics, setMetrics] = useState({ jitter: 0, frameTime: 0, loadTime: 0 })

  return (
    <main className="relative w-full h-screen bg-[#050505] overflow-hidden">
      <PerformanceOverlay
        title={`${count} Triángulos Estáticos`}
        input={true}
        count={count}
        setCount={setCount}
      />
      <PerfMetricsHUD metrics={metrics} />

      <Canvas camera={{ position: [20, 20, 20], fov: 50 }}>
        <DebugTools title="Triángulos Estáticos" />
        <MetricsCollector onUpdate={setMetrics} count={count} />

        <Suspense fallback={null}>
          <ambientLight intensity={1} />
          <OrbitControls makeDefault />
          <InstancedTriangles count={count} />
        </Suspense>
      </Canvas>

      <div className="absolute bottom-6 left-6 bg-black/70 p-4 rounded-lg border border-cyan-500 text-white text-xs max-w-xs">
        <h3 className="font-bold text-cyan-400 mb-2">Especificaciones del test</h3>
        <ul className="space-y-1 text-gray-300">
          <li>• Instancias: {count.toLocaleString()}</li>
          <li>• Geometría: cono r=0.2, h=0.4, 8 seg (~16 tris)</li>
          <li>• Triángulos totales: ~{(count * 16).toLocaleString()}</li>
          <li>• Draw calls: 1 (InstancedMesh)</li>
          <li>• Animación: ninguna (GPU puro)</li>
          <li>• Iluminación: ambientLight × 1</li>
        </ul>
      </div>
    </main>
  )
}