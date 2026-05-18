import * as THREE from 'three'

export interface VRAMBreakdown {
  geometries: string
  instances: string
  textures: string
  shadowMaps: string
  canvas: string
  total: string
}

/**
 * Calculates a highly accurate estimation of VRAM usage in WebGL / Three.js.
 * Unlike rendered-triangle metrics (which multiply per pass/shadow map and scale down with culling),
 * this traverses the actual active scene and inspects loaded WebGL buffers, textures, shadow maps, and canvas buffers.
 */
export function getVRAMUsage(gl: THREE.WebGLRenderer, scene: THREE.Scene): VRAMBreakdown {
  let geometryBytes = 0
  let instancedBytes = 0
  let textureBytes = 0
  let shadowMapBytes = 0
  let canvasBytes = 0

  const seenGeometries = new Set<string>()
  const seenTextures = new Set<string>()
  const seenShadowMaps = new Set<any>()

  const checkTexture = (prop: any) => {
    if (prop && prop.isTexture && !seenTextures.has(prop.uuid)) {
      seenTextures.add(prop.uuid)

      let bytes = 0
      if (prop.image) {
        // Handle CubeTextures or arrays of images (cubemap)
        const isCube = prop.isCubeTexture || Array.isArray(prop.image)
        const images = isCube ? prop.image : [prop.image]
        
        for (const img of images) {
          if (!img) continue
          const width = img.width || 0
          const height = img.height || 0
          
          let bpp = 4 // Default RGBA
          if (prop.format === THREE.RedFormat || prop.format === (THREE as any).LuminanceFormat || prop.format === 1024 /* LuminanceFormat */) {
            bpp = 1
          }
          
          if (prop.type === THREE.FloatType) {
            bpp *= 4
          } else if (prop.type === THREE.HalfFloatType) {
            bpp *= 2
          }

          bytes += width * height * bpp
        }

        if (prop.generateMipmaps) {
          bytes *= 1.333 // Mipmaps add ~33% overhead
        }
      } else if (prop.width && prop.height) {
        // Render target texture or data texture without standard HTMLImageElement
        const width = prop.width
        const height = prop.height
        const isCube = prop.isCubeTexture || prop.mapping === 301 /* CubeReflectionMapping */ || prop.mapping === 302 /* CubeRefractionMapping */
        const faces = isCube ? 6 : 1
        let bpp = 4
        
        if (prop.type === THREE.FloatType) {
          bpp *= 4
        } else if (prop.type === THREE.HalfFloatType) {
          bpp *= 2
        }
        
        bytes = width * height * faces * bpp
        if (prop.generateMipmaps) {
          bytes *= 1.333
        }
      }
      textureBytes += bytes
    }
  }

  // Check scene-level background and environment textures (like HDRIs)
  if (scene.background) checkTexture(scene.background)
  if (scene.environment) checkTexture(scene.environment)

  scene.traverse((object) => {
    // 1. Geometry VRAM
    if ((object as any).isMesh || (object as any).isPoints || (object as any).isLine) {
      const mesh = object as any
      const geometry = mesh.geometry as THREE.BufferGeometry

      if (geometry && !seenGeometries.has(geometry.uuid)) {
        seenGeometries.add(geometry.uuid)

        // Add size of all active vertex attributes (position, normal, uv, color, etc.)
        for (const key in geometry.attributes) {
          const attribute = geometry.attributes[key]
          if (attribute && attribute.array) {
            geometryBytes += attribute.array.byteLength
          }
        }

        // Add size of index buffer if it exists
        if (geometry.index && geometry.index.array) {
          geometryBytes += geometry.index.array.byteLength
        }
      }

      // 2. Instanced Mesh attributes (matrices and optional colors)
      if (mesh.isInstancedMesh && mesh.instanceMatrix) {
        if (mesh.instanceMatrix.array) {
          instancedBytes += mesh.instanceMatrix.array.byteLength
        }
        if (mesh.instanceColor && mesh.instanceColor.array) {
          instancedBytes += mesh.instanceColor.array.byteLength
        }
      }

      // 3. Material Textures VRAM
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const mat of materials) {
        if (!mat) continue

        // Dynamically find all texture objects referenced in the material
        for (const propName in mat) {
          const prop = mat[propName]
          if (prop && prop.isTexture) {
            checkTexture(prop)
          }
        }
      }
    }

    // 4. Shadow Map Render Targets VRAM
    if ((object as any).isLight) {
      const light = object as any
      if (light.castShadow && light.shadow) {
        const shadow = light.shadow
        
        // Point lights use WebGLCubeRenderTarget (6 faces), other lights use standard Render Targets (1 face)
        const isPoint = light.isPointLight || light instanceof THREE.PointLight
        const faces = isPoint ? 6 : 1

        if (shadow.map) {
          const map = shadow.map
          if (!seenShadowMaps.has(map)) {
            seenShadowMaps.add(map)
            // A shadow depth texture typically uses 4 bytes per pixel (Float / UnsignedInt depth format)
            const width = map.width || 0
            const height = map.height || 0
            shadowMapBytes += width * height * faces * 4
          }
        } else {
          // If the shadow map render target is not initialized yet (before first render), estimate from mapSize settings
          const mapSize = shadow.mapSize || { x: 512, y: 512 }
          shadowMapBytes += mapSize.x * mapSize.y * faces * 4
        }
      }
    }
  })

  // 5. Canvas Drawing Buffer VRAM (Color + Depth/Stencil backbuffers)
  if (gl) {
    const width = (gl as any).drawingBufferWidth || gl.domElement.width
    const height = (gl as any).drawingBufferHeight || gl.domElement.height
    // 8 bytes per pixel covers standard RGBA8 color buffer + Depth24Stencil8 stencil-depth buffer
    canvasBytes = width * height * 8
  }

  const totalBytes = geometryBytes + instancedBytes + textureBytes + shadowMapBytes + canvasBytes

  return {
    geometries: (geometryBytes / 1048576).toFixed(2),
    instances: (instancedBytes / 1048576).toFixed(2),
    textures: (textureBytes / 1048576).toFixed(2),
    shadowMaps: (shadowMapBytes / 1048576).toFixed(2),
    canvas: (canvasBytes / 1048576).toFixed(2),
    total: (totalBytes / 1048576).toFixed(2),
  }
}
