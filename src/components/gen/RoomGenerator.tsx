import Floor from '@/components/world/elemtns/Floor'
import Box from '@/components/Box'
import Walls from '@/components/world/elemtns/Walls'

import Bathroom from '@/components/world/rooms/Bathroom'
import Kitchen from '@/components/world/rooms/kitchen'
import LivingRoom from '@/components/world/rooms/LivingRoom'
import RoomBig from '@/components/world/rooms/RoomBig'
import processMap from '@/app/helpers/generator'
import type Room from '@/app/types/room'

export default function RoomGenerator(props: any) {
    const sizeRoom = 32

    const rooms = {
        0: LivingRoom,
        1: Kitchen,
        2: Bathroom,
        3: RoomBig
    }

    const board = processMap(3)

    console.log(board)

    return (
        <group {...props}>
            <Floor size={sizeRoom} />

            {board.map((row: Room[], rowIndex: number) => (
                row.map((room: Room, colIndex: number) => {
                    const RoomComponent = rooms[room.type as keyof typeof rooms]
                    return (
                        <RoomComponent
                            key={`${rowIndex}-${colIndex}`}
                            sizeRoom={sizeRoom}
                            walls={room.walls}
                            position={[
                                colIndex * sizeRoom,
                                0,
                                rowIndex * sizeRoom
                            ]}
                        />
                    )
                })
            ))}
        </group>
    )
}
