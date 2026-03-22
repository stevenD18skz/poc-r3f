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


    const wallCache: Record<string, string> = {}

    const getWallType = (x1: number, y1: number, x2: number, y2: number) => {
        const key = [[x1, y1], [x2, y2]].sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(p => p.join(',')).join('|')
        if (wallCache[key]) return wallCache[key]

        const randInt = Math.floor(Math.random() * 3) + 1
        const type = randInt === 1 ? "wall" : randInt === 2 ? "free" : "door"
        wallCache[key] = type
        return type
    }

    const DefineWall = (cell: number, x: number, y: number): { type: string, position: string }[] => {
        const directions: [number, number, string][] = [[1, 0, "right"], [-1, 0, "left"], [0, 1, "front"], [0, -1, "back"]]
        const walls: { type: string, position: string }[] = []

        directions.forEach((direction) => {
            const nx = x + direction[0]
            const ny = y + direction[1]
            if (nx >= 0 && nx < map[0].length && ny >= 0 && ny < map.length) {
                walls.push({
                    type: getWallType(x, y, nx, ny),
                    position: direction[2]
                })
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
            gridRow.push({
                type: cell,
                walls: DefineWall(cell, x, y)
            })
        })
        grid.push(gridRow)
    })

    // Asignar 3 mascotas a coordenadas aleatorias distintas
    const allCoords: { x: number, y: number }[] = []
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            allCoords.push({ x, y })
        }
    }
    // Barajar aleatoriamente
    allCoords.sort(() => Math.random() - 0.5)

    const petsToAssign = ['snoopy', 'cat-1', 'cat-2']
    petsToAssign.forEach((petId, i) => {
        if (i < allCoords.length) {
            const { x, y } = allCoords[i]
            grid[y][x].petId = petId
        }
    })

    return grid
}




export default processMap