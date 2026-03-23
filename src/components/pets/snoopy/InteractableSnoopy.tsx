import { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { Raycaster, Vector3, Group } from 'three'
import Snoopy from '@/components/pets/Snoopy/Snoopy'
import { useGameStore } from '@/logic/gameStore'

interface InteractableSnoopyProps {
    id: string
    name: string
    position: [number, number, number]
}

export default function InteractableSnoopy({ id, name, position }: InteractableSnoopyProps) {
    const [isHovered, setIsHovered] = useState(false)
    const [lastFedTime, setLastFedTime] = useState(0)
    const groupRef = useRef<Group>(null!)

    // Acceso al store global
    const feedPet = useGameStore(state => state.feedPet)
    const fedPets = useGameStore(state => state.fedPets)
    const foodCount = useGameStore(state => state.food)

    const isFed = fedPets.includes(id)

    // Raycasting manual en cada frame para detectar "Mirada"
    useFrame(({ camera }) => {
        if (!groupRef.current) return

        const raycaster = new Raycaster()
        // Vector hacia adelante desde la cámara
        const direction = new Vector3(0, 0, -1).applyQuaternion(camera.quaternion)

        raycaster.set(camera.position, direction)

        // Verificamos si intersecta con el grupo de Snoopy (recursivo true)
        const intersects = raycaster.intersectObject(groupRef.current, true)

        // Si hay intersección y está cerca (< 4 metros)
        if (intersects.length > 0 && intersects[0].distance < 4) {
            if (!isHovered) setIsHovered(true)
        } else {
            if (isHovered) setIsHovered(false)
        }
    })

    // Escuchar tecla "E" para interactuar
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'KeyE' && isHovered && !isFed && foodCount > 0) {
                feedPet(id)
                setLastFedTime(Date.now())
                // Pequeño feedback visual o de consola
                console.log(`¡Alimentaste a ${name}!`)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isHovered, isFed, foodCount, id, feedPet, name])

    return (
        <group ref={groupRef} position={position}>
            {/* El modelo 3D con animación de saltito si acaba de comer */}
            <group position={[0, isFed ? 0.5 : 0, 0]}>
                <Snoopy />
            </group>

            {/* UI Flotante Solo si lo miramos */}
            {isHovered && (
                <Html position={[0, 2.5, 0]} center>
                    <div className="bg-white/90 p-3 rounded-lg shadow-xl text-center min-w-[150px] transform transition-all">
                        <h3 className="font-bold text-lg text-gray-800">{name} 🐶</h3>

                        {isFed ? (
                            <p className="text-green-600 font-medium">¡Estómago Lleno! ❤️</p>
                        ) : foodCount > 0 ? (
                            <p className="text-blue-600 animate-pulse">Presiona <kbd className="bg-gray-200 px-1 rounded">E</kbd> para alimentar</p>
                        ) : (
                            <p className="text-red-500 font-bold">¡No tienes comida! 🍖</p>
                        )}
                    </div>
                </Html>
            )}
        </group>
    )
}
