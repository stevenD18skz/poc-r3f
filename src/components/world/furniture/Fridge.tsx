import React, { useRef } from 'react'
import { useGLTF } from '@react-three/drei'

export default function Friedge(props) {
  const { nodes, materials } = useGLTF('/models/funitary/Fridge.glb')
  return (
    <group {...props} dispose={null}>
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.fridge.geometry}
        material={materials['Material.001']}
        rotation={[Math.PI / 2, 0, 0]}
      />
    </group>
  )
}

useGLTF.preload('/models/ funitary/Fridge.glb')
