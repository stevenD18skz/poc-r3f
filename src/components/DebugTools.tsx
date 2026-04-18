// src/components/DebugTools.tsx
import { Stats, Grid, GizmoHelper, GizmoViewport } from '@react-three/drei'
import { useControls, button } from 'leva'
import * as THREE from 'three'
import { Suspense, lazy } from 'react'
import { useThree } from '@react-three/fiber'
import { getPerf } from 'r3f-perf'

// Carga dinámica de r3f-perf para evitar error de Turbopack con .woff
const PerfLazy = lazy(() => import('r3f-perf').then(mod => ({ default: mod.Perf })))

// Hook para crear el contexto de debug
export function useDebugControls({title, entityCount}: {title?: string, entityCount?: number}) {
    const { gl } = useThree()

    return useControls('Debug', {
        freeCam: false,
        showStats: true,
        statPanel: { 
            value: 0, 
            options: { 'FPS': 0, 'MS (Latencia)': 1, 'MB (Memoria RAM)': 2 },
            label: 'Métrica Stats.js'
        },
        showPerf: true,
        showGizmo: false,
        showAxes: false,
        showGrid: false,
        //triangles: {
            //value: 1_000,
            //min: 1_000,
            //max: 32_000,
            //step: 1_000,
            //label: 'Triángulos'
        //},
        exportarCSV: button(() => {
            const perfState = getPerf ? getPerf() : null;
            const logData = perfState?.log || { gpu: 0, cpu: 0, mem: 0, fps: 0 };
            
            // WebGL renderer metrics
            const calls = gl.info.render.calls;
            const renderTriangles = gl.info.render.triangles;
            const points = gl.info.render.points;
            const lines = gl.info.render.lines;
            const geometries = gl.info.memory.geometries;
            const textures = gl.info.memory.textures;
            const shaders = gl.info.programs ? gl.info.programs.length : 0;

            const gpuMs = logData.gpu.toFixed(2);
            const cpuMs = logData.cpu.toFixed(2);
            const fpsAvg = logData.fps.toFixed(2);
            const memMB = logData.mem.toFixed(2);

            let csvContent = "data:text/csv;charset=utf-8,";
            
            if (entityCount !== undefined) {
                csvContent += `${entityCount.toLocaleString()} entidades\n\n`;
            }

            csvContent += "Escena,FPS Promedio,GPU (ms),CPU (ms),Draw Calls,Triangulos,Geometrias,Texturas,Shaders,Lineas,Puntos,Memoria RAM (MB)\n"
                + `Metricas Actuales,${fpsAvg},${gpuMs},${cpuMs},${calls},${renderTriangles},${geometries},${textures},${shaders},${lines},${points},${memMB}\n`;

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `metricas_escena_${title}.csv`);
            document.body.appendChild(link); // Required for FF
            link.click();
            document.body.removeChild(link);
        })
    })
}

export default function DebugTools({title, entityCount}: {title: string, entityCount?: number}) {
    const { showAxes, showGrid, showStats, statPanel, showGizmo, showPerf } = useDebugControls({title, entityCount})

    return (
        <>
            {showStats && <Stats key={statPanel} showPanel={statPanel} />}
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