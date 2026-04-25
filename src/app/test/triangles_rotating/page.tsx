'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { useRef, useEffect, useState, Suspense, useMemo, useCallback } from 'react'
import * as THREE from 'three'
import PerformanceOverlay from '@/components/test/PerformanceOverlay'
import DebugTools from '@/components/DebugTools'
import { OrbitControls } from '@react-three/drei'

import Loader3D from '@/components/ui/Loader3D'

//upsate 25-04-2026-12:48

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
          'color: #f43f5e; font-weight: bold;'
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

function InstancedRotatingTriangles({ count = 1000 }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const tempObject = new THREE.Object3D()
  
  // Create static data for positions and rotation speeds
  const particles = useMemo(() => {
    const temp = []
    for (let i = 0; i < count; i++) {
        const radius = 10 + Math.random() * 40
        const theta = Math.random() * Math.PI * 2
        const phi = Math.random() * Math.PI
        
        const x = radius * Math.sin(phi) * Math.cos(theta)
        const y = radius * Math.sin(phi) * Math.sin(theta)
        const z = radius * Math.cos(phi)
        
        const rotationSpeed = (Math.random() - 0.5) * 2
        const color = new THREE.Color(`hsl(${Math.random() * 70 + 150}, 80%, 50%)`)
        
        temp.push({ x, y, z, rotationSpeed, color })
    }
    return temp
  }, [count])

  // Initial setup: position and colors
  useEffect(() => {
    particles.forEach((p, i) => {
      tempObject.position.set(p.x, p.y, p.z)
      tempObject.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)
      tempObject.updateMatrix()
      meshRef.current.setMatrixAt(i, tempObject.matrix)
      meshRef.current.setColorAt(i, p.color)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true
  }, [particles, count])

  // Individual rotation per frame
  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    particles.forEach((p, i) => {
      tempObject.position.set(p.x, p.y, p.z)
      // Rotate individually based on their speed and time
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
    <instancedMesh ref={meshRef} args={[null!, null!, count]}>
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
          max: 12
        }}
      />
      <PerfMetricsHUD metrics={metrics} title="Triángulos Rotando" />

      <Canvas
      camera={{ position: [120, 0, 0], fov: 50 }}
      >
          <DebugTools title="Triángulos Rotando" entityCount={count} />
          <MetricsCollector onUpdate={setMetrics} count={count} />

          <Suspense fallback={<Loader3D />}>
            <OrbitControls makeDefault />
            <ambientLight intensity={1} />
            <InstancedRotatingTriangles count={count} />
          </Suspense>
      </Canvas>
    </main>
  )
}
