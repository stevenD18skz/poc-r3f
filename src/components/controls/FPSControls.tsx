'use client'

import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { PointerLockControls } from '@react-three/drei'
import { useGameStore } from '@/logic/gameStore'

export default function FPSControls() {
  const controlsRef = useRef<any>(null)
  const { gl } = useThree()
  const isPlaying = useGameStore(state => state.isPlaying)
  const setIsPlaying = useGameStore(state => state.setIsPlaying)

  // Cuando el store dice "isPlaying = true", bloqueamos el puntero
  useEffect(() => {
    if (isPlaying) {
      controlsRef.current?.lock()
    } else {
      controlsRef.current?.unlock()
    }
  }, [isPlaying])

  // Sincronizar el estado del store cuando el puntero se bloquea/desbloquea
  // (ESC lo desbloquea automáticamente via el browser)
  const handleLock = () => setIsPlaying(true)
  const handleUnlock = () => setIsPlaying(false)

  return (
    <PointerLockControls
      ref={controlsRef}
      onLock={handleLock}
      onUnlock={handleUnlock}
    />
  )
}