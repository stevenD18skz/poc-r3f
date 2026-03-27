import Floor from '@/components/world/elemtns/Floor'
import Box from '@/components/Box'
import Walls from '@/components/world/elemtns/Walls'

import Bathroom from '@/components/world/rooms/Bathroom'
import Kitchen from '@/components/world/rooms/kitchen'
import LivingRoom from '@/components/world/rooms/LivingRoom'
import RoomBig from '@/components/world/rooms/RoomBig'
import processMap from '@/helpers/generator'
import type Room from '@/types/room'
import { useGameStore } from '@/logic/gameStore'
import { useControls, button } from 'leva'
import InteractablePet from '@/components/pets/InteractablePet'
import Snoopy from '@/components/pets/snoopy/Snoopy'
import Cat from '@/components/pets/cat/Cat'

export default function RoomGenerator(props: any) {
    const sizeRoom = 32

    const rooms = {
        0: LivingRoom,
        1: Kitchen,
        2: Bathroom,
        3: RoomBig
    }

    const board = useGameStore(s => s.board)
    const regenerateBoard = useGameStore(s => s.regenerateBoard)

    useControls('Map Generation', {
        regenerate: button(() => regenerateBoard())
    })

    return (
        <group {...props}>
            <Floor size={sizeRoom} />

            {board.map((row: Room[], rowIndex: number) => (
                row.map((room: Room, colIndex: number) => {
                    const RoomComponent = rooms[room.type as keyof typeof rooms]
                    const position: [number, number, number] = [
                        colIndex * sizeRoom,
                        0,
                        rowIndex * sizeRoom
                    ]

                    return (
                        <group key={`${rowIndex}-${colIndex}`}>
                            <RoomComponent
                                sizeRoom={sizeRoom}
                                walls={room.walls}
                                position={position}
                            />

                            {/* Renderizar mascota dinámicamente si el generador asignó una */}
                            {room.petId === 'snoopy' && (
                                <InteractablePet petId="snoopy" position={[position[0], 1, position[2]]}>
                                    <Snoopy />
                                </InteractablePet>
                            )}
                            {room.petId === 'cat-1' && (
                                <InteractablePet petId="cat-1" position={[position[0] - 3, 0, position[2] + 3]}>
                                    <Cat scale={0.15} />
                                </InteractablePet>
                            )}
                            {room.petId === 'cat-2' && (
                                <InteractablePet petId="cat-2" position={[position[0] + 3, 0, position[2] - 3]}>
                                    <Cat scale={0.15} />
                                </InteractablePet>
                            )}
                        </group>
                    )
                })
            ))}
        </group>
    )
}

