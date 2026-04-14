// src/components/DebugTools.tsx
import { Stats, Grid, GizmoHelper, GizmoViewport } from '@react-three/drei'
import { useControls, button } from 'leva'
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
        },
        exportarCSV: button(() => {
            // Genera la plantilla básica en CSV
            const csvContent = "data:text/csv;charset=utf-8," 
                + "Test Name,FPS Promedio,FPS 1% Low,Draw Calls,Memoria (MB),Triangulos\n"
                + "Scene Idle,,,,,\n"
                + "Triangles Static,,,,,\n"
                + "Triangles Rotating,,,,,\n"
                + "Dynamic Lights,,,,,\n"
                + "Raycasting,,,,,\n"
                + "Animation Stress,,,,,\n"
                + "NPC AI,,,,,\n"
                + "Physics Stress,,,,,\n"
                + "VRAM Stress,,,,,\n";

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "metricas_r3f_vs_babylon.csv");
            document.body.appendChild(link); // Required for FF
            link.click();
            document.body.removeChild(link);
        })
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