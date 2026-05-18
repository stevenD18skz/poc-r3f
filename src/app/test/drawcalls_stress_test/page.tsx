'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useState, useMemo, useRef, Suspense } from 'react'
import * as THREE from 'three'
import { Perf, getPerf } from 'r3f-perf'
import PerformanceOverlay from '@/components/test/PerformanceOverlay'
import DebugTools from '@/components/DebugTools'
import Loader3D from '@/components/ui/Loader3D'
import { OrbitControls } from '@react-three/drei'
import { useEffect } from 'react'

interface ConsoleMetricsCollectorProps {
  count: number // Cantidad de meshes actuales en escena
}

// ─────────────────────────────────────────────
// PARAMETROS Y GEOMETRÍAS PRE-CALCULADAS
// ─────────────────────────────────────────────
const GEOMETRIES = [
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.SphereGeometry(0.6, 16, 16),
  new THREE.ConeGeometry(0.5, 1.2, 8),
  new THREE.CylinderGeometry(0.4, 0.4, 1.2, 12),
  new THREE.TorusGeometry(0.5, 0.2, 8, 16),
]

const SAMPLE_SIZE = 120

// Calculador matemático estricto para estabilidad en Steady State
const deltaCalculator = {
  samples: new Float32Array(SAMPLE_SIZE),
  index: 0,
  filled: 0,

  push(deltaMs: number) {
    this.samples[this.index] = deltaMs
    this.index = (this.index + 1) % SAMPLE_SIZE
    this.filled = Math.min(this.filled + 1, SAMPLE_SIZE)
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
// CONSOLE METRICS COLLECTOR (EXCLUSIVO CONSOLA)
// ─────────────────────────────────────────────
function ConsoleMetricsCollector({ count }: { count: number }) {
  const { gl } = useThree()
  const frameCount = useRef(0)
  const lastLogTime = useRef(performance.now() - 2000)
  const lastCount = useRef(count)
  const drawCallsRef = useRef(0)

  if (lastCount.current !== count) {
    lastCount.current = count
    frameCount.current = 0
    deltaCalculator.reset()
    lastLogTime.current = performance.now() - 2000 // Forzar log inmediato al mutar el conteo
  }

  // ─── Post-render: captura draw calls reales del frame recién completado
  useFrame((_, delta) => {
    drawCallsRef.current = gl.info.render.calls // ✅ Frame ya renderizado
  }, -1)

  useFrame((_, delta) => {
    const now = performance.now()
    const deltaMs = delta * 1000
    frameCount.current++

    // Ignoramos los primeros 10 frames (warm-up) para asegurar que el Jitter 
    // represente únicamente el "Steady State" del sobrecosto síncrono por comando
    if (frameCount.current > 10) {
      deltaCalculator.push(deltaMs)
    }

    if (now - lastLogTime.current >= 2000) {
      const perfState = getPerf ? getPerf() : null
      const cpuTime = perfState?.log?.cpu ?? 0
      const meanFrameTime = deltaCalculator.mean()
      const currentFps = meanFrameTime > 0 ? 1000 / meanFrameTime : 0
      const frameBudget = (meanFrameTime / 10.00) * 100
      const jitter = deltaCalculator.jitter()
      
      // 1. Captura directa desde el pipeline nativo de WebGL
      const activeDrawCalls = gl.info.render.calls

      // 2. Captura procesada desde r3f-perf
      const r3fPerfDrawCalls = perfState?.log?.drawCalls ?? 0

      console.log(
        `%c[Draw Calls Stress] ${count.toLocaleString()} Meshes independientes con Material Único`,
        'color:#f59e0b;font-weight:bold;font-size:12px'
      )
      console.log(`%cEntidades%c ${count}`, 'color:#94a3b8', 'color:#e2e8f0;font-weight:600')
      console.log(`%cMotor%c React Three Fiber`, 'color:#94a3b8', 'color:#e2e8f0;font-weight:600')
      console.log(`%cFPS%c ${Math.round(currentFps)}`, 'color:#94a3b8', 'color:#e2e8f0;font-weight:600')
      console.log(`%cDraw Calls (WebGL Info)%c ${activeDrawCalls}`, 'color:#94a3b8', 'color:#f43f5e;font-weight:700')
      console.log(`%cDraw Calls (r3f-perf)%c ${r3fPerfDrawCalls}`, 'color:#94a3b8', 'color:#ec4899;font-weight:700')
      console.log(`%cCPU (ms)%c ${cpuTime.toFixed(2)} ms`, 'color:#94a3b8', 'color:#38bdf8;font-weight:600')
      console.log(`%cFrame Time (ms)%c ${meanFrameTime.toFixed(2)} ms`, 'color:#94a3b8', 'color:#e2e8f0;font-weight:600')
      console.log(`%cJitter (ms)%c ${jitter.toFixed(2)} ms`, 'color:#94a3b8', 'color:#fbbf24;font-weight:600')
      console.log(`%cFrame Budget (%)%c ${frameBudget.toFixed(1)}%`, 'color:#94a3b8', 'color:#f43f5e;font-weight:600')
      console.log('--------------------------------------------------')

      lastLogTime.current = now
    }
  })

  return null
}

// ─────────────────────────────────────────────
// OBJETO ÚNICO (Rompe el Batching e Instancing)
// ─────────────────────────────────────────────
function UniqueObject({ position, rotation, scale, color, geomIndex }: {
  position: [number, number, number]
  rotation: [number, number, number]
  scale: number
  color: THREE.Color
  geomIndex: number
}) {
  return (
    <mesh
      geometry={GEOMETRIES[geomIndex]}
      position={position}
      rotation={rotation}
      scale={scale}
    >
      <meshStandardMaterial
        color={color}
        roughness={0.3 + (geomIndex / 5) * 0.5}
        metalness={0.1 + (geomIndex / 5) * 0.4}
      />
    </mesh>
  )
}

function DrawCallScene({ count }: { count: number }) {
  const objects = useMemo(() => Array.from({ length: count }, (_, i) => ({
    position: [
      (Math.random() - 0.5) * 30,
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 30,
    ] as [number, number, number],
    rotation: [
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI,
    ] as [number, number, number],
    scale: 0.4 + Math.random() * 1.0,
    color: new THREE.Color().setHSL(i / count, 0.7, 0.5),
    geomIndex: i % GEOMETRIES.length,
  })), [count])

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 10]} intensity={1.0} />
      <directionalLight position={[-10, -10, -10]} intensity={0.3} color="#4f46e5" />

      {objects.map((obj, i) => (
        <UniqueObject key={i} {...obj} />
      ))}
    </>
  )
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────
export default function DrawCallsStressTest() {
  const [count, setCount] = useState(4096)

  return (
    <main className="relative w-full h-screen bg-[#050505] overflow-hidden">
      <PerformanceOverlay
        title={`Draw Calls: ${count} Objetos Únicos`}
        input={true}
        count={count}
        setCount={setCount}
        inputConfig={{ unit: 'normal', type: 'values', values: [64, 256, 512, 1024, 4096] }}
      />

      <Canvas
        shadows={false}
        camera={{ position: [0, 20, 40], fov: 50 }}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
      >
        {/* Capturador de CPU interno oculto */}
        <Perf minimal style={{ display: 'none' }} />
        <OrbitControls />
        
        {/* Monitor e impresor estructurado de la consola */}
        <ConsoleMetricsCollector count={count} />
        
        <Suspense fallback={<Loader3D />}>
          <DrawCallScene count={count} />
        </Suspense>
      </Canvas>
    </main>
  )
}