'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useRef, useEffect, useState, Suspense, useMemo } from 'react'
import * as THREE from 'three'
import PerformanceOverlay from '@/components/test/PerformanceOverlay'
import { OrbitControls } from '@react-three/drei'
import Loader3D from '@/components/ui/Loader3D'
import { Perf, getPerf } from 'r3f-perf'

// ─────────────────────────────────────────────
// PARÁMETROS DEL TEST DINÁMICO (R3F)
// ─────────────────────────────────────────────

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
  const [count, setCount] = useState(1000)
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
          values: [1000, 4000, 16000, 64000, 256000, 512000],
        }}
      />

      <Canvas camera={{ position: [0, 120, 0], fov: 50 }}>
        <MetricsCollector onUpdate={setMetrics} count={count} />
        <Perf style={{ display: 'none' }} />

        <Suspense fallback={<Loader3D />}>
          <ambientLight intensity={1} />
          <InstancedRotatingTriangles count={count} />
        </Suspense>
      </Canvas>
    </main>
  )
}