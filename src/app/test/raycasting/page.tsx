'use client'

import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber'
import { useState, useMemo, useRef, useCallback, useEffect, Suspense } from 'react'
import * as THREE from 'three'
import PerformanceOverlay from '@/components/test/PerformanceOverlay'
import DebugTools from '@/components/DebugTools'
import Loader3D from '@/components/ui/Loader3D'

// ─────────────────────────────────────────────
// PARÁMETROS DEL TEST (deben ser idénticos en Babylon)
// ─────────────────────────────────────────────
// Geometría: N esferas moviéndose en 3D (N draw calls, 1 por esfera)
// Raycasting: hover continuo contra N objetos en movimiento
// Click: elimina target + suma score
// Lo que mides: costo de raycast contra N transforms dinámicos por frame
// ─────────────────────────────────────────────

const SPHERE_SEGMENTS = 16
const ARENA_SIZE = 20

// Creamos los recursos una sola vez para no penalizar el test con GC (Garbage Collection)
const sharedGeometry = new THREE.SphereGeometry(1, SPHERE_SEGMENTS, SPHERE_SEGMENTS)

interface TargetData {
    id: number
    position: THREE.Vector3
    velocity: THREE.Vector3
    scale: number
    color: THREE.Color
}

function createTarget(id: number): TargetData {
    const theta = Math.random() * Math.PI * 2
    const phi = Math.random() * Math.PI
    const r = 5 + Math.random() * (ARENA_SIZE - 5)

    return {
        id,
        position: new THREE.Vector3(
            r * Math.sin(phi) * Math.cos(theta),
            Math.random() * 12 + 1,
            r * Math.sin(phi) * Math.sin(theta)
        ),
        velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 4
        ),
        scale: 0.4 + Math.random() * 0.6,
        color: new THREE.Color().setHSL(Math.random(), 0.9, 0.6),
    }
}

// ─────────────────────────────────────────────
// COMPONENTE TARGET (Optimizado)
// ─────────────────────────────────────────────
function Target({ data, onHit }: { data: TargetData; onHit: (id: number) => void }) {
    const meshRef = useRef<THREE.Mesh>(null!)
    const matRef = useRef<THREE.MeshStandardMaterial>(null!)

    // Usamos un Ref para el estado de hover para no disparar re-renders de React
    const isHovered = useRef(false)
    const pos = useRef(data.position.clone())
    const vel = useRef(data.velocity.clone())

    useFrame((state, delta) => {
        if (!meshRef.current) return

        // 1. Lógica de Movimiento (Física básica)
        pos.current.addScaledVector(vel.current, delta)
        if (Math.abs(pos.current.x) > ARENA_SIZE) vel.current.x *= -1
        if (pos.current.y < 0.5 || pos.current.y > 15) vel.current.y *= -1
        if (Math.abs(pos.current.z) > ARENA_SIZE) vel.current.z *= -1
        meshRef.current.position.copy(pos.current)

        // 2. Interpolación visual del Hover (Direct Mutation)
        // Esto es mucho más rápido que usar un state de React
        const targetScale = isHovered.current ? data.scale * 1.3 : data.scale
        meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.2)

        // 3. Feedback visual del material
        matRef.current.emissiveIntensity = THREE.MathUtils.lerp(
            matRef.current.emissiveIntensity,
            isHovered.current ? 0.8 : 0.1,
            0.2
        )
    })

    return (
        <mesh
            ref={meshRef}
            geometry={sharedGeometry}
            onPointerOver={(e) => {
                e.stopPropagation()
                isHovered.current = true
            }}
            onPointerOut={() => {
                isHovered.current = false
            }}
            onClick={(e) => {
                e.stopPropagation()
                onHit(data.id)
            }}
        >
            <meshStandardMaterial
                ref={matRef}
                color={data.color}
                emissive={data.color}
                roughness={0.3}
                metalness={0.4}
            />
        </mesh>
    )
}

// ─────────────────────────────────────────────
// ESCENA Y ARENA
// ─────────────────────────────────────────────
function Arena() {
    return (
        <>
            <mesh rotation-x={-Math.PI / 2} receiveShadow raycast={() => null}>
                <circleGeometry args={[ARENA_SIZE, 64]} />
                <meshStandardMaterial color="#0d0d1a" roughness={0.8} />
            </mesh>
            <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 0]} raycast={() => null}>
                <ringGeometry args={[ARENA_SIZE - 0.3, ARENA_SIZE, 64]} />
                <meshBasicMaterial color="#6366f1" opacity={0.5} transparent />
            </mesh>
        </>
    )
}

// HUD: información de rendimiento del juego
function GameHUD({
    score,
    missed,
    count,
    active,
}: {
    score: number
    missed: number
    count: number
    active: number
}) {
    const accuracy = score + missed > 0 ? Math.round((score / (score + missed)) * 100) : 100

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
            {/* Score */}
            <div className="bg-black/80 backdrop-blur-xl border border-emerald-500/40 px-5 py-3 rounded-xl">
                <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Score</p>
                <p className="text-3xl font-mono font-black text-emerald-400">{score}</p>
            </div>

            {/* Accuracy */}
            <div className="bg-black/80 backdrop-blur-xl border border-blue-500/40 px-5 py-3 rounded-xl">
                <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Precisión</p>
                <p className="text-2xl font-mono font-black text-blue-400">{accuracy}%</p>
            </div>

            {/* Targets activos */}
            <div className="bg-black/80 backdrop-blur-xl border border-purple-500/40 px-5 py-3 rounded-xl">
                <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Targets activos</p>
                <p className="text-2xl font-mono font-black text-purple-400">
                    {active} <span className="text-gray-500 text-sm">/ {count}</span>
                </p>
            </div>
        </div>
    )
}

// Crosshair
function Crosshair() {
    return (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-40">
            <div className="relative w-8 h-8">
                <div className="absolute top-1/2 left-0 right-0 h-px bg-white/60 -translate-y-1/2" />
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/60 -translate-x-1/2" />
                <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80" />
            </div>
        </div>
    )
}

export default function RaycastTest() {
    const [count, setCount] = useState(64)
    const [score, setScore] = useState(0)
    const [missed, setMissed] = useState(0)
    const nextId = useRef(0)

    const [targets, setTargets] = useState<TargetData[]>(() =>
        Array.from({ length: 64 }, () => createTarget(nextId.current++))
    )

    useEffect(() => {
        nextId.current = 0
        setTargets(Array.from({ length: count }, () => createTarget(nextId.current++)))
        setScore(0)
        setMissed(0)
    }, [count])

    const handleHit = useCallback((id: number) => {
        setScore((s) => s + 1)
        setTargets((prev) => {
            // Reemplazamos el target específico para mantener el pool constante
            return prev.map((t) => (t.id === id ? createTarget(nextId.current++) : t))
        })
    }, [])

    return (
        <main
            className="relative w-full h-screen bg-[#050505] overflow-hidden"
            style={{ cursor: 'crosshair' }}
            onPointerDown={() => setMissed(m => m + 1)}
        >
            <PerformanceOverlay
                title={`Raycasting: ${count} Targets Dinámicos`}
                input={true}
                count={count}
                setCount={setCount}
                inputConfig={{
                    unit: 'normal',
                    type: 'power',
                    min: 1,
                    max: 12
                }}
            />

            <GameHUD
                score={score}
                missed={missed}
                count={count}
                active={targets.length}
            />

            <Crosshair />

            <Canvas
                shadows
                camera={{ position: [0, 15, 35], fov: 60 }}
                // Optimización de Raycaster global
                raycaster={{
                    params: {
                      Mesh: { threshold: 0.1 } // Más preciso para esferas pequeñas
                      ,
                      Line: {
                        threshold: 0
                      },
                      LOD: undefined,
                      Points: {
                        threshold: 0
                      },
                      Sprite: undefined
                    }
                }}
            >
                <ambientLight intensity={0.4} />
                <pointLight position={[10, 10, 10]} intensity={1.5} />

                <Suspense fallback={null}>
                    <Arena />
                    {targets.map((t) => (
                        <Target key={t.id} data={t} onHit={handleHit} />
                    ))}
                </Suspense>

                <DebugTools title="R3F Optimized Raycast" entityCount={count} />
            </Canvas>
        </main>
    )
}