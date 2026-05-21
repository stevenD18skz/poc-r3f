import React, { JSX, useRef, useEffect } from 'react'
import { useGLTF, useAnimations } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useControls } from 'leva' // <-- 1. Importamos Leva
import * as THREE from 'three'

export default function Character(props: JSX.IntrinsicElements['group']) {
  const group = useRef<THREE.Group>(null)
  const { nodes, materials, animations } = useGLTF('/models/sims/Character Animated.glb') as any
  const { actions, names } = useAnimations(animations, group)
  
  // 2. Usamos useControls para generar el panel de Leva
  const { animation, speed } = useControls('Control del Personaje', {
    animation: {
      value: 'Idle',
      options: ['Idle', 'Walk', 'Run'] // <-- Asegúrate de que estos nombres coincidan con tu .glb
    },
    animation2: {
      options: names.length > 0 ? names : ['None'],
    },
    speed: {
      value: 2,
      min: 0.5,
      max: 10,
      step: 0.1
    }
  })

  // 3. Efecto para manejar la reproducción de animaciones basado en el control de Leva
  useEffect(() => {
    const action = actions[animation]
    
    if (action) {
      action.reset().fadeIn(0.2).play()
      
      return () => {
        action.fadeOut(0.2)
      }
    } else {
      console.warn(`La animación "${animation}" no existe en el modelo.`)
      // Si quieres ver las animaciones reales, descomenta esto:
      // console.log("Animaciones disponibles:", Object.keys(actions))
    }
  }, [animation, actions])

  // 4. Mover el personaje físicamente basado en el control de Leva
  useFrame((state, delta) => {
    if (animation === 'Walk' && group.current) {
      group.current.position.z += speed * delta 
    } else if (animation === 'Run' && group.current) {
      group.current.position.z += (speed * 2) * delta // Si corre, va el doble de rápido
    }
  })
  
  return (
    <group ref={group} {...props} dispose={null}>
      <group name="Root_Scene">
        <group name="RootNode">
          <group name="CharacterArmature" rotation={[-Math.PI / 2, 0, 0]} scale={100}>
            <primitive object={nodes.Root} />
          </group>
          <group name="Rogue" position={[0, 0, 0.166]} rotation={[-Math.PI / 2, 0, 0]} scale={100}>
            <skinnedMesh
              name="Rogue_1"
              geometry={nodes.Rogue_1.geometry}
              material={materials.Skin}
              skeleton={nodes.Rogue_1.skeleton}
            />
            <skinnedMesh
              name="Rogue_2"
              geometry={nodes.Rogue_2.geometry}
              material={materials.UnderShirt}
              skeleton={nodes.Rogue_2.skeleton}
            />
            <skinnedMesh
              name="Rogue_3"
              geometry={nodes.Rogue_3.geometry}
              material={materials.Pants}
              skeleton={nodes.Rogue_3.skeleton}
            />
            <skinnedMesh
              name="Rogue_4"
              geometry={nodes.Rogue_4.geometry}
              material={materials.Shirt}
              skeleton={nodes.Rogue_4.skeleton}
            />
            <skinnedMesh
              name="Rogue_5"
              geometry={nodes.Rogue_5.geometry}
              material={materials.Detail}
              skeleton={nodes.Rogue_5.skeleton}
            />
            <skinnedMesh
              name="Rogue_6"
              geometry={nodes.Rogue_6.geometry}
              material={materials.Boots}
              skeleton={nodes.Rogue_6.skeleton}
            />
          </group>
          <skinnedMesh
            name="Rogue001"
            geometry={nodes.Rogue001.geometry}
            material={materials['Material.006']}
            skeleton={nodes.Rogue001.skeleton}
            position={[0, 0, 0.166]}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={100}
          />
        </group>
      </group>
    </group>
  )
}

useGLTF.preload('/models/sims/Character Animated.glb')