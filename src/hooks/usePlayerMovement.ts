// src/hooks/usePlayerMovement.ts
'use client'

import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import { useWallCollision } from './useWallCollision'
import { useGameStore } from '@/logic/gameStore'

export function usePlayerMovement(speed = 5) {
  const { camera } = useThree()
  const isPlaying = useGameStore(state => state.isPlaying)
  const velocity = useRef(new Vector3())
  const keys = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
  })

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW': keys.current.forward = true; break
        case 'KeyS': keys.current.backward = true; break
        case 'KeyA': keys.current.left = true; break
        case 'KeyD': keys.current.right = true; break
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW': keys.current.forward = false; break
        case 'KeyS': keys.current.backward = false; break
        case 'KeyA': keys.current.left = false; break
        case 'KeyD': keys.current.right = false; break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  useFrame((state, delta) => {
    // Solo mover si estamos jugando (puntero bloqueado)
    if (!isPlaying) return

    const direction = new Vector3()
    const frontVector = new Vector3(0, 0, Number(keys.current.backward) - Number(keys.current.forward))
    const sideVector = new Vector3(Number(keys.current.left) - Number(keys.current.right), 0, 0)

    direction
      .subVectors(frontVector, sideVector)
      .normalize()
      .multiplyScalar(speed)
      .applyEuler(camera.rotation)

    camera.position.add(direction.multiplyScalar(delta))
    camera.position.y = 1.6 // Altura de los ojos
  })

  // Aplicar colisiones después del movimiento
  useWallCollision(camera)
}