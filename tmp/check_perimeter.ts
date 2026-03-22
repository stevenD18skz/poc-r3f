const map = [
    ["K", "B", "L"],
    ["R", "L", "L"],
    ["R", "L", "R"]
]

const wallCache: Record<string, string> = {}
const getWallType = (x1: number, y1: number, x2: number, y2: number) => {
    const key = [[x1, y1], [x2, y2]].sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(p => p.join(',')).join('|')
    if (wallCache[key]) return wallCache[key]
    const randInt = Math.floor(Math.random() * 3) + 1
    const type = randInt === 1 ? "wall" : randInt === 2 ? "free" : "door"
    wallCache[key] = type
    return type
}

const DefineWall = (x: number, y: number) => {
    const directions: [number, number, string][] = [[0, -1, "Back"], [1, 0, "Right"], [0, 1, "Front"], [-1, 0, "Left"]]
    const walls: Record<string, string> = {}
    directions.forEach((direction) => {
        const nx = x + direction[0]
        const ny = y + direction[1]
        if (nx >= 0 && nx < map[0].length && ny >= 0 && ny < map.length) {
            walls[direction[2]] = getWallType(x, y, nx, ny)
        } else {
            walls[direction[2]] = "wall"
        }
    })
    return walls
}

console.log("--- Perimeter Check ---")
console.log("(0,0) Left (should be wall):", DefineWall(0,0).Left)
console.log("(0,0) Back (should be wall):", DefineWall(0,0).Back)
console.log("(2,0) Right (should be wall):", DefineWall(2,0).Right)
console.log("(2,0) Back (should be wall):", DefineWall(2,0).Back)
console.log("(0,2) Left (should be wall):", DefineWall(0,2).Left)
console.log("(0,2) Front (should be wall):", DefineWall(0,2).Front)
console.log("(2,2) Right (should be wall):", DefineWall(2,2).Right)
console.log("(2,2) Front (should be wall):", DefineWall(2,2).Front)
