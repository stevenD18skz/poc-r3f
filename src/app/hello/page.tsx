
export default function Hello() {
    const map = [
        ["K", "B", "L"],
        ["R", "L", "L"],
        ["R", "L", "R"]
    ]

    const processMap = () => {
        let txt = ""

        const DefineRoom = (cell: string) => {
            switch (cell) {
                case "K":
                    return "Cocina"
                case "B":
                    return "Baño  "
                case "L":
                    return "Sala  "
                case "R":
                    return "Cuarto"
            }
        }



        const DefineWall = (cell: string, x: number, y: number): { type: string, position: string }[] => {
            const directions: [number, number, string][] = [[0, -1, "Back"], [1, 0, "Right"], [0, 1, "Front"], [-1, 0, "Left"]]
            const walls: { type: string, position: string }[] = []

            directions.forEach((direction) => {
                const nx = x + direction[0]
                const ny = y + direction[1]
                if (nx >= 0 && nx < map[0].length && ny >= 0 && ny < map.length) {
                    const randInt = Math.floor(Math.random() * 3) + 1
                    console.log(randInt)
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
            row.forEach((cell, x) => {
                console.log(`${DefineRoom(cell)} en: ${x}, ${y}`);
                txt += `${DefineRoom(cell)} en: ${x}, ${y} ======== Paredes: ${JSON.stringify(DefineWall(cell, x, y))}\n`;
            })
        })
        return txt
    }

    return (
        <div>
            <h1>Hello</h1>
            <pre>{processMap()}</pre>
        </div>
    )
}