import { Fragment } from 'react'
import type { ThreeElements } from '@react-three/fiber'
import Floor from '@/components/world/elemtns/Floor'
import Walls from '@/components/world/elemtns/Walls'
import Door from '@/components/world/elemtns/door'
import Fridge from '@/components/world/furniture/Fridge'

type GroupProps = ThreeElements['group']
interface KitchenProps extends GroupProps {
    sizeRoom: number
    walls: { position: string, type: string }[]
}

export default function Kitchen({ sizeRoom, walls, ...groupProps }: KitchenProps) {

    return (
        <group {...groupProps}>
            {/* Suelo y Paredes de la Cocina */}
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

            {/* Muebles de Cocina*/}
            {/* Nevera */}
            <Fridge position={[5, 2, 0]} />
        </group>
    )
}
