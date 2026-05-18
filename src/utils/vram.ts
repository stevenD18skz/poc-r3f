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
 * Cálculo avanzado de VRAM para WebGL / Three.js
 * Escanea a profundidad Uniforms, MSAA (Multisampling), FBOs internos y Buffers del Canvas.
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

  // El pixel ratio aumenta exponencialmente el peso de los buffers que dependen de la pantalla
  const pixelRatio = gl.getPixelRatio()
  const screenWidth = gl.domElement.width
  const screenHeight = gl.domElement.height

  const checkTexture = (tex: any, isFBO = false, assumedSamples = 1) => {
    if (!tex || (!tex.isTexture && !tex.isWebGLRenderTarget) || seenTextures.has(tex.uuid)) return
    seenTextures.add(tex.uuid)

    let width = 0
    let height = 0
    let depth = 1

    if (tex.image) {
      if (Array.isArray(tex.image)) {
        depth = 6 // Cube texture
        width = tex.image[0]?.width || 0
        height = tex.image[0]?.height || 0
      } else {
        width = tex.image.width || 0
        height = tex.image.height || 0
        if (tex.image.depth) depth = tex.image.depth // Data3DTexture
      }
    } else if (tex.source && tex.source.data) {
      width = tex.source.data.width || 0
      height = tex.source.data.height || 0
    } else if (tex.width && tex.height) {
      // FBO fallback
      width = tex.width
      height = tex.height
    }

    if (width === 0 || height === 0) return

    let bpp = 4 // Default RGBA8
    if (tex.format === THREE.RedFormat) bpp = 1
    else if (tex.format === THREE.RGFormat) bpp = 2
    else if (tex.format === THREE.RGBFormat) bpp = 3

    if (tex.type === THREE.FloatType) bpp *= 4 // Float32 (HDRI / Compute)
    else if (tex.type === THREE.HalfFloatType) bpp *= 2 // Float16 (PMREM Env Maps)

    let bytes = width * height * depth * bpp

    // Mipmapping overhead (~33%)
    if (tex.generateMipmaps || (tex.mipmaps && tex.mipmaps.length > 0)) {
      bytes *= 1.3333
    }

    // Si es una textura proveniente de un Render Target (FBO), 
    // trae atado un Depth Buffer y posiblemente MSAA (Samples)
    if (isFBO || tex.isRenderTargetTexture) {
      const depthBytes = width * height * depth * 4 // Depth24Stencil8
      bytes += depthBytes

      if (assumedSamples > 1) {
        bytes *= assumedSamples // El peso se multiplica por el nivel de Anti-Aliasing
      }
    }

    textureBytes += bytes
  }

  const checkMaterial = (mat: any) => {
    if (!mat) return

    // 1. Scan propiedades directas
    for (const key in mat) {
      const prop = mat[key]
      if (prop && prop.isTexture) checkTexture(prop)
    }

    // 2. Deep scan de Uniforms (Vital para atrapar los FBOs de MeshTransmissionMaterial)
    if (mat.uniforms) {
      for (const key in mat.uniforms) {
        const uniform = mat.uniforms[key]
        if (uniform && uniform.value) {
          const val = uniform.value
          if (val.isTexture || val.isWebGLRenderTarget) {
            
            // Detectar heurísticamente si es el buffer de transmisión de Drei
            // Este buffer escala con la pantalla y suele tener samples=8
            const isTransmissionFBO = key.toLowerCase().includes('transmission')
            const isScreenSized = val.image && (val.image.width === screenWidth || val.image.width === screenWidth / pixelRatio)
            const samples = isTransmissionFBO ? 8 : 1
            
            checkTexture(val, isTransmissionFBO || isScreenSized, samples)
          } else if (Array.isArray(val)) {
            val.forEach(v => {
              if (v && (v.isTexture || v.isWebGLRenderTarget)) checkTexture(v)
            })
          }
        }
      }
    }

    // 3. Scan de userData (A veces bibliotecas externas esconden texturas allí)
    if (mat.userData) {
      for (const key in mat.userData) {
        const prop = mat.userData[key]
        if (prop && prop.isTexture) checkTexture(prop)
      }
    }
  }

  // Escaneo global de Environment (HDRI / PMREM)
  if (scene.background) checkTexture(scene.background)
  if (scene.environment) checkTexture(scene.environment) // HDRI consume mucha VRAM (HalfFloat + Mipmaps)

  scene.traverse((object: any) => {
    // Geometría
    if (object.isMesh || object.isPoints || object.isLine) {
      const geometry = object.geometry as THREE.BufferGeometry
      if (geometry && !seenGeometries.has(geometry.uuid)) {
        seenGeometries.add(geometry.uuid)
        for (const key in geometry.attributes) {
          const attribute = geometry.attributes[key]
          if (attribute && attribute.array) {
            geometryBytes += attribute.array.byteLength
          }
        }
        if (geometry.index && geometry.index.array) {
          geometryBytes += geometry.index.array.byteLength
        }
      }

      // Instancias (Matrices dinámicas)
      if (object.isInstancedMesh && object.instanceMatrix && object.instanceMatrix.array) {
        instancedBytes += object.instanceMatrix.array.byteLength
        if (object.instanceColor && object.instanceColor.array) {
          instancedBytes += object.instanceColor.array.byteLength
        }
      }

      // Materiales (Itera uno o múltiples)
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      materials.forEach(checkMaterial)
    }

    // Shadow Maps
    if (object.isLight && object.castShadow && object.shadow) {
      const shadow = object.shadow
      const map = shadow.map
      const isPoint = object.isPointLight || object instanceof THREE.PointLight
      const faces = isPoint ? 6 : 1

      if (map) {
        if (!seenShadowMaps.has(map.uuid)) {
          seenShadowMaps.add(map.uuid)
          const width = map.width || map.image?.width || 0
          const height = map.height || map.image?.height || 0
          shadowMapBytes += width * height * faces * 4 // Float/Depth map (4 bytes)
        }
      } else {
        const mapSize = shadow.mapSize || { x: 512, y: 512 }
        shadowMapBytes += mapSize.x * mapSize.y * faces * 4
      }
    }
  })

  // Canvas Drawing Buffer
  if (gl) {
    const glContext = gl.getContext()
    const glAttrs = glContext.getContextAttributes()
    // Si el antialias está encendido, WebGL reserva un multisample buffer de 4 samples (x4 de memoria)
    const canvasSamples = glAttrs?.antialias ? 4 : 1
    
    // Color (4 bytes) + Depth24Stencil8 (4 bytes) = 8 bytes por pixel * MSAA
    canvasBytes = screenWidth * screenHeight * 8 * canvasSamples
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