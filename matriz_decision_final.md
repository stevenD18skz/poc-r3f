# Matriz de Decisión: Evaluación de Motores 3D Web (R3F vs BabylonJS)

Esta matriz te permite clasificar la viabilidad de uso entre **React Three Fiber (Three.js)** y **BabylonJS** tomando en cuenta aspectos más allá del rendimiento puro. Asigna un valor de **1 a 5** a cada criterio según tu experiencia tras realizar los benchmarks técnicos y revisar la documentación.

## 1. Sistema de Puntuación
A cada criterio se le asigna un "Peso" (Importancia para el proyecto). La fórmula es:
> `Puntaje Total = Puntuación (1-5) * Peso`

### Escala de Puntuación:
* 1 = Deficiente / Inexistente
* 2 = Aceptable pero requiere mucho esfuerzo
* 3 = Bueno / Adecuado
* 4 = Muy Bueno (Supera expectativas base)
* 5 = Excelente (Referente en la industria)

---

## 2. Matriz Ponderada

| Criterio de Decisión | Peso (1-3) | R3F (Three.js) (R) | BabylonJS (B) | Ponderado R3F (R x Peso) | Ponderado Babylon (B x Peso) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Rendimiento Poligonal** (Draw Calls y VRAM) | 3 | | | | |
| **Estabilidad de Físicas** (Rapier vs Havok) | 3 | | | | |
| **Madurez de Ecosistema** (Librerías extra, utilidades) | 2 | | | | |
| **Ergonomía (DX)** (Curva de aprendizaje, facilidad JSX) | 2 | | | | |
| **Comunidad y Documentación** (Ejemplos, foros resueltos) | 2 | | | | |
| **Depuración y Herramientas** (Inspectores web, r3f-perf vs Babylon Inspector) | 2 | | | | |
| **Soporte de Recursos (GLTF/Animaciones)** | 3 | | | | |
| **Tamaño del Bundle / Tiempo de Carga** | 2 | | | | |
| **Integración con Interfaz (React/DOM)** | 3 | | | | |
| **Mantenibilidad a largo plazo** | 2 | | | | |
| **TOTALES** | **24** | **--**| **--**| **--** | **--** |

---

## 3. Conclusión Final y Resumen Técnico

**Motor Seleccionado:** __________________________________

### Justificación de la decisión:
*Escribe aquí los motivos técnicos y de negocio que inclinaron la balanza.*

**Puntos Fuertes del motor elegido:**
1. _(Ej: Integración perfecta con el stack React existente permitiendo superposición de UI sin problemas)._
2.
3.

**Puntos Débiles asumidos (Trade-offs):**
1. _(Ej: Mayor sobrecarga de CPU por el Virtual DOM comparado con un render loop vanilla)._
2.
3.

---

## 4. Resultados de Benchmarks Técnicos (R3F vs BabylonJS)

Esta tabla resume los datos empíricos obtenidos en las pruebas de estrés. Úsala para completar las puntuaciones de la sección 2.

| Caso de Prueba (Test Case) | Motor | FPS Promedio | Latencia (ms) | Draw Calls | Memoria (MB) | Triángulos / Objetos |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Scene Idle** | R3F | 60 | ~16.6 | 1-5 | ~60 | Base |
| (Carga Base) | Babylon | | | | | |
| **Triángulos Estáticos** | R3F | 60 | ~16.6 | 1 | ~180 | 512,000 |
| (Instanced Rendering) | Babylon | | | | | |
| **Triángulos Rotando** | R3F | 60 | ~16.6 | 1 | ~150 | 4,000 |
| (CPU/GPU Transform) | Babylon | | | | | |
| **Luces Dinámicas** | R3F | 60 | ~16.7 | 10-15 | ~120 | Sombras activas |
| (Shadow Mapping) | Babylon | | | | | |
| **Raycasting** | R3F | 60 | ~16.6 | 2 | ~100 | 500 objetos |
| (Interactividad) | Babylon | | | | | |
| **Animation Stress** | R3F | ~58 | ~17.1 | Varios | ~250 | 500 useFrame |
| (Render Loop) | Babylon | | | | | |
| **Simulación NPC** | R3F | 60 | ~16.6 | 5-10 | ~200 | IA Asincrónica |
| (Lógica de Negocio) | Babylon | | | | | |
| **Estrés de Física** | R3F | ~55 | ~18.2 | 1 | ~300 | 200 RigidBodies |
| (Rapier vs Havok) | Babylon | | | | | |
| **Estrés de VRAM** | R3F | 60 | ~16.6 | 20 | ~600 | 200 Texturas 1K |
| (Memory Leak/VRAM) | Babylon | | | | | |

---

### Cómo usar esta matriz:
1. Revisa los datos empíricos de tu archivo de métricas exportado (JSON/CSV) y tus percepciones de desarrollo.
2. Llena las columnas R3F y BabylonJS con números del 1 al 5 en la tabla del apartado 2.
3. Multiplica por el peso en las siguientes dos columnas y suma el total al final. El de mayor número será tu elección objetiva más favorable según los requisitos de tu Tesis de Grado.

