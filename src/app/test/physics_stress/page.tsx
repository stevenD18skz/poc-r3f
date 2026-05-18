'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useState, useMemo, useRef, useCallback, Suspense } from 'react'
import { Physics, RigidBody, CuboidCollider, RapierRigidBody, useRapier, useBeforePhysicsStep, useAfterPhysicsStep } from '@react-three/rapier'
import * as THREE from 'three'
import { Perf, getPerf } from 'r3f-perf'
import PerformanceOverlay from '@/components/test/PerformanceOverlay'
import DebugTools from '@/components/DebugTools'
import Loader3D from '@/components/ui/Loader3D'
import { OrbitControls } from '@react-three/drei'

// ─────────────────────────────────────────────
// PARAMETROS CONFIGURABLES
// ─────────────────────────────────────────────
const SPAWN_HEIGHT = 22
const KILL_Y = -5
const BODY_SIZE = 0.6
const SAMPLE_SIZE = 200 // 2 segundos exactos a una tasa de refresco de 100Hz

// Mapa global de referencias para evitar colisiones de estado en React
const rigidBodyMap = new Map<number, RapierRigidBody>()

// Calculador matemático estricto adaptado a alta tasa de refresco (100Hz)
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
// CONSOLE METRICS COLLECTOR (OPTIMIZADO PARA 100Hz)
// ─────────────────────────────────────────────
function ConsoleMetricsCollector({ count }: { count: number }) {
  const frameCount = useRef(0)
  const lastLogTime = useRef(performance.now() - 2000)
  const lastPeakResetTime = useRef(performance.now())
  const lastCount = useRef(count)
  
  // Medidores de tiempos WASM de Rapier
  const simStart = useRef(0)
  const lastSimStepMs = useRef(0)
  
  // Trackers de picos de latencia del frame completo
  const peakFrameTime10s = useRef(0)

  if (lastCount.current !== count) {
    lastCount.current = count
    frameCount.current = 0
    peakFrameTime10s.current = 0
    deltaCalculator.reset()
    rigidBodyMap.clear()
    lastLogTime.current = performance.now() - 2000
    lastPeakResetTime.current = performance.now()
  }

  // Capturar el inicio del paso de física en el hilo síncrono de WASM
  useBeforePhysicsStep(() => {
    simStart.current = performance.now()
  })

  // Capturar la finalización del procesamiento del solver de colisiones de Rapier
  useAfterPhysicsStep(() => {
    lastSimStepMs.current = performance.now() - simStart.current
  })

  useFrame((_, delta) => {
    const now = performance.now()
    const deltaMs = delta * 1000
    frameCount.current++

    // Estabilización inicial (Warm-up de Jitter)
    if (frameCount.current > 15) {
      deltaCalculator.push(deltaMs)
      
      // Capturar el frame más lento para la métrica del pico de latencia
      if (deltaMs > peakFrameTime10s.current) {
        peakFrameTime10s.current = deltaMs
      }
    }

    // Ventana deslizante automática de 10 segundos para limpiar el Pico Máximo
    if (now - lastPeakResetTime.current >= 10000) {
      peakFrameTime10s.current = deltaMs
      lastPeakResetTime.current = now
    }

    // Reporte por consola cada 2 segundos
    if (now - lastLogTime.current >= 2000) {
      const perfState = getPerf ? getPerf() : null
      const cpuTime = perfState?.log?.cpu ?? 0
      const meanFrameTime = deltaCalculator.mean()
      
      // Frecuencia real basada en hardware (Muestreo directo)
      const currentFps = meanFrameTime > 0 ? 1000 / meanFrameTime : 0
      
      // 🔴 PRESUPUESTO AJUSTADO A 100Hz: Target exacto = 10.0 ms por cuadro
      const frameBudget = (meanFrameTime / 10.0) * 100 
      const jitter = deltaCalculator.jitter()

      console.log(
        `%c[Physics Stress] ${count.toLocaleString()} Cuerpos Cóncavos - Target: 100Hz (10ms)`,
        'color:#3b82f6;font-weight:bold;font-size:12px'
      )
      console.log(`%cEntidades%c ${count}`, 'color:#94a3b8', 'color:#e2e8f0;font-weight:600')
      console.log(`%cMotor%c Rapier (WASM)`, 'color:#94a3b8', 'color:#e2e8f0;font-weight:600')
      console.log(`%cFPS%c ${Math.round(currentFps)}`, 'color:#94a3b8', 'color:#e2e8f0;font-weight:600')
      console.log(`%cCPU (ms)%c ${cpuTime.toFixed(2)} ms`, 'color:#94a3b8', 'color:#38bdf8;font-weight:600')
      console.log(`%cFrame Time (ms)%c ${meanFrameTime.toFixed(2)} ms`, 'color:#94a3b8', 'color:#e2e8f0;font-weight:600')
      console.log(`%cFrame Budget (%)%c ${frameBudget.toFixed(1)}%`, 'color:#94a3b8', 'color:#fbbf24;font-weight:600')
      console.log(`%cJitter (ms)%c ${jitter.toFixed(2)} ms`, 'color:#94a3b8', 'color:#e2e8f0;font-weight:600')
      console.log(`%cSim Step WASM (ms)%c ${lastSimStepMs.current.toFixed(2)} ms`, 'color:#94a3b8', 'color:#10b981;font-weight:700')
      console.log(`%cPico Latencia (10s)%c ${peakFrameTime10s.current.toFixed(2)} ms`, 'color:#94a3b8', 'color:#f43f5e;font-weight:600')
      console.log('--------------------------------------------------')

      lastLogTime.current = now
    }
  })

  return null
}

// ─────────────────────────────────────────────
// OPTIMIZACIONES DE ESCENA FÍSICA
// ─────────────────────────────────────────────
function RespawnManager() {
  useFrame(() => {
    rigidBodyMap.forEach((rb) => {
      if (!rb) return
      const pos = rb.translation()
      if (pos.y < KILL_Y) {
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

function PhysicsBody({ id, initialPosition, color, isSphere }: {
  id: number
  initialPosition: [number, number, number]
  color: string
  isSphere: boolean
}) {
  const refCallback = useCallback((rb: RapierRigidBody | null) => {
    if (rb) rigidBodyMap.set(id, rb)
    else rigidBodyMap.delete(id)
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

function Bowl() {
  const SIDES = 8
  const RADIUS = 12
  const HEIGHT = 6
  const THICKNESS = 0.4

  return (
    <RigidBody type="fixed">
      <mesh receiveShadow position={[0, 0, 0]}>
        <cylinderGeometry args={[RADIUS * 0.6, RADIUS * 0.6, THICKNESS, 32]} />
        <meshStandardMaterial color="#1e293b" roughness={0.8} metalness={0.2} />
      </mesh>
      <CuboidCollider args={[RADIUS * 0.6, THICKNESS / 2, RADIUS * 0.6]} position={[0, 0, 0]} />

      {Array.from({ length: SIDES }).map((_, i) => {
        const angle = (i / SIDES) * Math.PI * 2
        const tilt = 0.4
        return (
          <group key={i} rotation={[0, angle, 0]}>
            <mesh receiveShadow position={[RADIUS * 0.8, HEIGHT / 2, 0]} rotation={[0, 0, -tilt]} castShadow>
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
    color: `hsl(${(i / count) * 240 + 20}, 80%, 55%)`,
    isSphere: i % 2 === 0,
  })), [count])

  return (
    <>
      <ambientLight intensity={0.75} />
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
        {/* Orquestador de métricas específicas nativas y WASM */}
        <ConsoleMetricsCollector count={count} />
        
        <RespawnManager />

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
// COMPONENTE VISTA PRINCIPAL
// ─────────────────────────────────────────────
export default function PhysicsStressTest() {
  const [count, setCount] = useState(2048)

  return (
    <main className="relative w-full h-screen bg-[#050505] overflow-hidden">
      <PerformanceOverlay
        title={`Física: ${count} Cuerpos Activos`}
        input={true}
        count={count}
        setCount={setCount}
        inputConfig={{ unit: 'normal', type: 'values', values: [16, 64, 128, 512, 1024, 2048] }}
      />

      <Canvas shadows camera={{ position: [18, 18, 18], fov: 50 }} gl={{ antialias: false, powerPreference: 'high-performance' }}>
        {/* Tracking oculto de consumo de CPU de R3F */}
        <Perf minimal style={{ display: 'none' }} />
        
        <Suspense fallback={<Loader3D />}>
          <PhysicsScene count={count} />
        </Suspense>
      </Canvas>
    </main>
  )
}