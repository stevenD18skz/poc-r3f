'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { useState, useMemo, useRef, useCallback, useEffect, Suspense } from 'react'
import * as THREE from 'three'
import PerformanceOverlay from '@/components/test/PerformanceOverlay'
import DebugTools from '@/components/DebugTools'
import Loader3D from '@/components/ui/Loader3D'
import { OrbitControls } from '@react-three/drei'

// ─────────────────────────────────────────────
// POR QUÉ ESTE TEST ES DIFERENTE A LOS OTROS
// ─────────────────────────────────────────────
// Todos los tests anteriores usan InstancedMesh (1 draw call para N objetos)
// Este test usa N meshes independientes con N materiales distintos
// → N draw calls (uno por objeto)
//
// Esto representa el escenario real de una escena 3D:
// personajes, muebles, props → cada uno con geometría y material único
//
// Lo que mides: overhead del framework por draw call
// Es el benchmark más honesto para comparar R3F vs Babylon en escenas reales
// ─────────────────────────────────────────────
//
// PARÁMETROS (deben ser idénticos en Babylon):
// Geometría: 5 tipos distintos rotando (no instanciadas)
// Material: 1 MeshStandardMaterial único por objeto (N materials)
// Objetos estáticos: sí (aislar draw call cost, no animación)
// Sombras: OFF (aislar draw calls, no shadow maps)
// Draw calls: N (1 por objeto, sin instancing)
// ─────────────────────────────────────────────

// 5 geometrías distintas para simular variedad real de escena
const GEOMETRIES = [
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.SphereGeometry(0.6, 16, 16),
  new THREE.ConeGeometry(0.5, 1.2, 8),
  new THREE.CylinderGeometry(0.4, 0.4, 1.2, 12),
  new THREE.TorusGeometry(0.5, 0.2, 8, 16),
]

// ─────────────────────────────────────────────
// MÉTRICAS
// ─────────────────────────────────────────────
const frameBuffer = new Float32Array(60)
let bufIdx = 0, bufFilled = 0

interface DrawCallMetrics {
  frameTime: number
  jitter: number
  frameBudget: number
  drawCalls: number   // Leído del renderer info
}

function MetricsCollector({ onUpdate }: { onUpdate: (m: DrawCallMetrics) => void }) {
  const fc = useRef(0)

  useFrame(({ gl }) => {
    // ✅ gl.info.render.calls = draw calls reales del frame
    const calls = gl.info.render.calls

    const ms = (performance.now() - (MetricsCollector as any)._last) || 0;
    (MetricsCollector as any)._last = performance.now()

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
      frameTime: Math.round(mean * 100) / 100,
      jitter: Math.round(Math.sqrt(variance / n) * 100) / 100,
      frameBudget: Math.round((mean / 16.667) * 1000) / 10,
      drawCalls: calls,
    })
  })
  return null
}
;(MetricsCollector as any)._last = performance.now()

// ─────────────────────────────────────────────
// OBJETO ÚNICO: geometría + material propio
// Esto es lo que genera 1 draw call por objeto
// ─────────────────────────────────────────────
function UniqueObject({ position, rotation, scale, color, geomIndex }: {
  position: [number, number, number]
  rotation: [number, number, number]
  scale: number
  color: THREE.Color
  geomIndex: number
}) {
  return (
    // ✅ Cada mesh tiene su propio material (new material por instancia JSX)
    // → Three.js no puede batching → 1 draw call por objeto
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
  // Datos de los objetos calculados una sola vez
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
      {/* Iluminación simple y fija */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 10]} intensity={1.0} />
      <directionalLight position={[-10, -10, -10]} intensity={0.3} color="#4f46e5" />

      {/* ✅ N objetos individuales = N draw calls */}
      {objects.map((obj, i) => (
        <UniqueObject key={i} {...obj} />
      ))}
    </>
  )
}

// ─────────────────────────────────────────────
// HUD
// ─────────────────────────────────────────────
function DrawCallsHUD({ metrics, count }: { metrics: DrawCallMetrics; count: number }) {
  const drawColor =
    metrics.drawCalls < 200 ? 'text-emerald-400' :
    metrics.drawCalls < 600 ? 'text-yellow-400' :
    'text-red-400'

  const jitterColor =
    metrics.jitter < 2 ? 'text-emerald-400' :
    metrics.jitter < 5 ? 'text-yellow-400' :
    'text-red-400'

  const budgetColor =
    metrics.frameBudget < 50 ? 'text-emerald-400' :
    metrics.frameBudget < 85 ? 'text-yellow-400' :
    'text-red-400'

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 min-w-[180px]">
      {/* Draw Calls: la métrica principal de este test */}
      <div className="bg-black/80 backdrop-blur border border-cyan-500/40 px-4 py-3 rounded-xl">
        <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Draw Calls</p>
        <p className={`text-2xl font-mono font-black ${drawColor}`}>
          {metrics.drawCalls}
        </p>
        <p className="text-gray-600 text-[10px]">1 por objeto (sin instancing)</p>
      </div>

      <div className="bg-black/80 backdrop-blur border border-slate-500/40 px-4 py-3 rounded-xl">
        <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Frame Time</p>
        <p className="text-2xl font-mono font-black text-slate-300">
          {metrics.frameTime.toFixed(2)}<span className="text-xs text-gray-500 ml-1">ms</span>
        </p>
      </div>

      <div className="bg-black/80 backdrop-blur border border-orange-500/40 px-4 py-3 rounded-xl">
        <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Jitter</p>
        <p className={`text-2xl font-mono font-black ${jitterColor}`}>
          {metrics.jitter.toFixed(2)}<span className="text-xs text-gray-500 ml-1">ms</span>
        </p>
        <p className="text-gray-600 text-[10px]">varianza frame time</p>
      </div>

      <div className="bg-black/80 backdrop-blur border border-blue-500/40 px-4 py-3 rounded-xl">
        <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Frame Budget</p>
        <p className={`text-2xl font-mono font-black ${budgetColor}`}>
          {metrics.frameBudget.toFixed(1)}<span className="text-xs text-gray-500 ml-1">%</span>
        </p>
        <p className="text-gray-600 text-[10px]">de 16.67ms (60fps)</p>
      </div>

      {/* Comparación instancing vs draw calls */}
      <div className="bg-black/80 backdrop-blur border border-violet-500/40 px-4 py-3 rounded-xl">
        <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">Instancing vs Único</p>
        <div className="flex justify-between text-[11px] mb-1">
          <span className="text-gray-400">Con instancing</span>
          <span className="text-emerald-400 font-mono font-bold">1 DC</span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="text-gray-400">Sin instancing</span>
          <span className="text-red-400 font-mono font-bold">{count} DC</span>
        </div>
      </div>
    </div>
  )
}

export default function DrawCallsStressTest() {
  const [count, setCount] = useState(4096)
  const [metrics, setMetrics] = useState<DrawCallMetrics>({
    frameTime: 0, jitter: 0, frameBudget: 0, drawCalls: 0,
  })
  const handleMetrics = useCallback((m: DrawCallMetrics) => setMetrics(m), [])

  return (
    <main className="relative w-full h-screen bg-[#050505] overflow-hidden">
      <PerformanceOverlay
        title={`Draw Calls: ${count} Objetos Únicos`}
        input={true}
        count={count}
        setCount={setCount}
        inputConfig={{ unit: 'normal', type: 'values', values: [64, 256, 512, 1024, 4096] }}
      />

      <DrawCallsHUD metrics={metrics} count={count} />

      <Canvas
        shadows={false}  // OFF: aislar costo de draw calls, no sombras
        camera={{ position: [0, 10, 40], fov: 50 }}
      >
        <MetricsCollector onUpdate={handleMetrics} />
        <DebugTools title="Draw Calls Stress" entityCount={count} />

        <Suspense fallback={<Loader3D />}>
          <OrbitControls makeDefault />
          <DrawCallScene count={count} />
        </Suspense>
      </Canvas>

    
      {/* {metrics.drawCalls} 
      <div className="absolute bottom-6 left-6 bg-black/70 p-4 rounded-lg border border-cyan-500 text-white text-xs max-w-xs">
        <h3 className="font-bold text-cyan-400 mb-2">Especificaciones del test</h3>
        <ul className="space-y-1 text-gray-300">
          <li>• Objetos: {count} meshes independientes</li>
          <li>• Materiales: {count} únicos (sin batching)</li>
          <li>• Geometrías: 5 tipos distintos</li>
          <li>• Draw calls: {count} (1 por objeto)</li>
          <li>• Instancing: NO (este es el punto del test)</li>
          <li>• Sombras: OFF (aislar draw call cost)</li>
          <li>• Escena: estática (sin animación)</li>
        </ul>
      </div>*/}
    </main>
  )
}