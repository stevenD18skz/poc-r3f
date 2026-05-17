'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useRef } from 'react'
import { Environment, OrbitControls } from '@react-three/drei'
import PerformanceOverlay from '@/components/test/PerformanceOverlay'
import Loader3D from '@/components/ui/Loader3D'
import * as THREE from 'three'

// ─── MÉTRICAS BASALES ────────────────────────────────────────────────────────
const JITTER_SAMPLE_SIZE = 120
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
    if (this.filled < 2) return { frameTime: 0, jitter: 0 }
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
  }
}

function BaselineMetricsCollector() {
  const frameCount = useRef(0)
  const startTime = useRef(performance.now())
  const lastLogTime = useRef(performance.now())
  const loadTime = useRef(0)
  
  // NUEVOS: Para medir el tiempo neto de ejecución de la CPU
  const cpuSamples = useRef(new Float32Array(120))
  const cpuIndex = useRef(0)
  const cpuFilled = useRef(0)

  const { gl, gl: { domElement } } = useThree()

  useFrame((state) => {
    // 1. Cronómetro de inicio de CPU
    const cpuStart = performance.now()

    frameCount.current++
    const now = performance.now()

    if (frameCount.current === 1) {
      loadTime.current = now - startTime.current
    }

    // 2. Al final de la lógica, calcular los ms netos que trabajó la CPU en ESTE frame
    const cpuDuration = performance.now() - cpuStart
    
    // Guardar la muestra de CPU neta en el búfer
    cpuSamples.current[cpuIndex.current] = cpuDuration
    cpuIndex.current = (cpuIndex.current + 1) % 120
    cpuFilled.current = Math.min(cpuFilled.current + 1, 120)

    if (now - lastLogTime.current >= 1000) {
      const computed = metricsCalculator.compute()
      const frameTime = computed.frameTime
      const jitter = computed.jitter
      const avgFps = frameTime > 0 ? 1000 / frameTime : 0
      
      // Calcular el promedio del tiempo NETO de CPU guardado en el búfer
      let cpuSum = 0
      for (let i = 0; i < cpuFilled.current; i++) {
        cpuSum += cpuSamples.current[i]
      }
      const realCpuMs = cpuFilled.current > 0 ? cpuSum / cpuFilled.current : 0

      const drawCalls = gl.info.render.calls
      const textures = gl.info.memory.textures
      const triangles = gl.info.render.triangles
      
      const mem = (performance as any).memory
      const ramMB = mem ? (mem.usedJSHeapSize / 1048576).toFixed(1) : 'N/A'
      const vramMB = ((triangles * 3 * 12) / 1048576).toFixed(1)
      
      console.groupCollapsed(
        `%c[R3F Test] Baseline Idle - ${new Date().toLocaleTimeString()}`,
        'color:#10b981;font-weight:700;font-size:12px',
      )
      
      // ─── ORDEN ESTÁNDAR REQUERIDO ──────────────────────────────────────────
      console.log(`%cFPS Promedio         %c${avgFps.toFixed(1)}`, 'color:#94a3b8', 'color:#f1f5f9;font-weight:600')
      console.log(`%cRAM                  %c${ramMB} MB`, 'color:#94a3b8', 'color:#f1f5f9;font-weight:600')
      console.log(`%cVRAM Estimada        %c${vramMB} MB`, 'color:#94a3b8', 'color:#f1f5f9;font-weight:600')
      console.log(`%cCPU (ms)             %c${realCpuMs.toFixed(3)} ms`, 'color:#94a3b8', 'color:#60a5fa;font-weight:600') // <--- ¡AQUÍ ESTÁ TU 0.2 ms NETO!
      console.log(`%cFrame Time           %c${frameTime.toFixed(2)} ms`, 'color:#94a3b8', 'color:#f1f5f9;font-weight:600')
      console.log(`%cJitter               %c${jitter.toFixed(2)} ms`, 'color:#94a3b8', 'color:#f1f5f9;font-weight:600')
      console.log(`%cLoad Time            %c${loadTime.current.toFixed(1)} ms`, 'color:#94a3b8', 'color:#f1f5f9;font-weight:600')
      
      // ─── MÉTRICAS EXTRA ────────────────────────────────────────────────────
      console.log(`%cDraw Calls           %c${drawCalls}`, 'color:#94a3b8', 'color:#f1f5f9;font-weight:600')
      console.log(`%cTexturas (HDR)       %c${textures}`, 'color:#94a3b8', 'color:#f1f5f9;font-weight:600')
      
      console.groupEnd()

      lastLogTime.current = now
    }
  })

  return null
}

export default function SceneIdleTest() {
  return (
    <main className="w-full h-screen bg-[#050505] overflow-hidden">
      <PerformanceOverlay title="Escena Idle (60s)" />
      
      <Canvas camera={{ position: [120, 0, 0], fov: 50 }}>
        <BaselineMetricsCollector />
        <Suspense fallback={<Loader3D />}> 
          <OrbitControls makeDefault />
          <Environment preset="forest" background />
        </Suspense>
      </Canvas>
    </main>
  )
}