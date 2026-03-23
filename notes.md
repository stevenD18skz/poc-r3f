# 📚 Notas de Aprendizaje - Web 3D con React Three Fiber

> Repositorio de práctica para aprender desarrollo 3D en la web usando React Three Fiber, Three.js y herramientas del ecosistema.

---

## 🛠️ Stack Tecnológico

| Tecnología | Descripción |
|------------|-------------|
| **React Three Fiber** | Renderer de React para Three.js |
| **@react-three/drei** | Helpers y componentes útiles para R3F |
| **@react-three/rapier** | Motor de física (Rapier) para R3F |
| **Leva** | Panel de controles para debug en tiempo real |
| **Three.js** | Librería base de 3D para la web |

---

## 🪹 INTRODUCCIÓN A THREE.JS 🥟

### ¿Qué es?

Three.js es una librería que hace fácil crear gráficos 3D en el navegador. Por debajo usa **WebGL**, que es una tecnología compleja para hablar con la tarjeta gráfica (GPU). Three.js simplifica las matemáticas difíciles y el código repetitivo.

### Conceptos Fundamentales

Imagínate que vas a rodar una película. Necesitas 3 cosas básicas:

1. **Scene (Escena):** Es el "mundo" o el set de rodaje. Aquí pones tus objetos, luces y cámaras. Si no está en la escena, no existe.
2. **Camera (Cámara):** Es el "ojo" del espectador. Define qué parte de la escena se ve y desde qué ángulo.
3. **Renderer (Renderizador):** Es el "artista" que toma lo que ve la cámara y lo dibuja en tu pantalla (en el elemento `<canvas>`).

### ¿Qué compone un objeto 3D?

En Three.js, un objeto visible se llama típicamente **Mesh** (Malla). Un Mesh siempre necesita dos cosas:

1. **Geometry (Geometría):** Es la forma o el esqueleto. Define los puntos (vértices) en el espacio 3D.
    * Ejemplos: `boxGeometry` (cubo), `sphereGeometry` (esfera), `planeGeometry` (plano).
2. **Material (Material):** Es la piel o la apariencia. Define cómo reacciona a la luz, el color, si es brillante o mate.
    * Ejemplos: `meshStandardMaterial` (realista), `meshBasicMaterial` (plano, sin sombras).

```math
Mesh = Geometría + Material
```

### El Espacio 3D (Coordenadas)

Vivimos en un sistema de 3 ejes (X, Y, Z). El centro del mundo es `[0, 0, 0]`.

* **X (Rojo):** Izquierda (-) / Derecha (+)
* **Y (Verde):** Abajo (-) / Arriba (+)  *(Nota: En otras apps 3D a veces Y es profundidad, pero en Three.js Y es "arriba")*
* **Z (Azul):** Lejos/Atrás (-) / Cerca/Adelante (+)

**Unidades:** Son abstractas. Normalmente consideramos `1 unidad = 1 metro`.

### Rotaciones (¡Ojo con esto!)

Las computadoras prefieren los **Radianes** en lugar de Grados.

* Círculo completo (360°) = `2 * PI` (~6.28)
* Media vuelta (180°) = `PI` (~3.14)
* Ángulo recto (90°) = `PI / 2` (~1.57)

> **Tip:** En el código siempre usa `Math.PI`.
> Ejemplo: Para rotar 90 grados en X: `rotation={[Math.PI / 2, 0, 0]}`

## 📦 Cargando Modelos 3D (GLTF/GLB)

### Usando gltfjsx

1. Instalar: `npx gltfjsx modelo.glb`
2. Genera un componente React listo para usar

```tsx
import { useGLTF } from '@react-three/drei'

export default function Table(props) {
  const { nodes, materials } = useGLTF('/models/Table.glb')
  
  return (
    <group {...props} dispose={null}>
      <mesh
        geometry={nodes.Table_7.geometry}
        material={materials.Table_7_mat}
        castShadow
        receiveShadow
      />
    </group>
  )
}

useGLTF.preload('/models/Table.glb') // Pre-carga
```

**💡 Tip:** Usa `<Suspense fallback={null}>` para envolver modelos que se cargan.

---

## 🎨 Materiales

### Diferencia entre MeshBasicMaterial y MeshStandardMaterial

| Característica | `MeshBasicMaterial` | `MeshStandardMaterial` |
|----------------|---------------------|------------------------|
| Iluminación | ❌ Ignora las luces | ✅ Reacciona a las luces |
| Sombras | ❌ No recibe ni proyecta | ✅ Recibe y proyecta |
| Rendimiento | ⚡ Muy rápido | 🐢 Más lento (PBR) |
| Realismo | Plano, como pintura | Físicamente realista |

### MeshStandardMaterial - Propiedades

```tsx
<meshStandardMaterial
  color="orange"
  metalness={0.3}    // 0 = no metálico, 1 = muy metálico
  roughness={0.4}    // 0 = muy brillante, 1 = mate
/>
```

* `MeshLambertMaterial` - Reacciona a luz, sin reflejos
* `MeshPhongMaterial` - Reflejos simples
* `MeshPhysicalMaterial` - PBR avanzado con clearcoat, transmisión, etc.

---

## 🖼️ Texturas

### ¿Qué es una Textura?

Una **textura** es una imagen 2D que se aplica sobre la superficie de un objeto 3D para darle apariencia visual. Sin texturas, los objetos solo tendrían colores sólidos.

```
Geometría (forma) + Material (propiedades) + Textura (imagen) = Objeto 3D realista
```

### UV Mapping - Cómo se "envuelve" una imagen en 3D

**UV Mapping** es el proceso de "desenvolver" un modelo 3D en 2D para poder pintarle una textura encima, como desenvolver una caja de cartón.

* **U** = eje horizontal de la textura (equivale a X)
* **V** = eje vertical de la textura (equivale a Y)

```
         Modelo 3D              Textura 2D
        ┌─────────┐              ┌─────┐
       /│        /│              │     │
      / │       / │    UV Map    │ 🪵  │
     ┌─────────┐  │   ────────►  │     │
     │  │      │  │              └─────┘
     │  └──────│──┘             (imagen)
     │ /       │ /
     └─────────┘
```

**💡 Tip:** Los modelos `.glb` ya vienen con UV mapping definido. Los modelos de Poly Haven y Sketchfab suelen tenerlo bien hecho.

### Tipos de Mapas de Textura

| Mapa | Propiedad R3F | Descripción | Ejemplo uso |
|------|---------------|-------------|-------------|
| **Diffuse/Color** | `map` | El color base de la superficie | La imagen del ladrillo, madera, etc. |
| **Normal** | `normalMap` | Simula relieve sin modificar geometría | Vetas de madera, grietas |
| **Roughness** | `roughnessMap` | Controla brillo/mate por zona | Madera pulida vs áspera |
| **Metalness** | `metalnessMap` | Define qué partes son metálicas | Tornillos en mueble de madera |
| **Displacement** | `displacementMap` | Modifica la geometría real | Relieve real de ladrillos |
| **AO (Ambient Occlusion)** | `aoMap` | Sombras suaves en esquinas/bordes | Más realismo en hendiduras |

### Cargando Texturas en React Three Fiber

```tsx
import { useTexture } from '@react-three/drei'
import { RepeatWrapping } from 'three'

function Floor() {
  // Cargar múltiples texturas a la vez
  const textures = useTexture({
    map: '/textures/wood_diff.jpg',
    normalMap: '/textures/wood_nor.png',
    roughnessMap: '/textures/wood_rough.png',
    displacementMap: '/textures/wood_disp.png'
  })
  
  // Configurar repetición para todas
  Object.values(textures).forEach(texture => {
    texture.wrapS = texture.wrapT = RepeatWrapping
    texture.repeat.set(4, 4)
  })
  
  return (
    <mesh>
      {/* Más subdivisiones para displacement */}
      <planeGeometry args={[10, 10, 64, 64]} />
      <meshStandardMaterial 
        {...textures}
        displacementScale={0.1}
      />
    </mesh>
  )
}
```

### Propiedades de Repetición

```tsx
import { RepeatWrapping, ClampToEdgeWrapping, MirroredRepeatWrapping } from 'three'

texture.wrapS = RepeatWrapping  // Repetición en eje U (horizontal)
texture.wrapT = RepeatWrapping  // Repetición en eje V (vertical)
texture.repeat.set(4, 4)        // Repetir 4x4 veces
```

| Wrap Mode | Descripción |
|-----------|-------------|
| `RepeatWrapping` | Repite la textura infinitamente |
| `ClampToEdgeWrapping` | Estira el último píxel (default) |
| `MirroredRepeatWrapping` | Repite alternando espejo |

### Normal Map: OpenGL vs DirectX

Las texturas de Poly Haven vienen en dos formatos:

* `_nor_gl` = **OpenGL** ✅ (usar este en Three.js)
* `_nor_dx` = DirectX ❌ (canal verde invertido)

### 🌐 Fuentes de Texturas Gratuitas

| Sitio | Descripción | URL |
|-------|-------------|-----|
| **Poly Haven** | Texturas PBR de alta calidad, CC0 | [polyhaven.com/textures](https://polyhaven.com/textures) |
| **AmbientCG** | Miles de materiales PBR gratis | [ambientcg.com](https://ambientcg.com/) |
| **Texture Ninja** | Fotos de texturas naturales | [texture.ninja](https://texture.ninja/) |
| **3D Textures** | Texturas PBR seamless | [3dtextures.me](https://3dtextures.me/) |
| **FreePBR** | Materiales PBR gratuitos | [freepbr.com](https://freepbr.com/) |

### Nomenclatura común en texturas descargadas

| Sufijo | Tipo de mapa |
|--------|--------------|
| `_diff`, `_col`, `_albedo` | Diffuse/Color |
| `_nor`, `_nrm`, `_normal` | Normal |
| `_rough`, `_roughness` | Roughness |
| `_metal`, `_metallic`, `_metalness` | Metalness |
| `_disp`, `_height`, `_bump` | Displacement |
| `_ao`, `_occ` | Ambient Occlusion |

**💡 Tip:** Siempre descarga texturas del mismo pack para que las UVs coincidan entre mapas.

## 🎮 Modelos 3D Externos (GLTF/GLB) - Guía Completa

### Formato GLTF vs GLB - Diferencias

| Característica | GLTF (.gltf) | GLB (.glb) |
|----------------|--------------|------------|
| **Tipo** | Archivo JSON + recursos externos | Todo en un solo archivo binario |
| **Estructura** | Múltiples archivos (.gltf + .bin + texturas) | Un solo archivo empaquetado |
| **Tamaño** | Más grande en total | Más compacto |
| **Edición** | Fácil de editar (es JSON) | Requiere herramientas para editar |
| **Carga** | Múltiples peticiones HTTP | Una sola petición |
| **Uso web** | ⚠️ Más lento | ✅ Recomendado para producción |

**💡 Recomendación:** Usa **.GLB** para proyectos web. Es más eficiente.

### El formato GLTF en detalle

```
📁 modelo/
├── modelo.gltf     # JSON con estructura, materiales, animaciones
├── modelo.bin      # Datos binarios (geometría, animaciones)
├── textura1.jpg    # Texturas externas
└── textura2.png
```

El **GLB** es lo mismo pero todo comprimido en un solo archivo binario.

### 🌐 Dónde descargar modelos 3D gratuitos

| Sitio | Descripción | Formatos | URL |
|-------|-------------|----------|-----|
| **Sketchfab** | La mayor biblioteca de modelos 3D | GLTF, GLB, FBX, OBJ | [sketchfab.com](https://sketchfab.com/features/free-3d-models) |
| **Poly Haven** | Modelos de alta calidad, CC0 | GLTF, FBX, Blend | [polyhaven.com/models](https://polyhaven.com/models) |
| **Quaternius** | Packs de modelos low-poly gratuitos | GLTF, FBX | [quaternius.com](https://quaternius.com/) |
| **Kenney** | Assets para juegos (low-poly) | GLTF, OBJ | [kenney.nl/assets](https://kenney.nl/assets) |
| **Mixamo** | Personajes + animaciones gratis | FBX (convertir a GLB) | [mixamo.com](https://www.mixamo.com/) |
| **Google Poly** (archivo) | Modelos simples | GLTF | [poly.pizza](https://poly.pizza/) |
| **CGTrader** | Algunos modelos gratis | Varios | [cgtrader.com](https://www.cgtrader.com/free-3d-models) |
| **TurboSquid** | Modelos profesionales (algunos gratis) | Varios | [turbosquid.com](https://www.turbosquid.com/Search/3D-Models/free) |

**💡 Tip:** En Sketchfab, filtra por "Downloadable" y licencia CC para modelos gratuitos.

### 🛠️ Herramientas para Modelos 3D

#### Blender (Gratuito y Open Source)

**Blender** es el software estándar para crear y editar modelos 3D.

| Tarea | Cómo hacerlo en Blender |
|-------|------------------------|
| **Importar** | File → Import → glTF 2.0 |
| **Exportar a GLB** | File → Export → glTF 2.0 → Format: GLB |
| **Reducir polígonos** | Modifier → Decimate → Ratio (0.1 = 10% de polígonos) |
| **Ver UV Map** | UV Editing workspace |
| **Aplicar transformaciones** | Ctrl+A → All Transforms (IMPORTANTE antes de exportar) |

**Configuración recomendada al exportar:**

* ✅ Format: glTF Binary (.glb)
* ✅ Include → Selected Objects (si solo quieres exportar algunos)
* ✅ Mesh → Apply Modifiers
* ✅ Compression (si el modelo es grande)

#### gltf.report (Herramienta Online)

**[gltf.report](https://gltf.report/)** - Analiza y optimiza modelos GLB online.

Funcionalidades:

* 📊 Ver estadísticas del modelo (vértices, triángulos, texturas)
* 🔍 Inspeccionar estructura del modelo
* ⚡ Optimizar/comprimir el modelo
* 👁️ Preview 3D del modelo

#### Otras herramientas útiles

| Herramienta | Uso | URL |
|-------------|-----|-----|
| **gltf-transform** | CLI para optimizar GLB | [github.com/donmccurdy/glTF-Transform](https://github.com/donmccurdy/glTF-Transform) |
| **glTF Viewer** | Preview online de modelos | [gltf-viewer.donmccurdy.com](https://gltf-viewer.donmccurdy.com/) |
| **Gestaltor** | Editor visual de GLTF | [gestaltor.io](https://gestaltor.io/) |
| **gltfjsx** | Genera componentes React | `npx gltfjsx modelo.glb` |

### ⚡ Optimización de Modelos

#### ¿Por qué optimizar?

| Problema | Consecuencia |
|----------|--------------|
| Muchos polígonos | FPS bajo, carga lenta |
| Texturas grandes (4K) | Memoria GPU alta, carga lenta |
| Modelo sin comprimir | Archivo pesado |

#### Métricas recomendadas para web (Verificado ✅)

La información anterior es un excelente punto de partida para garantizar rendimiento en móviles. He verificado las métricas y añadido un desglose detallado por tipo de objeto y estrategia de LOD para optimizar al máximo.

| Métrica | Valor recomendado | Para escenas simples |
|---------|-------------------|---------------------|
| **Triángulos totales (Escena)** | < 100,000 | < 50,000 |
| **Por modelo decorativo** | < 2,000 - 5,000 | < 1,000 |
| **Texturas** | 1K-2K max | 512px-1K |
| **Tamaño archivo** | < 10MB (Carga rápida) | < 2MB |

#### 📏 Presupuesto de Polígonos por Rol (Triángulos)

Estas son las cantidades de triángulos recomendadas para mantener 60 FPS en navegadores web (incluyendo móviles de gama media).

| Rol del Objeto | Ejemplos | Valor Recomendado 🌟 | Máximo (Desktop) ⚠️ |
|---|---|---|---|
| **Personaje Principal** | El jugador (siempre en cámara) | **4,000 - 10,000** | ~15,000 - 20,000 |
| **NPC / Enemigos** | Personajes secundarios | **1,500 - 5,000** | ~8,000 |
| **Props Grandes** | Mesa, Silla, Cama, Vehículo | **500 - 1,500** | ~3,000 |
| **Props Pequeños** | Tazas, Libros, Armas de mano | **50 - 300** | ~800 |
| **Decoración/Entorno** | Árboles, Piedras (se instancian) | **200 - 1,000** | ~2,500 |
| **Estructuras** | Paredes, Suelos (Shapes simples) | **12 - 200** | ~500 |

#### 🔍 Niveles de Detalle (LOD - Level of Detail)

Se recomienda tener 3 versiones del modelo si es muy detallado. Usa `<Detailed />` en R3F para cambiar automáticamente según la distancia a la cámara.

| Nivel LOD | Descripción | Distancia Aprox. | Objetivo Triángulos (Ej. Personaje 10k) |
|---|---|---|---|
| **LOD 0** (High) | Primer plano, detalle completo. | 0m - 10m | **100%** (~10,000 tris) |
| **LOD 1** (Med) | Distancia media, reduce detalles finos. | 10m - 25m | **~50%** (~5,000 tris) |
| **LOD 2** (Low) | Lejano, solo silueta y formas base. | > 25m | **~20%** (~2,000 tris) |

#### Técnicas de optimización

##### 1. Reducir polígonos (Blender)

```
1. Seleccionar objeto
2. Modifier → Add Modifier → Decimate
3. Ajustar "Ratio" (0.5 = 50% menos polígonos)
4. Apply modifier
```

##### 2. Comprimir texturas

```bash
# Usando gltf-transform CLI
npx @gltf-transform/cli optimize input.glb output.glb --compress draco --texture-compress webp
```

##### 3. Usar LOD (Level of Detail)

Para objetos lejanos, usar versiones con menos detalle:

```tsx
import { Detailed } from '@react-three/drei'

function Tree() {
  return (
    <Detailed distances={[0, 10, 25]}>
      <TreeHighDetail />   {/* < 10 unidades de distancia */}
      <TreeMediumDetail /> {/* 10-25 unidades */}
      <TreeLowDetail />    {/* > 25 unidades */}
    </Detailed>
  )
}
```

##### 4. Instancing para objetos repetidos

Si tienes muchos objetos iguales (árboles, rocas):

```tsx
import { Instances, Instance } from '@react-three/drei'
import { useGLTF } from '@react-three/drei'

function Trees() {
  const { nodes } = useGLTF('/tree.glb')
  
  return (
    <Instances geometry={nodes.tree.geometry} material={nodes.tree.material}>
      <Instance position={[0, 0, 0]} />
      <Instance position={[5, 0, 3]} />
      <Instance position={[-3, 0, 7]} />
      {/* Cientos de árboles sin impacto en rendimiento */}
    </Instances>
  )
}
```

#### Checklist antes de usar un modelo

* [ ] ¿Tiene menos de 10,000 triángulos? (para objetos individuales)
* [ ] ¿Las texturas son 2K o menos?
* [ ] ¿El archivo pesa menos de 5MB?
* [ ] ¿Tiene UV mapping correcto?
* [ ] ¿Las transformaciones están aplicadas? (Blender: Ctrl+A)
* [ ] ¿El modelo está centrado en el origen?

**💡 Tip:** Usa `console.log(nodes)` para ver la estructura del modelo y qué meshes contiene.

## 🌄 Environment (Entorno)

El componente `<Environment />` de drei tiene dos funciones:

1. **Iluminación IBL** - Usa HDRI para iluminar objetos de forma realista
2. **Fondo de escena** - Puede mostrar el HDRI como cielo

```tsx
// Solo iluminación (fondo negro)
<Environment preset="sunset" />

// Iluminación + fondo visible
<Environment preset="sunset" background />

// Con desenfoque
<Environment preset="sunset" background blur={0.5} />
```

### Presets disponibles

`city` | `apartment` | `lobby` | `night` | `warehouse` | `forest` | `studio` | `sunset`

---

## 💡 Iluminación

### Tipos de Luces

| Luz | Descripción | Uso típico |
|-----|-------------|------------|
| `ambientLight` | Ilumina todo por igual, sin dirección | Luz base para que nada quede 100% negro |
| `directionalLight` | Rayos paralelos como el sol | Escenas exteriores, sombras definidas |
| `pointLight` | Emite en todas direcciones desde un punto | Bombillas, velas |
| `spotLight` | Cono de luz como linterna | Focos, lámparas direccionales |
| `rectAreaLight` | Luz rectangular como lámpara de escritorio | Ambiente general |
| `hemiLight` | Luz hemisférica | Ambiente general |
| `IBLHDRLight` | Luz de iluminación base | Ambiente general |

### AmbientLight - Propiedades Importantes

```tsx
<ambientLight
  color="white"                // Color de la luz
  intensity={0.5}              // Brillo
/>
```

### DirectionalLight - Propiedades Importantes

```tsx
<directionalLight
  color="white"                // Color de la luz
  position={[10, 10, 5]}      // Posición (define dirección de rayos)
  intensity={1.5}              // Brillo
  castShadow                   // Habilita proyección de sombras
  // Configuración de sombras
  shadow-mapSize={[1024, 1024]}  // Resolución de sombras
  shadow-camera-left={-10}       // Área de sombras
  shadow-camera-right={10}
  shadow-camera-top={10}
  shadow-camera-bottom={-10}
/>
```

### PointLight - Propiedades Importantes

```tsx
<pointLight
  color="white"                // Color de la luz
  position={[4, 10, 4]}        // Posición (define dirección de rayos)
  intensity={100}              // Brillo
  distance={10}                // Distancia máxima de la luz
  decay={2}                    // Atenuación por distancia
  castShadow                   // Habilita proyección de sombras
/>
```

### SpotLight - Propiedades Importantes

```tsx
<spotLight
  color={"white"}              // Color de la luz
  position={[-10, 4, 0]}       // Posición (define dirección de rayos)
  angle={Math.PI / 4}          // Ángulo del cono de luz
  distance={80}                // Distancia máxima de la luz
  intensity={20}               // Brillo
  decay={0.5}                  // Atenuación por distancia
  penumbra={1}                 // Gradualidad de la luz
  target={target}              // Punto de destino
  castShadow                   // Habilita proyección de sombras
/>
```

**💡 Tip:** La posición de `directionalLight` solo define la DIRECCIÓN de los rayos, no hay atenuación por distancia.

### Helpers de Luz (Debug)

Para visualizar las luces como en Blender:

```tsx
import { useHelper } from '@react-three/drei'
import * as THREE from 'three'

function SceneLights() {
  const lightRef = useRef<THREE.SpotLight>(null!)
  useHelper(lightRef, THREE.SpotLightHelper)

  // useMemo evita que se cree un nuevo Object3D en cada render
  const target = useMemo(() => new Object3D(), [])

  return (
    <>
      <spotLight
        ref={lightRef}
        color={"white"}
        //Demas propiedades de spotLight
      />
      <primitive object={target} position={[0, 0, 0]} />
    </>
  )
}
```

---

## 😈 SOMBRAS EN THREE.JS & R3F 👿

Las sombras son cruciales para dar profundidad y realismo ("grounding") a los objetos 3D. Sin ellas, los objetos parecen flotar sobre el fondo.

### 1. La Regla de Oro (Checklist)

Para ver sombras, necesitas **activar 3 cosas**:

1. **Canvas (Render)**: Habilitar el mapa de sombras globalmente.

    ```tsx
    <Canvas shadows ... >
    ```

2. **Luces (Emisores)**: La luz debe tener permitido "proyectar" sombre.

    ```tsx
    <directionalLight castShadow />
    ```

3. **Meshes (Objetos)**: Los objetos deben poder "proyectar" (cast) y "recibir" (receive) sombras.

    ```tsx
    <mesh castShadow receiveShadow />
    ```

---

### 2. Tipos de Sombras (Técnicas)

Three.js ofrece varios algoritmos de cálculo de sombras (Shadow Maps), y `@react-three/drei` ofrece alternativas modernas.

#### A. Shadow Maps (Nativas de Three.js)

Son las sombras "reales" calculadas desde la perspectiva de la luz.

| Tipo | Descripción | Costo | Uso |
|------|-------------|-------|-----|
| **BasicShadowMap** | Muy rápida, pero pixelada. Sin suavizado. | 🟢 Bajo | Estilos retro / bajo rendimiento. |
| **PCFShadowMap** | (Default) Bordes suavizados, estándar. | 🟡 Medio | Mayoría de casos. |
| **PCFSoftShadowMap** | Bordes más suaves, mejor calidad. | 🟡 Medio-Alto | Cuando se busca realismo simple. |
| **VSMShadowMap** | (Variance) Muy suave, evita artefactos, pero complejo de configurar. | 🔴 Alto | Escenas de alta calidad. |

*Para cambiar el tipo:*

```tsx
<Canvas shadows={{ type: THREE.PCFSoftShadowMap }} ... >
```

#### B. Sombras Especiales (Drei)

Son componentes qye "fingir" o calculan sombras de forma diferente, a menudo más estéticas o baratas.

1. **`<ContactShadows>`**:
    * **Qué es:** Renderiza la escena desde abajo y la proyecta en un plano 2D.
    * **Ventaja:** Muy suave, "pega" bien el objeto al suelo. Sin clipping.
    * **Desventaja:** No proyecta sobre otros objetos, solo en el suelo plano.
    * **Uso:** Presentación de productos, personajes flotando scbre un plano infinito.

2. **`<AccumulativeShadows>`**:
    * **Qué es:** Acumula múltiples renders de sombras a lo largo del tiempo (frames).
    * **Ventaja:** Calidad fotorealista, sombras suaves dispersas.
    * **Desventaja:** Tarda unos frames en generarse (bueno para ecsenas estáticas o bajo movimiento).

3. **`<BakeShadows>`**:
    * Calcula la sombra una vez y la deja fija. Ideal para estáticos para ahorrar rendimiento.

---

### 3. Luces y sus Sombras

No todas las luces generan sombras igual:

* **DirectionalLight (Sol):** Sombras paralelas y nítidas. Muy eficiente. Usa una "Shadow Camera" ortográfica (caja).
* **SpotLight (Linterna):** Sombras cónicas que se expanden. Usa una cámara de perspectiva.
* **PointLight (Bombilla):** Proyecta en **todas direcciones** (6 mapas de sombra). **MUY costoso**. Evitar si es posible.
* **AmbientLight / HemisphereLight:** **NO tienen sombras**. Son luces de relleno.

---

### 4. Configuración y Trucos (Pro Tips)

#### 🔹 Shadow Bias (El problema de las rayas)

Si ves rayas extrañas sobre tu objeto ("Shadow Acne"), ajusta el bias:

```tsx
<directionalLight 
  castShadow 
  shadow-bias={-0.0001} // Ajustar valores pequeños negativos
/>
```

#### � Resolución del Mapa (Calidad vs Rendimiento)

Por defecto es 512x512. Si se ve pixelado, auméntalo (potencias de 2):

```tsx
<directionalLight 
  castShadow 
  shadow-mapSize={[1024, 1024]} // o 2048, 4096 (cuidado con el rendimiento)
/>
```

#### 🔹 Área de la Sombra (Clipping)

Las luces direccionales solo calculan sombras dentro de una "caja" específica. Si la sombra se corta, agranda la cámara:

```tsx
<directionalLight castShadow>
  <orthographicCamera attach="shadow-camera" args={[-10, 10, 10, -10]} />
</directionalLight>
```

*O simplemente ajusta los props `shadow-camera-left`, `right`, `top`, `bottom` directamente en la luz.*

---

### 5. Tabla Resumen: ¿Qué uso?

| Situación | Recomendación |
|-----------|---------------|
| **Juego / Mundo completo** | `DirectionalLight` + `Canvas shadows` (PCFSoft) |
| **Mostrar un Producto (Zapato, Coche)** | `<ContactShadows>` (Queda muy limpio y suave) |
| **Render Arquitectónico (Quiet)** | `<AccumulativeShadows>` (Realismo máximo) |
| **Móviles / Bajo Rendimiento** | Baked Shadows (Texturas pintadas) o `BasicShadowMap` |

## 🎮 OrbitControls - Controles de Cámara

```tsx
<OrbitControls
  enableDamping={true}        // Movimiento suave con inercia
  dampingFactor={0.05}        // Rapidez de frenado (menor = más suave)
  minDistance={2}             // Zoom mínimo
  maxDistance={40}            // Zoom máximo
  maxPolarAngle={Math.PI / 2} // Limita rotación vertical (no ver debajo del suelo)
  autoRotate                  // Rotación automática
  enablePan                   // Permite desplazamiento lateral
/>
```

**💡 Tip:** `Math.PI / 2` = 90° - útil para limitar que la cámara no pase por debajo del suelo.

---

## 🎛️ Debug Tools con Leva

Panel de controles en tiempo real:

```tsx
import { useControls } from 'leva'

function DebugTools() {
  const { showAxes, showGrid } = useControls('Debug', {
    showAxes: true,
    showGrid: true,
  })
  
  return (
    <>
      {showAxes && <primitive object={new THREE.AxesHelper(10)} />}
      {showGrid && <Grid args={[20, 20]} />}
    </>
  )
}
```

### Helpers útiles de drei

* `<Stats />` - Muestra FPS, MS, MB
* `<Grid />` - Cuadrícula de referencia
* `<GizmoHelper>` - Brújula 3D en esquina
* `useHelper()` - Visualizar luces, cámaras, etc.

---

## 🎬 ANIMACIONES EN R3F (La Guía Completa)

En 3D, todo se mueve frame por frame. Aquí tienes las 3 formas maestras de animar.

### 1. El Corazón: `useFrame` (Loop Infinito)

Es el equivalente a `requestAnimationFrame`. Se ejecuta 60 veces por segundo (60 FPS).
Si quieres mover algo manualmente (procedural), va aquí.

#### A. Delta Time (Independencia del Frame Rate)

**Nunca** sumes un valor fijo (ej. `x += 0.01`) porque si alguien tiene un monitor de 120Hz, ¡su juego irá al doble de velocidad!
Multiplica siempre por `delta` (tiempo en segundos desde el último frame).

```tsx
useFrame((state, delta) => {
  // ✅ Correcto: Velocidad constante en cualquier PC
  ref.current.rotation.y += delta * 2 // 2 radianes por segundo
})
```

#### B. Lerp (Linear Interpolation) - Suavizado Mágico

En lugar de teletransportar objetos, usamos **Linear Interpolation** para que se "deslicen" suavemente hacia su destino.
Fórmula: `valor_actual = lerp(valor_actual, destino, suavidad)`

```tsx
import { MathUtils } from 'three'

useFrame((state, delta) => {
  // Interpolación suave del movimiento (Ease out)
  // El factor 0.1 suaviza; delta * 5 ajusta la velocidad
  ref.current.position.x = MathUtils.lerp(
    ref.current.position.x, 
    targetPosition, 
    0.1
  )
})
```

#### C. Oscilación (Idle Movement)

Para que las cosas floten o respiren, usa funciones seno/coseno con el reloj global.

```tsx
useFrame((state) => {
  const t = state.clock.getElapsedTime()
  
  // Flotar arriba/abajo suavemente
  ref.current.position.y = Math.sin(t) * 0.5 // Rango -0.5 a 0.5
  
  // Rotación tipo "péndulo"
  ref.current.rotation.z = Math.cos(t * 2) * 0.1
})
```

---

### 2. Librerías Externas (Tweening & Resortes)

No reinventes la rueda para transiciones complejas.

| Librería | Tipo | ¿Cuándo usarla? |
|----------|------|-----------------|
| **@react-spring/three** | Físicas (Springs) | Interacciones UI, Hover, Drag. Se siente "orgánico" y elástico. |
| **framer-motion-3d** | Declarativo | Si ya amas Framer Motion en web. Transiciones simples de estado (Layout). |
| **GSAP** | Timelines | **Cine**. Secuencias complejas: "La cámara baja, luego explota algo, luego texto". |

#### Ejemplo con React Spring (Física Elástica)

```tsx
import { useSpring, animated } from '@react-spring/three'

function BouncyBox() {
  const [active, setActive] = useState(false)
  
  const { scale } = useSpring({ 
    scale: active ? 1.5 : 1,
    config: { mass: 1, tension: 170, friction: 26 } // Configuración de resorte
  })

  return (
    <animated.mesh 
      scale={scale} 
      onClick={() => setActive(!active)}
    >
      <boxGeometry />
      <meshStandardMaterial color="hotpink" />
    </animated.mesh>
  )
}
```

---

### 3. Animaciones de Personajes (GLTF & Actions)

Los modelos `.glb` (como Mixamo) traen clips de animación ("Idle", "Run", "Die").
Usamos `useAnimations` de Drei.

#### State Machines (Máquinas de Estado)

No mezcles animaciones a lo loco. Piensa en **Estados**.
Un personaje NO puede estar "Corriendo" y "Muriendo" a la vez.

```tsx
import { useAnimations, useGLTF } from '@react-three/drei'

function Character() {
  const { scene, animations } = useGLTF('/model.glb')
  const { actions } = useAnimations(animations, scene)
  
  useEffect(() => {
    // Transición suave entre estados (Fade In/Out)
    actions['Idle'].reset().fadeIn(0.5).play()
    
    return () => {
      actions['Idle'].fadeOut(0.5)
    }
  }, []) // Cambiar dependencia a [estadoActual]

  return <primitive object={scene} />
}
```

**💡 Tip:** Para lógica compleja de estados (ej. saltar solo si estás en el suelo), considera usar librerías como **XState** o simplemente un `useEffect` bien estructurado con switch/case.

## 🎞️ Navegación en Primera Persona (FPS) 🍿

Crear un control tipo "Minecraft" o "Call of Duty" requiere separar la **Mirada** (Mouse) del **Movimiento** (Teclado).

### 1. Tipos de Controles en R3F

| Control | Descripción | Uso Ideal |
|---------|-------------|-----------|
| **OrbitControls** | Gira *alrededor* de un objeto central. | Model viewers, ecommerce, editores. |
| **FirstPersonControls** | (De Three.js) Clásico "Fly mode". Mueves la cámara libremente. | Editores de nivel. |
| **PointerLockControls** | **El estándar FPS**. Bloquea el cursor en el centro y gira la cámara con el mouse delta. | Juegos FPS, Walking Sims, Museos virtuales. |

### 2. La Receta del FPS

Para lograrlo necesitas 3 ingredientes trabajando juntos:

#### A. PointerLockControls (La Mirada)

Este componente de `@react-three/drei` hace la magia de ocultar el cursor.

```tsx
<PointerLockControls selector="#boton-jugar" />
```

#### B. El Crosshair (La Mira)

Como el cursor desaparece, necesitas dibujar un `div` en el centro de la pantalla (UI) para que el jugador sepa dónde mira.

```tsx
<div className="absolute top-1/2 left-1/2 w-2 h-2 bg-white rounded-full" />
```

#### C. Lógica de Movimiento (Vector Math)

Aquí es donde muchos fallan. No basta con sumar `z += 1`.
Debes moverte **hacia donde mira la cámara**.

1. **Capturar Input:** Guardar qué teclas (WASD) están presionadas.
2. **Vector Frontal:** `input.forward - input.backward`
3. **Vector Lateral:** `input.left - input.right`
4. **Normalizar:** ¡Muy importante! Si presionas W + D, la velocidad no debe ser el doble (hipotenusa). `.normalize()` lo arregla.
5. **Aplicar Rotación:** Usar `direction.applyEuler(camera.rotation)` para que "Adelante" sea "Adelante de la cámara", no "Norte del mundo".

```typescript
// Ejemplo simplificado del Hook
useFrame((state, delta) => {
  const speed = 5
  direction.subVectors(front, side).normalize().multiplyScalar(speed * delta)
  
  // Mover la cámara
  state.camera.translateX(direction.x)
  state.camera.translateZ(direction.z)
})
```

### 3. Física y "Feel" 🏃‍♂️

Para que se sienta profesional, evita cambiar la posición directamente. Usa **Velocidad**.

* **Sin física (Arcade):** `pos = pos + speed` (Se detiene en seco).
* **Con inercia:**
  * `velocity += acceleration` (al presionar tecla).
  * `velocity *= friction` (al soltar, ej. 0.9 para frenado suave).
  * `pos += velocity`

### 4. Integración Final

Tu estructura de escena debería verse así:

```tsx
<Canvas>
  <FPSControls />       {/* Maneja la rotación con Mouse */}
  <PlayerLogic />       {/* Componente invisible que maneja WASD */}
  <SceneContent />      {/* Tu mundo 3D */}
</Canvas>
<UIOverlay />           {/* Crosshair HTML encima del Canvas */}
```

### 5. Colisiones y Detección de Zonas (Triggers)

Ahora que caminas, ¡puedes atravesar paredes! Para evitarlo (y saber dónde estás), necesitas detectar colisiones.

#### A. Método "Barato" (Matemáticas AABB) 📦

*Analogía: Cajas de Zapatos apiladas en un almacén.*

**AABB** significa **A**xis-**A**ligned **B**ounding **B**ox (Caja Delimitadora Alineada a los Ejes).
Es la forma más primitiva de colisión. Imagina que envuelves a tus personajes y muebles en cajas de cartón que **NO pueden rotar**. Siempre miran al Norte.

* **Ventaja:** Matemáticas ultra rápidas (solo sumas y restas).
* **Desventaja:** Si tu personaje es un palo largo y rota 45 grados, la caja AABB se hace enorme y choca con el aire (falsos positivos).

**El Algoritmo:**
¿Se tocan las cajas?

```javascript
si (Jugador.derecha > Pared.izquierda &&
    Jugador.izquierda < Pared.derecha &&
    Jugador.arriba > Pared.abajo && ...) {
    ¡CHOQUE!
}
```

---

#### B. Método "Pro" (Física Real con Rapier) 🏎️

*Analogía: Fall Guys / Rocket League*

Imagina que tus objetos 3D son **fantasmas**: se ven pero se atraviesan.
Rapier es quien les da "cuerpo sólido" (Masa, Fricción, Rebote).

Para usarlo, envuelves tu JSX en `<RigidBody>`.

**Conceptos Clave:**

1. **RigidBody:** El "Alma" física. Decide si el objeto se mueve, cae por gravedad o es estático.
    * `type="dynamic"`: Una pelota, una caja, el jugador (Sufre gravedad).
    * `type="fixed"`: El suelo, paredes, una casa (Inamovible).
    * `type="kinematic"`: Un ascensor o plataforma móvil (Se mueve pero nada lo empuja).
2. **Collider:** La "Forma". Puede ser distinta al visual.
    * *Ejemplo:* Un árbol visualmente es complejo, pero su collider puede ser un simple cilindro (CylinderCollider) para ahorrar CPU.

**🌟 LO QUE TU BUSCAS: SENSORES (Triggers)**
*Analogía: Las cajas de items en Mario Kart o la línea de meta.*

Son paredes invisibles que **NO chocan** (las atraviesas) pero **AVISAN** cuando pasas por ellas. Es perfecto para detectar "Entró a la cocina" o "Pisó lava".

```tsx
<RigidBody 
  type="fixed" 
  sensor // <--- ¡LA CLAVE! Esto lo convierte en "fantasma detectable"
  onIntersectionEnter={() => console.log("¡Entraste a la Zona!")}
  onIntersectionExit={() => console.log("¡Saliste!")}
>
  {/* El cuerpo es invisible (sin mesh), solo geometría física */}
  <cuboidCollider args={[5, 5, 5]} /> 
</RigidBody>
```

---

#### C. Raycasting (El Puntero Láser) 🔫

*Analogía: Disparar en Call of Duty o picar bloques en Minecraft.*

No tiene nada que ver con "chocar" con el cuerpo. Es puramente visual/matemático.
Imagina que un **rayo láser invisible** sale desde el centro de tu cámara (tu cruz de mira).

El `Raycaster` te dice:

1. **Qué** tocó ese láser.
2. A qué **distancia**.
3. En qué **punto exacto** (x,y,z).

**¿Cuándo usarlo?**

* **Disparos:** ¿Le di al enemigo?
* **Interacción:** "Presionar F para abrir puerta" (Si estás mirando la puerta y estás cerca).
* **Hover:** Resaltar un objeto cuando lo miras.

```tsx
// Ejemplo: Detectar qué miras cada frame
useFrame((state) => {
  // Lanza rayo desde el centro (0,0) de la cámara
  state.raycaster.setFromCamera({ x: 0, y: 0 }, state.camera)
  
  // Verifica si el rayo corta algo
  const hits = state.raycaster.intersectObjects(scene.children)
  
  if (hits.length > 0) {
    // hits[0] es el objeto más cercano (el primero que tocó el láser)
    const objetoMirado = hits[0].object
    console.log("Estás mirando:", objetoMirado.name)
    
    // Ejemplo: Cambiar color si está cerca (menos de 3 metros)
    if (hits[0].distance < 3) {
      // Activar UI de "Abrir Puerta"
    }
  }
})
```

---

### Resumen: ¿Cuál uso?

| Tu Necesidad | Usa... | Ejemplo |
|--------------|--------|---------|
| "Quiero que no atraviese paredes" | **Rapier (RigidBody)** | Paredes, Suelo. |
| "Quiero saber si entró a la habitación" | **Rapier (Sensor)** | Checkpoints, Zonas de daño, Cambio de música. |
| "Quiero saber qué está mirando" | **Raycasting** | Mirar items, Textos informativos al pasar el mouse. |
| "Quiero disparar una bala instantánea" | **Raycasting** | Francotirador, Puntero láser. |

---

#### D. Optimización: ¡No calcules todo! (Octrees y Spatial Hashing) 🚀

Si tienes 1,000 objetos y cada uno verifica si choca con los otros 999... ¡Tu PC explota! (1 millón de cálculos por frame). Necesitas trucos para **solo revisar lo que está cerca**.

##### 1. Octrees (El Pastel Dividido) 🍰

*Analogía: Zoom de Google Maps.*
Divides tu mundo 3D en 8 cubos grandes. Si un cubo está vacío, lo ignoras por completo. Si está lleno, lo divides en otros 8 cubitos más pequeños, y así recursivamente.

* **Uso:** Motores gráficos, escenas estáticas complejas.
* **Lógica:** "¿Para qué calcular si choco con la cocina si estoy en el jardín?". El Octree descarta la cocina entera en un solo chequeo.

##### 2. Spatial Hashing (El Tablero de Ajedrez) 🏁

*Analogía: Casilleros de correo o la cuadrícula de "Hundir la flota".*
Divides el mundo en una cuadrícula infinita. Cada objeto se registra en su celda (bucket).
Para ver colisiones, **solo miras tu celda y las vecinas**.

* **Uso:** Física en tiempo real (Rapier usa una variante de esto o BVH), Minecraft (Chunks).
* **Ventaja:** Muy rápido de actualizar si las cosas se mueven mucho.

## ⚛️ Física con Rapier (para el futuro)

```bash
npm install @react-three/rapier
```

```tsx
import { Physics, RigidBody } from '@react-three/rapier'

// Envolver toda la escena
<Physics gravity={[0, -9.81, 0]}>
  
  {/* Objeto fijo (suelo) */}
  <RigidBody type="fixed" colliders="cuboid">
    <mesh>
      <boxGeometry args={[20, 1, 20]} />
    </mesh>
  </RigidBody>
  
  {/* Objeto dinámico (cae con gravedad) */}
  <RigidBody colliders="hull">
    <MyModel />
  </RigidBody>
  
</Physics>
```

### Tipos de colliders

* `cuboid` - Caja
* `ball` - Esfera
* `hull` - Envolvente convexa del mesh
* `trimesh` - Mesh exacto (más lento)

---

## 📁 Estructura del Proyecto

```
practicas-web3d/
├── public/
│   └── models/          # Modelos .glb/.gltf
├── src/
│   ├── app/
│   │   └── page.tsx     # Página principal
│   ├── components/
│   │   ├── Scene3D.tsx  # Escena principal con Canvas
│   │   ├── DebugTools.tsx
│   │   └── models/      # Componentes de modelos 3D
│   │       ├── Box.tsx
│   │       ├── Snoopy.tsx
│   │       ├── Table.tsx
│   │       └── Chair.tsx
└── notes.md             # ¡Este archivo!
```

---

## 🎯 Tips Generales

1. **Sombras:** Activar `shadows` en Canvas Y `castShadow`/`receiveShadow` en meshes/luces
2. **Posiciones:** Three.js usa sistema de coordenadas Y-up (Y es arriba)
3. **Rotaciones:** Se miden en radianes, no grados. `Math.PI` = 180°
4. **Performance:** Usa `<Suspense>` para cargar modelos y `useGLTF.preload()` para pre-cargar
5. **Debug:** Siempre ten herramientas de debug (Stats, Grid, AxesHelper) durante desarrollo

---

## 📖 Recursos Útiles

#### Recursos gratis

* [Sketchfab (Modelos gratis)](https://sketchfab.com/)

* [cg trader (Modelos gratis)](https://cgtrader.com/)
* [Poly Haven (HDRIs gratis)](https://polyhaven.com/)

#### Documentación

* [React Three Fiber Docs](https://docs.pmnd.rs/react-three-fiber)

* [Drei (Helpers)](https://github.com/pmndrs/drei)
* [Three.js Docs](https://threejs.org/docs/)
* [Rapier Physics](https://rapier.rs/)

---

*Última actualización: 31 de enero de 2026*
