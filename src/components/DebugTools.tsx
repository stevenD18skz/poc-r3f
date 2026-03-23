// src/components/DebugTools.tsx
import { Stats, Grid, GizmoHelper, GizmoViewport } from '@react-three/drei'
import { useControls } from 'leva'
import * as THREE from 'three'

// Hook para crear el contexto de debug
export function useDebugControls() {
    return useControls('Debug', {
        showAxes: true,
        showGrid: true,
        showStats: true,
        showGizmo: true,
        freeCam: true // Nuevo control para alternar cámara
    })
}

export default function DebugTools() {
    const { showAxes, showGrid, showStats, showGizmo } = useDebugControls()

    return (
        <>
            {showStats && <Stats />}
            {showAxes && <primitive object={new THREE.AxesHelper(10)} />}
            {showGrid && <Grid args={[20, 20]} />}
            {showGizmo && <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
                <GizmoViewport />
            </GizmoHelper>}
        </>
    )
}