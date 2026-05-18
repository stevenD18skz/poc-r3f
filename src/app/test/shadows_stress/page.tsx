'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { useState, useMemo, useRef, useEffect, Suspense } from 'react'
import * as THREE from 'three'
import PerformanceOverlay from '@/components/test/PerformanceOverlay'
import DebugTools from '@/components/DebugTools'
import Loader3D from '@/components/ui/Loader3D'
import { OrbitControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'

// Importamos la librería de rendimiento y su hook de telemetría directo
import { Perf, getPerf } from 'r3f-perf'

// ─── CONFIGURACIÓN DE MUESTREO SÓLIDO ─────────────────────────────────────────
const JITTER_SAMPLE_SIZE = 120

// Dos calculadores separados: uno para delta real, uno para cpu
const deltaCalculator = {
  samples: new Float32Array(JITTER_SAMPLE_SIZE),
  index: 0,
  filled: 0,
  push(deltaMs: number) {
    this.samples[this.index] = deltaMs
    this.index = (this.index + 1) % JITTER_SAMPLE_SIZE
    this.filled = Math.min(this.filled + 1, JITTER_SAMPLE_SIZE)
  },
  mean() {
    if (this.filled < 1) return 0
    let sum = 0
    for (let i = 0; i < this.filled; i++) sum += this.samples[i]
    return sum / this.filled
  },
  // Jitter = desviación estándar de los deltas reales entre frames
  jitter() {
    if (this.filled < 2) return 0
    const m = this.mean()
    let variance = 0
    for (let i = 0; i < this.filled; i++) {
      const diff = this.samples[i] - m
      variance += diff * diff
    }
    return Math.round(Math.sqrt(variance / this.filled) * 100) / 100
  },
  // P95 de los deltas para detectar spikes
  p95() {
    if (this.filled < 2) return 0
    const sorted = this.samples.slice(0, this.filled).sort()
    return sorted[Math.floor(this.filled * 0.95)]
  },
  reset() {
    this.index = 0
    this.filled = 0
  }
}

function MetricsCollector({ onUpdate, count }: { onUpdate: (m: any) => void; count: number }) {
  const frameCount = useRef(0)
  const startTime = useRef(performance.now())
  const lastLogTime = useRef(performance.now())
  const loadTime = useRef(0)
  // maxFrameTime ahora trackea el pico del período actual (últimos 10s)
  const periodMaxFrameTime = useRef(0)
  const lastCount = useRef(count)
  const { gl } = useThree()

  if (lastCount.current !== count) {
    startTime.current = performance.now()
    lastLogTime.current = performance.now()
    lastCount.current = count
    frameCount.current = 0
    loadTime.current = 0
    periodMaxFrameTime.current = 0
    deltaCalculator.reset()
  }

  useFrame((_, delta) => {
    frameCount.current++
    const now = performance.now()
    // Delta real entre frames (lo que importa para jitter y frame time)
    const deltaMs = delta * 1000

    // Alimentar el calculador con deltas reales, no con CPU time
    deltaCalculator.push(deltaMs)

    // Pico del período actual
    if (deltaMs > periodMaxFrameTime.current) {
      periodMaxFrameTime.current = deltaMs
    }

    if (frameCount.current === 1) {
      loadTime.current = now - startTime.current
    }

    const perfState = getPerf ? getPerf() : null
    const logData = perfState?.log

    // HUD: actualizar cada 10 frames
    if (frameCount.current % 10 === 0) {
      onUpdate({
        // Frame time = media de los deltas reales entre frames
        frameTime: Math.round(deltaCalculator.mean() * 100) / 100,
        // Jitter = std dev de esos mismos deltas
        jitter: deltaCalculator.jitter(),
        loadTime: loadTime.current,
        // CPU time de r3f-perf, reportado separado y con su nombre correcto
        cpuTime: logData?.cpu ?? 0,
      })
    }

    // Log cada 10 segundos
    if (now - lastLogTime.current >= 10000) {
      const perf = getPerf ? getPerf() : null
      const data = perf?.log || { fps: 0, cpu: 0, mem: 0 }

      const frameTimeMean = deltaCalculator.mean()
      const avgFps = frameTimeMean > 0 ? 1000 / frameTimeMean : 0
      const jitter = deltaCalculator.jitter()
      const p95 = deltaCalculator.p95()

      const drawCalls = gl.info.render.calls
      const triangles = gl.info.render.triangles

      // VRAM: estimación honesta con los buffers que Three.js sí reporta
      // Posiciones: triangles * 3 verts * 12 bytes (3 floats)
      // Normales: mismo tamaño que posiciones
      // UVs: triangles * 3 verts * 8 bytes (2 floats)
      // Instance matrices: count * 64 bytes (mat4 de floats)
      // Instance colors: count * 12 bytes (vec3 de floats)
      const posBytes = triangles * 3 * 12
      const normalBytes = posBytes
      const uvBytes = triangles * 3 * 8
      const matrixBytes = count * 64
      const colorBytes = count * 12
      const totalBytes = posBytes + normalBytes + uvBytes + matrixBytes + colorBytes
      const vramMB = (totalBytes / 1048576).toFixed(2)

      const ramMB = data.mem?.toFixed(1) ?? 'N/A'

      console.log(
        `%c[R3F Static] ${count.toLocaleString()} Instancias - ${new Date().toLocaleTimeString()}`,
        'color:#3b82f6;font-weight:700;font-size:12px',
      )
      console.log(`%cFPS Promedio         %c${avgFps.toFixed(1)}`, 'color:#94a3b8', 'color:#f1f5f9;font-weight:600')
      console.log(`%cRAM                  %c${ramMB} MB`, 'color:#94a3b8', 'color:#f1f5f9;font-weight:600')
      console.log(`%cVRAM Estimada        %c${vramMB} MB (geom+inst)`, 'color:#94a3b8', 'color:#f1f5f9;font-weight:600')
      // CPU time de r3f-perf reportado con su nombre exacto, separado de frame time
      console.log(`%cCPU r3f-perf (ms)    %c${data.cpu.toFixed(2)} ms`, 'color:#94a3b8', 'color:#60a5fa;font-weight:600')
      console.log(`%cFrame Time (media)   %c${frameTimeMean.toFixed(2)} ms`, 'color:#94a3b8', 'color:#f1f5f9;font-weight:600')
      console.log(`%cFrame Time (P95)     %c${p95.toFixed(2)} ms`, 'color:#94a3b8', 'color:#fbbf24;font-weight:600')
      console.log(`%cJitter               %c${jitter.toFixed(2)} ms`, 'color:#94a3b8', 'color:#f1f5f9;font-weight:600')
      console.log(`%cLoad Time            %c${loadTime.current.toFixed(1)} ms`, 'color:#94a3b8', 'color:#f1f5f9;font-weight:600')
      console.log(`%cDraw Calls           %c${drawCalls}`, 'color:#94a3b8', 'color:#f1f5f9;font-weight:600')
      // Pico del período actual (se resetea en cada log)
      console.log(`%cPico Latencia (10s)  %c${periodMaxFrameTime.current.toFixed(2)} ms`, 'color:#94a3b8', 'color:#f87171;font-weight:600')
      // console.groupEnd()

      // Reset del pico al iniciar nuevo período
      periodMaxFrameTime.current = 0
      lastLogTime.current = now
    }
  })

  return null
}




// ─────────────────────────────────────────────
// PARÁMETROS DEL TEST (deben ser idénticos en Babylon)
// ─────────────────────────────────────────────
// Escena: arena cerrada (suelo + 4 paredes + techo con hueco)
// Luces: 3 SpotLights orbitando DENTRO de la arena
// Geometría: N cajas estáticas instanciadas (1 draw call)
// Por qué es mejor: cada sombra proyecta sobre suelo + paredes
// simultáneamente → más fill de shadow maps por frame
// ─────────────────────────────────────────────

const ARENA = { w: 32, h: 32, d: 32 } // Dimensiones de la arena
const WALL_THICKNESS = 0.5

// SpotLight que orbita DENTRO de la arena apuntando hacia abajo-frente
function InternalSpotLight({
  index,
  total,
  isStatic = false,
}: {
  index: number
  total: number
  isStatic?: boolean
}) {
  const lightRef = useRef<THREE.PointLight>(null!)
  const target = useMemo(() => new THREE.Object3D(), [])

  // Cálculo de posición estática: divide el ancho de la arena en 'total' partes
  // y coloca la luz en el centro de su parte correspondiente.
  const staticX = useMemo(() => {
    return -ARENA.w / 2 + (ARENA.w / total) * (index + 0.5)
  }, [index, total])

  const color = `hsl(195, 30%, 95%)`

  useFrame((state) => {
    if (isStatic) {
      lightRef.current.position.x = staticX
      lightRef.current.position.z = 0
      lightRef.current.position.y = ARENA.h * 0.55
      return
    }

    const t = state.clock.getElapsedTime() * 1
    const baseAngle = (index / total) * Math.PI * 2
    const orbitRadius = ARENA.w * 0.28

    // Orbita horizontal a media altura de la arena
    lightRef.current.position.x = Math.cos(t + baseAngle) * orbitRadius
    lightRef.current.position.z = Math.sin(t + baseAngle) * orbitRadius
    lightRef.current.position.y = ARENA.h * 0.55

    // Target oscila entre el suelo y los lados para variar la dirección
    // Esto fuerza sombras dinámicas en múltiples paredes a la vez
    target.position.x = Math.sin(t * 0.7 + baseAngle) * (ARENA.w * 0.3)
    target.position.y = 0
    target.position.z = Math.cos(t * 0.7 + baseAngle) * (ARENA.d * 0.3)
    target.updateMatrixWorld()
  })

  return (
    <>
      <pointLight
        ref={lightRef}
        color={color}
        intensity={512}
        // angle={Math.PI / 2}   // Cono amplio para iluminar más superficies
        //penumbra={0.4}
        distance={ARENA.w * 4}
        castShadow
        shadow-mapSize={[512, 512]}
        shadow-bias={-0.0005}
      //target={target}
      >
        {/* Esfera visual que se mueve con la luz */}
        <mesh>
          <sphereGeometry args={[0.2, 8, 8]} />
          <meshBasicMaterial color={color} />
        </mesh>
      </pointLight>
      <primitive object={target} />
    </>
  )
}

// ─────────────────────────────────────────────
// ARENA CERRADA
// Suelo + 4 paredes + techo con hueco central (para ver desde arriba)
// Todas las superficies reciben sombras
// ─────────────────────────────────────────────
function Arena() {
  return (
    <group>
      {/* Suelo */}
      <mesh position={[0, 0, 0]} receiveShadow castShadow>
        <boxGeometry args={[ARENA.w, WALL_THICKNESS, ARENA.d]} />
        <meshStandardMaterial color="#444" roughness={1} metalness={0.1} />
      </mesh>

      {/* Pared norte */}
      <mesh position={[0, ARENA.h / 2, -ARENA.d / 2]} receiveShadow castShadow>
        <boxGeometry args={[ARENA.w, ARENA.h, WALL_THICKNESS]} />
        <meshStandardMaterial color="#444" roughness={1} metalness={0.1} />
      </mesh>

      {/* Pared sur */}
      <mesh position={[0, ARENA.h / 2, ARENA.d / 2]} receiveShadow castShadow>
        <boxGeometry args={[ARENA.w, ARENA.h, WALL_THICKNESS]} />
        <meshStandardMaterial color="#444" roughness={1} metalness={0.1} />
      </mesh>

      {/* Pared oeste */}
      <mesh position={[-ARENA.w / 2, ARENA.h / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[WALL_THICKNESS, ARENA.h, ARENA.d]} />
        <meshStandardMaterial color="#444" roughness={1} metalness={0.1} />
      </mesh>

      {/* Pared este */}
      <mesh position={[ARENA.w / 2, ARENA.h / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[WALL_THICKNESS, ARENA.h, ARENA.d]} />
        <meshStandardMaterial color="#444" roughness={1} metalness={0.1} />
      </mesh>

      {/* Techo completo 
      <mesh position={[0, ARENA.h, 0]} receiveShadow castShadow>
        <boxGeometry args={[ARENA.w, WALL_THICKNESS, ARENA.d]} />
        <meshStandardMaterial color="#444" roughness={1} metalness={0.1} />
      </mesh>*/}
    </group>
  )
}

// Cajas instanciadas estáticas DENTRO de la arena
function StaticBoxes({ count }: { count: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const tempObject = useRef(new THREE.Object3D()).current

  const positions = useMemo(() => {
    return Array.from({ length: count }, () => ({
      // Mantener dentro de la arena con margen
      x: (Math.random() - 0.5) * (ARENA.w - 4),
      y: Math.random() * (ARENA.h - 1) + 0.5,
      z: (Math.random() - 0.5) * (ARENA.d - 4),
      rx: Math.random() * Math.PI,
      ry: Math.random() * Math.PI,
      scale: 0.5 + Math.random() * 1.2,
    }))
  }, [count])

  useEffect(() => {
    if (!meshRef.current) return
    positions.forEach((p, i) => {
      tempObject.position.set(p.x, p.y, p.z)
      tempObject.rotation.set(p.rx, p.ry, 0)
      tempObject.scale.setScalar(p.scale)
      tempObject.updateMatrix()
      meshRef.current.setMatrixAt(i, tempObject.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [positions])

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, count]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[0.4, 0.4, 0.4]} />
      <meshStandardMaterial color="#94a3b8" roughness={0.5} metalness={0.15} />
    </instancedMesh>
  )
}

function ShadowScene({
  count,
  lightCount = 3,
  isStatic = false
}: {
  count: number,
  lightCount?: number,
  isStatic?: boolean
}) {
  return (
    <>
      {/* Ambient mínimo: la escena debe verse mayormente por las spotlights */}
      <ambientLight intensity={0.3} />

      {/* Generar luces dinámicamente */}
      {Array.from({ length: lightCount }).map((_, i) => (
        <InternalSpotLight
          key={i}
          index={i}
          total={lightCount}
          isStatic={isStatic}
        />
      ))}

      {/* Arena cerrada (suelo + paredes + techo parcial) */}
      <Arena />

      {/* Cajas estáticas que lanzan y reciben sombras */}
      <StaticBoxes count={count} />
    </>
  )
}

export default function ShadowsStressTest() {
  const [count, setCount] = useState(64)
  const [lightCount, setLightCount] = useState(1)
  const [isStatic, setIsStatic] = useState(false)
  const [metrics, setMetrics] = useState({ jitter: 0, frameTime: 0 })

  return (
    <main className="relative w-full h-screen bg-[#050505] overflow-hidden">

      <Canvas shadows camera={{ position: [0, 70, 0], fov: 50 }} dpr={[1, 2]}>
        <MetricsCollector onUpdate={setMetrics} count={count} />

        <Suspense fallback={<Loader3D />}>
        
          <ShadowScene count={count} lightCount={lightCount} isStatic={isStatic} />
          <Perf style={{ display: 'none' }} />

        </Suspense>
      </Canvas>

      <PerformanceOverlay
        title={`Sombras: ${count} Objetos en Arena`}
        input={true}
        count={count}
        setCount={setCount}
        inputConfig={{
          unit: 'normal',
          type: 'values',
          values: [64, 256, 1024, 4096, 16384],
        }}
      >

      </PerformanceOverlay>
    </main>
  )
}