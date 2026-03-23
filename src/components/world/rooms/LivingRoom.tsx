'use client'

import { Fragment } from 'react'

import type { ThreeElements } from '@react-three/fiber'
import { Center } from '@react-three/drei'

import Box from '@/components/Box'
import Table from '@/components/world/furniture/Table'
import Window from '@/components/world/furniture/Window'
import Floor from '@/components/world/elemtns/Floor'
import Walls from '@/components/world/elemtns/Walls'
import Door from '@/components/world/elemtns/door'

type GroupProps = ThreeElements['group']

interface LivingRoom extends GroupProps {
  sizeRoom: number
  walls: { position: string, type: string }[]
}


export default function LivingRoom({ sizeRoom, walls, ...groupProps }: LivingRoom) {

  return (
    <group {...groupProps}>
      {/* Suelo y paredes */}
      <group>
        <Floor size={sizeRoom} />

        {/* Pared Frontal */}
        {walls.map((wall, index) => (
          wall.type === "wall" ? (
            <Walls key={index} size={sizeRoom} position={wall.position as "back" | "right" | "front" | "left"} />
          ) : wall.type === "door" ? (
            <Door key={index} size={sizeRoom} position={wall.position as "back" | "right" | "front" | "left"} />
          ) : (
            <Fragment key={index} />
          )
        ))}
      </group>

      {/* contenido 3D */}
      <Box position={[3, 1, 0]} />



      <Center top position={[5, 0, 5]}>
        <Table />
      </Center>

      <Center top position={[0, 5, -15.1]} rotation={[0, Math.PI, 0]}>
        <Window />
      </Center>
      <Center top position={[-14, 5, 0]}>
        <Window rotation={[0, Math.PI / 2, 0]} />
      </Center>
    </group>
  )
}