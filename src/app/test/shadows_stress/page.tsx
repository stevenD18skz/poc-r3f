'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { useState, useMemo, useRef, useEffect, Suspense } from 'react'
import * as THREE from 'three'
import PerformanceOverlay from '@/components/test/PerformanceOverlay'
import DebugTools from '@/components/DebugTools'
import Loader3D from '@/components/ui/Loader3D'
import { OrbitControls, } from '@react-three/drei'

// ─────────────────────────────────────────────
// PARÁMETROS DEL TEST (deben ser idénticos en Babylon)
// ─────────────────────────────────────────────
// Escena: arena cerrada (suelo + 4 paredes + techo con hueco)
// Luces: 3 SpotLights orbitando DENTRO de la arena
// Geometría: N cajas estáticas instanciadas (1 draw call)
// Por qué es mejor: cada sombra proyecta sobre suelo + paredes
// simultáneamente → más fill de shadow maps por frame
// ─────────────────────────────────────────────

const ARENA = { w: 32, h: 32, d: 32 } // Dimensiones de la arena
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

  const color = `hsl(195, 30%, 95%)`

  useFrame((state) => {
    if (isStatic) {
      lightRef.current.position.x = staticX
      lightRef.current.position.z = 0
      lightRef.current.position.y = ARENA.h * 0.55
      return
    }

    const t = state.clock.getElapsedTime() * 1
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
        intensity={512}
        // angle={Math.PI / 2}   // Cono amplio para iluminar más superficies
        //penumbra={0.4}
        distance={ARENA.w * 4}
        castShadow
        shadow-mapSize={[512, 512]}
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
  return (
    <group>
      {/* Suelo */}
      <mesh  position={[0, 0, 0]} receiveShadow castShadow>
        <boxGeometry args={[ARENA.w, WALL_THICKNESS, ARENA.d]} />
        <meshStandardMaterial color="#444" roughness={1} metalness={0.1} />
      </mesh>

      {/* Pared norte */}
      <mesh position={[0, ARENA.h / 2, -ARENA.d / 2]} receiveShadow castShadow>
        <boxGeometry args={[ARENA.w, ARENA.h, WALL_THICKNESS]} />
        <meshStandardMaterial color="#444" roughness={1} metalness={0.1} />
      </mesh>

      {/* Pared sur */}
      <mesh position={[0, ARENA.h / 2, ARENA.d / 2]} receiveShadow castShadow>
        <boxGeometry args={[ARENA.w, ARENA.h, WALL_THICKNESS]} />
        <meshStandardMaterial color="#444" roughness={1} metalness={0.1} />
      </mesh>

      {/* Pared oeste */}
      <mesh position={[-ARENA.w / 2, ARENA.h / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[WALL_THICKNESS, ARENA.h, ARENA.d]} />
        <meshStandardMaterial color="#444" roughness={1} metalness={0.1} />
      </mesh>

      {/* Pared este */}
      <mesh position={[ARENA.w / 2, ARENA.h / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[WALL_THICKNESS, ARENA.h, ARENA.d]} />
        <meshStandardMaterial color="#444" roughness={1} metalness={0.1} />
      </mesh>

      {/* Techo completo 
      <mesh position={[0, ARENA.h, 0]} receiveShadow castShadow>
        <boxGeometry args={[ARENA.w, WALL_THICKNESS, ARENA.d]} />
        <meshStandardMaterial color="#444" roughness={1} metalness={0.1} />
      </mesh>*/}
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
      y: Math.random() * (ARENA.h - 1) + 0.5,
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
      <boxGeometry args={[0.4, 0.4, 0.4]} />
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
      <ambientLight intensity={0.3} />

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
  const [lightCount, setLightCount] = useState(1)
  const [isStatic, setIsStatic] = useState(false)

  return (
    <main className="relative w-full h-screen bg-[#050505] overflow-hidden">
      <Canvas camera={{ position: [0, ARENA.h * 1.5, 0.1], fov: 75 }} shadows>
        <DebugTools title="Estrés de Sombras (Arena)" entityCount={count} />

        <Suspense fallback={<Loader3D />}>
          <OrbitControls makeDefault />
          <ShadowScene count={count} lightCount={lightCount} isStatic={isStatic} />
        </Suspense>
      </Canvas>

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
      >
        <div className="bg-white/5 px-6 py-3 border-t border-white/10 flex flex-col gap-4 rounded-3xl mt-4">
          <div className="flex justify-between items-center mb-1">
            <label className="text-[12px] uppercase tracking-[0.15em] font-black text-white/50">Luces</label>
            <span className="text-[16px] font-mono text-yellow-400 font-bold bg-yellow-500/15 px-3 py-1 rounded-full border border-yellow-500/30 shadow-inner">
              {lightCount} <span className="text-[8px] opacity-70 ml-1">LIT</span>
            </span>
          </div>
          
          <div className="relative h-6 flex items-center">
            <input 
              type="range" 
              min="1" 
              max="7" 
              step="1" 
              className="w-full accent-yellow-500 cursor-pointer h-1 bg-white/10 rounded-full appearance-none hover:bg-white/20 transition-colors"
              value={lightCount}
              onChange={(e) => setLightCount(Number(e.target.value))}
            />
          </div>

          <div className="flex justify-between items-center mt-2 group cursor-pointer" onClick={() => setIsStatic(!isStatic)}>
            <label className="text-[12px] uppercase tracking-[0.15em] font-black text-white/50 cursor-pointer">Movimiento</label>
            <div className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ${isStatic ? 'bg-white/10' : 'bg-green-500/40'}`}>
              <div className={`w-4 h-4 rounded-full bg-white transition-all duration-300 ${isStatic ? 'translate-x-0 opacity-40' : 'translate-x-6 shadow-[0_0_10px_white]'}`} />
            </div>
          </div>
        </div>
      </PerformanceOverlay>
    </main>
  )
}