'use client'

import { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { Raycaster, Vector3, Group } from 'three'
import { useGameStore, type PetId } from '@/logic/gameStore'

interface InteractablePetProps {
    petId: PetId
    position?: [number, number, number]
    children: React.ReactNode // el modelo 3D de la mascota
}

export default function InteractablePet({ petId, position = [0, 0, 0], children }: InteractablePetProps) {
    const [isHovered, setIsHovered] = useState(false)
    const groupRef = useRef<Group>(null!)

    const feedPet  = useGameStore(s => s.feedPet)
    const getPet   = useGameStore(s => s.getPet)
    const food     = useGameStore(s => s.player.food)
    const isPlaying = useGameStore(s => s.isPlaying)

    const pet = getPet(petId)
    const isFed = pet?.isFed ?? false

    // Raycasting: detectar si el jugador mira a la mascota
    useFrame(({ camera }) => {
        if (!groupRef.current || !isPlaying) return

        const raycaster = new Raycaster()
        const direction = new Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
        raycaster.set(camera.position, direction)

        const intersects = raycaster.intersectObject(groupRef.current, true)
        const hit = intersects.length > 0 && intersects[0].distance < 5

        if (hit !== isHovered) setIsHovered(hit)
    })

    // Tecla E para interactuar
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'KeyE' && isHovered && !isFed && food > 0) {
                feedPet(petId)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isHovered, isFed, food, petId, feedPet])

    return (
        <group ref={groupRef} position={position}>
            {/* Modelo 3D — animación suave si acaba de comer */}
            <group position={[0, isFed ? 0.4 : 0, 0]}>
                {children}
            </group>

            {/* Tooltip flotante */}
            {isHovered && (
                <Html position={[0, 2.8, 0]} center>
                    <div className="bg-white/90 backdrop-blur-sm px-4 py-3 rounded-xl shadow-xl text-center min-w-[160px] border border-white/40 select-none">
                        <p className="font-bold text-base text-gray-800">
                            {pet?.emoji} {pet?.name}
                        </p>
                        {isFed ? (
                            <p className="text-green-600 text-sm font-semibold mt-1">¡Está satisfecho! ❤️</p>
                        ) : food > 0 ? (
                            <p className="text-blue-600 text-sm animate-pulse mt-1">
                                Pulsa <kbd className="bg-gray-200 px-1.5 py-0.5 rounded text-xs font-mono">E</kbd> para alimentar
                            </p>
                        ) : (
                            <p className="text-red-500 text-sm font-bold mt-1">¡Sin comida! 🍖</p>
                        )}
                    </div>
                </Html>
            )}
        </group>
    )
}
