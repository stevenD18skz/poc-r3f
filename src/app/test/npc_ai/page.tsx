'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { useState, useEffect, useRef, useCallback, Suspense, useMemo } from 'react'
import * as THREE from 'three'
import PerformanceOverlay from '@/components/test/PerformanceOverlay'
import DebugTools from '@/components/DebugTools'
import Loader3D from '@/components/ui/Loader3D'
import { OrbitControls, Text, Grid } from '@react-three/drei'

// ─────────────────────────────────────────────
// TIPOS
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

interface ApiMetrics {
  totalRequests: number
  successRequests: number
  failedRequests: number
  avgLatency: number
  latencies: number[]
}

// ─────────────────────────────────────────────
// COLA GLOBAL DE REQUESTS
// Evita bombardear la API con N NPCs simultáneos
// ─────────────────────────────────────────────

class RequestQueue {
  private queue: Array<() => Promise<void>> = []
  private running = 0
  private maxConcurrent: number

  constructor(maxConcurrent = 3) {
    this.maxConcurrent = maxConcurrent
  }

  async add(fn: () => Promise<void>) {
    return new Promise<void>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          await fn()
          resolve()
        } catch (e) {
          reject(e)
        }
      })
      this.process()
    })
  }

  private async process() {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) return
    this.running++
    const task = this.queue.shift()!
    try {
      await task()
    } finally {
      this.running--
      this.process()
    }
  }
}

const globalQueue = new RequestQueue(3) // Máximo 3 requests simultáneos

// ─────────────────────────────────────────────
// COMPONENTE NPC 3D
// ─────────────────────────────────────────────

function NpcEntity({ state }: { state: NpcState }) {
  const groupRef = useRef<THREE.Group>(null!)
  const bodyRef = useRef<THREE.Mesh>(null!)
  const targetPos = useRef(new THREE.Vector3(state.targetPosition.x, 0, state.targetPosition.z))

  // Actualizar target cuando cambia en el estado
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
          groupRef.current.rotation.y = THREE.MathUtils.lerp(
            groupRef.current.rotation.y,
            angle,
            delta * 5
          )
          curr.lerp(targetPos.current, delta * 1.5)
          groupRef.current.position.copy(curr)
        }
        bodyRef.current.position.y = Math.abs(Math.sin(t * 8 + state.id)) * 0.3
        bodyRef.current.rotation.z = Math.sin(t * 8 + state.id) * 0.15
        break
      }
    }
  })

  // Color según estado
  const bodyColor = state.error ? '#ef4444' : state.thinking ? '#facc15' : '#f97316'
  const labelText = state.thinking ? '...' : state.error ? 'ERR' : state.action.toUpperCase()
  const labelColor = state.error ? '#ef4444' : state.thinking ? '#facc15' : '#4ade80'

  return (
    <group ref={groupRef} position={[state.id % 5 * 3 - 6, 0, Math.floor(state.id / 5) * 3 - 6]}>
      {/* Label encima del NPC */}
      <Text
        position={[0, 3.2, 0]}
        fontSize={0.35}
        color={labelColor}
        outlineWidth={0.04}
        outlineColor="#000"
        anchorX="center"
        anchorY="middle"
      >
        {`#${state.id} ${labelText}`}
      </Text>

      {/* Latencia */}
      {state.lastLatency > 0 && (
        <Text
          position={[0, 2.7, 0]}
          fontSize={0.25}
          color="#94a3b8"
          anchorX="center"
        >
          {`${state.lastLatency}ms`}
        </Text>
      )}

      <mesh ref={bodyRef}>
        {/* Cabeza */}
        <mesh position={[0, 1.2, 0.4]}>
          <boxGeometry args={[0.8, 0.8, 0.8]} />
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

        {/* Cuerpo */}
        <mesh position={[0, 0.5, -0.3]}>
          <boxGeometry args={[1.0, 0.7, 1.4]} />
          <meshStandardMaterial color={bodyColor} />
        </mesh>
      </mesh>
    </group>
  )
}

// ─────────────────────────────────────────────
// ESCENA
// ─────────────────────────────────────────────

function NpcScene({ npcStates }: { npcStates: NpcState[] }) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 15, 10]} intensity={1.0} castShadow />

      {/* ✅ Grid como componente independiente, no hijo de mesh */}
      <Grid
        position={[0, 0, 0]}
        args={[24, 24]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#1e3a5f"
        sectionSize={4}
        sectionThickness={1}
        sectionColor="#3b82f6"
        fadeDistance={40}
        infiniteGrid
      />

      {/* Piso */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#020817" roughness={0.9} />
      </mesh>

      {npcStates.map((s) => (
        <NpcEntity key={s.id} state={s} />
      ))}
    </>
  )
}

// ─────────────────────────────────────────────
// HUD DE MÉTRICAS DE RED
// ─────────────────────────────────────────────

function NetworkMetricsHUD({ metrics, npcCount }: { metrics: ApiMetrics; npcCount: number }) {
  const successRate = metrics.totalRequests > 0
    ? Math.round((metrics.successRequests / metrics.totalRequests) * 100)
    : 100

  return (
    <div className="fixed top-6 right-6 z-50 flex flex-col gap-2 min-w-[180px]">
      <div className="bg-black/80 backdrop-blur border border-blue-500/40 px-4 py-3 rounded-xl">
        <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">NPCs Activos</p>
        <p className="text-2xl font-mono font-black text-blue-400">{npcCount}</p>
      </div>
      <div className="bg-black/80 backdrop-blur border border-emerald-500/40 px-4 py-3 rounded-xl">
        <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Requests Totales</p>
        <p className="text-2xl font-mono font-black text-emerald-400">{metrics.totalRequests}</p>
      </div>
      <div className="bg-black/80 backdrop-blur border border-yellow-500/40 px-4 py-3 rounded-xl">
        <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Latencia Promedio</p>
        <p className="text-2xl font-mono font-black text-yellow-400">
          {metrics.avgLatency > 0 ? `${metrics.avgLatency}ms` : '—'}
        </p>
      </div>
      <div className="bg-black/80 backdrop-blur border border-red-500/40 px-4 py-3 rounded-xl">
        <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Tasa de Éxito</p>
        <p className={`text-2xl font-mono font-black ${successRate > 90 ? 'text-emerald-400' : successRate > 70 ? 'text-yellow-400' : 'text-red-400'}`}>
          {successRate}%
        </p>
      </div>
      {metrics.failedRequests > 0 && (
        <div className="bg-black/80 backdrop-blur border border-red-500/40 px-4 py-3 rounded-xl">
          <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Fallos</p>
          <p className="text-2xl font-mono font-black text-red-400">{metrics.failedRequests}</p>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────

export default function NpcAiTest() {
  const [npcCount, setNpcCount] = useState(4)
  const [npcStates, setNpcStates] = useState<NpcState[]>([])
  const [metrics, setMetrics] = useState<ApiMetrics>({
    totalRequests: 0,
    successRequests: 0,
    failedRequests: 0,
    avgLatency: 0,
    latencies: [],
  })

  // Inicializar/reiniciar NPCs cuando cambia el count
  useEffect(() => {
    setNpcStates(
      Array.from({ length: npcCount }, (_, i): NpcState => ({
        id: i,
        action: 'idle',
        thinking: false,
        error: false,
        targetPosition: { x: 0, z: 0 },
        requestCount: 0,
        lastLatency: 0,
      }))
    )
  }, [npcCount])

  // Actualizar métricas
  const recordRequest = useCallback((success: boolean, latency: number) => {
    setMetrics((prev) => {
      const newLatencies = [...prev.latencies.slice(-49), latency] // Últimas 50
      const avgLatency = Math.round(
        newLatencies.reduce((a, b) => a + b, 0) / newLatencies.length
      )
      return {
        totalRequests: prev.totalRequests + 1,
        successRequests: prev.successRequests + (success ? 1 : 0),
        failedRequests: prev.failedRequests + (success ? 0 : 1),
        avgLatency,
        latencies: newLatencies,
      }
    })
  }, [])

  // Actualizar estado de un NPC específico
  const updateNpc = useCallback((id: number, patch: Partial<NpcState>) => {
    setNpcStates((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s))
    )
  }, [])

  // Loop de IA para un NPC
  const runNpcLoop = useCallback(
    async (id: number) => {
      // Pequeño delay inicial para escalonar las requests
      await new Promise((r) => setTimeout(r, id * 500))

      while (true) {
        // Obtener estado actual desde ref (evita closure stale)
        let currentState: NpcState | undefined
        setNpcStates((prev) => {
          currentState = prev.find((s) => s.id === id)
          return prev
        })

        await new Promise((r) => setTimeout(r, 0)) // Flush state

        updateNpc(id, { thinking: true, error: false })

        const t0 = performance.now()

        try {
          await globalQueue.add(async () => {
            const res = await fetch('/api/npc', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                currentAction: currentState?.action ?? 'idle',
                position: { x: 0, y: 0, z: 0 },
              }),
            })

            const latency = Math.round(performance.now() - t0)

            if (!res.ok) throw new Error(`HTTP ${res.status}`)

            const data = await res.json()
            recordRequest(true, latency)
            updateNpc(id, {
              action: data.action as NpcAction,
              thinking: false,
              error: false,
              targetPosition: data.targetPosition ?? { x: 0, z: 0 },
              requestCount: (currentState?.requestCount ?? 0) + 1,
              lastLatency: latency,
            })
          })
        } catch (err) {
          const latency = Math.round(performance.now() - t0)
          recordRequest(false, latency)
          updateNpc(id, { thinking: false, error: true, lastLatency: latency })
        }

        // Espera entre decisiones (simula tiempo de "pensamiento")
        await new Promise((r) => setTimeout(r, 3000 + Math.random() * 2000))
      }
    },
    [updateNpc, recordRequest]
  )

  // Iniciar loops cuando los NPCs están listos
  useEffect(() => {
    if (npcStates.length === 0) return
    const controllers: AbortController[] = []

    npcStates.forEach((s) => {
      const ac = new AbortController()
      controllers.push(ac)
      runNpcLoop(s.id)
    })

    return () => controllers.forEach((c) => c.abort())
  }, [npcCount]) // Solo re-lanzar si cambia el count

  return (
    <main className="relative w-full h-screen bg-[#050505] overflow-hidden">
      <PerformanceOverlay
        title={`NPC IA: ${npcCount} Agentes`}
        input={true}
        count={npcCount}
        setCount={setNpcCount}
      />

      <NetworkMetricsHUD metrics={metrics} npcCount={npcCount} />

      <Canvas camera={{ position: [0, 14, 18], fov: 50 }}>
        <DebugTools title="Simulación NPC + IA" entityCount={npcCount} />
        <Suspense fallback={<Loader3D />}>
          <OrbitControls makeDefault maxPolarAngle={Math.PI / 2 - 0.05} />
          <NpcScene npcStates={npcStates} />
        </Suspense>
      </Canvas>

      {/* Info del test */}
      <div className="absolute bottom-6 left-6 bg-black/70 p-4 rounded-lg border border-cyan-500 text-white text-xs max-w-xs">
        <h3 className="font-bold text-cyan-400 mb-2">Especificaciones del test</h3>
        <ul className="space-y-1 text-gray-300">
          <li>• NPCs: {npcCount} agentes con IA</li>
          <li>• Cola: máx 3 requests simultáneos</li>
          <li>• Intervalo: 3–5s entre decisiones</li>
          <li>• Latencia API simulada: 800–1400ms</li>
          <li>• Estados: idle / walk / jump</li>
          <li>• <span className="text-yellow-400">■</span> Pensando &nbsp;
              <span className="text-emerald-400">■</span> Activo &nbsp;
              <span className="text-red-400">■</span> Error
          </li>
        </ul>
      </div>
    </main>
  )
}