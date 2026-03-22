import { Fragment } from 'react'
import type { ThreeElements } from '@react-three/fiber'
import Floor from '@/components/world/elemtns/Floor'
import Walls from '@/components/world/elemtns/Walls'
import Door from '@/components/world/elemtns/door'
import Bed from '@/components/world/furniture/Bed'

type GroupProps = ThreeElements['group']
interface RoomBigProps extends GroupProps {
    sizeRoom: number
    walls: { position: string, type: string }[]
}

export default function RoomBig({ sizeRoom, walls, ...groupProps }: RoomBigProps) {

    return (
        <group {...groupProps}>
            {/* Suelo y Paredes */}
            <group>
                <Floor size={sizeRoom} />
                {walls.map((wall, index) => (
                    wall.type === "wall" ? (
                        <Walls key={index} size={sizeRoom} position={wall.position as "back" | "right" | "front" | "left"} />
                    ) : wall.type === "door" ? (
                        <Door key={index} size={sizeRoom} position={wall.position as "back" | "right" | "front" | "left"} />
                    ) : (
                        <Fragment key={index} />
                    )
                ))}
            </group>

            {/* Muebles */}
            {/* Cama */}
            <Bed position={[0, 2, 0]} scale={5} />
        </group>
    )
}
