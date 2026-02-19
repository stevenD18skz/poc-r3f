// src/components/world/Floor.tsx
import { useTexture } from '@react-three/drei'
import { RepeatWrapping } from 'three'

export default function Door({ size, position }: { size: number, position: 'left' | 'right' | 'front' | 'back' }) {
    // Cargar múltiples texturas a la vez
    const textures = useTexture({
        map: '/textures/wall/whitewashed_brick_diff_1k.jpg'
    })

    
    const sizeWall = 16

    // Configurar repetición para todas las texturas
    Object.values(textures).forEach(texture => {
        texture.wrapS = texture.wrapT = RepeatWrapping
        texture.repeat.set(4, 4)
    })

    const positionDoor: { [key: string]: [number, number, number] } = {
        back: [0, sizeWall-sizeWall / 4, -size / 2],
        right: [size / 2, sizeWall - sizeWall / 4, 0],
        front: [0, sizeWall - sizeWall / 4, size / 2],
        left: [-size / 2, sizeWall - sizeWall / 4, 0],
    }

    const rotationDoor: { [key: string]: [number, number, number] } = {
        back: [0, 0, 0],
        right: [0, Math.PI / 2,0],
        front: [0, 0, 0],
        left: [0, Math.PI / 2, 0]
    }

    return (
        <mesh position={positionDoor[position]} rotation={rotationDoor[position]} receiveShadow>
            <boxGeometry args={[size, sizeWall/2, 1]} />
            <meshStandardMaterial
                {...textures}
            />
        </mesh>
    )
}