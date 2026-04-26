'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { useState, useMemo, useRef, useCallback, Suspense } from 'react'
import * as THREE from 'three'
import PerformanceOverlay from '@/components/test/PerformanceOverlay'
import DebugTools from '@/components/DebugTools'
import Loader3D from '@/components/ui/Loader3D'
import { OrbitControls, Environment, MeshTransmissionMaterial } from '@react-three/drei'

// ─────────────────────────────────────────────
// PARÁMETROS DEL TEST (deben ser idénticos en Babylon)
// ─────────────────────────────────────────────
// Geometría: alternancia torusKnot / sphere (pre-calculadas, sin GC)
// Materiales: 3 tipos PBR - Transmission / Metal / Clearcoat+Sheen
// Distribución: i % 3 → equitativa, no aleatoria (reproducible)
// Sombras: OFF → aislar costo de shader/material
// Luces: solo Environment HDRI → necesario para evaluar PBR correctamente
// Lo que mides: costo de compilar y ejecutar N shader variants complejos
// ─────────────────────────────────────────────

// ✅ Pre-calculadas: no se recrean en cada render
const torusKnotGeom = new THREE.TorusKnotGeometry(1, 0.3, 128, 32)
const sphereGeom = new THREE.SphereGeometry(1, 64, 64)

const SHADER_TYPES = ['Transmission', 'Metal PBR', 'Clearcoat+Sheen'] as const
type ShaderType = typeof SHADER_TYPES[number]

// ─────────────────────────────────────────────
// MÉTRICAS
// ─────────────────────────────────────────────
const frameBuffer = new Float32Array(60)
let bufIdx = 0, bufFilled = 0

interface MaterialMetrics {
  jitter: number
  frameBudget: number
  frameTime: number
  shaderBreakdown: Record<ShaderType, number>
}

function MetricsCollector({ onUpdate, shaderBreakdown }: {
  onUpdate: (m: MaterialMetrics) => void
  shaderBreakdown: Record<ShaderType, number>
}) {
  const fc = useRef(0)
  useFrame((_, delta) => {
    const ms = delta * 1000
    frameBuffer[bufIdx] = ms
    bufIdx = (bufIdx + 1) % 60
    bufFilled = Math.min(bufFilled + 1, 60)
    fc.current++
    if (fc.current % 10 !== 0) return
    const n = bufFilled
    let sum = 0
    for (let i = 0; i < n; i++) sum += frameBuffer[i]
    const mean = sum / n
    let variance = 0
    for (let i = 0; i < n; i++) { const d = frameBuffer[i] - mean; variance += d * d }
    onUpdate({
      jitter: Math.round(Math.sqrt(variance / n) * 100) / 100,
      frameBudget: Math.round((mean / 16.667) * 100 * 10) / 10,
      frameTime: Math.round(mean * 100) / 100,
      shaderBreakdown,
    })
  })
  return null
}

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
      // ✅ i % 3: distribución equitativa y reproducible (no aleatoria)
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
          // ✅ Geometría compartida: no crea instancias nuevas
          geometry={i % 2 === 0 ? torusKnotGeom : sphereGeom}
          position={obj.position}
          rotation={obj.rotation}
          scale={obj.scale}
        >
          {/* TIPO 0: TRANSMISSION - El más pesado */}
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

          {/* TIPO 1: METAL PBR - Reflejos HDRI */}
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
// HUD
// ─────────────────────────────────────────────
function MaterialsHUD({ metrics, count }: { metrics: MaterialMetrics; count: number }) {
  const jitterColor = metrics.jitter < 2 ? 'text-emerald-400' : metrics.jitter < 5 ? 'text-yellow-400' : 'text-red-400'
  const budgetColor = metrics.frameBudget < 50 ? 'text-emerald-400' : metrics.frameBudget < 85 ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 min-w-[175px]">
      <div className="bg-black/80 backdrop-blur border border-slate-500/40 px-4 py-3 rounded-xl">
        <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Frame Time</p>
        <p className="text-2xl font-mono font-black text-slate-300">{metrics.frameTime.toFixed(2)}<span className="text-xs text-gray-500 ml-1">ms</span></p>
      </div>
      <div className="bg-black/80 backdrop-blur border border-orange-500/40 px-4 py-3 rounded-xl">
        <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Jitter</p>
        <p className={`text-2xl font-mono font-black ${jitterColor}`}>{metrics.jitter.toFixed(2)}<span className="text-xs text-gray-500 ml-1">ms</span></p>
        <p className="text-gray-600 text-[10px]">spike por compilación shader</p>
      </div>
      <div className="bg-black/80 backdrop-blur border border-blue-500/40 px-4 py-3 rounded-xl">
        <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Frame Budget</p>
        <p className={`text-2xl font-mono font-black ${budgetColor}`}>{metrics.frameBudget.toFixed(1)}<span className="text-xs text-gray-500 ml-1">%</span></p>
      </div>
      <div className="bg-black/80 backdrop-blur border border-violet-500/40 px-4 py-3 rounded-xl">
        <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">Shader Variants</p>
        {SHADER_TYPES.map((t) => (
          <div key={t} className="flex justify-between text-[11px] mb-1">
            <span className="text-gray-400">{t}</span>
            <span className="text-violet-400 font-mono font-bold">{metrics.shaderBreakdown[t]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function MaterialsStressTest() {
  const [count, setCount] = useState(128)
  const [metrics, setMetrics] = useState<MaterialMetrics>({
    jitter: 0, frameBudget: 0, frameTime: 0,
    shaderBreakdown: { 'Transmission': 0, 'Metal PBR': 0, 'Clearcoat+Sheen': 0 },
  })

  const shaderBreakdown = useMemo<Record<ShaderType, number>>(() => ({
    'Transmission': Math.ceil(count / 3),
    'Metal PBR': Math.floor(count / 3),
    'Clearcoat+Sheen': Math.floor(count / 3),
  }), [count])

  const handleMetrics = useCallback((m: MaterialMetrics) => setMetrics(m), [])

  return (
    <main className="relative w-full h-screen bg-[#050505] overflow-hidden">
      <PerformanceOverlay
        title={`PBR Stress: ${count} Shaders Complejos`}
        input={true}
        count={count}
        setCount={setCount}
        inputConfig={{ unit: 'normal', type: 'values', values: [8, 16, 32, 64, 128] }}
      />

      <MaterialsHUD metrics={metrics} count={count} />

      <Canvas
        shadows={false} // ✅ OFF: aislar costo de material, no de sombras
        camera={{ position: [0, 0, 40], fov: 45 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <MetricsCollector onUpdate={handleMetrics} shaderBreakdown={shaderBreakdown} />
        <DebugTools title="PBR / Transmission Stress" entityCount={count} />

        <Suspense fallback={<Loader3D />}>
          <OrbitControls makeDefault />
          {/* ✅ Environment obligatorio para PBR. Sin él los reflejos no se evalúan */}
          <Environment preset="studio" background blur={0.5} />
          <ComplexMaterials count={count} />
        </Suspense>
      </Canvas>
    </main>
  )
}