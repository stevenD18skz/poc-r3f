'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import * as THREE from 'three'
import { Perf, getPerf } from 'r3f-perf'
import PerformanceOverlay from '@/components/test/PerformanceOverlay'
import DebugTools from '@/components/DebugTools'
import Loader3D from '@/components/ui/Loader3D'
import { OrbitControls, Text, Grid } from '@react-three/drei'

// ─────────────────────────────────────────────
// TIPOS Y COLA DE PETICIONES
// ─────────────────────────────────────────────
type NpcAction = 'idle' | 'walk' | 'jump'

interface NpcState {
  id: number
  action: NpcAction
  thinking: boolean
  error: boolean
  targetPosition: { x: number; z: number }
  requestCount: number
  lastLatency: number
}

class RequestQueue {
  private queue: Array<() => Promise<void>> = []
  private running = 0
  private maxConcurrent: number
  constructor(maxConcurrent = 3) { this.maxConcurrent = maxConcurrent }
  async add(fn: () => Promise<void>) {
    return new Promise<void>((resolve, reject) => {
      this.queue.push(async () => { try { await fn(); resolve() } catch (e) { reject(e) } })
      this.process()
    })
  }
  private async process() {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) return
    this.running++
    const task = this.queue.shift()!
    try { await task() } finally { this.running--; this.process() }
  }
}

const globalQueue = new RequestQueue(3)

// ─────────────────────────────────────────────
// CALCULADOR MATEMÁTICO DE RENDIMIENTO (FRAME TIME & JITTER)
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
// CONSOLE METRICS COLLECTOR (CERO HUD)
// ─────────────────────────────────────────────
function ConsoleMetricsCollector({
  count,
  latenciesRef
}: {
  count: number
  latenciesRef: React.MutableRefObject<{ ts: number, val: number }[]>
}) {
  const lastLogTime = useRef(performance.now() - 2000)
  const lastCount = useRef(count)

  if (lastCount.current !== count) {
    lastCount.current = count
    deltaCalculator.reset()
    lastLogTime.current = performance.now() - 2000 // Forzar log inmediato al cambiar
  }

  useFrame((_, delta) => {
    const now = performance.now()
    const deltaMs = delta * 1000
    deltaCalculator.push(deltaMs)

    // Log a la consola cada 2 segundos
    if (now - lastLogTime.current >= 2000) {
      const perfState = getPerf ? getPerf() : null
      const cpuTime = perfState?.log?.cpu ?? 0
      const meanFrameTime = deltaCalculator.mean()
      const currentFps = meanFrameTime > 0 ? 1000 / meanFrameTime : 0
      const frameBudget = (meanFrameTime / 16.667) * 100
      const jitter = deltaCalculator.jitter()

      // Limpiar latencias más viejas de 10 segundos
      latenciesRef.current = latenciesRef.current.filter(l => now - l.ts <= 10000)

      const currentLatencies = latenciesRef.current
      const maxLatency10s = currentLatencies.length > 0 ? Math.max(...currentLatencies.map(l => l.val)) : 0
      const avgLatency = currentLatencies.length > 0
        ? currentLatencies.reduce((sum, l) => sum + l.val, 0) / currentLatencies.length
        : 0

      console.log(
        `%c[Simulación IA] ${count.toLocaleString()} NPCs Activos`,
        'color:#3b82f6;font-weight:bold;font-size:12px'
      )
      console.log(`%cFPS%c ${Math.round(currentFps)}`, 'color:#94a3b8', 'color:#e2e8f0;font-weight:600')
      console.log(`%cFrame Time (ms)%c ${meanFrameTime.toFixed(2)} ms`, 'color:#94a3b8', 'color:#e2e8f0;font-weight:600')
      console.log(`%cFrame Budget (%)%c ${frameBudget.toFixed(1)}%`, 'color:#94a3b8', 'color:#fbbf24;font-weight:600')
      console.log(`%cJitter (ms)%c ${jitter.toFixed(2)} ms`, 'color:#94a3b8', 'color:#f87171;font-weight:600')
      console.log(`%cScripting CPU (ms)%c ${cpuTime.toFixed(2)} ms`, 'color:#94a3b8', 'color:#38bdf8;font-weight:600')
      console.log(`%cPico Latencia (10s)%c ${Math.round(maxLatency10s)} ms`, 'color:#94a3b8', 'color:#c084fc;font-weight:600')
      console.log(`%cLatencia Prom. (ms)%c ${Math.round(avgLatency)} ms`, 'color:#94a3b8', 'color:#a78bfa;font-weight:600')
      console.log('--------------------------------------------------')

      lastLogTime.current = now
    }
  })

  return null
}

// ─────────────────────────────────────────────
// ENTIDAD NPC Y ESCENA R3F
// ─────────────────────────────────────────────
function NpcEntity({ state }: { state: NpcState }) {
  const groupRef = useRef<THREE.Group>(null!)
  const bodyRef = useRef<THREE.Mesh>(null!)
  const targetPos = useRef(new THREE.Vector3(state.targetPosition.x, 0, state.targetPosition.z))

  useEffect(() => {
    targetPos.current.set(state.targetPosition.x, 0, state.targetPosition.z)
  }, [state.targetPosition])

  useFrame((s, delta) => {
    if (!groupRef.current || !bodyRef.current) return
    const t = s.clock.getElapsedTime()
    switch (state.action) {
      case 'idle':
        bodyRef.current.position.y = Math.sin(t * 2 + state.id) * 0.08
        bodyRef.current.rotation.z = Math.sin(t + state.id) * 0.04
        break
      case 'jump':
        bodyRef.current.position.y = Math.abs(Math.sin(t * 6 + state.id)) * 1.5
        bodyRef.current.rotation.x = Math.sin(t * 6) * 0.3
        break
      case 'walk': {
        const curr = groupRef.current.position
        const dir = targetPos.current.clone().sub(curr)
        if (dir.length() > 0.1) {
          const angle = Math.atan2(dir.x, dir.z)
          groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, angle, delta * 5)
          curr.lerp(targetPos.current, delta * 1.5)
          groupRef.current.position.copy(curr)
        }
        bodyRef.current.position.y = Math.abs(Math.sin(t * 8 + state.id)) * 0.3
        bodyRef.current.rotation.z = Math.sin(t * 8 + state.id) * 0.15
        break
      }
    }
  })

  const bodyColor = state.error ? '#ef4444' : state.thinking ? '#facc15' : '#f97316'
  const labelText = state.thinking ? '...' : state.error ? 'ERR' : state.action.toUpperCase()
  const labelColor = state.error ? '#ef4444' : state.thinking ? '#facc15' : '#4ade80'

  return (
    <group ref={groupRef} position={[state.id % 5 * 3 - 6, 0, Math.floor(state.id / 5) * 3 - 6]}>
      <Text position={[0, 3.2, 0]} fontSize={0.35} color={labelColor} outlineWidth={0.04} outlineColor="#000" anchorX="center" anchorY="middle">
        {`#${state.id} ${labelText}`}
      </Text>
      {state.lastLatency > 0 && (
        <Text position={[0, 2.7, 0]} fontSize={0.25} color="#94a3b8" anchorX="center">
          {`${state.lastLatency}ms`}
        </Text>
      )}
      <mesh ref={bodyRef}>
        <mesh position={[0, 1.2, 0.4]}>
          <boxGeometry args={[0.8, 0.8, 0.8]} />
          {/* ✅ Elimina color-convert-colorspace */}
          <meshStandardMaterial color={bodyColor} />

          <mesh position={[-0.25, 0.5, 0]}>
            <coneGeometry args={[0.15, 0.4, 4]} />
            <meshStandardMaterial color="#c2410c" />
          </mesh>
          <mesh position={[0.25, 0.5, 0]}>
            <coneGeometry args={[0.15, 0.4, 4]} />
            <meshStandardMaterial color="#c2410c" />
          </mesh>
        </mesh>
        <mesh position={[0, 0.5, -0.3]}>
          <boxGeometry args={[1.0, 0.7, 1.4]} />
          {/* ✅ Elimina color-convert-colorspace */}
          <meshStandardMaterial color={bodyColor} />
        </mesh>
      </mesh>

    </group>
  )
}

function NpcScene({ npcStates }: { npcStates: NpcState[] }) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 15, 10]} intensity={1.0} castShadow />
      <Grid position={[0, 0, 0]} args={[24, 24]} cellSize={1} cellThickness={0.5} cellColor="#1e3a5f" sectionSize={4} sectionThickness={1} sectionColor="#3b82f6" fadeDistance={40} infiniteGrid />
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#020817" roughness={0.9} />
      </mesh>
      {npcStates.map((s) => <NpcEntity key={s.id} state={s} />)}
    </>
  )
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────
export default function NpcAiTest() {
  const [npcCount, setNpcCount] = useState(64)
  const [npcStates, setNpcStates] = useState<NpcState[]>([])

  // Ref para almacenar historial de latencias de los últimos 10s y no triggear re-renders excesivos
  const apiLatenciesRef = useRef<{ ts: number, val: number }[]>([])

  useEffect(() => {
    apiLatenciesRef.current = [] // Resetear latencias al cambiar el conteo
    setNpcStates(Array.from({ length: npcCount }, (_, i): NpcState => ({
      id: i, action: 'idle', thinking: false, error: false,
      targetPosition: { x: 0, z: 0 }, requestCount: 0, lastLatency: 0,
    })))
  }, [npcCount])

  const updateNpc = useCallback((id: number, patch: Partial<NpcState>) => {
    setNpcStates((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }, [])

  const runNpcLoop = useCallback(async (id: number, signal: AbortSignal) => {
    await new Promise((r) => setTimeout(r, id * 500))
    while (!signal.aborted) {
      let currentAction: NpcAction = 'idle'
      let currentPos = { x: 0, z: 0 }

      setNpcStates(prev => {
        const npc = prev.find(s => s.id === id)
        if (npc) { currentAction = npc.action; currentPos = npc.targetPosition }
        return prev
      })

      updateNpc(id, { thinking: true, error: false })
      const t0 = performance.now()

      try {
        await globalQueue.add(async () => {
          if (signal.aborted) return
          const res = await fetch('/api/npc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentAction, position: { x: currentPos.x, y: 0, z: currentPos.z } }),
            signal,
          })

          const latency = Math.round(performance.now() - t0)
          apiLatenciesRef.current.push({ ts: performance.now(), val: latency }) // Guardar latencia

          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          const data = await res.json()
          if (signal.aborted) return

          updateNpc(id, {
            action: data.action as NpcAction,
            thinking: false,
            error: false,
            targetPosition: data.targetPosition ?? { x: 0, z: 0 },
            lastLatency: latency
          })
        })
      } catch (err: any) {
        if (err.name === 'AbortError') return
        const latencyError = Math.round(performance.now() - t0)
        apiLatenciesRef.current.push({ ts: performance.now(), val: latencyError })
        updateNpc(id, { thinking: false, error: true, lastLatency: latencyError })
      }

      await new Promise((r) => {
        const timeout = setTimeout(r, 3000 + Math.random() * 2000)
        signal.addEventListener('abort', () => clearTimeout(timeout), { once: true })
      })
    }
  }, [updateNpc])

  useEffect(() => {
    if (npcStates.length === 0) return
    const ac = new AbortController()
    npcStates.forEach((s) => runNpcLoop(s.id, ac.signal))
    return () => ac.abort()
  }, [npcStates.length, runNpcLoop])

  return (
    <main className="relative w-full h-screen bg-[#050505] overflow-hidden">
      <PerformanceOverlay
        title={`NPC IA: ${npcCount} Agentes`}
        input={true}
        count={npcCount}
        setCount={setNpcCount}
        inputConfig={{ unit: 'normal', type: 'values', values: [4, 16, 64, 256, 512] }}
      />

      <Canvas camera={{ position: [0, 14, 18], fov: 50 }} gl={{ antialias: false, powerPreference: "high-performance" }}>
        {/* Recolector de telemetría oculto de R3F */}
        <Perf minimal style={{ display: 'none' }} />

        {/* Recolector e impresor exclusivo de consola */}
        <ConsoleMetricsCollector count={npcCount} latenciesRef={apiLatenciesRef} />

        <Suspense fallback={<Loader3D />}>
          <NpcScene npcStates={npcStates} />
        </Suspense>
      </Canvas>
    </main>
  )
}