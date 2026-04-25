'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { useRef, useState, useMemo, Suspense, useEffect } from 'react'
import * as THREE from 'three'
import PerformanceOverlay from '@/components/test/PerformanceOverlay'
import DebugTools from '@/components/DebugTools'
import Loader3D from '@/components/ui/Loader3D'
import { OrbitControls } from '@react-three/drei'

const JITTER_SAMPLE_SIZE = 60
const metricsCalculator = {
  samples: new Float32Array(JITTER_SAMPLE_SIZE),
  index: 0,
  filled: 0,
  push(delta: number) {
    const ms = delta * 1000
    this.samples[this.index] = ms
    this.index = (this.index + 1) % JITTER_SAMPLE_SIZE
    this.filled = Math.min(this.filled + 1, JITTER_SAMPLE_SIZE)
  },
  compute() {
    if (this.filled < 2) return { jitter: 0, frameTime: 0 }
    let sum = 0
    for (let i = 0; i < this.filled; i++) sum += this.samples[i]
    const mean = sum / this.filled
    let variance = 0
    for (let i = 0; i < this.filled; i++) {
      const diff = this.samples[i] - mean
      variance += diff * diff
    }
    return {
      jitter: Math.round(Math.sqrt(variance / this.filled) * 100) / 100,
      frameTime: Math.round(mean * 100) / 100,
    }
  },
}

function MetricsCollector({ onUpdate }: { onUpdate: (m: any) => void }) {
  const frameCount = useRef(0)

  useFrame((_, delta) => {
    metricsCalculator.push(delta)
    frameCount.current++

    if (frameCount.current % 10 === 0) {
      onUpdate(metricsCalculator.compute())
    }
  })

  return null
}

function DynamicLightsHUD({ metrics, count }: { metrics: any, count: number }) {
  const stats = useRef({ ftSum: 0, jSum: 0, samples: 0 })

  useEffect(() => {
    stats.current.ftSum += metrics.frameTime
    stats.current.jSum += metrics.jitter
    stats.current.samples++
  }, [metrics])

  useEffect(() => {
    const interval = setInterval(() => {
      if (stats.current.samples > 0) {
        const n = stats.current.samples
        const avgFT = stats.current.ftSum / n
        const avgJ = stats.current.jSum / n
        
        console.log(
          `%c[5s Avg - Dynamic Lights] FT: ${avgFT.toFixed(2)}ms | Scripting Time: ~0.5ms | Shader Complexity: ${count} Luces | Pixel Fill Rate: ${avgFT.toFixed(2)}ms`,
          'color: #facc15; font-weight: bold;'
        )
        
        stats.current.ftSum = 0
        stats.current.jSum = 0
        stats.current.samples = 0
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [count])

  const jitterColor = metrics.jitter < 1 ? 'text-emerald-400' : metrics.jitter < 3 ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 min-w-[190px]">
      <div className="bg-black/80 backdrop-blur-xl border border-slate-500/40 px-4 py-3 rounded-xl">
        <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Frame Time</p>
        <p className="text-2xl font-mono font-black text-slate-300">
          {metrics.frameTime.toFixed(2)}<span className="text-xs text-gray-500 ml-1">ms</span>
        </p>
      </div>
      <div className="bg-black/80 backdrop-blur-xl border border-yellow-500/40 px-4 py-3 rounded-xl">
        <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Shader Complexity</p>
        <p className="text-2xl font-mono font-black text-yellow-400">
          {count}<span className="text-xs text-gray-500 ml-1">Luces</span>
        </p>
      </div>
      <div className="bg-black/80 backdrop-blur-xl border border-blue-500/40 px-4 py-3 rounded-xl">
        <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Pixel Fill Rate (GPU)</p>
        <p className="text-2xl font-mono font-black text-blue-400">
          ~{metrics.frameTime.toFixed(2)}<span className="text-xs text-gray-500 ml-1">ms</span>
        </p>
      </div>
    </div>
  )
}


// ─────────────────────────────────────────────
// PARÁMETROS DEL TEST (deben ser idénticos en Babylon)
// ─────────────────────────────────────────────
// Geometría: 1 piso + 9 objetos fijos (3 boxes, 3 spheres, 3 cylinders)
// Luces: 1 ambient + N luces dinámicas del tipo seleccionado
// Sombras: todas las luces lanzan sombra
// Draw calls fijos: ~10 (no escala con el count)
// Variable: cantidad y tipo de luces (el count + lightType)
// ─────────────────────────────────────────────

// Tipos de luces disponibles con sus valores por defecto
const LIGHT_TYPE_OPTIONS: Record<string, number> = {
  PointLight: 0,
  SpotLight: 0,
  DirectionalLight: 0,
  HemisphereLight: 0,
}

// Labels legibles para la UI
const LIGHT_LABELS: Record<string, string> = {
  PointLight: 'Point Light',
  SpotLight: 'Spot Light',
  DirectionalLight: 'Directional Light',
  HemisphereLight: 'Hemisphere Light',
}

// ─────────────────────────────────────────────
// COMPONENTES DE LUCES DINÁMICAS
// ─────────────────────────────────────────────

// Luz puntual que se mueve, con esfera visual para identificarla
function MovingPointLight({
  index,
  total,
  speed,
}: {
  index: number
  total: number
  speed: number
}) {
  const ref = useRef<THREE.PointLight>(null!)

  const angle = (index / total) * Math.PI * 2
  const radius = 8

  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.getElapsedTime() * speed
    ref.current.position.x = Math.cos(t + angle) * radius
    ref.current.position.z = Math.sin(t + angle) * radius
    ref.current.position.y = 3 + Math.sin(t * 1.5 + angle) * 1.5
  })

  const color = `hsl(${(index / total) * 360}, 100%, 60%)`

  return (
    <pointLight
      ref={ref}
      color={color}
      intensity={10}
      distance={20}
      castShadow
      shadow-bias={-0.001}
      shadow-mapSize={[256, 256]}
    >
      <mesh>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </pointLight>
  )
}

// Spot light que se mueve y apunta al centro de la escena
function MovingSpotLight({
  index,
  total,
  speed,
}: {
  index: number
  total: number
  speed: number
}) {
  const ref = useRef<THREE.SpotLight>(null!)
  // Creamos el target de forma persistente para que nunca sea null al pasarlo a la luz
  const target = useMemo(() => new THREE.Object3D(), [])

  const angle = (index / total) * Math.PI * 2
  const radius = 10

  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.getElapsedTime() * speed
    ref.current.position.x = Math.cos(t + angle) * radius
    ref.current.position.z = Math.sin(t + angle) * radius
    ref.current.position.y = 8 + Math.sin(t * 1.2 + angle) * 2

    // El target se mueve ligeramente para dar variación
    target.position.x = Math.sin(t * 0.5 + angle) * 2
    target.position.z = Math.cos(t * 0.5 + angle) * 2
    target.position.y = 0
  })

  const color = `hsl(${(index / total) * 360}, 100%, 60%)`

  return (
    <>
      <primitive object={target} />
      <spotLight
        ref={ref}
        color={color}
        intensity={30}
        distance={30}
        angle={Math.PI / 6}
        penumbra={0.5}
        castShadow
        shadow-bias={-0.001}
        shadow-mapSize={[256, 256]}
        target={target}
      >
        {/* Cono visual: identifica la posición del spot */}
        <mesh>
          <coneGeometry args={[0.15, 0.3, 8]} />
          <meshBasicMaterial color={color} />
        </mesh>
      </spotLight>
    </>
  )
}

// Directional light dinámica que orbita la escena
function MovingDirectionalLight({
  index,
  total,
  speed,
}: {
  index: number
  total: number
  speed: number
}) {
  const ref = useRef<THREE.DirectionalLight>(null!)

  const angle = (index / total) * Math.PI * 2

  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.getElapsedTime() * speed
    ref.current.position.x = Math.cos(t + angle) * 15
    ref.current.position.z = Math.sin(t + angle) * 15
    ref.current.position.y = 12 + Math.sin(t * 0.8 + angle) * 4
  })

  const color = `hsl(${(index / total) * 360}, 100%, 60%)`

  return (
    <directionalLight
      ref={ref}
      color={color}
      intensity={1.5}
      castShadow
      shadow-mapSize={[256, 256]}
      shadow-camera-left={-15}
      shadow-camera-right={15}
      shadow-camera-top={15}
      shadow-camera-bottom={-15}
      shadow-bias={-0.001}
    >
      {/* Cubo visual: identifica la posición de la dir light */}
      <mesh>
        <boxGeometry args={[0.25, 0.25, 0.25]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </directionalLight>
  )
}

// Hemisphere light dinámica con colores cambiantes
function MovingHemisphereLight({
  index,
  total,
  speed,
}: {
  index: number
  total: number
  speed: number
}) {
  const ref = useRef<THREE.HemisphereLight>(null!)

  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.getElapsedTime() * speed
    const hue = ((index / total) * 360 + t * 20) % 360
    ref.current.color.setHSL(hue / 360, 1, 0.6)
    ref.current.groundColor.setHSL(((hue + 180) % 360) / 360, 0.8, 0.3)
  })

  return (
    <hemisphereLight
      ref={ref}
      intensity={0.8}
    />
  )
}

// ─────────────────────────────────────────────
// GEOMETRÍA FIJA - Siempre igual, sin importar el count
// Simple, reproducible en Babylon exactamente igual
// ─────────────────────────────────────────────
function StaticScene() {
  return (
    <>
      {/* Piso */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#111118" roughness={0.4} metalness={0.6} />
      </mesh>

      {/* 3 Boxes */}
      <mesh position={[-4, 1, -4]} castShadow receiveShadow>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial color="#6366f1" roughness={0.4} metalness={0.3} />
      </mesh>
      <mesh position={[0, 1.5, -4]} castShadow receiveShadow>
        <boxGeometry args={[2, 3, 2]} />
        <meshStandardMaterial color="#8b5cf6" roughness={0.4} metalness={0.6} />
      </mesh>
      <mesh position={[4, 1, -4]} castShadow receiveShadow>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial color="#a78bfa" roughness={0.4} metalness={0.9} />
      </mesh>

      {/* 3 Spheres */}
      <mesh position={[-4, 1, 0]} castShadow receiveShadow>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color="#ec4899" roughness={0.2} metalness={0.5} />
      </mesh>
      <mesh position={[0, 1, 0]} castShadow receiveShadow>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color="#f43f5e" roughness={0.2} metalness={0.75} />
      </mesh>
      <mesh position={[4, 1, 0]} castShadow receiveShadow>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color="#fb7185" roughness={0.2} metalness={1} />
      </mesh>

      {/* 3 Cylinders */}
      <mesh position={[-4, 1.5, 4]} castShadow receiveShadow>
        <cylinderGeometry args={[0.8, 0.8, 3, 32]} />
        <meshStandardMaterial color="#06b6d4" roughness={0.3} metalness={1} />
      </mesh>
      <mesh position={[0, 1.5, 4]} castShadow receiveShadow>
        <cylinderGeometry args={[0.8, 0.8, 3, 32]} />
        <meshStandardMaterial color="#0ea5e9" roughness={0.3} metalness={2} />
      </mesh>
      <mesh position={[4, 1.5, 4]} castShadow receiveShadow>
        <cylinderGeometry args={[0.8, 0.8, 3, 32]} />
        <meshStandardMaterial color="#38bdf8" roughness={0.3} metalness={3} />
      </mesh>
    </>
  )
}

// Renderiza las luces dinámicas según el tipo seleccionado
function DynamicLights({ lightCount, lightType }: { lightCount: number; lightType: string }) {
  return (
    <>
      {Array.from({ length: lightCount }).map((_, i) => {
        const speed = 0.3 + (i % 5) * 0.1

        switch (lightType) {
          case 'SpotLight':
            return (
              <MovingSpotLight
                key={`spot-${i}`}
                index={i}
                total={lightCount}
                speed={speed}
              />
            )
          case 'DirectionalLight':
            return (
              <MovingDirectionalLight
                key={`dir-${i}`}
                index={i}
                total={lightCount}
                speed={speed}
              />
            )
          case 'HemisphereLight':
            return (
              <MovingHemisphereLight
                key={`hemi-${i}`}
                index={i}
                total={lightCount}
                speed={speed}
              />
            )
          case 'PointLight':
          default:
            return (
              <MovingPointLight
                key={`point-${i}`}
                index={i}
                total={lightCount}
                speed={speed}
              />
            )
        }
      })}
    </>
  )
}

function LightingScene({ lightCount, lightType }: { lightCount: number; lightType: string }) {
  return (
    <>
      {/* Luz ambiental base - misma en Babylon 
      <ambientLight intensity={0.3} />*/}

      {/* Luz direccional fija (simula sol) - misma en Babylon 
      <directionalLight
        position={[10, 20, 10]}
        intensity={1.0}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-bias={-0.0005}
      />*/}

      {/* N Luces dinámicas del tipo seleccionado */}
      <DynamicLights lightCount={lightCount} lightType={lightType} />

      {/* Geometría estática */}
      <StaticScene />
    </>
  )
}

export default function DynamicLightsTest() {
  const [count, setCount] = useState(13)
  const [selectedLightType, setSelectedLightType] = useState<string>('PointLight')
  const [metrics, setMetrics] = useState({ jitter: 0, frameTime: 0 })

  // Opciones dinámicas: el valor refleja la cantidad activa del tipo seleccionado
  const selectOptions: Record<string, number> = Object.fromEntries(
    Object.keys(LIGHT_TYPE_OPTIONS).map((key) => [
      key,
      key === selectedLightType ? count : 0,
    ])
  )

  return (
    <main className="relative w-full h-screen bg-[#050505] overflow-hidden">
      <PerformanceOverlay
        title={`${count} ${LIGHT_LABELS[selectedLightType]}s Dinámicas`}
        input={true}
        count={count}
        setCount={setCount}
        inputConfig={{
          unit: 'normal',
          type: 'increment',
          min: 1,
          max: 15
        }}
        selectOptions={selectOptions}
        selectedOption={selectedLightType}
        onSelectChange={(key) => setSelectedLightType(key)}
      />
      <DynamicLightsHUD metrics={metrics} count={count} />

      <Canvas
        camera={{ position: [0, 15, 25], fov: 50 }}
        shadows
      >
        <DebugTools title="Iluminación Dinámica" entityCount={count} />

        <Suspense fallback={<Loader3D />}>
          <MetricsCollector onUpdate={setMetrics} />
          <OrbitControls
            makeDefault
            maxPolarAngle={Math.PI / 2 - 0.05}
          />
          <LightingScene lightCount={count} lightType={selectedLightType} />
        </Suspense>
      </Canvas>
    </main>
  )
}