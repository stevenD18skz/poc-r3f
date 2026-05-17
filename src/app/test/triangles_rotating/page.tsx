'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useRef, useEffect, useState, Suspense, useMemo } from 'react'
import * as THREE from 'three'
import PerformanceOverlay from '@/components/test/PerformanceOverlay'
import { OrbitControls } from '@react-three/drei'
import Loader3D from '@/components/ui/Loader3D'

// ─────────────────────────────────────────────
// PARÁMETROS DEL TEST DINÁMICO (R3F)
// ─────────────────────────────────────────────

// ─── MÉTRICAS (Agnósticas a los Hz del monitor) ──────────────────────────────
const JITTER_SAMPLE_SIZE = 120 // Aumentado para pantallas de >60Hz
const metricsCalculator = {
  samples: new Float32Array(JITTER_SAMPLE_SIZE),
  index: 0,
  filled: 0,
  push(delta: number) {
    const ms = delta * 1000
    this.samples[this.index] = ms
    this.index = (this.index + 1) % JITTER_SAMPLE_SIZE
    this.filled = Math.min(this.filled + 1, JITTER_SAMPLE_SIZE)
  },
  compute() {
    if (this.filled < 2) return { jitter: 0, frameTime: 0 }
    let sum = 0
    for (let i = 0; i < this.filled; i++) sum += this.samples[i]
    const mean = sum / this.filled
    let variance = 0
    for (let i = 0; i < this.filled; i++) {
      const diff = this.samples[i] - mean
      variance += diff * diff
    }
    return {
      jitter: Math.round(Math.sqrt(variance / this.filled) * 100) / 100,
      frameTime: Math.round(mean * 100) / 100,
    }
  },
}

function MetricsCollector({ onUpdate, count }: { onUpdate: (m: any) => void; count: number }) {
  const frameCount = useRef(0)
  const startTime = useRef(performance.now())
  const lastLogTime = useRef(performance.now())
  const loadTime = useRef(0)
  const maxFrameTime = useRef(0)
  const lastCount = useRef(count)
  const { gl } = useThree()

  // Resetear métricas si cambia la cantidad de instancias
  if (lastCount.current !== count) {
    startTime.current = performance.now()
    lastLogTime.current = performance.now()
    lastCount.current = count
    frameCount.current = 0
    loadTime.current = 0
    maxFrameTime.current = 0
    metricsCalculator.filled = 0
    metricsCalculator.index = 0
  }

  useFrame((_, delta) => {
    const deltaMs = delta * 1000
    metricsCalculator.push(delta)
    frameCount.current++
    
    // RASTREO: Guardar siempre el fotograma que más haya tardado (Pico de latencia)
    if (deltaMs > maxFrameTime.current) {
      maxFrameTime.current = deltaMs
    }

    const now = performance.now()

    // 1. Calcular el tiempo de carga del primer frame
    if (frameCount.current === 1) {
      loadTime.current = now - startTime.current
    }
    
    // 2. Actualizar la UI del HUD (cada 10 frames para no ahogar React)
    if (frameCount.current % 10 === 0) {
      onUpdate({ ...metricsCalculator.compute(), loadTime: loadTime.current })
    }

    // 3. Imprimir Log estrictamente cada 10 SEGUNDOS
    if (now - lastLogTime.current >= 10000) {
      const computed = metricsCalculator.compute()
      const frameTime = computed.frameTime
      const jitter = computed.jitter
      const avgFps = frameTime > 0 ? 1000 / frameTime : 0
      
      const drawCalls = gl.info.render.calls
      const mem = (performance as any).memory
      const ramMB = mem ? (mem.usedJSHeapSize / 1048576).toFixed(1) : 'N/A'
      
      console.groupCollapsed(
        `%c[R3F Test] ${count.toLocaleString()} Instancias - ${new Date().toLocaleTimeString()}`,
        'color:#3b82f6;font-weight:700;font-size:12px',
      )
      
      // Formato minimalista: Métrica + Número
      console.log(`%cFPS Promedio         %c${avgFps.toFixed(1)}`, 'color:#94a3b8', 'color:#f1f5f9;font-weight:600')
      console.log(`%cCPU (ms)             %c${frameTime.toFixed(2)} ms`, 'color:#94a3b8', 'color:#f1f5f9;font-weight:600')
      console.log(`%cRAM                  %c${ramMB} MB`, 'color:#94a3b8', 'color:#f1f5f9;font-weight:600')
      console.log(`%cPico Latencia        %c${maxFrameTime.current.toFixed(2)} ms`, 'color:#94a3b8', 'color:#f87171;font-weight:600')
      console.log(`%cFrame Time           %c${frameTime.toFixed(2)} ms`, 'color:#94a3b8', 'color:#f1f5f9;font-weight:600')
      console.log(`%cJitter               %c${jitter.toFixed(2)} ms`, 'color:#94a3b8', 'color:#f1f5f9;font-weight:600')
      console.log(`%cLoad Time            %c${loadTime.current.toFixed(1)} ms`, 'color:#94a3b8', 'color:#f1f5f9;font-weight:600')
      console.log(`%cDraw Calls           %c${drawCalls}`, 'color:#94a3b8', 'color:#f1f5f9;font-weight:600')

      console.groupEnd()

      // Resetear el temporizador para los próximos 10 segundos
      lastLogTime.current = now
    }
  })

  return null
}

// ─── GEOMETRÍA DINÁMICA ────────────────────────────────────────────────────────
function InstancedRotatingTriangles({ count = 32000 }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const tempObject = useRef(new THREE.Object3D()).current

  // Datos calculados una sola vez (useMemo evita regenerarlos en cada re-render de React)
  const particles = useMemo(() => {
    return Array.from({ length: count }, () => {
      const radius = 10 + Math.random() * 40
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      return {
        x: radius * Math.sin(phi) * Math.cos(theta),
        y: radius * Math.sin(phi) * Math.sin(theta),
        z: radius * Math.cos(phi),
        rotationSpeed: (Math.random() - 0.5) * 2,
        color: new THREE.Color(`hsl(${Math.random() * 70 + 150}, 80%, 50%)`),
      }
    })
  }, [count])

  // Setup inicial de matrices y colores
  useEffect(() => {
    if (!meshRef.current) return
    particles.forEach((p, i) => {
      tempObject.position.set(p.x, p.y, p.z)
      tempObject.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)
      tempObject.updateMatrix()
      meshRef.current.setMatrixAt(i, tempObject.matrix)
      meshRef.current.setColorAt(i, p.color)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true
  }, [particles, tempObject])

  // Rotación en CPU (Cuello de botella a evaluar)
  useFrame((state) => {
    if (!meshRef.current) return
    const t = state.clock.getElapsedTime()
    particles.forEach((p, i) => {
      tempObject.position.set(p.x, p.y, p.z)
      tempObject.rotation.set(
        t * p.rotationSpeed,
        t * (p.rotationSpeed / 2),
        t * (p.rotationSpeed * 0.8)
      )
      tempObject.updateMatrix()
      meshRef.current.setMatrixAt(i, tempObject.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <coneGeometry args={[0.2, 0.4, 8]} />
      <meshStandardMaterial />
    </instancedMesh>
  )
}

// ─── ESCENA PRINCIPAL ────────────────────────────────────────────────────────
export default function TrianglesRotatingTest() {
  const [count, setCount] = useState(512000)
  const [metrics, setMetrics] = useState({ jitter: 0, frameTime: 0, loadTime: 0 })

  return (
    <main className="relative w-full h-screen bg-[#050505] overflow-hidden">
      <PerformanceOverlay
        title={`${count} Triángulos Rotando`}
        input={true}
        count={count}
        setCount={setCount}
        inputConfig={{
          unit: 'thousands',
          type: 'values',
          values: [1000, 4000, 16000, 64000, 256000, 1024000],
        }}
      />

      <Canvas camera={{ position: [0, 120, 0], fov: 50 }}>
        <MetricsCollector onUpdate={setMetrics} count={count} />

        <Suspense fallback={<Loader3D />}>
          <ambientLight intensity={1} />
          <InstancedRotatingTriangles count={count} />
        </Suspense>
      </Canvas>
    </main>
  )
}