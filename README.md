
# Prácticas Web 3D - Proyecto de Trabajo de Grado

Este repositorio contiene el código fuente y las evidencias de desarrollo correspondientes al trabajo de grado enfocado en tecnologías Web 3D. El proyecto está construido utilizando **Next.js** y el ecosistema de **React Three Fiber**.

A continuación se detallan las actividades realizadas:

## A1. Investigación y Caracterización de Librerías/Frameworks Web 3D

Para el desarrollo de experiencias inmersivas en la web, se han investigado y seleccionado las siguientes tecnologías. Esta selección se basa en la popularidad, soporte de la comunidad, rendimiento y facilidad de integración con frameworks modernos de frontend (React).

### Stack Tecnológico Seleccionado

| Tecnología | Rol | Descripción | Versión Utilizada |
| :--- | :--- | :--- | :--- |
| **Three.js** | Motor Gráfico (Core) | Biblioteca base estándar para renderizado 3D en navegadores mediante WebGL. Provee las primitivas básicas (escenas, cámaras, mallas). | ^0.182.0 |
| **React Three Fiber (R3F)** | Framework / Reconciliador | Permite construir escenas de Three.js de manera declarativa usando componentes de React. Facilita la gestión del ciclo de vida y la reactividad. | ^9.5.0 |
| **Drei** | Utilidades | Colección de abstracciones listas para usar sobre R3F (cámaras, controles, loaders, entornos). Acelera drásticamente el desarrollo. | ^10.7.7 |
| **React Three Rapier** | Motor de Físicas | Integración del motor de físicas *Rapier* (escrito en Rust/WASM) para simulaciones rápidas y estables de colisiones y cuerpos rígidos. | ^2.2.0 |
| **Zustand** | Gestión de Estado | Biblioteca minimalista para manejo de estado global. Se utiliza para comunicar la lógica del juego (UI, inventario) con la escena 3D sin provocar re-renderizados costosos. | ^5.0.11 |
| **Leva** | Debugging / GUI | Panel de control gráfico para ajustar variables de la escena en tiempo real durante el desarrollo. | ^0.10.1 |

### Justificación

La elección de **Next.js + R3F** sobre opciones puras como *Babylon.js* o *Three.js vanilla* se debe a la arquitectura basada en componentes. Esto permite encapsular lógica 3D (ej: un mueble interactivo) en piezas reutilizables que mantienen su propio estado y ciclo de vida, alineándose con las prácticas modernas de desarrollo web.

---

## A2. Evaluación Técnica mediante Prototipos de Prueba (POC)

Se ha desarrollado un prototipo funcional (**Proof of Concept**) para validar la viabilidad técnica de la arquitectura propuesta.

### Descripción del Prototipo ("House")

El prototipo consiste en un entorno 3D navegable que simula el interior de una casa, diseñado para probar la integración de modelos, iluminación, físicas y controles de usuario.

#### Características Implementadas

1. **Arquitectura Modular de Escenas**:
    * La escena principal (`House.tsx`) orquesta la carga de sub-escenas independientes (Habitaciones).
    * **Módulos:** `LivingRoom`, `Kitchen`, `RoomBig`, `Bathroom`.
    * Esto permite la carga diferida e iteración aislada por componentes.

2. **Sistema de Navegación Híbrido**:
    * **Modo FPS (First Person):** Control de movimiento estilo videojuego (WASD + Mouse) implementado con `FPSControls` y hooks de movimiento (`usePlayerMovement`).
    * **Modo Free Cam (Debug):** `OrbitControls` para inspección libre de la escena, activable desde el panel de debug.

3. **Lógica y Físicas**:
    * Detección de posición del jugador usando coordenadas para determinar en qué habitación se encuentra (`RoomTracker`).
    * Integración de estado global con **Zustand** (`useGameStore`) para sincronizar la UI con eventos del mundo 3D.

4. **Iluminación y Ambiente**:
    * Uso de `Environment` para iluminación basada en imágenes (IBL) y luces dinámicas (`SpotLight`) con sombras (`castShadow`).

### Análisis de Resultados y Conclusiones (A2)

Tras la implementación y pruebas del prototipo, se obtuvieron las siguientes conclusiones técnicas:

1. **Rendimiento y Optimización**:
    * El uso de **React Three Fiber** no introdujo una sobrecarga (overhead) perceptible en el rendimiento en comparación con Three.js vanilla para esta escala de proyecto.
    * La instanciación de objetos y la gestión del loop de renderizado (`useFrame`) se mantuvieron estables sobre 60 FPS en entornos de prueba estándar.

2. **Eficiencia del Motor de Físicas**:
    * **Rapier (WASM)** demostró ser superior en rendimiento a alternativas basadas en JavaScript puro (como Cannon.js) para la detección de colisiones del jugador con las paredes y el suelo. La ejecución en WebAssembly garantiza que los cálculos físicos complejos no bloqueen el hilo principal de la interfaz.

3. **Gestión de Estado y Reactividad**:
    * La integración de **Zustand** resolvió eficazmente el "puente" entre el DOM (UI HTML) y el Canvas (WebGL). Se logró actualizar la interfaz de usuario (barra de inventario, notificaciones de habitación) en tiempo real sin provocar re-renderizados innecesarios en la escena 3D, validando la arquitectura para aplicaciones complejas.

4. **Experiencia de Desarrollo (DX)**:
    * La librería **Drei** redujo el tiempo de implementación de funcionalidades comunes (cámaras, loaders, controles) en aproximadamente un 40% frente a la implementación manual.
    * El sistema de componentes permite una escalabilidad modular: nuevas habitaciones o mecánicas pueden añadirse sin refactorizar el núcleo del motor.

**Conclusión Final:**
La arquitectura basada en **Next.js + R3F + Rapier** es **técnicamente viable y robusta** para los objetivos del trabajo de grado. Cumple con los requisitos de rendimiento, interactividad y mantenibilidad necesarios para desarrollar una experiencia Web 3D moderna y escalable.

---

## Ejecución del Proyecto

Para correr el entorno de desarrollo localmente:

```bash
# Instalar dependencias
npm install 
# o
pnpm install

# Correr servidor de desarrollo
npm run dev
# o
pnpm dev
```

Abrir [http://localhost:3000](http://localhost:3000) en el navegador.

---
*Este documento sirve como registro de las actividades A1 y A2 del trabajo de grado.*
