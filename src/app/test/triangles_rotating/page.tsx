'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { useRef, useEffect, useState, Suspense, useMemo } from 'react'
import * as THREE from 'three'
import PerformanceOverlay from '@/components/test/PerformanceOverlay'
import DebugTools from '@/components/DebugTools'
import { OrbitControls } from '@react-three/drei'
import Loader3D from '@/components/ui/Loader3D'

// ─────────────────────────────────────────────
// PARÁMETROS DEL TEST (deben ser idénticos en Babylon)
// ─────────────────────────────────────────────
// Geometría: cono radio 0.2, altura 0.4, 8 segmentos (idéntico al test estático)
// Instancias: N (1 draw call total)
// Animación: rotación individual por instancia en CPU (useFrame)
// Lo que mides: overhead CPU de actualizar N matrices/frame + subida a GPU
// Comparar con Test Estático: diferencia = costo puro de la animación CPU
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
function InstancedRotatingTriangles({ count = 32000 }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  // ✅ tempObject estable: no se recrea en cada render de React
  const tempObject = useRef(new THREE.Object3D()).current

  // Datos por instancia calculados una sola vez
  // ✅ phase en [0, 2π]: distribuida uniformemente, no delay*0.15 que crece sin límite
  const particles = useMemo(() => {
    return Array.from({ length: count }, () => {
      const radius = 10 + Math.random() * 40
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      return {
        x: radius * Math.sin(phi) * Math.cos(theta),
        y: radius * Math.sin(phi) * Math.sin(theta),
        z: radius * Math.cos(phi),
        rotationSpeed: (Math.random() - 0.5) * 2,
        color: new THREE.Color(`hsl(${Math.random() * 70 + 150}, 80%, 50%)`),
      }
    })
  }, [count])

  // Setup inicial de posiciones y colores
  useEffect(() => {
    if (!meshRef.current) return
    particles.forEach((p, i) => {
      tempObject.position.set(p.x, p.y, p.z)
      tempObject.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)
      tempObject.updateMatrix()
      meshRef.current.setMatrixAt(i, tempObject.matrix)
      meshRef.current.setColorAt(i, p.color)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true
  }, [particles])

  // Rotación individual en CPU cada frame
  // ✅ 1 solo useFrame que itera N instancias (no N useFrame registrados)
  useFrame((state) => {
    if (!meshRef.current) return
    const t = state.clock.getElapsedTime()
    particles.forEach((p, i) => {
      tempObject.position.set(p.x, p.y, p.z)
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
    // ✅ undefined en lugar de null!
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      {/* ✅ radio 0.2, altura 0.4, 8 segmentos — idéntico al test estático */}
      <coneGeometry args={[0.2, 0.4, 8]} />
      <meshStandardMaterial />
    </instancedMesh>
  )
}

export default function TrianglesRotatingTest() {
  const [count, setCount] = useState(32000)
  const [metrics, setMetrics] = useState({ jitter: 0, frameTime: 0, loadTime: 0 })

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
          max: 12,
        }}
      />
      <PerfMetricsHUD metrics={metrics} />

      {/* ✅ Misma posición de cámara que el test estático para comparación visual justa */}
      <Canvas camera={{ position: [20, 20, 20], fov: 50 }}>
        <DebugTools title="Triángulos Rotando" entityCount={count} />
        <MetricsCollector onUpdate={setMetrics} count={count} />

        <Suspense fallback={<Loader3D />}>
          <OrbitControls makeDefault />
          <ambientLight intensity={1} />
          <InstancedRotatingTriangles count={count} />
        </Suspense>
      </Canvas>

      <div className="absolute bottom-6 left-6 bg-black/70 p-4 rounded-lg border border-rose-500 text-white text-xs max-w-xs">
        <h3 className="font-bold text-rose-400 mb-2">Especificaciones del test</h3>
        <ul className="space-y-1 text-gray-300">
          <li>• Instancias: {count.toLocaleString()}</li>
          <li>• Geometría: cono r=0.2, h=0.4, 8 seg (~16 tris)</li>
          <li>• Triángulos totales: ~{(count * 16).toLocaleString()}</li>
          <li>• Draw calls: 1 (InstancedMesh)</li>
          <li>• Animación: rotación individual por instancia (CPU)</li>
          <li>• useFrame loops: 1 (itera N, no registra N)</li>
          <li>• Cuello de botella: JS single-thread (~16ms/frame max)</li>
        </ul>
      </div>
    </main>
  )
}