'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
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
  const { gl } = useThree()

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

    if (frameCount.current % 300 === 0) {
      const computed = metricsCalculator.compute()
      const frameTime = computed.frameTime
      const jitter = computed.jitter
      const avgFps = frameTime > 0 ? 1000 / frameTime : 0
      
      const drawCalls = gl.info.render.calls
      const triangles = gl.info.render.triangles
      
      const mem = (performance as any).memory
      const ramMB = mem ? (mem.usedJSHeapSize / 1048576).toFixed(1) : 'N/A'
      
      // Estimaciones (Three.js no da acceso directo a timings de GPU/CPU sin extensiones)
      const cpuMs = frameTime
      const gpuMs = frameTime * 0.8 
      const vramMB = ((triangles * 3 * 12) / 1048576).toFixed(1)
      
      console.groupCollapsed(
        `%c[R3F Rotating] ${new Date().toLocaleTimeString()}`,
        'color:#3b82f6;font-weight:700;font-size:12px',
      )
      console.log(`%cFPS Promedio     %c${avgFps.toFixed(1)}`, 'color:#94a3b8', 'color:#f1f5f9;font-weight:600')
      console.log(`%cGPU (ms/frame)   %c${gpuMs.toFixed(2)} ms`, 'color:#94a3b8', 'color:#f1f5f9;font-weight:600')
      console.log(`%cCPU (ms/frame)   %c${cpuMs.toFixed(2)} ms`, 'color:#94a3b8', 'color:#f1f5f9;font-weight:600')
      console.log(`%cRAM              %c${ramMB} MB`, 'color:#94a3b8', 'color:#f1f5f9;font-weight:600')
      console.log(`%cVRAM Estimada    %c${vramMB} MB`, 'color:#94a3b8', 'color:#f1f5f9;font-weight:600')
      console.log(`%cDraw Calls       %c${drawCalls}`, 'color:#94a3b8', 'color:#f1f5f9;font-weight:600')
      console.log(`%cTriángulos       %c${triangles.toLocaleString()}`, 'color:#94a3b8', 'color:#f1f5f9;font-weight:600')

      console.log(`%cFrame Time       %c${frameTime.toFixed(2)} ms`, 'color:#94a3b8', 'color:#f1f5f9;font-weight:600')
      console.log(`%cJitter           %c${jitter.toFixed(2)} ms`, 'color:#94a3b8', 'color:#f1f5f9;font-weight:600')
      console.log(`%cLoad Time        %c${loadTime.current.toFixed(1)} ms`, 'color:#94a3b8', 'color:#f1f5f9;font-weight:600')
      console.groupEnd()
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
  const [count, setCount] = useState(512000)
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
          type: 'values',
          values: [1000, 4000, 16000, 64000, 256000, 1024000],
        }}
      />

      {/* ✅ Misma posición de cámara que el test estático para comparación visual justa */}
      <Canvas camera={{ position: [0, 120, 0], fov: 50 }}>
        <MetricsCollector onUpdate={setMetrics} count={count} />

        <Suspense fallback={<Loader3D />}>
          <ambientLight intensity={1} />
          <InstancedRotatingTriangles count={count} />
        </Suspense>
      </Canvas>
    </main>
  )
}