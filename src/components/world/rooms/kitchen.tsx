import type { ThreeElements } from '@react-three/fiber'
import Floor from '@/components/world/elemtns/Floor'
import Walls from '@/components/world/elemtns/Walls'
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
                {/* Pared Fondo */}
                <Walls size={sizeRoom} position="back" />
                <Walls size={sizeRoom} position="right" />
            </group>

            {/* Muebles de Cocina*/}
            {/* Nevera */}
            <Fridge position={[5, 2, 0]} />
        </group>
    )
}
