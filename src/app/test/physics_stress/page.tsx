'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { useState, useMemo, useRef, useCallback, Suspense } from 'react'
import { Physics, RigidBody, CuboidCollider, RapierRigidBody, useRapier } from '@react-three/rapier'
import * as THREE from 'three'
import PerformanceOverlay from '@/components/test/PerformanceOverlay'
import DebugTools from '@/components/DebugTools'
import Loader3D from '@/components/ui/Loader3D'
import { OrbitControls } from '@react-three/drei'

// ─────────────────────────────────────────────
// PARÁMETROS DEL TEST (documentar al comparar con Babylon)
// ─────────────────────────────────────────────
// Motor R3F:    Rapier (Rust/WASM)
// Motor Babylon: Havok / Cannon.js
// NOTA: Se comparan motores distintos, no solo frameworks
// ─────────────────────────────────────────────
// Escena: bowl cóncavo + rampa central → objetos se acumulan y colisionan densamente
// Cuerpos: N cajas + N esferas (50/50) → más variedad de colisiones
// canSleep: false → siempre activos
// ✅ 1 solo useFrame para todos los respawns (no N callbacks)
// Variable: cantidad de cuerpos simultáneos
// Métricas: Sim Step (tiempo WASM puro) + Active Bodies + Jitter
// ─────────────────────────────────────────────

const SPAWN_HEIGHT = 22
const KILL_Y = -5
const BODY_SIZE = 0.6

// ─────────────────────────────────────────────
// MÉTRICAS DE FÍSICA
// Rapier expone world.performanceData con tiempos internos del motor
// ─────────────────────────────────────────────
const frameBuffer = new Float32Array(60)
let bufIdx = 0, bufFilled = 0

interface PhysicsMetrics {
  simStepMs: number     // Tiempo de simulación WASM puro (lo más valioso)
  activeBodies: number  // Cuerpos activos en la simulación
  jitter: number        // Varianza del frame time
  frameBudget: number   // % del presupuesto de 16ms usado
}

function PhysicsMetricsCollector({ onUpdate }: { onUpdate: (m: PhysicsMetrics) => void }) {
  const { world } = useRapier()
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

    // ✅ Rapier world data: tiempo real de la simulación WASM
    const perf = (world as any).performanceData?.()
    const simStep = perf?.totalTime ?? 0

    onUpdate({
      simStepMs: Math.round(simStep * 100) / 100,
      activeBodies: world.bodies.len(),
      jitter: Math.round(Math.sqrt(variance / n) * 100) / 100,
      frameBudget: Math.round((mean / 16.667) * 1000) / 10,
    })
  })

  return null
}

// ─────────────────────────────────────────────
// GESTOR DE CUERPOS FÍSICOS
// ✅ 1 solo useFrame para N respawns (no N callbacks)
// Los rigid body refs se registran en un Map global
// ─────────────────────────────────────────────
const rigidBodyMap = new Map<number, RapierRigidBody>()

function RespawnManager({ count }: { count: number }) {
  useFrame(() => {
    rigidBodyMap.forEach((rb) => {
      if (!rb || rb.isSleeping()) return
      const pos = rb.translation()
      if (pos.y < KILL_Y) {
        // Respawn en posición aleatoria arriba
        rb.setTranslation({
          x: (Math.random() - 0.5) * 8,
          y: SPAWN_HEIGHT,
          z: (Math.random() - 0.5) * 8,
        }, true)
        rb.setLinvel({
          x: (Math.random() - 0.5) * 3,
          y: 0,
          z: (Math.random() - 0.5) * 3,
        }, true)
        rb.setAngvel({
          x: (Math.random() - 0.5) * 8,
          y: (Math.random() - 0.5) * 8,
          z: (Math.random() - 0.5) * 8,
        }, true)
      }
    })
  })
  return null
}

// Cuerpo físico individual que se registra en el mapa global
function PhysicsBody({ id, initialPosition, color, isSphere }: {
  id: number
  initialPosition: [number, number, number]
  color: string
  isSphere: boolean
}) {
  const rbRef = useRef<RapierRigidBody>(null!)

  // Registrar/desregistrar en el mapa global
  const refCallback = useCallback((rb: RapierRigidBody | null) => {
    if (rb) rigidBodyMap.set(id, rb)
    else rigidBodyMap.delete(id)
    ;(rbRef as any).current = rb
  }, [id])

  return (
    <RigidBody
      ref={refCallback}
      position={initialPosition}
      colliders={isSphere ? 'ball' : 'cuboid'}
      restitution={0.5}
      friction={0.4}
      linearDamping={0.05}
      angularDamping={0.05}
      canSleep={false}
    >
      <mesh castShadow>
        {isSphere
          ? <sphereGeometry args={[BODY_SIZE * 0.5, 12, 12]} />
          : <boxGeometry args={[BODY_SIZE, BODY_SIZE, BODY_SIZE]} />
        }
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.2} />
      </mesh>
    </RigidBody>
  )
}

// ─────────────────────────────────────────────
// BOWL: estructura cóncava que acumula cuerpos
// → Mayor densidad de colisiones entre cuerpos
// → Más interesante visualmente
// ─────────────────────────────────────────────
function Bowl() {
  const SIDES = 8
  const RADIUS = 12
  const HEIGHT = 6
  const THICKNESS = 0.4

  return (
    <RigidBody type="fixed">
      {/* Suelo del bowl */}
      <mesh receiveShadow position={[0, 0, 0]}>
        <cylinderGeometry args={[RADIUS * 0.6, RADIUS * 0.6, THICKNESS, 32]} />
        <meshStandardMaterial color="#1e293b" roughness={0.8} metalness={0.2} />
      </mesh>
      <CuboidCollider args={[RADIUS * 0.6, THICKNESS / 2, RADIUS * 0.6]} position={[0, 0, 0]} />

      {/* Paredes inclinadas del bowl (octágono) */}
      {Array.from({ length: SIDES }).map((_, i) => {
        const angle = (i / SIDES) * Math.PI * 2
        const tilt = 0.4 // Inclinación hacia dentro
        return (
          <group key={i} rotation={[0, angle, 0]}>
            <mesh
              receiveShadow
              position={[RADIUS * 0.8, HEIGHT / 2, 0]}
              rotation={[0, 0, -tilt]}
              castShadow
            >
              <boxGeometry args={[THICKNESS, HEIGHT, RADIUS * 0.85]} />
              <meshStandardMaterial color="#334155" roughness={0.7} metalness={0.3} />
            </mesh>
            <CuboidCollider
              args={[THICKNESS / 2, HEIGHT / 2, RADIUS * 0.85 / 2]}
              position={[RADIUS * 0.8, HEIGHT / 2, 0]}
              rotation={[0, 0, -tilt]}
            />
          </group>
        )
      })}

      {/* Rampa central inclinada → deflecta cuerpos hacia las paredes */}
      <mesh position={[0, 2, 0]} rotation={[0.3, 0.4, 0.2]} receiveShadow castShadow>
        <boxGeometry args={[5, 0.3, 5]} />
        <meshStandardMaterial color="#4f46e5" roughness={0.5} metalness={0.4} />
      </mesh>
      <CuboidCollider args={[2.5, 0.15, 2.5]} position={[0, 2, 0]} rotation={[0.3, 0.4, 0.2]} />
    </RigidBody>
  )
}

function PhysicsScene({ count }: { count: number }) {
  const bodies = useMemo(() => Array.from({ length: count }, (_, i) => ({
    id: i,
    initialPosition: [
      (Math.random() - 0.5) * 8,
      SPAWN_HEIGHT + i * 0.25,
      (Math.random() - 0.5) * 8,
    ] as [number, number, number],
    // Colores: velocidad visual alta → azul frío, baja → naranja cálido
    color: `hsl(${(i / count) * 240 + 20}, 80%, 55%)`,
    isSphere: i % 2 === 0, // 50% esferas, 50% cajas
  })), [count])

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[15, 25, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      <pointLight position={[0, 15, 0]} intensity={30} color="#6366f1" />
      <pointLight position={[-8, 5, -8]} intensity={15} color="#f43f5e" />

      <Physics gravity={[0, -9.81, 0]} timeStep={1 / 60}>
        <RespawnManager count={count} />

        {bodies.map((b) => (
          <PhysicsBody
            key={b.id}
            id={b.id}
            initialPosition={b.initialPosition}
            color={b.color}
            isSphere={b.isSphere}
          />
        ))}

        <Bowl />
      </Physics>
    </>
  )
}

// ─────────────────────────────────────────────
// HUD DE MÉTRICAS
// ─────────────────────────────────────────────
function PhysicsMetricsHUD({ metrics, count }: { metrics: PhysicsMetrics; count: number }) {
  const simColor = metrics.simStepMs < 2 ? 'text-emerald-400' : metrics.simStepMs < 6 ? 'text-yellow-400' : 'text-red-400'
  const jitterColor = metrics.jitter < 2 ? 'text-emerald-400' : metrics.jitter < 5 ? 'text-yellow-400' : 'text-red-400'
  const budgetColor = metrics.frameBudget < 50 ? 'text-emerald-400' : metrics.frameBudget < 85 ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 min-w-[180px]">
      {/* Sim Step: la métrica más valiosa de este test */}
      <div className="bg-black/80 backdrop-blur border border-orange-500/40 px-4 py-3 rounded-xl">
        <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Sim Step (WASM)</p>
        <p className={`text-2xl font-mono font-black ${simColor}`}>
          {metrics.simStepMs.toFixed(2)}
          <span className="text-xs text-gray-500 ml-1">ms</span>
        </p>
        <p className="text-gray-600 text-[10px]">tiempo puro de Rapier</p>
      </div>

      <div className="bg-black/80 backdrop-blur border border-blue-500/40 px-4 py-3 rounded-xl">
        <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Cuerpos Activos</p>
        <p className="text-2xl font-mono font-black text-blue-400">
          {metrics.activeBodies}
          <span className="text-xs text-gray-500 ml-1">/ {count}</span>
        </p>
        <p className="text-gray-600 text-[10px]">canSleep: false</p>
      </div>

      <div className="bg-black/80 backdrop-blur border border-yellow-500/40 px-4 py-3 rounded-xl">
        <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Jitter</p>
        <p className={`text-2xl font-mono font-black ${jitterColor}`}>
          {metrics.jitter.toFixed(2)}
          <span className="text-xs text-gray-500 ml-1">ms</span>
        </p>
        <p className="text-gray-600 text-[10px]">varianza frame time</p>
      </div>

      <div className="bg-black/80 backdrop-blur border border-purple-500/40 px-4 py-3 rounded-xl">
        <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Frame Budget</p>
        <p className={`text-2xl font-mono font-black ${budgetColor}`}>
          {metrics.frameBudget.toFixed(1)}
          <span className="text-xs text-gray-500 ml-1">%</span>
        </p>
        <p className="text-gray-600 text-[10px]">de 16.67ms (60fps)</p>
      </div>
    </div>
  )
}

export default function PhysicsStressTest() {
  const [count, setCount] = useState(32)
  const [metrics, setMetrics] = useState<PhysicsMetrics>({
    simStepMs: 0, activeBodies: 0, jitter: 0, frameBudget: 0,
  })

  return (
    <main className="relative w-full h-screen bg-[#050505] overflow-hidden">
      <PerformanceOverlay
        title={`Física: ${count} Cuerpos Activos`}
        input={true}
        count={count}
        setCount={setCount}
        inputConfig={{ unit: 'normal', type: 'values', values: [32, 64, 128, 256] }}
      />

      <PhysicsMetricsHUD metrics={metrics} count={count} />

      <Canvas shadows camera={{ position: [18, 18, 18], fov: 50 }}>
        <DebugTools title="Estrés de Física (Rapier)" entityCount={count} />
        <Suspense fallback={<Loader3D />}>
          <OrbitControls makeDefault target={[0, 4, 0]} />
          <PhysicsScene count={count} />
          {/* Collector dentro de Physics para acceder a useRapier */}
          <Physics gravity={[0, 0, 0]} timeStep={1 / 60}>
            <PhysicsMetricsCollector onUpdate={setMetrics} />
          </Physics>
        </Suspense>
      </Canvas>

      <div className="absolute bottom-6 left-6 bg-black/70 p-4 rounded-lg border border-orange-500 text-white text-xs max-w-xs">
        <h3 className="font-bold text-orange-400 mb-2">Especificaciones del test</h3>
        <ul className="space-y-1 text-gray-300">
          <li>• Cuerpos: {count} ({Math.ceil(count/2)} esferas + {Math.floor(count/2)} cajas)</li>
          <li>• canSleep: false · timeStep: 1/60</li>
          <li>• Escena: bowl cóncavo + rampa → colisiones densas</li>
          <li>• Respawn: 1 useFrame (no {count})</li>
          <li>• Motor R3F: Rapier (Rust/WASM)</li>
          <li>• Motor Babylon: Havok / Cannon.js</li>
          <li>• ⚠️ Motores distintos</li>
        </ul>
      </div>
    </main>
  )
}