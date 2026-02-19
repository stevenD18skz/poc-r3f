interface Room {
    type: number
    walls: { type: string, position: string }[]
}

export default Room