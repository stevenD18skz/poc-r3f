import { useFrame } from '@react-three/fiber'
import { Camera } from 'three'
import { useGameStore } from '@/logic/gameStore'

export function useWallCollision(cameraRef: Camera) {
    const board = useGameStore(s => s.board)
    const sizeRoom = 32

    useFrame(() => {
        if (!board || board.length === 0) return

        const pos = cameraRef.position
        
        // Calcular en qué celda de la cuadrícula estamos
        const colIndex = Math.round(pos.x / sizeRoom)
        const rowIndex = Math.round(pos.z / sizeRoom)

        // Si salimos completamente del mapa (ejem: inicio en 0, pero corremos mucho afuera)
        if (rowIndex < 0 || rowIndex >= board.length || colIndex < 0 || colIndex >= board[0].length) {
            return
        }

        const room = board[rowIndex][colIndex]
        
        // Las paredes tienen un grosor de 1m (0.5m hacia adentro). 
        // Aumentamos el margen a 1.5 para que la cámara (los ojos) se detenga a 1 metro de la textura de la pared.
        const margin = 1.5 

        // Límites absolutos de la celda actual (AABB)
        const minX = colIndex * sizeRoom - sizeRoom / 2
        const maxX = colIndex * sizeRoom + sizeRoom / 2
        const minZ = rowIndex * sizeRoom - sizeRoom / 2
        const maxZ = rowIndex * sizeRoom + sizeRoom / 2

        // Datos del ancho de la puerta
        const doorWidth = sizeRoom / 5
        const halfDoor = doorWidth / 2

        // Helper para obtener el tipo de pared en una dirección
        const getWallType = (posStr: string) => room.walls.find(w => w.position === posStr)?.type || 'free'

        const leftWall = getWallType('left')
        const rightWall = getWallType('right')
        const frontWall = getWallType('front')
        const backWall = getWallType('back')

        // ─── COLISIÓN X NEGATIVO (Pared Izquierda) ───
        if (pos.x < minX + margin) {
            if (leftWall === 'wall') {
                pos.x = minX + margin
            } else if (leftWall === 'door') {
                // Para cruzar una puerta en X, nuestra posición en Z debe estar alineada al centro (apertura de la puerta)
                if (pos.z < rowIndex * sizeRoom - halfDoor + margin || pos.z > rowIndex * sizeRoom + halfDoor - margin) {
                    pos.x = minX + margin
                }
            }
        }

        // ─── COLISIÓN X POSITIVO (Pared Derecha) ───
        if (pos.x > maxX - margin) {
            if (rightWall === 'wall') {
                pos.x = maxX - margin
            } else if (rightWall === 'door') {
                if (pos.z < rowIndex * sizeRoom - halfDoor + margin || pos.z > rowIndex * sizeRoom + halfDoor - margin) {
                    pos.x = maxX - margin
                }
            }
        }

        // ─── COLISIÓN Z NEGATIVO (Pared Trasera / Back) ───
        if (pos.z < minZ + margin) {
            if (backWall === 'wall') {
                pos.z = minZ + margin
            } else if (backWall === 'door') {
                // Para cruzar una puerta en Z, nuestra posición en X debe estar centrada
                if (pos.x < colIndex * sizeRoom - halfDoor + margin || pos.x > colIndex * sizeRoom + halfDoor - margin) {
                    pos.z = minZ + margin
                }
            }
        }

        // ─── COLISIÓN Z POSITIVO (Pared Frontal / Front) ───
        if (pos.z > maxZ - margin) {
            if (frontWall === 'wall') {
                pos.z = maxZ - margin
            } else if (frontWall === 'door') {
                if (pos.x < colIndex * sizeRoom - halfDoor + margin || pos.x > colIndex * sizeRoom + halfDoor - margin) {
                    pos.z = maxZ - margin
                }
            }
        }
    })
}
