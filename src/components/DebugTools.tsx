// src/components/DebugTools.tsx
import { Stats, Grid, GizmoHelper, GizmoViewport } from '@react-three/drei'
import { useControls, button } from 'leva'
import * as THREE from 'three'
import { Suspense, lazy } from 'react'
import { useThree } from '@react-three/fiber'
import { getPerf } from 'r3f-perf'

// Carga dinámica de r3f-perf para evitar error de Turbopack con .woff
const PerfLazy = lazy(() => import('r3f-perf').then(mod => ({ default: mod.Perf })))

// Función para estimar la VRAM en base a Geometrías y Texturas en la escena
const estimateVRAM = (scene: THREE.Scene): number => {
    let totalBytes = 0;
    const seenGeometries = new Set();
    const seenTextures = new Set();

    scene.traverse((object: any) => {
        if (object.isMesh) {
            // Calcular peso de la Geometría
            if (object.geometry && !seenGeometries.has(object.geometry.uuid)) {
                seenGeometries.add(object.geometry.uuid);
                const attributes = object.geometry.attributes;
                for (const key in attributes) {
                    const attribute = attributes[key];
                    totalBytes += attribute.array.length * attribute.array.BYTES_PER_ELEMENT;
                }
                if (object.geometry.index) {
                    totalBytes += object.geometry.index.array.length * object.geometry.index.array.BYTES_PER_ELEMENT;
                }
            }

            // Calcular peso de las Texturas
            if (object.material) {
                const materials = Array.isArray(object.material) ? object.material : [object.material];
                materials.forEach(mat => {
                    for (const key in mat) {
                        const tex = mat[key];
                        if (tex && tex.isTexture && tex.image && !seenTextures.has(tex.uuid)) {
                            seenTextures.add(tex.uuid);
                            const width = tex.image.width || 0;
                            const height = tex.image.height || 0;
                            // Asumiendo mapa de bits RGBA (4 bytes por pixel)
                            let texBytes = width * height * 4;
                            // Si tiene mipmaps generados (por defecto en ThreeJS), ocupa ~1.33x más espacio en VRAM
                            if (tex.generateMipmaps) {
                                texBytes *= 1.33;
                            }
                            totalBytes += texBytes;
                        }
                    }
                });
            }
        }
    });

    // Retornamos el valor en Megabytes (MB)
    return totalBytes / (1024 * 1024);
};

// Hook para crear el contexto de debug
export function useDebugControls({title, entityCount}: {title?: string, entityCount?: number}) {
    const { gl, scene } = useThree()

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
            const estVramMB = estimateVRAM(scene).toFixed(2);

            let csvContent = "data:text/csv;charset=utf-8,";
            
            if (entityCount !== undefined) {
                csvContent += `${entityCount.toLocaleString()} entidades\n\n`;
            }

            csvContent += "Escena,FPS Promedio,GPU (ms),CPU (ms),Draw Calls,Triangulos,Geometrias,Texturas,Shaders,Lineas,Puntos,Memoria RAM (MB),VRAM Estimada (MB)\n"
                + `Metricas Actuales,${fpsAvg},${gpuMs},${cpuMs},${calls},${renderTriangles},${geometries},${textures},${shaders},${lines},${points},${memMB},${estVramMB}\n`;

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