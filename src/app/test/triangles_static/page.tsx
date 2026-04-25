'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { useRef, useEffect, useState, Suspense, useCallback } from 'react'
import * as THREE from 'three'
import PerformanceOverlay from '@/components/test/PerformanceOverlay'
import DebugTools from '@/components/DebugTools'
import { OrbitControls, Sparkles, Environment } from '@react-three/drei'

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

function MetricsCollector({ onUpdate, count }: { onUpdate: (m: any) => void, count: number }) {
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

function PerfMetricsHUD({ metrics, title }: { metrics: any, title: string }) {
  const stats = useRef({ ftSum: 0, jSum: 0, lSum: 0, samples: 0 })

  useEffect(() => {
    stats.current.ftSum += metrics.frameTime
    stats.current.jSum += metrics.jitter
    stats.current.lSum = metrics.loadTime
    stats.current.samples++
  }, [metrics])

  useEffect(() => {
    const interval = setInterval(() => {
      if (stats.current.samples > 0) {
        const n = stats.current.samples
        const avgFT = stats.current.ftSum / n
        const avgJ = stats.current.jSum / n
        const load = stats.current.lSum
        
        console.log(
          `%c[5s Avg - ${title}] FT: ${avgFT.toFixed(2)}ms | Jitter: ${avgJ.toFixed(2)}ms | LoadTime: ${load.toFixed(1)}ms`,
          'color: #38bdf8; font-weight: bold;'
        )
        
        stats.current.ftSum = 0
        stats.current.jSum = 0
        stats.current.samples = 0
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [title])

  const jitterColor = metrics.jitter < 1 ? 'text-emerald-400' : metrics.jitter < 3 ? 'text-yellow-400' : 'text-red-400'

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

function InstancedTriangles({ count = 10000 }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const tempObject = new THREE.Object3D()

  useEffect(() => {
    for (let i = 0; i < count; i++) {
      const radius = 10 + Math.random() * 15
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      
      tempObject.position.set(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
      )
      
      tempObject.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)
      tempObject.updateMatrix()
      meshRef.current.setMatrixAt(i, tempObject.matrix)
      
      // Random colors for aesthetics
      meshRef.current.setColorAt(i, new THREE.Color(`hsl(${Math.random() * 50 + 200}, 80%, 50%)`))
    }
    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true
  }, [count])

  // Optional: Gentle vibration/oscillation
  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    meshRef.current.rotation.y = t * 0.05
  })

  return (
    <instancedMesh ref={meshRef} args={[null!, null!, count]}>
      <coneGeometry args={[0.1, 0.2, 3]} />
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
      <PerfMetricsHUD metrics={metrics} title="Triángulos Estáticos" />

      <Canvas camera={{ position: [20, 20, 20], fov: 50 }}>
          <DebugTools title="Triángulos Estáticos" />
          <MetricsCollector onUpdate={setMetrics} count={count} />
          
          <Suspense fallback={null}>
            <ambientLight intensity={1} />
            <OrbitControls makeDefault autoRotate autoRotateSpeed={0.5} />
            <InstancedTriangles count={count} />
          </Suspense>
      </Canvas>
    </main>
  )
}
