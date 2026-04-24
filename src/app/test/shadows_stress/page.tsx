'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { useState, useMemo, useRef, useEffect, Suspense } from 'react'
import * as THREE from 'three'
import PerformanceOverlay from '@/components/test/PerformanceOverlay'
import DebugTools from '@/components/DebugTools'
import Loader3D from '@/components/ui/Loader3D'
import { OrbitControls } from '@react-three/drei'

// ─────────────────────────────────────────────
// PARÁMETROS DEL TEST (deben ser idénticos en Babylon)
// ─────────────────────────────────────────────
// Escena: arena cerrada (suelo + 4 paredes + techo con hueco)
// Luces: 3 SpotLights orbitando DENTRO de la arena
// Geometría: N cajas estáticas instanciadas (1 draw call)
// Por qué es mejor: cada sombra proyecta sobre suelo + paredes
// simultáneamente → más fill de shadow maps por frame
// ─────────────────────────────────────────────

const ARENA = { w: 32, h: 24, d: 32 } // Dimensiones de la arena
const WALL_THICKNESS = 0.5

// SpotLight que orbita DENTRO de la arena apuntando hacia abajo-frente
function InternalSpotLight({
  index,
  total,
  isStatic = false,
}: {
  index: number
  total: number
  isStatic?: boolean
}) {
  const lightRef = useRef<THREE.PointLight>(null!)
  const target = useMemo(() => new THREE.Object3D(), [])

  // Cálculo de posición estática: divide el ancho de la arena en 'total' partes
  // y coloca la luz en el centro de su parte correspondiente.
  const staticX = useMemo(() => {
    return -ARENA.w / 2 + (ARENA.w / total) * (index + 0.5)
  }, [index, total])

  const color = `hsl(${(index / total) * 360}, 80%, 85%)`

  useFrame((state) => {
    if (isStatic) {
      lightRef.current.position.x = staticX
      lightRef.current.position.z = 0
      lightRef.current.position.y = ARENA.h * 0.55
      return
    }

    const t = state.clock.getElapsedTime() * 0
    const baseAngle = (index / total) * Math.PI * 2
    const orbitRadius = ARENA.w * 0.28

    // Orbita horizontal a media altura de la arena
    lightRef.current.position.x = Math.cos(t + baseAngle) * orbitRadius
    lightRef.current.position.z = Math.sin(t + baseAngle) * orbitRadius
    lightRef.current.position.y = ARENA.h * 0.55

    // Target oscila entre el suelo y los lados para variar la dirección
    // Esto fuerza sombras dinámicas en múltiples paredes a la vez
    target.position.x = Math.sin(t * 0.7 + baseAngle) * (ARENA.w * 0.3)
    target.position.y = 0
    target.position.z = Math.cos(t * 0.7 + baseAngle) * (ARENA.d * 0.3)
    target.updateMatrixWorld()
  })

  return (
    <>
      <pointLight
        ref={lightRef}
        color={color}
        intensity={128}
        // angle={Math.PI / 2}   // Cono amplio para iluminar más superficies
        //penumbra={0.4}
        distance={ARENA.w * 4}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0005}
        //target={target}
      >
        {/* Esfera visual que se mueve con la luz */}
        <mesh>
          <sphereGeometry args={[0.2, 8, 8]} />
          <meshBasicMaterial color={color} />
        </mesh>
      </pointLight>
      <primitive object={target} />
    </>
  )
}

// ─────────────────────────────────────────────
// ARENA CERRADA
// Suelo + 4 paredes + techo con hueco central (para ver desde arriba)
// Todas las superficies reciben sombras
// ─────────────────────────────────────────────
function Arena() {
  const wallMat = (
    <meshStandardMaterial
      color="#1e293b"
      roughness={0.85}
      metalness={0.1}
      side={THREE.BackSide} // Renderizar cara interior
    />
  )

  const floorMat = (
    <meshStandardMaterial
      color="#0f172a"
      roughness={0.9}
      metalness={0.15}
    />
  )

  return (
    <group>
      {/* Suelo */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[ARENA.w, ARENA.d]} />
        {floorMat}
      </mesh>

      {/* Pared norte */}
      <mesh position={[0, ARENA.h / 2, -ARENA.d / 2]} receiveShadow castShadow>
        <boxGeometry args={[ARENA.w, ARENA.h, WALL_THICKNESS]} />
        <meshStandardMaterial color="#1e293b" roughness={0.85} metalness={0.1} />
      </mesh>

      {/* Pared sur */}
      <mesh position={[0, ARENA.h / 2, ARENA.d / 2]} receiveShadow castShadow>
        <boxGeometry args={[ARENA.w, ARENA.h, WALL_THICKNESS]} />
        <meshStandardMaterial color="#1e293b" roughness={0.85} metalness={0.1} />
      </mesh>

      {/* Pared oeste */}
      <mesh position={[-ARENA.w / 2, ARENA.h / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[WALL_THICKNESS, ARENA.h, ARENA.d]} />
        <meshStandardMaterial color="#1e293b" roughness={0.85} metalness={0.1} />
      </mesh>

      {/* Pared este */}
      <mesh position={[ARENA.w / 2, ARENA.h / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[WALL_THICKNESS, ARENA.h, ARENA.d]} />
        <meshStandardMaterial color="#1e293b" roughness={0.85} metalness={0.1} />
      </mesh>

      {/* Techo completo */}
      <mesh position={[0, ARENA.h, 0]} receiveShadow castShadow>
        <boxGeometry args={[ARENA.w, WALL_THICKNESS, ARENA.d]} />
        <meshStandardMaterial color="#0f172a" roughness={0.9} metalness={0.1} />
      </mesh>
    </group>
  )
}

// Cajas instanciadas estáticas DENTRO de la arena
function StaticBoxes({ count }: { count: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const tempObject = useRef(new THREE.Object3D()).current

  const positions = useMemo(() => {
    return Array.from({ length: count }, () => ({
      // Mantener dentro de la arena con margen
      x: (Math.random() - 0.5) * (ARENA.w - 4),
      y: Math.random() * 20 + 0.5,
      z: (Math.random() - 0.5) * (ARENA.d - 4),
      rx: Math.random() * Math.PI,
      ry: Math.random() * Math.PI,
      scale: 0.5 + Math.random() * 1.2,
    }))
  }, [count])

  useEffect(() => {
    if (!meshRef.current) return
    positions.forEach((p, i) => {
      tempObject.position.set(p.x, p.y, p.z)
      tempObject.rotation.set(p.rx, p.ry, 0)
      tempObject.scale.setScalar(p.scale)
      tempObject.updateMatrix()
      meshRef.current.setMatrixAt(i, tempObject.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [positions])

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, count]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#94a3b8" roughness={0.5} metalness={0.15} />
    </instancedMesh>
  )
}

function ShadowScene({ 
  count, 
  lightCount = 3, 
  isStatic = false 
}: { 
  count: number, 
  lightCount?: number, 
  isStatic?: boolean 
}) {
  return (
    <>
      {/* Ambient mínimo: la escena debe verse mayormente por las spotlights */}
      <ambientLight intensity={0} />

      {/* Generar luces dinámicamente */}
      {Array.from({ length: lightCount }).map((_, i) => (
        <InternalSpotLight 
          key={i} 
          index={i} 
          total={lightCount} 
          isStatic={isStatic} 
        />
      ))}

      {/* Arena cerrada (suelo + paredes + techo parcial) */}
      <Arena />

      {/* Cajas estáticas que lanzan y reciben sombras */}
      <StaticBoxes count={count} />
    </>
  )
}

export default function ShadowsStressTest() {
  const [count, setCount] = useState(64)

  return (
    <main className="relative w-full h-screen bg-[#050505] overflow-hidden">
      <PerformanceOverlay
        title={`Sombras: ${count} Objetos en Arena`}
        input={true}
        count={count}
        setCount={setCount}
        inputConfig={{
          unit: 'normal',
          type: 'power',
          min: 0,
          max: 13,
        }}
      />

      <Canvas camera={{ position: [0, ARENA.h * 1.4, ARENA.d * 1.1], fov: 50 }} shadows>
        <DebugTools title="Estrés de Sombras (Arena)" entityCount={count} />

        <Suspense fallback={<Loader3D />}>
          <OrbitControls makeDefault />
          <ShadowScene count={count} lightCount={6} isStatic={true} />
        </Suspense>
      </Canvas>

      <div className="absolute bottom-6 left-6 bg-black bg-opacity-70 p-4 rounded-lg border border-yellow-500 text-white text-xs max-w-xs">
        <h3 className="font-bold text-yellow-400 mb-2">Especificaciones del test</h3>
        <ul className="space-y-1 text-gray-300">
          <li>• Objetos: {count} cajas estáticas (1 draw call)</li>
          <li>• Arena: suelo + 4 paredes + techo parcial</li>
          <li>• Luces: 3 SpotLights internas dinámicas</li>
          <li>• Shadow maps: 512×512 por luz</li>
          <li>• Sombras sobre: suelo + paredes + cajas</li>
          <li>• CPU overhead: solo 3 movimientos de luz/frame</li>
        </ul>
      </div>
    </main>
  )
}