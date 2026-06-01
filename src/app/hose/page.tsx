'use client'

import { useEffect, useRef, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei'
import { useControls } from 'leva'
import * as THREE from 'three'
import { CCDIKSolver, CCDIKHelper } from 'three/examples/jsm/animation/CCDIKSolver.js'
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js'

// ─── Nodos importantes del modelo (igual que OOI en el original) ──────────────
const OOI: Record<string, any> = {}

// ─── Componente principal con IK + espejo + TransformControls ─────────────────
function KiraIK() {
  const { scene: gltfScene } = useGLTF('/models/sims/kira.glb')
  const { scene, camera, gl } = useThree()

  const ikSolverRef       = useRef<CCDIKSolver | null>(null)
  const mirrorCamRef      = useRef<THREE.CubeCamera | null>(null)
  const transformCtrlRef  = useRef<TransformControls | null>(null)
  const orbitCtrlRef      = useRef<any>(null)          // ref pasado desde OrbitControls
  const v0                = useRef(new THREE.Vector3())

  // Leva GUI — igual que el original
  const conf = useControls('Controls', {
    'follow sphere':   false,
    'turn head':       true,
    'IK auto update':  true,
  })

  // ── Setup (una sola vez cuando carga el GLB) ──────────────────────────────
  useEffect(() => {
    // 1. Recorrer el GLTF y guardar los nodos por nombre
    gltfScene.traverse((n: THREE.Object3D) => {
      if (n.name === 'head')           OOI.head          = n
      if (n.name === 'lowerarm_l')     OOI.lowerarm_l    = n
      if (n.name === 'Upperarm_l')     OOI.Upperarm_l    = n
      if (n.name === 'hand_l')         OOI.hand_l        = n
      if (n.name === 'target_hand_l')  OOI.target_hand_l = n
      if (n.name === 'boule')          OOI.sphere        = n
      if (n.name === 'Kira_Shirt_left') OOI.kira         = n
    })
    scene.add(gltfScene)

    // 2. Esfera espejo con CubeCamera (reflejo real, igual al original)
    if (OOI.hand_l && OOI.sphere) {
      OOI.hand_l.attach(OOI.sphere)             // esfera sigue la mano
    }

    const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(1024)
    const mirrorCam = new THREE.CubeCamera(0.05, 50, cubeRenderTarget)
    scene.add(mirrorCam)
    mirrorCamRef.current = mirrorCam

    if (OOI.sphere) {
      OOI.sphere.material = new THREE.MeshBasicMaterial({
        envMap: cubeRenderTarget.texture,
      })
    }

    // 3. CCDIKSolver — índices de huesos idénticos al original
    if (OOI.kira) {
      OOI.kira.add(OOI.kira.skeleton.bones[0])

      const iks = [
        {
          target: 22,  // target_hand_l
          effector: 6, // hand_l
          links: [
            {
              index: 5, // lowerarm_l
              rotationMin: new THREE.Vector3( 1.2, -1.8, -0.4),
              rotationMax: new THREE.Vector3( 1.7, -1.1,  0.3),
            },
            {
              index: 4, // Upperarm_l
              rotationMin: new THREE.Vector3(0.1, -0.7, -1.8),
              rotationMax: new THREE.Vector3(1.1,  0.0, -1.4),
            },
          ],
        },
      ]

      ikSolverRef.current = new CCDIKSolver(OOI.kira, iks)

      const helper = new CCDIKHelper(OOI.kira, iks, 0.01)
      scene.add(helper)
    }

    // 4. TransformControls en target_hand_l (para mover la mano)
    if (OOI.target_hand_l) {
      const tc = new TransformControls(camera, gl.domElement)
      tc.size    = 0.75
      tc.showX   = false
      tc.space   = 'world'
      tc.attach(OOI.target_hand_l)
      scene.add(tc.getHelper())
      transformCtrlRef.current = tc

      // Deshabilitar OrbitControls mientras se usa TransformControls
      tc.addEventListener('mouseDown', () => {
        if (orbitCtrlRef.current) orbitCtrlRef.current.enabled = false
      })
      tc.addEventListener('mouseUp', () => {
        if (orbitCtrlRef.current) orbitCtrlRef.current.enabled = true
      })
    }

    return () => {
      scene.remove(gltfScene)
      if (mirrorCamRef.current)     scene.remove(mirrorCamRef.current)
      if (transformCtrlRef.current) {
        scene.remove(transformCtrlRef.current.getHelper())
        transformCtrlRef.current.dispose()
      }
    }
  }, [gltfScene, scene, camera, gl])

  // ── Loop de animación (igual que animate() en el original) ────────────────
  useFrame(() => {
    // Espejo: CubeCamera sigue a la esfera
    if (OOI.sphere && mirrorCamRef.current) {
      OOI.sphere.visible = false
      OOI.sphere.getWorldPosition(mirrorCamRef.current.position)
      mirrorCamRef.current.update(gl, scene)
      OOI.sphere.visible = true
    }

    // OrbitControls sigue la esfera (si está activado)
    if (OOI.sphere && conf['follow sphere'] && orbitCtrlRef.current) {
      OOI.sphere.getWorldPosition(v0.current)
      orbitCtrlRef.current.target.lerp(v0.current, 0.1)
    }

    // Cabeza mira la esfera
    if (OOI.head && OOI.sphere && conf['turn head']) {
      OOI.sphere.getWorldPosition(v0.current)
      OOI.head.lookAt(v0.current)
      OOI.head.rotation.set(
        OOI.head.rotation.x,
        OOI.head.rotation.y + Math.PI,
        OOI.head.rotation.z
      )
    }

    // IK update
    if (conf['IK auto update'] && ikSolverRef.current) {
      ikSolverRef.current.update()
      scene.traverse((obj) => {
        if ((obj as THREE.SkinnedMesh).isSkinnedMesh) {
          ;(obj as THREE.SkinnedMesh).computeBoundingSphere()
        }
      })
    }
  })

  // Exponemos la ref de OrbitControls para que KiraIK pueda deshabilitarlo
  return (
    <OrbitControls
      ref={orbitCtrlRef}
      minDistance={0.2}
      maxDistance={1.5}
      enableDamping
      target={[0, 0.9, 0]}
    />
  )
}

// ─── Mobiliario de la habitación (tus modelos existentes) ─────────────────────
function Room() {
  const plant = useGLTF('/models/sims/Office Pack-glb/Potted Plant.glb')
  const rug   = useGLTF('/models/sims/Office Pack-glb/Rug Round.glb')
  const shelf = useGLTF('/models/sims/Ultimate Interior Props Pack-glb/Large Book Shelf.glb')
  const lamp  = useGLTF('/models/sims/Ultimate Interior Props Pack-glb/Floor Lamp.glb')

  useEffect(() => {
    ;[plant, rug, shelf, lamp].forEach((m) =>
      m.scene.traverse((c) => {
        if (c instanceof THREE.Mesh) {
          c.castShadow = true
          c.receiveShadow = true
        }
      })
    )
  }, [plant, rug, shelf, lamp])

  return (
    <group>
      {/* Suelo */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#c89b6e" roughness={0.8} />
      </mesh>

      {/* Pared trasera azul-menta */}
      <mesh position={[0, 3, -5]}>
        <boxGeometry args={[20, 6, 0.15]} />
        <meshStandardMaterial color="#b0c8c4" />
      </mesh>

      {/* Pared izquierda */}
      <mesh position={[-7, 3, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[10, 6, 0.15]} />
        <meshStandardMaterial color="#b5ccc8" />
      </mesh>

      {/* Ventana */}
      <group position={[0, 3.2, -4.92]}>
        <mesh>
          <planeGeometry args={[3, 2.5]} />
          <meshStandardMaterial color="#d4ebf5" emissive="#b8dcf0" emissiveIntensity={1.2} transparent opacity={0.4} />
        </mesh>
        {/* marcos */}
        <mesh position={[0, 0, 0.01]}><boxGeometry args={[3, 0.06, 0.04]} /><meshStandardMaterial color="#ccc" /></mesh>
        <mesh position={[0, 0, 0.01]}><boxGeometry args={[0.06, 2.5, 0.04]} /><meshStandardMaterial color="#ccc" /></mesh>
      </group>



      {/* Alfombra */}
      <primitive object={rug.scene}    position={[0, 0.01, 1]} scale={2.5} />

      {/* Planta */}
      <primitive object={plant.scene}  position={[-5.5, 0, 3]}  scale={2} />

      {/* Estantería */}
      <primitive object={shelf.scene}  position={[4, 0, -4.8]}  scale={1} />

      {/* Lámpara de pie */}
      <primitive object={lamp.scene}   position={[3.5, 0, 1.5]} scale={1.5} />
    </group>
  )
}

// ─── Escena ───────────────────────────────────────────────────────────────────
export default function IKPage() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas
        shadows
        camera={{ position: [0.97, 1.1, 0.73], fov: 55 }}
        onCreated={({ scene }) => {
          scene.background = new THREE.Color(0xffffff)
          scene.fog = new THREE.FogExp2(0xffffff, 0.17)
        }}
      >
        <ambientLight intensity={8} />

        <Suspense fallback={null}>
          <Room />
          <KiraIK />
        </Suspense>
      </Canvas>
    </div>
  )
}

useGLTF.preload('/models/gltf/kira.glb')
useGLTF.preload('/models/sims/Office Pack-glb/Potted Plant.glb')
useGLTF.preload('/models/sims/Office Pack-glb/Rug Round.glb')
useGLTF.preload('/models/sims/Ultimate Interior Props Pack-glb/Large Book Shelf.glb')
useGLTF.preload('/models/sims/Ultimate Interior Props Pack-glb/Floor Lamp.glb')