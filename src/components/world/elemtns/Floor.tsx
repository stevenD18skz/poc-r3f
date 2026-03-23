// src/components/world/Floor.tsx
import { useTexture } from '@react-three/drei'
import { RepeatWrapping } from 'three'

export default function Floor({ size }: { size: number }) {
    // Cargar múltiples texturas a la vez
    const textures = useTexture({
        map: '/textures/floor/stained_pine_diff_1k.jpg',            // Color/Diffuse
        displacementMap: '/textures/floor/stained_pine_disp_1k.png', // Displacement/Altura
        normalMap: '/textures/floor/stained_pine_nor_gl_1k.png'      // Normal map (simula relieve)
    })

    // Configurar repetición para todas las texturas
    Object.values(textures).forEach(texture => {
        texture.wrapS = texture.wrapT = RepeatWrapping
        texture.repeat.set(4, 4)
    })

    return (
        <mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            {/* Más subdivisiones (64x64) para que el displacement se vea bien */}
            <planeGeometry args={[size, size, 64, 64]} />
            <meshStandardMaterial
                {...textures}
                displacementScale={0.1}  // Ajusta este valor para más/menos relieve
            />
        </mesh>
    )
}