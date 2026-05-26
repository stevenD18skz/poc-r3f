import React, { JSX, useRef, useEffect, useMemo } from 'react'
import { useGLTF, useAnimations, CubeCamera, TransformControls } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useControls, button } from 'leva'
import * as THREE from 'three'
import { CCDIKSolver } from 'three-stdlib'

export default function Character(props: JSX.IntrinsicElements['group']) {
  const group = useRef<THREE.Group>(null)
  const sphereRef = useRef<THREE.Mesh>(null)
  const solverRef = useRef<CCDIKSolver | null>(null)
  
  const { nodes, materials, animations } = useGLTF('/models/sims/Character Animated.glb') as any
  const { actions, names } = useAnimations(animations, group)
  
  const v0 = useMemo(() => new THREE.Vector3(), [])

  // 1. Usamos useControls para generar el panel de Leva
  const { animation, speed } = useControls('Control del Personaje', {
    animation: {
      value: 'Idle',
      options: ['Idle', 'Walk', 'Run']
    },
    animation2: {
      options: names?.length > 0 ? names : ['None'],
    },
    speed: {
      value: 2,
      min: 0.5,
      max: 10,
      step: 0.1
    }
  })

  // Controles específicos de IK basados en el ejemplo de three.js
  const ikControls = useControls('IK Settings', {
    followSphere: false,
    turnHead: true,
    ik_solver: true,
    update: button(() => {
      if (solverRef.current) solverRef.current.update()
    })
  })

  // 2. Setup IK
  useEffect(() => {
    const skeleton = nodes.Rogue_1.skeleton;
    
    // Buscar un hueso objetivo, o usar PoleTarget.L / Fist2.L_end si están disponibles
    const targetBone = nodes['PoleTarget.L'] || nodes['Fist2.L_end'];
    if (targetBone && nodes.RootNode) {
      // Separarlo de su padre actual para moverlo libremente con TransformControls
      nodes.RootNode.attach(targetBone);
    }

    const targetIndex = skeleton.bones.findIndex((b: any) => b.name === targetBone?.name);
    const effectorIndex = skeleton.bones.findIndex((b: any) => b.name === 'Fist.L');
    const lowerArmIndex = skeleton.bones.findIndex((b: any) => b.name === 'LowerArm.L');
    const upperArmIndex = skeleton.bones.findIndex((b: any) => b.name === 'UpperArm.L');
    
    if (targetIndex !== -1 && effectorIndex !== -1 && lowerArmIndex !== -1 && upperArmIndex !== -1) {
      const iks = [{
        target: targetIndex,
        effector: effectorIndex,
        links: [
          {
            index: lowerArmIndex,
            rotationMin: new THREE.Vector3(1.2, -1.8, -0.4),
            rotationMax: new THREE.Vector3(1.7, -1.1, 0.3)
          },
          {
            index: upperArmIndex,
            rotationMin: new THREE.Vector3(0.1, -0.7, -1.8),
            rotationMax: new THREE.Vector3(1.1, 0, -1.4)
          }
        ]
      }];
      
      solverRef.current = new CCDIKSolver(nodes.Rogue_1, iks);
    }
  }, [nodes])

  // 3. Efecto para manejar la reproducción de animaciones
  useEffect(() => {
    const action = actions[animation]
    if (action) {
      action.reset().fadeIn(0.2).play()
      return () => {
        action.fadeOut(0.2)
      }
    }
  }, [animation, actions])

  // 4. Mover el personaje físicamente y lógica IK en el Frame
  useFrame((state, delta) => {
    if (animation === 'Walk' && group.current) {
      group.current.position.z += speed * delta 
    } else if (animation === 'Run' && group.current) {
      group.current.position.z += (speed * 2) * delta 
    }

    // Lógica IK (Inverse Kinematics) y Sphere
    if (sphereRef.current) {
      sphereRef.current.getWorldPosition(v0);

      // Follow Sphere (OrbitControls sigue a la esfera)
      if (ikControls.followSphere && state.controls) {
        (state.controls as any).target.lerp(v0, 0.1);
      }

      // Turn Head (La cabeza mira hacia la esfera)
      if (ikControls.turnHead && nodes.Head) {
        nodes.Head.lookAt(v0);
        // Ajuste según el modelo original de Three.js
        nodes.Head.rotation.y += Math.PI;
      }
    }

    // Actualizar el Solver IK manualmente si la auto actualización está activada
    if (ikControls.ik_solver && solverRef.current) {
      solverRef.current.update();
    }
  })

  const targetBone = nodes['PoleTarget.L'] || nodes['Fist2.L_end'];

  return (
    <group ref={group} {...props} dispose={null}>
      
      {/* TransformControls para controlar el objetivo (Target) del brazo izquierdo */}
      {targetBone && (
        <TransformControls object={targetBone} mode="translate" size={0.75} showX={false} space="world" />
      )}

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

      {/* Adjuntar esfera reflectante a la mano izquierda (Fist.L) */}
      {nodes['Fist.L'] && (
        <primitive object={nodes['Fist.L']}>
          {/* Mirror Sphere (CubeCamera renderiza los reflejos alrededor en la textura) */}
          <CubeCamera resolution={256} frames={Infinity}>
            {(texture) => (
              <mesh ref={sphereRef} name="boule">
                <sphereGeometry args={[0.05, 32, 32]} />
                <meshBasicMaterial envMap={texture} />
              </mesh>
            )}
          </CubeCamera>
        </primitive>
      )}

    </group>
  )
}

useGLTF.preload('/models/sims/Character Animated.glb')