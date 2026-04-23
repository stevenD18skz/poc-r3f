'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { useRef, useState, useMemo, Suspense } from 'react'
import * as THREE from 'three'
import PerformanceOverlay from '@/components/test/PerformanceOverlay'
import DebugTools from '@/components/DebugTools'
import Loader3D from '@/components/ui/Loader3D'
import { OrbitControls } from '@react-three/drei'

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
        <meshStandardMaterial color="#8b5cf6" roughness={0.4} metalness={0.3} />
      </mesh>
      <mesh position={[4, 1, -4]} castShadow receiveShadow>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial color="#a78bfa" roughness={0.4} metalness={0.3} />
      </mesh>

      {/* 3 Spheres */}
      <mesh position={[-4, 1, 0]} castShadow receiveShadow>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color="#ec4899" roughness={0.2} metalness={0.7} />
      </mesh>
      <mesh position={[0, 1, 0]} castShadow receiveShadow>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color="#f43f5e" roughness={0.2} metalness={0.7} />
      </mesh>
      <mesh position={[4, 1, 0]} castShadow receiveShadow>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color="#fb7185" roughness={0.2} metalness={0.7} />
      </mesh>

      {/* 3 Cylinders */}
      <mesh position={[-4, 1.5, 4]} castShadow receiveShadow>
        <cylinderGeometry args={[0.8, 0.8, 3, 32]} />
        <meshStandardMaterial color="#06b6d4" roughness={0.3} metalness={0.5} />
      </mesh>
      <mesh position={[0, 1.5, 4]} castShadow receiveShadow>
        <cylinderGeometry args={[0.8, 0.8, 3, 32]} />
        <meshStandardMaterial color="#0ea5e9" roughness={0.3} metalness={0.5} />
      </mesh>
      <mesh position={[4, 1.5, 4]} castShadow receiveShadow>
        <cylinderGeometry args={[0.8, 0.8, 3, 32]} />
        <meshStandardMaterial color="#38bdf8" roughness={0.3} metalness={0.5} />
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
      {/* Luz ambiental base - misma en Babylon */}
      <ambientLight intensity={0.3} />

      {/* Luz direccional fija (simula sol) - misma en Babylon */}
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
      />

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
        inputConfig={
          
          {
          unit: 'normal',
          type: 'increment',
          min: 1,
          max: 16
        }}
        selectOptions={selectOptions}
        selectedOption={selectedLightType}
        onSelectChange={(key) => setSelectedLightType(key)}
      />

      <Canvas
        camera={{ position: [0, 15, 25], fov: 50 }}
        shadows
      >
        <DebugTools title="Iluminación Dinámica" entityCount={count} />

        <Suspense fallback={<Loader3D />}>
          <OrbitControls
            makeDefault
            maxPolarAngle={Math.PI / 2 - 0.05}
          />
          <LightingScene lightCount={count} lightType={selectedLightType} />
        </Suspense>
      </Canvas>

      {/* Info del test */}
      <div className="absolute bottom-32 left-6 bg-black bg-opacity-70 p-4 rounded-lg border border-purple-500 text-white text-xs max-w-xs">
        <h3 className="font-bold text-purple-400 mb-2">Especificaciones del test</h3>
        <ul className="space-y-1 text-gray-300">
          <li>• Geometría: 1 piso + 9 objetos fijos</li>
          <li>• Draw calls fijos: ~10</li>
          <li>• Luces fijas: 1 ambient + 1 directional</li>
          <li>• Luces variables: {count} {LIGHT_LABELS[selectedLightType]}s</li>
          <li>• Tipo activo: <span className="text-indigo-400 font-bold">{LIGHT_LABELS[selectedLightType]}</span></li>
          <li>• Todas con shadow casting{selectedLightType === 'HemisphereLight' ? ' (N/A)' : ''}</li>
          <li>• Shadow map: 256×256 por luz</li>
        </ul>
      </div>
    </main>
  )
}