import type { ThreeElements } from '@react-three/fiber'
import Floor from '@/components/world/elemtns/Floor'
import Walls from '@/components/world/elemtns/Walls'
import Cat from '@/components/pets/cat/Cat'
import Toilet from '@/components/world/furniture/Toilet'

type GroupProps = ThreeElements['group']
interface BathroomProps extends GroupProps {
    sizeRoom: number
    walls: { position: string, type: string }[]
}

export default function Bathroom({ sizeRoom, walls, ...groupProps }: BathroomProps) {

    return (
        <group {...groupProps}>
            {/* Suelo y Paredes */}
            <group>
                <Floor size={sizeRoom} />
                {/* Paredes */}
                <Walls size={sizeRoom} position="front" />
                <Walls size={sizeRoom} position="right" />
            </group>

            {/* Muebles */}
            <Toilet position={[2, 2, 0]} scale={10} />
        </group>
    )
}
