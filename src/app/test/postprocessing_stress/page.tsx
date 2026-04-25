'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { useState, useMemo, useRef, useEffect, useCallback, Suspense } from 'react'
import * as THREE from 'three'
import PerformanceOverlay from '@/components/test/PerformanceOverlay'
import DebugTools from '@/components/DebugTools'
import Loader3D from '@/components/ui/Loader3D'
import { OrbitControls, Environment } from '@react-three/drei'
import { EffectComposer, Bloom, SSAO, Vignette, Noise, BrightnessContrast } from '@react-three/postprocessing'

// ─────────────────────────────────────────────
// PARÁMETROS DEL TEST (deben ser idénticos en Babylon)
// ─────────────────────────────────────────────
// Geometría: N esferas ESTÁTICAS (no se mueven en useFrame)
// Razón: los objetos estáticos aíslan el costo de los efectos de post-proceso
// Si los objetos se animaran, no sabrías si el lag viene de la animación o del SSAO/Bloom
// Efectos: SSAO + Bloom + Noise + Vignette + BrightnessContrast
// Lo que mides: costo GPU de los render passes adicionales por frame
// Métrica clave: Jitter (SSAO causa spikes de frame time)
// ─────────────────────────────────────────────

const sphereGeom = new THREE.SphereGeometry(1, 32, 32)

// ─────────────────────────────────────────────
// MÉTRICAS
// ─────────────────────────────────────────────
const ppBuffer = new Float32Array(60)
let ppIdx = 0, ppFilled = 0

interface PostMetrics {
  jitter: number
  frameBudget: number
  frameTime: number
  peakFrame: number
}

function MetricsCollector({ onUpdate }: { onUpdate: (m: PostMetrics) => void }) {
  const fc = useRef(0)
  const peak = useRef(0)

  useFrame((_, delta) => {
    const ms = delta * 1000
    ppBuffer[ppIdx] = ms
    ppIdx = (ppIdx + 1) % 60
    ppFilled = Math.min(ppFilled + 1, 60)
    if (ms > peak.current) peak.current = ms
    fc.current++
    if (fc.current % 10 !== 0) return

    const n = ppFilled
    let sum = 0
    for (let i = 0; i < n; i++) sum += ppBuffer[i]
    const mean = sum / n
    let variance = 0
    for (let i = 0; i < n; i++) { const d = ppBuffer[i] - mean; variance += d * d }

    onUpdate({
      jitter: Math.round(Math.sqrt(variance / n) * 100) / 100,
      frameBudget: Math.round((mean / 16.667) * 100 * 10) / 10,
      frameTime: Math.round(mean * 100) / 100,
      peakFrame: Math.round(peak.current * 100) / 100,
    })
  })
  return null
}

// ✅ Objetos ESTÁTICOS: matrices calculadas una sola vez con useEffect
// El costo de post-processing no depende de si los objetos se mueven
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
  }, [positions])

  return (
    <instancedMesh ref={meshRef} args={[sphereGeom, undefined, count]}>
      <meshStandardMaterial
        roughness={0}
        metalness={1}
        emissive="#ffffff"
        emissiveIntensity={3} // Alto para activar Bloom
      />
    </instancedMesh>
  )
}

// ─────────────────────────────────────────────
// HUD
// ─────────────────────────────────────────────
function PostMetricsHUD({ metrics }: { metrics: PostMetrics }) {
  const jitterColor = metrics.jitter < 2 ? 'text-emerald-400' : metrics.jitter < 6 ? 'text-yellow-400' : 'text-red-400'
  const budgetColor = metrics.frameBudget < 50 ? 'text-emerald-400' : metrics.frameBudget < 85 ? 'text-yellow-400' : 'text-red-400'
  const peakColor = metrics.peakFrame < 20 ? 'text-emerald-400' : metrics.peakFrame < 33 ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 min-w-[175px]">
      <div className="bg-black/80 backdrop-blur border border-slate-500/40 px-4 py-3 rounded-xl">
        <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Frame Time</p>
        <p className="text-2xl font-mono font-black text-slate-300">{metrics.frameTime.toFixed(2)}<span className="text-xs text-gray-500 ml-1">ms</span></p>
      </div>

      {/* Jitter: especialmente relevante con SSAO */}
      <div className="bg-black/80 backdrop-blur border border-orange-500/40 px-4 py-3 rounded-xl">
        <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Jitter</p>
        <p className={`text-2xl font-mono font-black ${jitterColor}`}>{metrics.jitter.toFixed(2)}<span className="text-xs text-gray-500 ml-1">ms</span></p>
        <p className="text-gray-600 text-[10px]">SSAO causa spikes de frame</p>
      </div>

      {/* Peak frame: peor frame registrado */}
      <div className="bg-black/80 backdrop-blur border border-red-500/40 px-4 py-3 rounded-xl">
        <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Peor Frame</p>
        <p className={`text-2xl font-mono font-black ${peakColor}`}>{metrics.peakFrame.toFixed(2)}<span className="text-xs text-gray-500 ml-1">ms</span></p>
        <p className="text-gray-600 text-[10px]">máximo registrado</p>
      </div>

      <div className="bg-black/80 backdrop-blur border border-blue-500/40 px-4 py-3 rounded-xl">
        <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Frame Budget</p>
        <p className={`text-2xl font-mono font-black ${budgetColor}`}>{metrics.frameBudget.toFixed(1)}<span className="text-xs text-gray-500 ml-1">%</span></p>
        <p className="text-gray-600 text-[10px]">de 16.67ms target 60fps</p>
      </div>

      {/* Lista de efectos activos */}
      <div className="bg-black/80 backdrop-blur border border-purple-500/40 px-4 py-3 rounded-xl">
        <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">Efectos Activos</p>
        {['SSAO', 'Bloom', 'Noise', 'Vignette', 'Brightness/Contrast'].map(e => (
          <div key={e} className="flex items-center gap-2 text-[11px] mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />
            <span className="text-gray-300">{e}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function PostProcessingStressTest() {
  const [count, setCount] = useState(32)
  const [metrics, setMetrics] = useState<PostMetrics>({ jitter: 0, frameBudget: 0, frameTime: 0, peakFrame: 0 })
  const handleMetrics = useCallback((m: PostMetrics) => setMetrics(m), [])

  return (
    <main className="relative w-full h-screen bg-[#050505] overflow-hidden">
      <PerformanceOverlay
        title={`Post-Procesado: ${count} Emisores`}
        input={true}
        count={count}
        setCount={setCount}
        inputConfig={{ unit: 'normal', type: 'values', values: [32, 128, 512] }}
      />

      <PostMetricsHUD metrics={metrics} />

      <Canvas camera={{ position: [0, 0, 30], fov: 45 }}>
        <MetricsCollector onUpdate={handleMetrics} />
        <DebugTools title="Post-Procesado" entityCount={count} />

        <Suspense fallback={<Loader3D />}>
          <OrbitControls makeDefault />
          <Environment preset="night" />
          <ambientLight intensity={0.3} />
          <pointLight position={[10, 10, 10]} intensity={10} color="#3b82f6" />

          {/* ✅ Estáticos: aisla costo de efectos, no de animación */}
          <StaticEmitters count={count} />

          <EffectComposer>
            <SSAO intensity={20} luminanceInfluence={0.5} radius={0.4} bias={0.035} />
            <Bloom intensity={1.5} luminanceThreshold={0.5} luminanceSmoothing={0.9} height={300} />
            <Noise opacity={0.05} />
            <Vignette eskil={false} offset={0.1} darkness={1.1} />
            <BrightnessContrast brightness={0.05} contrast={0.1} />
          </EffectComposer>

          <mesh rotation-x={-Math.PI / 2} position={[0, -10, 0]} receiveShadow>
            <planeGeometry args={[100, 100]} />
            <meshStandardMaterial color="#111" roughness={0.5} />
          </mesh>
        </Suspense>
      </Canvas>
    </main>
  )
}