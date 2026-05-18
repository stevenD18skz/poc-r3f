'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useState, useMemo, useRef, Suspense } from 'react'
import * as THREE from 'three'
import { Perf, getPerf } from 'r3f-perf'
import PerformanceOverlay from '@/components/test/PerformanceOverlay'
import DebugTools from '@/components/DebugTools'
import Loader3D from '@/components/ui/Loader3D'
import { OrbitControls, Environment, MeshTransmissionMaterial } from '@react-three/drei'
import { getVRAMUsage } from '@/utils/vram' // ✅ Reintegrado de tu entorno

// ─────────────────────────────────────────────
// PARÁMETROS DEL TEST
// ─────────────────────────────────────────────
const torusKnotGeom = new THREE.TorusKnotGeometry(1, 0.3, 128, 32)
const sphereGeom = new THREE.SphereGeometry(1, 64, 64)

// ─────────────────────────────────────────────
// CALCULADOR MATEMÁTICO (STEADY STATE)
// ─────────────────────────────────────────────
const SAMPLE_SIZE = 120

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
// CONSOLE METRICS COLLECTOR (CORREGIDO)
// ─────────────────────────────────────────────
function ConsoleMetricsCollector({ count }: { count: number }) {
  const { gl, scene } = useThree()
  const frameCount = useRef(0)
  const lastLogTime = useRef(performance.now() - 2000)
  const lastCount = useRef(count)
  
  // Ref para capturar el pico de compilación
  const compilationSpike = useRef(0)

  if (lastCount.current !== count) {
    lastCount.current = count
    frameCount.current = 0
    compilationSpike.current = 0
    deltaCalculator.reset()
    lastLogTime.current = performance.now() - 2000 
  }

  useFrame((_, delta) => {
    const now = performance.now()
    const deltaMs = delta * 1000
    frameCount.current++

    // 🔴 LA CORRECCIÓN: Ventana de calentamiento (Primeros 5 frames)
    // El bloqueo de compilación de WebGL ocurre durante el render del frame 1, 
    // lo que dispara masivamente el `delta` del frame 2 o 3.
    if (frameCount.current <= 5) {
      if (deltaMs > compilationSpike.current) {
        compilationSpike.current = deltaMs
      }
    } else {
      // Solo alimentamos el estado estacionario (Jitter) después del calentamiento
      deltaCalculator.push(deltaMs)
    }

    if (now - lastLogTime.current >= 2000) {
      const perfState = getPerf ? getPerf() : null
      const cpuTime = perfState?.log?.cpu ?? 0
      const meanFrameTime = deltaCalculator.mean()
      const currentFps = meanFrameTime > 0 ? 1000 / meanFrameTime : 0
      const jitter = deltaCalculator.jitter()
      
      const vram = getVRAMUsage(gl, scene)

      console.log(
        `%c[PBR Shaders] ${count.toLocaleString()} Materiales Complejos`,
        'color:#f43f5e;font-weight:bold;font-size:12px'
      )
      console.log(`%cMotor%c React Three Fiber`, 'color:#94a3b8', 'color:#e2e8f0;font-weight:600')
      console.log(`%cEntidades%c ${count}`, 'color:#94a3b8', 'color:#e2e8f0;font-weight:600')
      console.log(`%cFPS%c ${Math.round(currentFps)}`, 'color:#94a3b8', 'color:#e2e8f0;font-weight:600')
      console.log(`%cCPU (ms)%c ${cpuTime.toFixed(2)} ms`, 'color:#94a3b8', 'color:#38bdf8;font-weight:600')
      console.log(`%cFrame Time (ms)%c ${meanFrameTime.toFixed(2)} ms`, 'color:#94a3b8', 'color:#e2e8f0;font-weight:600')
      console.log(`%cVRAM (mb)%c ${vram.total} MB`, 'color:#94a3b8', 'color:#a78bfa;font-weight:600')
      console.log(`%cJitter — steady state (ms)%c ${jitter.toFixed(2)} ms`, 'color:#94a3b8', 'color:#fbbf24;font-weight:600')
      
      // Mostrará el pico correctamente (ej. 150.45 ms)
      console.log(`%cCompilation spike (ms)%c ${compilationSpike.current.toFixed(2)} ms`, 'color:#94a3b8', 'color:#f87171;font-weight:600')
      console.log('--------------------------------------------------')

      lastLogTime.current = now
    }
  })

  return null
}

// ─────────────────────────────────────────────
// MATERIALES COMPLEJOS Y ESCENA
// ─────────────────────────────────────────────
function ComplexMaterials({ count }: { count: number }) {
  const objects = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      position: [
        (Math.random() - 0.5) * 25,
        (Math.random() - 0.5) * 25,
        (Math.random() - 0.5) * 25,
      ] as [number, number, number],
      rotation: [
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI,
      ] as [number, number, number],
      scale: Math.random() * 1.5 + 0.5,
      color: new THREE.Color().setHSL(i / count, 0.7, 0.5),
      type: i % 3,
    }))
  }, [count])

  const groupRef = useRef<THREE.Group>(null!)
  useFrame((state) => {
    groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.05
  })

  return (
    <group ref={groupRef}>
      {objects.map((obj, i) => (
        <mesh
          key={i}
          geometry={i % 2 === 0 ? torusKnotGeom : sphereGeom}
          position={obj.position}
          rotation={obj.rotation}
          scale={obj.scale}
        >
          {/* TIPO 0: TRANSMISSION */}
          {obj.type === 0 && (
            <MeshTransmissionMaterial
              backside
              samples={8}
              thickness={1.5}
              roughness={0.1}
              transmission={1}
              ior={1.2}
              chromaticAberration={0.05}
              color={obj.color}
            />
          )}

          {/* TIPO 1: METAL PBR */}
          {obj.type === 1 && (
            <meshPhysicalMaterial
              color={obj.color}
              metalness={1}
              roughness={0.05}
              clearcoat={1}
              clearcoatRoughness={0.1}
            />
          )}

          {/* TIPO 2: CLEARCOAT + SHEEN */}
          {obj.type === 2 && (
            <meshPhysicalMaterial
              color={obj.color}
              metalness={0.1}
              roughness={0.4}
              clearcoat={1}
              clearcoatRoughness={0.1}
              sheen={1}
              sheenRoughness={0.5}
              sheenColor="#ffffff"
            />
          )}
        </mesh>
      ))}
    </group>
  )
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────
export default function MaterialsStressTest() {
  const [count, setCount] = useState(32)

  return (
    <main className="relative w-full h-screen bg-[#050505] overflow-hidden">
      <PerformanceOverlay
        title={`PBR Stress: ${count} Shaders Complejos`}
        input={true}
        count={count}
        setCount={setCount}
        inputConfig={{ unit: 'normal', type: 'values', values: [8, 16, 32, 64, 128] }}
      />

      <Canvas
        shadows={false}
        camera={{ position: [0, 0, 40], fov: 45 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        {/* Recolector de CPU oculto */}
        <Perf minimal style={{ display: 'none' }} />
        
        {/* Recolector de métricas de consola (sin HUD) */}
        <ConsoleMetricsCollector count={count} />

        <Suspense fallback={<Loader3D />}>
          <Environment preset="studio" background blur={0.5} />
          <ComplexMaterials count={count} />
        </Suspense>
      </Canvas>
    </main>
  )
}