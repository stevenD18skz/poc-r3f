'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { useState, useMemo, useRef, Suspense, useEffect } from 'react'
import { Physics, RigidBody, CuboidCollider, RapierRigidBody } from '@react-three/rapier'
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
// Geometría: N cajas idénticas (solo cuboid, sin mezcla)
// Patrón: "fuente" - objetos caen, rebotan en plataformas, respawnean
// Cuerpos durmientes: 0 (siempre activos por respawn continuo)
// Variable: cantidad de cuerpos activos simultáneos
// Lo que mides: costo de simulación con N cuerpos SIEMPRE activos
// ─────────────────────────────────────────────

const SPAWN_HEIGHT = 18
const KILL_Y = -2 // Si cae por debajo, respawnear
const BOX_SIZE = 0.7

// Una sola caja con respawn automático cuando cae demasiado
function PhysicsBox({
  initialPosition,
  color,
}: {
  initialPosition: [number, number, number]
  color: string
}) {
  const rigidBodyRef = useRef<RapierRigidBody>(null!)

  const respawn = () => {
    if (!rigidBodyRef.current) return
    rigidBodyRef.current.setTranslation(
      {
        x: (Math.random() - 0.5) * 10,
        y: SPAWN_HEIGHT,
        z: (Math.random() - 0.5) * 10,
      },
      true
    )
    // Impulso inicial aleatorio para variar trayectorias
    rigidBodyRef.current.setLinvel(
      {
        x: (Math.random() - 0.5) * 4,
        y: Math.random() * 2,
        z: (Math.random() - 0.5) * 4,
      },
      true
    )
    rigidBodyRef.current.setAngvel(
      {
        x: (Math.random() - 0.5) * 5,
        y: (Math.random() - 0.5) * 5,
        z: (Math.random() - 0.5) * 5,
      },
      true
    )
  }

  useFrame(() => {
    if (!rigidBodyRef.current) return
    const pos = rigidBodyRef.current.translation()
    if (pos.y < KILL_Y) respawn()
  })

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={initialPosition}
      colliders="cuboid"
      restitution={0.4}   // Rebote moderado
      friction={0.6}
      linearDamping={0.1}
      angularDamping={0.1}
      // ✅ CLAVE: deshabilitar sleeping para mantener cuerpo siempre activo
      canSleep={false}
    >
      <mesh castShadow>
        <boxGeometry args={[BOX_SIZE, BOX_SIZE, BOX_SIZE]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.1} />
      </mesh>
    </RigidBody>
  )
}

// Plataformas inclinadas para hacer los objetos rebotar y moverse más
function Platforms() {
  return (
    <>
      {/* Plataforma central baja */}
      <RigidBody type="fixed">
        <mesh receiveShadow rotation={[0.3, 0, 0.2]} position={[0, 3, 0]} castShadow>
          <boxGeometry args={[8, 0.3, 8]} />
          <meshStandardMaterial color="#334155" roughness={0.7} />
        </mesh>
        <CuboidCollider args={[4, 0.15, 4]} position={[0, 3, 0]} rotation={[0.3, 0, 0.2]} />
      </RigidBody>

      {/* Plataforma izquierda alta */}
      <RigidBody type="fixed">
        <mesh receiveShadow rotation={[0, 0, -0.4]} position={[-6, 7, -2]} castShadow>
          <boxGeometry args={[5, 0.3, 5]} />
          <meshStandardMaterial color="#1e3a5f" roughness={0.7} />
        </mesh>
        <CuboidCollider args={[2.5, 0.15, 2.5]} position={[-6, 7, -2]} rotation={[0, 0, -0.4]} />
      </RigidBody>

      {/* Plataforma derecha media */}
      <RigidBody type="fixed">
        <mesh receiveShadow rotation={[0.2, 0, 0.3]} position={[6, 5, 2]} castShadow>
          <boxGeometry args={[5, 0.3, 5]} />
          <meshStandardMaterial color="#1e3a5f" roughness={0.7} />
        </mesh>
        <CuboidCollider args={[2.5, 0.15, 2.5]} position={[6, 5, 2]} rotation={[0.2, 0, 0.3]} />
      </RigidBody>
    </>
  )
}

function PhysicsScene({ count }: { count: number }) {
  // Colores precalculados, estables entre re-renders
  const colors = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => `hsl(${(i / count) * 280 + 40}, 75%, 55%)`),
    [count]
  )

  // Posiciones iniciales escalonadas para evitar solapamiento al spawn
  const initialPositions = useMemo(
    () =>
      Array.from({ length: count }, (_, i): [number, number, number] => [
        (Math.random() - 0.5) * 10,
        SPAWN_HEIGHT + i * 0.3, // Escalonado para no spawnear todos en el mismo punto
        (Math.random() - 0.5) * 10,
      ]),
    [count]
  )

  return (
    <>
      {/* Iluminación simple - sin Environment */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1.0}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />

      <Physics
        gravity={[0, -9.81, 0]}
        // ✅ timeStep fijo para comparación justa con Babylon
        timeStep={1 / 60}
      >
        {/* Cajas físicas */}
        {Array.from({ length: count }, (_, i) => (
          <PhysicsBox
            key={i}
            initialPosition={initialPositions[i]}
            color={colors[i]}
          />
        ))}

        {/* Plataformas inclinadas */}
        <Platforms />

        {/* Suelo */}
        <RigidBody type="fixed">
          <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
            <planeGeometry args={[40, 40]} />
            <meshStandardMaterial color="#0f172a" roughness={0.8} />
          </mesh>
          <CuboidCollider args={[20, 0.1, 20]} position={[0, -0.1, 0]} />
        </RigidBody>

        {/* Paredes invisibles */}
        <RigidBody type="fixed">
          <CuboidCollider args={[20, 15, 0.2]} position={[0, 7, -15]} />
          <CuboidCollider args={[20, 15, 0.2]} position={[0, 7, 15]} />
          <CuboidCollider args={[0.2, 15, 20]} position={[-15, 7, 0]} />
          <CuboidCollider args={[0.2, 15, 20]} position={[15, 7, 0]} />
        </RigidBody>
      </Physics>
    </>
  )
}

export default function PhysicsStressTest() {
  const [count, setCount] = useState(64)

  return (
    <main className="relative w-full h-screen bg-[#050505] overflow-hidden">
      <PerformanceOverlay
        title={`Física: ${count} Cuerpos Activos`}
        input={true}
        count={count}
        setCount={setCount}
        unit="normal"
      />

      <Canvas
        shadows
        camera={{ position: [20, 20, 20], fov: 50 }}
      >
        <DebugTools title="Estrés de Física" entityCount={count} />

        <Suspense fallback={<Loader3D />}>
          <OrbitControls makeDefault />
          <ambientLight intensity={4} />
          <PhysicsScene count={count} />
        </Suspense>
      </Canvas>

      {/* Info del test */}
      <div className="absolute bottom-6 left-6 bg-black bg-opacity-70 p-4 rounded-lg border border-orange-500 text-white text-xs max-w-xs">
        <h3 className="font-bold text-orange-400 mb-2">Especificaciones del test</h3>
        <ul className="space-y-1 text-gray-300">
          <li>• Cuerpos activos: {count} (canSleep: false)</li>
          <li>• Geometría: cuboid {BOX_SIZE}×{BOX_SIZE}×{BOX_SIZE}</li>
          <li>• Motor R3F: Rapier (Rust/WASM)</li>
          <li>• Motor Babylon: Havok / Cannon.js</li>
          <li>• TimeStep: 1/60 fijo en ambos</li>
          <li>• Respawn automático al caer (siempre activos)</li>
          <li>• ⚠️ Compara motores distintos</li>
        </ul>
      </div>
    </main>
  )
}