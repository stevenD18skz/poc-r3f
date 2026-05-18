'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useState, useMemo, useRef, useEffect, Suspense } from 'react'
import * as THREE from 'three'
import { Perf, getPerf } from 'r3f-perf'
import PerformanceOverlay from '@/components/test/PerformanceOverlay'
import DebugTools from '@/components/DebugTools'
import Loader3D from '@/components/ui/Loader3D'
import { OrbitControls, Environment } from '@react-three/drei'
import { EffectComposer, Bloom, SSAO, Vignette, Noise, BrightnessContrast } from '@react-three/postprocessing'
import { getVRAMUsage } from '@/utils/vram'

// ─────────────────────────────────────────────
// PARÁMETROS DEL TEST
// ─────────────────────────────────────────────
const sphereGeom = new THREE.SphereGeometry(1, 32, 32)
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
  const { gl, scene } = useThree()
  const frameCount = useRef(0)
  const lastLogTime = useRef(performance.now() - 2000)
  const lastCount = useRef(count)

  if (lastCount.current !== count) {
    lastCount.current = count
    frameCount.current = 0
    deltaCalculator.reset()
    lastLogTime.current = performance.now() - 2000 // Forzar log inmediato al cambiar targets
  }

  useFrame((_, delta) => {
    const now = performance.now()
    const deltaMs = delta * 1000
    frameCount.current++

    // Ignoramos los primeros 10 frames (warm-up) para asegurar que el Jitter 
    // represente únicamente el "Steady State" del post-procesado continuo
    if (frameCount.current > 10) {
      deltaCalculator.push(deltaMs)
    }

    if (now - lastLogTime.current >= 2000) {
      const perfState = getPerf ? getPerf() : null
      const cpuTime = perfState?.log?.cpu ?? 0
      const meanFrameTime = deltaCalculator.mean()
      const currentFps = meanFrameTime > 0 ? 1000 / meanFrameTime : 0
      const frameBudget = (meanFrameTime / 16.667) * 100
      const jitter = deltaCalculator.jitter()
      
      const vram = getVRAMUsage(gl, scene)

      console.log(
        `%c[Post-Processing] ${count.toLocaleString()} Objetos + 5 Passes (SSAO/Bloom/Noise/Vignette/BC)`,
        'color:#10b981;font-weight:bold;font-size:12px'
      )
      console.log(`%cMotor%c React Three Fiber`, 'color:#94a3b8', 'color:#e2e8f0;font-weight:600')
      console.log(`%cFPS%c ${Math.round(currentFps)}`, 'color:#94a3b8', 'color:#e2e8f0;font-weight:600')
      console.log(`%cCPU (ms)%c ${cpuTime.toFixed(2)} ms`, 'color:#94a3b8', 'color:#38bdf8;font-weight:600')
      console.log(`%cFrame Time (ms)%c ${meanFrameTime.toFixed(2)} ms`, 'color:#94a3b8', 'color:#e2e8f0;font-weight:600')
      console.log(`%cVRAM (mb)%c ${vram.total} MB`, 'color:#94a3b8', 'color:#a78bfa;font-weight:600')
      console.log(`%cJitter — steady state (ms)%c ${jitter.toFixed(2)} ms`, 'color:#94a3b8', 'color:#fbbf24;font-weight:600')
      console.log(`%cFrame Budget (%)%c ${frameBudget.toFixed(1)}%`, 'color:#94a3b8', 'color:#f43f5e;font-weight:600')
      console.log('--------------------------------------------------')

      lastLogTime.current = now
    }
  })

  return null
}

// ─────────────────────────────────────────────
// ESCENA ESTÁTICA EN INSTANCED MESH
// ─────────────────────────────────────────────
function StaticEmitters({ count }: { count: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const tempObject = useRef(new THREE.Object3D()).current

  const positions = useMemo(() => Array.from({ length: count }, () => ({
    x: (Math.random() - 0.5) * 20,
    y: (Math.random() - 0.5) * 20,
    z: (Math.random() - 0.5) * 20,
    scale: Math.random() * 0.5 + 0.2,
  })), [count])

  useEffect(() => {
    if (!meshRef.current) return
    positions.forEach((p, i) => {
      tempObject.position.set(p.x, p.y, p.z)
      tempObject.scale.setScalar(p.scale)
      tempObject.updateMatrix()
      meshRef.current.setMatrixAt(i, tempObject.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [positions, tempObject])

  return (
    <instancedMesh ref={meshRef} args={[sphereGeom, undefined, count]}>
      <meshStandardMaterial roughness={0} metalness={1} emissive="#ffffff" emissiveIntensity={3} />
    </instancedMesh>
  )
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────
export default function PostProcessingStressTest() {
  const [count, setCount] = useState(256)

  return (
    <main className="relative w-full h-screen bg-[#050505] overflow-hidden">
      <PerformanceOverlay
        title={`Post-Procesado: ${count} Emisores`}
        input={true}
        count={count}
        setCount={setCount}
        inputConfig={{ unit: 'normal', type: 'values', values: [32, 128, 512] }}
      />

      <Canvas 
        camera={{ position: [0, 0, 30], fov: 45 }}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
      >
        {/* Registro del Hook de CPU (r3f-perf) oculto de la pantalla */}
        <Perf minimal style={{ display: 'none' }} />
        
        {/* Escucha y reporte de telemetría directo a consola */}
        <ConsoleMetricsCollector count={count} />
      

        <Suspense fallback={<Loader3D />}>
          <Environment preset="night" />
          <ambientLight intensity={0.3} />
          <pointLight position={[10, 10, 10]} intensity={10} color="#3b82f6" />

          <StaticEmitters count={count} />

          <EffectComposer enableNormalPass>
            <SSAO intensity={20} luminanceInfluence={0.5} radius={0.4} bias={0.035} />
            <Bloom intensity={1.5} luminanceThreshold={0.5} luminanceSmoothing={0.9} height={300} />
            <Noise opacity={0.05} />
            <Vignette eskil={false} offset={0.1} darkness={1.1} />
            <BrightnessContrast brightness={0.05} contrast={0.1} />
          </EffectComposer>

          <mesh rotation-x={-Math.PI / 2} position={[0, -10, 0]}>
            <planeGeometry args={[100, 100]} />
            <meshStandardMaterial color="#111" roughness={0.5} />
          </mesh>
        </Suspense>
      </Canvas>
    </main>
  )
}