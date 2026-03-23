
import React, { useRef } from 'react'
import { useGLTF } from '@react-three/drei'

export default function Chair(props) {
  const { nodes, materials } = useGLTF('/models/funitary/Chair.glb')
  return (
    <group {...props} dispose={null}>
      <group position={[-2.166, 0, 0.03]} rotation={[Math.PI / 2, 0, -Math.PI / 2]} scale={0.033}>
        <mesh
          castShadow
          receiveShadow
          geometry={nodes['3SM_wood'].geometry}
          material={materials.wire_108008136}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes['3SM_wood_1'].geometry}
          material={materials.wire_134005005}
        />
      </group>
    </group>
  )
}

useGLTF.preload('/models/funitary/Chair.glb')