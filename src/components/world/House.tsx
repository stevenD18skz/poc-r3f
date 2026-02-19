'use client'

import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment, Html } from '@react-three/drei'
import { Suspense, useMemo, useRef, useState } from 'react'
import DebugTools, { useDebugControls } from '@/components/DebugTools'
import { Object3D } from 'three'
import { useHelper } from '@react-three/drei'
import * as THREE from 'three'

import FPSControls from '@/components/controls/FPSControls'
import { usePlayerMovement } from '@/hooks/usePlayerMovement'

import GameUI from '../ui/GameUI'

// Componente invisible que maneja la lógica de movimiento del jugador
function Player() {
    usePlayerMovement()
    return null
}

import { useGameStore } from '@/logic/gameStore'
import Bathroom from './rooms/Bathroom'
import RoomGenerator from '../gen/RoomGenerator'

// Componente que rastrea en qué habitación estás
function RoomTracker() {
    const { camera } = useThree()
    const isPlaying = useGameStore(state => state.isPlaying)
    const currentRoom = useGameStore(state => state.currentRoom)
    const setRoom = useGameStore(state => state.setRoom)

    useFrame(() => {
        const x = camera.position.x
        const z = camera.position.z

        // Lógica simple de coordenadas (AABB)
        if (x > -16 && x < 16 && z > -16 && z < 16) {
            if (currentRoom !== 'Sala') setRoom('Sala')
        }
        else if (x > 16 && x < 48 && z > -16 && z < 16) {
            if (currentRoom !== 'Cocina') setRoom('Cocina')
        }
        else {
            if (currentRoom !== 'Exterior') setRoom('Exterior')
        }
    })

    if (!isPlaying) return null

    return null
}

function SceneLights() {
    const lightRef = useRef<THREE.SpotLight>(null!)
    useHelper(lightRef, THREE.SpotLightHelper)
    const target = useMemo(() => new Object3D(), [])

    return (
        <>
            <spotLight
                ref={lightRef}
                color={"white"}
                position={[-13.8, 7, 0]}
                angle={Math.PI / 6}
                distance={64}
                intensity={16}
                decay={0.5}
                penumbra={0.125}
                target={target}
                castShadow
            />
            <primitive object={target} position={[0, 7, 0]} />
            {/* Luz ambiental extra para que no esté todo tan oscuro */}
            <ambientLight intensity={0.5} />
        </>
    )
}

export default function House() {
    // Obtenemos el estado de freeCam desde los controles de debug
    const { freeCam } = useDebugControls()

    const sizeFloor = 32
    const heightWall = 8


    return (
        <div className="w-full h-screen">
            <Canvas
                camera={{ position: [5, 1.6, 5], fov: 50 }}
                shadows
            >
                {/* Herramientas Globales */}
                <DebugTools />
                <RoomTracker />

                {/* LOGICA DE CONTROLES */}
                {freeCam ? (
                    <OrbitControls makeDefault minDistance={2} maxDistance={200} />
                ) : (
                    <>
                        <FPSControls />
                        <Player />
                    </>
                )}

                {/* Luces y Entorno */}
                <SceneLights />
                <Environment preset="forest" background />

                {/* Generador de habitaciones */}
                <Suspense fallback={null}>
                    <RoomGenerator position={[0, 0, 0]} />
                </Suspense>

            </Canvas>

            {/* Interfaz de Usuario (Overlay) */}
            <GameUI />
        </div>
    )
}
