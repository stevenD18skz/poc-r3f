// src/components/DebugTools.tsx
import { Stats, Grid, GizmoHelper, GizmoViewport } from '@react-three/drei'
import { useControls } from 'leva'
import * as THREE from 'three'
import { Suspense, lazy } from 'react'

// Carga dinámica de r3f-perf para evitar error de Turbopack con .woff
const PerfLazy = lazy(() => import('r3f-perf').then(mod => ({ default: mod.Perf })))

// Hook para crear el contexto de debug
export function useDebugControls() {
    return useControls('Debug', {
        showAxes: true,
        showGrid: true,
        showStats: true,
        statPanel: { 
            value: 0, 
            options: { 'FPS': 0, 'MS (Latencia)': 1, 'MB (Memoria RAM)': 2 },
            label: 'Métrica Stats.js'
        },
        showPerf: true,
        showGizmo: true,
        freeCam: true,
        triangles: {
            value: 1_000,
            min: 1_000,
            max: 32_000,
            step: 1_000,
            label: 'Triángulos'
        }
    })
}

export default function DebugTools() {
    const { showAxes, showGrid, showStats, statPanel, showGizmo, showPerf, triangles } = useDebugControls()

    return (
        <>
            {showStats && <Stats key={statPanel} showPanel={statPanel} className="left-4!" />}
            {showPerf && (
                <Suspense fallback={null}>
                    <PerfLazy position="bottom-left" />
                </Suspense>
            )}
            {showAxes && <primitive object={new THREE.AxesHelper(10)} />}
            {showGrid && <Grid args={[20, 20]} />}
            {showGizmo && <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
                <GizmoViewport />
            </GizmoHelper>}
        </>
    )
}