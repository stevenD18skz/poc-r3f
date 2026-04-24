# Análisis de Rendimiento: React Three Fiber (R3F)
Este documento formaliza los datos obtenidos de los primeros tests de rendimiento realizados en la Prueba de Concepto (PoC) utilizando React Three Fiber (R3F). Los tests se dividen en tres escenarios principales para medir la capacidad de renderizado y el impacto en CPU y memoria.
## 1. Escenarios de Prueba
1. **Escena Idle (60s):** Escena base sin carga adicional para establecer el consumo de recursos en reposo (baseline).
2. **Triángulos Estáticos:** Renderizado de múltiples instancias geométricas estáticas.
3. **Triángulos Rotando:** Renderizado de múltiples instancias con actualización de transformaciones (rotación) por cada frame.
> [!NOTE]
> En todas las pruebas se observó que el número de **Draw Calls se mantiene en 1**, lo que indica que se está utilizando correctamente una estrategia de **Instancing** (`InstancedMesh`). Esto es crítico para lograr las cantidades de entidades renderizadas. Cada entidad equivale a un polígono de 16 triángulos.
---
## 2. Resultados Obtenidos
### 2.1. Escena Idle (Baseline)
- **FPS:** ~60
- **CPU:** ~0.60 ms
- **RAM:** ~119 MB
- **Triángulos:** 12
**Síntesis:** Esta escena establece nuestra base de medición. Demuestra que el entorno base de React Three Fiber por sí solo, sin carga adicional, consume muy pocos recursos computacionales (~0.60ms de CPU por frame) y mantiene una huella de memoria inicial bastante ligera y estable de ~119 MB.
### 2.2. Triángulos Estáticos
Se renderizaron desde 1,000 hasta 4,096,000 entidades (cada una aportando triángulos al conteo total).
| Entidades | Triángulos Totales | FPS Promedio | CPU (ms) | Memoria RAM (MB) |
|-----------|--------------------|--------------|----------|------------------|
| 1,000     | 16,000             | 60.25        | 0.59     | 122.00           |
| 2,000     | 32,000             | 59.91        | 0.54     | 127.00           |
| 4,000     | 64,000             | 59.49        | 0.50     | 114.00           |
| 8,000     | 128,000            | 59.88        | 0.52     | 115.00           |
| 16,000    | 256,000            | 60.03        | 0.50     | 113.00           |
| 32,000    | 512,000            | 60.70        | 0.50     | 112.57           |
| 64,000    | 1,024,000          | 60.82        | 0.46     | 120.00           |
| 128,000   | 2,048,000          | 59.85        | 0.74     | 141.00           |
| 256,000   | 4,096,000          | 62.53        | 0.79     | 117.00           |
| 512,000   | 8,192,000          | 50.71        | 1.17     | 181.00           |
| 1,024,000 | 16,384,000         | 30.98        | 1.28     | 173.00           |
| 2,048,000 | 32,768,000         | 19.67        | 1.50     | 346.00           |
| 4,096,000 | 65,536,000         | 10.72        | 1.80     | 639.00           |
**Síntesis:** El rendimiento se mantiene impecable (60 FPS) hasta las 256,000 entidades estáticas. A partir de medio millón de entidades, los FPS comienzan a decaer gradualmente debido a que la GPU (tarjeta gráfica) no da abasto para procesar y dibujar la enorme cantidad de geometría (rasterización). Es vital notar que la carga en la **CPU se mantiene extremadamente baja (menos de 2ms)** en todo momento, confirmando que en contenido estático, el límite lo impone puramente la capacidad de la tarjeta gráfica.
### 2.3. Triángulos Rotando
Mismas cantidades de entidades, pero aplicando una rotación a cada instancia en cada frame del bucle de renderizado.
| Entidades | Triángulos Totales | FPS Promedio | CPU (ms) | Memoria RAM (MB) |
|-----------|--------------------|--------------|----------|------------------|
| 1,000     | 16,000             | 60.07        | 0.55     | 117.00           |
| 2,000     | 32,000             | 60.17        | 0.67     | 112.00           |
| 4,000     | 64,000             | 60.60        | 1.03     | 103.00           |
| 8,000     | 128,000            | 59.95        | 1.40     | 113.00           |
| 16,000    | 256,000            | 60.29        | 2.63     | 112.00           |
| 32,000    | 512,000            | 59.85        | 4.03     | 114.00           |
| 64,000    | 1,024,000          | 59.87        | 7.10     | 123.00           |
| 128,000   | 2,048,000          | 60.50        | 16.43    | 191.00           |
| 256,000   | 4,096,000          | 31.16        | 31.25    | 171.00           |
| 512,000   | 8,192,000          | 15.52        | 62.90    | 396.00           |
| 1,024,000 | 16,384,000         | 8.70         | 114.00   | 427.00           |
| 2,048,000 | 32,768,000         | 4.29         | 231.60   | 762.00           |
| 4,096,000 | 65,536,000         | 2.20         | 454.80   | 1442.00          |
**Síntesis:** Al introducir cálculos de rotación frame a frame gestionados por JavaScript, el límite de fluidez cae a la mitad (128,000 entidades). A diferencia del escenario estático, la pérdida dramática de FPS aquí **es culpa de la CPU**. El procesador no logra calcular todas las matrices de transformación en los 16.6ms requeridos, asfixiando el renderizado (llegando a tardar 454ms por frame). Adicionalmente, el constante trasiego de datos entre memoria y procesador dispara agresivamente el uso de RAM, triplicando el consumo respecto a la geometría estática.
---
## 3. Observaciones y Análisis
### 1. El éxito del Instancing
Tanto en objetos estáticos como dinámicos, **el sistema mantuvo 1 solo Draw Call**. Esta es la única forma en que WebGL/Three.js puede manejar millones de polígonos sin bloquear el hilo principal enviando llamadas de dibujo individuales. La estrategia técnica base actual es sumamente sólida para renderizado masivo.
### 2. Cuellos de Botella: Estático (GPU) vs Rotando (CPU)
> [!IMPORTANT]  
> Existe una diferencia fundamental en qué recurso limita el rendimiento dependiendo del escenario.
*   **En la escena ESTÁTICA:** El sistema mantiene los ~60 FPS impecables hasta las 256,000 entidades (4 millones de triángulos). Al pasar a las 512,000 entidades (8 millones de triángulos), los FPS caen a ~50, y luego decrecen a ~30 en 16M de triángulos.
    *   **Análisis:** En este escenario, **el cuello de botella es la GPU** (rasterización y proceso de fragmentos/vértices). Observamos que la **CPU se mantiene inactiva (1.17 ms - 1.80 ms)**, lo que indica que JavaScript ya hizo su trabajo y simplemente está esperando que la tarjeta gráfica dibuje la enorme cantidad de píxeles/geometría.
*   **En la escena ROTANDO:** El rendimiento cae bruscamente a la mitad (~31 FPS) a partir de las 256,000 entidades (4 millones de triángulos).
    *   **Análisis:** En este caso **el cuello de botella es claramente la CPU**. El tiempo de CPU por frame salta de 16.43ms (en 128k entidades) a **31.25ms** (en 256k entidades). Para mantener 60 FPS, un frame debe resolverse en ~16.6ms. Como actualizar las matrices de transformación (cálculos matemáticos en JavaScript) de cientos de miles de objetos toma más de 30ms (llegando a más de 200ms en cargas mayores), el framerate se limita por la CPU y cae inevitablemente.
    *   **Comportamiento Single-Thread y GPU Inactiva:** Dado que JavaScript es de un solo hilo, un núcleo de la CPU puede estar al 100% de uso mientras que el porcentaje global se ve bajo (ej. 24%). En este estado límite, el uso de la GPU reporta frecuentemente 0ms/0% simplemente porque **la GPU pasa el 99% de su tiempo esperando** a que el hilo único de JavaScript (CPU) termine de procesar las matrices. La potencia de la tarjeta gráfica queda desperdiciada esperando instrucciones.
### 3. Escalado de Consumo de Memoria (RAM)
*   **Geometría Estática:** El consumo es bastante eficiente, incluso para 4 millones de objetos ronda los ~600 MB.
*   **Geometría Dinámica (Rotando):** El consumo escala de forma más agresiva, alcanzando picos de ~1.4 GB (1442 MB) en la prueba máxima. Esto se debe a la cantidad de matrices que la CPU tiene que leer, calcular y enviar al buffer en la memoria repetidamente en cada render.
### 4. Consideraciones de Hardware (iGPU y Memoria Compartida)
*   **Gráficos Integrados (ej. AMD Ryzen 5 5600G):** En sistemas con iGPU, la memoria de video "Dedicada" (UMA) y la memoria "Compartida" son físicamente la misma RAM del sistema. Esto significa que el ancho de banda de la memoria está compartido entre CPU y GPU. Un volumen masivo de actualizaciones de posición/rotación no solo asfixia el hilo único de JavaScript, sino que aumenta severamente el tráfico en el bus de memoria (visible en el "Copy Graph" del sistema), lo que resta recursos a la propia tarea de renderizado.
## 4. Conclusiones y Próximos Pasos
1. **Límites Prácticos Actuales:**
    *   Si los objetos son **estáticos**, el límite antes de perder la fluidez (60 FPS) se encuentra en los **4 millones de triángulos** (aprox. 250k entidades).
    *   Si los objetos **se mueven o actualizan (transforman) constantemente**, el límite baja a los **2 millones de triángulos** (aprox. 128k entidades) debido a las limitaciones del hilo de JavaScript (CPU).
2. **Posibles Optimizaciones a Explorar:**
    *   Si se requiere animar más de 100k entidades simultáneamente sin perder los 60 FPS, se debe dejar de realizar el cálculo en la CPU (JavaScript) y **trasladarlo a la GPU usando un Shader Material (Vertex Shader)** o **Compute Shaders**.
    *   Implementar **Frustum Culling** para evitar actualizar matrices de objetos que no están visibles en la cámara, lo que salvaría tiempo de CPU drásticamente.
    *   Si la PoC requiere una cantidad superior de entidades, se recomienda evaluar si todas las entidades requieren actualización frame a frame o si se pueden utilizar técnicas de actualización espacial (ej. quadtrees / octrees) para animar solo lo cercano.
3. **Recomendaciones para Futuras Pruebas (Comparativa Justa R3F vs Babylon):**
    *   **Aislar el Entorno de Test:** Eliminar componentes como `<Environment>` en R3F, ya que añaden cálculos de iluminación basados en imagen (HDRI) y shaders extra que no aportan al test de instancing. Utilizar colores de fondo sólidos evita "contaminar" las métricas.
    *   **Aumentar Resolución Geométrica:** Para no depender solo de la cantidad de instancias (lo cual asfixia a la CPU rápidamente al animar), se recomienda probar subir los segmentos de las geometrías base (ej. de 3 a 8 segmentos). Esto empuja a la GPU a rasterizar más detalle sin aumentar el número de matrices que la CPU debe calcular.
---
## 5. Comparativa Técnica: R3F vs Babylon.js
| Test | Métrica Principal | Observaciones Técnicas (R3F) | Comportamiento en Babylon |
| :--- | :--- | :--- | :--- |
| **1. IA & Raycasting** | CPU Scripting (ms) | **React Overhead**: Cada evento `onPointerOver` dispara el ciclo de eventos de React. Con 2000 objetos, el "Event Raycaster" de R3F puede saturar el hilo principal sin un BVH. | Babylon gestiona el picking de forma nativa en su loop de C++, siendo mucho más ligero para miles de hits. |
| **2. Animación Stress** | FPS / Delta Time | **Lifecycle Cost**: Usar 2000 componentes individuales obliga a React a "reconciliar" 2000 objetos/frame. La solución DEBE ser `instancedMesh`. | Babylon no tiene un árbol virtual, por lo que manejar 2000 nodos individuales es menos costoso a nivel de CPU. |
| **3. Física (Rapier)** | Sim Time / Step | **Bridge de Datos**: El costo real en R3F es la copia de matrices desde la memoria de WASM a Three.js. `InstancedRigidBodies` es vital. | Babylon con Havok usa un sistema de clamping de energía superior. Havok está altamente optimizado para juegos AAA. |
| **4. VRAM (Texturas)** | VRAM MB / RAM | **Memory Leaks**: Three.js es "perezoso" con la limpieza. Sin `.dispose()`, la VRAM subirá hasta colapsar. React no limpia GPU por sí solo. | Babylon tiene un AssetManager y un GC de texturas integrado que libera memoria de forma más predecible. |
| **5. Post-Procesado** | GPU Frame Time | **Buffer Chain**: `EffectComposer` crea una cadena de texturas. El SSAO y otros efectos requieren múltiples pases que consumen ancho de banda. | Babylon usa un `DefaultRenderingPipeline` extremadamente eficiente que agrupa efectos en menos pases de shader. |
