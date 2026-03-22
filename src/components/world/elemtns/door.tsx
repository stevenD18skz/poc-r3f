import { useTexture } from '@react-three/drei'
import { RepeatWrapping } from 'three'

export default function Door({ size, position }: { size: number, position: 'left' | 'right' | 'front' | 'back' }) {
    const textures = useTexture({
        map: '/textures/wall/whitewashed_brick_diff_1k.jpg'
    })

    const sizeWall = 16         // altura total de la pared
    const doorWidth = size / 5  // ancho de la abertura
    const doorHeight = sizeWall * 0.7 // altura de la abertura (70% del muro)

    Object.values(textures).forEach(texture => {
        texture.wrapS = texture.wrapT = RepeatWrapping
        texture.repeat.set(4, 4)
    })

    // Dimensiones de los paneles
    const sideWidth = (size - doorWidth) / 2
    const topHeight = sizeWall - doorHeight

    // Posición X local de cada panel (relativa al centro del grupo)
    const leftX = -(doorWidth / 2 + sideWidth / 2)
    const rightX = doorWidth / 2 + sideWidth / 2

    // Posición del group en el mundo (igual que Walls.tsx)
    const groupPosition: { [key: string]: [number, number, number] } = {
        left:  [-size / 2, 0, 0],
        right: [size / 2,  0, 0],
        front: [0, 0,  size / 2],
        back:  [0, 0, -size / 2],
    }

    const groupRotation: { [key: string]: [number, number, number] } = {
        left:  [0, Math.PI / 2, 0],
        right: [0, Math.PI / 2, 0],
        front: [0, 0, 0],
        back:  [0, 0, 0],
    }

    const mat = <meshStandardMaterial {...textures} />

    return (
        <group position={groupPosition[position]} rotation={groupRotation[position]}>

            {/* Panel izquierdo — altura completa */}
            <mesh position={[leftX, sizeWall / 2, 0]} receiveShadow castShadow>
                <boxGeometry args={[sideWidth, sizeWall, 1]} />
                {mat}
            </mesh>

            {/* Panel derecho — altura completa */}
            <mesh position={[rightX, sizeWall / 2, 0]} receiveShadow castShadow>
                <boxGeometry args={[sideWidth, sizeWall, 1]} />
                {mat}
            </mesh>

            {/* Dintel superior — sobre la abertura */}
            <mesh position={[0, doorHeight + topHeight / 2, 0]} receiveShadow castShadow>
                <boxGeometry args={[doorWidth, topHeight, 1]} />
                {mat}
            </mesh>

        </group>
    )
}