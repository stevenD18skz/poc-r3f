'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { useState, useRef, useEffect, Suspense } from 'react'
import * as THREE from 'three'
import PerformanceOverlay from '@/components/test/PerformanceOverlay'
import DebugTools from '@/components/DebugTools'

// ─────────────────────────────────────────────
// PARÁMETROS DEL TEST
// ─────────────────────────────────────────────
const SPHERE_SEGMENTS = 16
const ARENA_SIZE = 20
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
// COMPONENTE TARGET (Solo Movimiento)
// ─────────────────────────────────────────────
function Target({ data }: { data: TargetData }) {
    const meshRef = useRef<THREE.Mesh>(null!)
    const pos = useRef(data.position.clone())
    const vel = useRef(data.velocity.clone())

    useFrame((state, delta) => {
        if (!meshRef.current) return

        // Lógica de Movimiento
        pos.current.addScaledVector(vel.current, delta)
        if (Math.abs(pos.current.x) > ARENA_SIZE) vel.current.x *= -1
        if (pos.current.y < 0.5 || pos.current.y > 15) vel.current.y *= -1
        if (Math.abs(pos.current.z) > ARENA_SIZE) vel.current.z *= -1
        
        meshRef.current.position.copy(pos.current)
        meshRef.current.scale.setScalar(data.scale)
    })

    return (
        <mesh
            ref={meshRef}
            geometry={sharedGeometry}
        >
            <meshStandardMaterial
                color={data.color}
                emissive={data.color}
                emissiveIntensity={0.1}
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
            <mesh rotation-x={-Math.PI / 2} receiveShadow>
                <circleGeometry args={[ARENA_SIZE, 64]} />
                <meshStandardMaterial color="#0d0d1a" roughness={0.8} />
            </mesh>
            <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 0]}>
                <ringGeometry args={[ARENA_SIZE - 0.3, ARENA_SIZE, 64]} />
                <meshBasicMaterial color="#6366f1" opacity={0.5} transparent />
            </mesh>
        </>
    )
}

export default function SceneOnly() {
    const [count, setCount] = useState(64)
    const nextId = useRef(0)

    const [targets, setTargets] = useState<TargetData[]>(() =>
        Array.from({ length: 64 }, () => createTarget(nextId.current++))
    )

    useEffect(() => {
        nextId.current = 0
        setTargets(Array.from({ length: count }, () => createTarget(nextId.current++)))
    }, [count])

    return (
        <main className="relative w-full h-screen bg-[#050505] overflow-hidden">
            <PerformanceOverlay
                title={`Escena 3D: ${count} Objetos`}
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

            <Canvas
                shadows
                camera={{ position: [0, 15, 35], fov: 60 }}
                // Desactivamos eventos de puntero en el Canvas para asegurar 0 raycasting
                style={{ pointerEvents: 'none' }}
            >
                <ambientLight intensity={0.4} />
                <pointLight position={[10, 10, 10]} intensity={1.5} />

                <Suspense fallback={null}>
                    <Arena />
                    {targets.map((t) => (
                        <Target key={t.id} data={t} />
                    ))}
                </Suspense>

                <DebugTools title="R3F Scene Only" entityCount={count} />
            </Canvas>
        </main>
    )
}
