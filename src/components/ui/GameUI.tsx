'use client'

import { useGameStore } from '@/logic/gameStore'

export default function GameUI() {
  const food = useGameStore(state => state.food)
  const fedPets = useGameStore(state => state.fedPets)
  const isPlaying = useGameStore(state => state.isPlaying)
  const setIsPlaying = useGameStore(state => state.setIsPlaying)
  const currentRoom = useGameStore(state => state.currentRoom)

  return (
    <>
      {/* --- MENU INICIAL / PAUSA --- */}
      {/* Solo visible si NO estamos jugando */}
      {!isPlaying && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 transition-all duration-500">
          <div className="bg-white/10 text-white p-10 rounded-2xl text-center shadow-2xl border border-white/20 max-w-lg w-full">
            <h1 className="text-5xl font-extrabold mb-6 bg-linear-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent drop-shadow-lg">
              Snoopy's House
            </h1>
            <p className="mb-8 text-lg text-gray-200 font-light">
              Explora el mundo y alimenta a tus mascotas.
            </p>

            <div className="grid grid-cols-2 gap-4 text-sm text-gray-300 mb-8 font-mono bg-black/20 p-4 rounded-lg">
              <div className="flex items-center gap-2"><span className="bg-white/10 px-2 rounded">W A S D</span> Moverse</div>
              <div className="flex items-center gap-2"><span className="bg-white/10 px-2 rounded">MOUSE</span> Mirar</div>
              <div className="flex items-center gap-2"><span className="bg-white/10 px-2 rounded">E</span> Interactuar</div>
              <div className="flex items-center gap-2"><span className="bg-white/10 px-2 rounded">ESC</span> Menú</div>
            </div>

            {/* ESTE ES EL BOTÓN MÁGICO QUE ACTIVA "FPSControls" */}
            <button
              id="start-button"
              onClick={() => setIsPlaying(true)}
              className="w-full bg-white text-black font-bold text-xl py-4 px-8 rounded-xl hover:scale-105 hover:bg-blue-50 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)] pointer-events-auto cursor-pointer"
            >
              JUGAR AHORA 🐾
            </button>
          </div>
        </div>
      )}

      {/* --- HUD DE JUEGO (Visible siempre o manejado por CSS) --- */}

      {/* 🎯 CROSSHAIR (Mira Central) - Solo visible si jugamos */}
      {isPlaying && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-80">
          <div className="w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_4px_rgba(0,0,0,1)]"></div>
          {/* Círculo sutil alrededor */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 border border-white/20 rounded-full"></div>
        </div>
      )}

      {/* Panel de Estadísticas */}
      <div className="absolute bottom-4 left-4 bg-black/80 text-white p-4 rounded-xl min-w-[220px] pointer-events-none select-none border border-white/10 backdrop-blur-md shadow-lg">
        <h3 className="font-bold mb-3 border-b border-white/20 pb-2 text-xs uppercase tracking-widest text-gray-400">Estado</h3>

        <div className="space-y-2 font-mono text-sm">
          <p className="flex items-center justify-between text-blue-300">
            <span>📍 Ubicación:</span>
            <span className="font-bold">{currentRoom}</span>
          </p>
          <p className={`flex items-center justify-between ${fedPets.length >= 1 ? "text-green-400" : "text-gray-300"}`}>
            <span>🐕 Alimentados:</span>
            <span className="font-bold text-lg">{fedPets.length}/1</span>
          </p>
          <p className={`flex items-center justify-between ${food > 0 ? "text-yellow-400" : "text-red-400"}`}>
            <span>🍖 Comida:</span>
            <span className="font-bold text-lg">{food}</span>
          </p>
        </div>

        {fedPets.length >= 1 && (
          <div className="mt-3 bg-green-500/20 text-green-300 text-xs py-2 px-1 rounded border border-green-500/30 text-center font-bold animate-pulse">
            ★ ¡MISIÓN COMPLETADA! ★
          </div>
        )}
      </div>
    </>
  )
}