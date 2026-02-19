import Room from "../types/room"

const processMap = (size: number) => {
    const grid: Room[][] = []

    const randomMap = (size: number) => {
        const map = []
        for (let i = 0; i < size; i++) {
            const row = []
            for (let j = 0; j < size; j++) {
                row.push(Math.floor(Math.random() * 4))
            }
            map.push(row)
        }
        return map
    }

    const map = randomMap(size)



    const DefineRoom = (cell: number) => {
        switch (cell) {
            case 0:
                return "Sala"
            case 1:
                return "Cocina"
            case 2:
                return "Baño"
            case 3:
                return "Cuarto"
        }
    }


    const DefineWall = (cell: number, x: number, y: number) => {
        const directions: [number, number, string][] = [[0, -1, "Back"], [1, 0, "Right"], [0, 1, "Front"], [-1, 0, "Left"]]
        const walls: { type: string, position: string }[] = []

        directions.forEach((direction: [number, number, string]) => {
            const nx = x + direction[0]
            const ny = y + direction[1]
            if (nx >= 0 && nx < map[0].length && ny >= 0 && ny < map.length) {
                const randInt = Math.floor(Math.random() * 3) + 1
                if (randInt === 1) {
                    walls.push({
                        type: "wall",
                        position: direction[2]
                    })
                }
                else if (randInt === 2) {
                    walls.push({
                        type: "free",
                        position: direction[2]
                    })
                }
                else {
                    walls.push({
                        type: "door",
                        position: direction[2]
                    })
                }
            }
            else {
                walls.push({
                    type: "wall",
                    position: direction[2]
                })
            }
        })
        return walls
    }

    map.forEach((row, y) => {
        const gridRow: Room[] = []
        row.forEach((cell, x) => {
            console.log(`${DefineRoom(cell)} en: ${x}, ${y} ======== Paredes: ${JSON.stringify(DefineWall(cell, x, y))}\n`);
            gridRow.push({
                type: cell,
                walls: DefineWall(cell, x, y)
            })
        })
        grid.push(gridRow)
    })

    return grid

}


export default processMap