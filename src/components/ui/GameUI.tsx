'use client'

import { useGameStore } from '@/logic/gameStore'

export default function GameUI() {
    const player      = useGameStore(s => s.player)
    const pets        = useGameStore(s => s.pets)
    const missions    = useGameStore(s => s.missions)
    const isPlaying   = useGameStore(s => s.isPlaying)
    const setIsPlaying = useGameStore(s => s.setIsPlaying)
    const currentRoom = useGameStore(s => s.currentRoom)

    const activeMission = missions[0]
    const fedCount = pets.filter(p => p.isFed).length
    const allFed   = fedCount === pets.length

    return (
        <>
            {/* ── MENÚ INICIAL / PAUSA ── */}
            {!isPlaying && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white/10 text-white p-10 rounded-2xl text-center shadow-2xl border border-white/20 max-w-lg w-full">
                        <h1 className="text-5xl font-extrabold mb-2 bg-linear-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent">
                            Pet House 🏠
                        </h1>
                        <p className="mb-6 text-base text-gray-300 font-light">
                            Explora la casa y alimenta a las 3 mascotas
                        </p>

                        {/* Controles */}
                        <div className="grid grid-cols-2 gap-3 text-sm text-gray-300 mb-8 font-mono bg-black/20 p-4 rounded-lg">
                            <div className="flex items-center gap-2"><span className="bg-white/10 px-2 rounded">W A S D</span> Moverse</div>
                            <div className="flex items-center gap-2"><span className="bg-white/10 px-2 rounded">MOUSE</span> Mirar</div>
                            <div className="flex items-center gap-2"><span className="bg-white/10 px-2 rounded">E</span> Interactuar</div>
                            <div className="flex items-center gap-2"><span className="bg-white/10 px-2 rounded">ESC</span> Pausa</div>
                        </div>

                        {/* Resumen de misión si hay progreso */}
                        {fedCount > 0 && (
                            <div className="mb-6 bg-amber-500/20 border border-amber-500/40 rounded-lg p-3 text-amber-200 text-sm">
                                Progreso: {fedCount}/{pets.length} mascotas alimentadas
                            </div>
                        )}

                        <button
                            id="start-button"
                            onClick={() => setIsPlaying(true)}
                            className="w-full bg-amber-400 text-black font-bold text-xl py-4 px-8 rounded-xl hover:scale-105 hover:bg-amber-300 transition-all shadow-[0_0_30px_rgba(251,191,36,0.3)] cursor-pointer"
                        >
                            {fedCount > 0 ? 'CONTINUAR 🐾' : 'JUGAR 🐾'}
                        </button>
                    </div>
                </div>
            )}

            {/* ── CROSSHAIR ── */}
            {isPlaying && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                    <div className="w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_4px_rgba(0,0,0,1)]" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 border border-white/30 rounded-full" />
                </div>
            )}

            {/* ── HUD PANEL IZQUIERDO ── */}
            <div className="absolute bottom-4 left-4 bg-black/80 text-white p-4 rounded-xl min-w-[240px] pointer-events-none select-none border border-white/10 backdrop-blur-md shadow-lg space-y-3">

                {/* Jugador */}
                <div>
                    <h3 className="text-xs uppercase tracking-widest text-gray-400 border-b border-white/10 pb-1 mb-2">Jugador</h3>
                    <div className="flex justify-between text-sm font-mono">
                        <span className="text-gray-300">📍 {currentRoom}</span>
                        <span className={player.food > 0 ? 'text-amber-400' : 'text-red-400'}>
                            🍖 × {player.food}
                        </span>
                    </div>
                </div>

                {/* Mascotas */}
                <div>
                    <h3 className="text-xs uppercase tracking-widest text-gray-400 border-b border-white/10 pb-1 mb-2">
                        Mascotas {fedCount}/{pets.length}
                    </h3>
                    <div className="space-y-1">
                        {pets.map(pet => (
                            <div key={pet.id} className="flex items-center gap-2 text-sm">
                                <span>{pet.emoji}</span>
                                <span className={pet.isFed ? 'text-green-400 line-through' : 'text-gray-300'}>
                                    {pet.name}
                                </span>
                                {pet.isFed && <span className="ml-auto text-green-400 text-xs">✓</span>}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Misión activa */}
                {activeMission && (
                    <div>
                        <h3 className="text-xs uppercase tracking-widest text-gray-400 border-b border-white/10 pb-1 mb-2">
                            Misión
                        </h3>
                        <p className="text-xs text-gray-300 mb-2">{activeMission.description}</p>
                        {/* barra de progreso */}
                        <div className="w-full bg-white/10 rounded-full h-1.5">
                            <div
                                className="bg-amber-400 h-1.5 rounded-full transition-all duration-500"
                                style={{ width: `${(fedCount / pets.length) * 100}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Misión completada */}
                {allFed && (
                    <div className="bg-green-500/20 text-green-300 text-xs py-2 px-3 rounded border border-green-500/30 text-center font-bold animate-pulse">
                        🎉 ¡MISIÓN COMPLETADA!
                    </div>
                )}
            </div>
        </>
    )
}