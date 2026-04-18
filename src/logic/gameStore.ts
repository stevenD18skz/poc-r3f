import { create } from 'zustand'
import processMap from '@/utils/generator'
import type Room from '@/types/room'

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export type PetId = 'snoopy' | 'cat-1' | 'cat-2'

export interface Pet {
    id: PetId
    name: string
    emoji: string
    isFed: boolean
}

export type MissionStatus = 'pending' | 'in-progress' | 'completed'

export interface Mission {
    id: string
    title: string
    description: string
    status: MissionStatus
    /** IDs de mascotas que hay que alimentar para cumplir esta misión */
    requiredPets: PetId[]
}

export interface Player {
    name: string
    food: number
}

// ─────────────────────────────────────────────
// INITIAL DATA
// ─────────────────────────────────────────────

const INITIAL_PETS: Pet[] = [
    { id: 'snoopy', name: 'Snoopy', emoji: '🐶', isFed: false },
    { id: 'cat-1', name: 'Whiskers', emoji: '🐱', isFed: false },
    { id: 'cat-2', name: 'Mittens', emoji: '🐾', isFed: false },
]

const INITIAL_MISSIONS: Mission[] = [
    {
        id: 'feed-all',
        title: '¡Hora de comer!',
        description: 'Alimenta a las 3 mascotas repartidas por la casa.',
        status: 'in-progress',
        requiredPets: ['snoopy', 'cat-1', 'cat-2'],
    },
]

// ─────────────────────────────────────────────
// STORE INTERFACE
// ─────────────────────────────────────────────

interface GameState {
    // — Player —
    player: Player
    addFood: (amount: number) => void

    // — Pets —
    pets: Pet[]
    feedPet: (petId: PetId) => void

    // — Missions —
    missions: Mission[]

    // — Map Configuration —
    board: Room[][]
    regenerateBoard: () => void

    // — Game control —
    isPlaying: boolean
    currentRoom: string
    isInventoryOpen: boolean

    setIsPlaying: (playing: boolean) => void
    setRoom: (roomName: string) => void
    toggleInventory: () => void

    // — Helpers (derived, computed on access) —
    getPet: (id: PetId) => Pet | undefined
    getActiveMission: () => Mission | undefined
    isMissionComplete: (missionId: string) => boolean
}

// ─────────────────────────────────────────────
// STORE
// ─────────────────────────────────────────────

export const useGameStore = create<GameState>((set, get) => ({
    // ── Player ──
    player: { name: 'Jugador', food: 5 },

    addFood: (amount) =>
        set((s) => ({ player: { ...s.player, food: s.player.food + amount } })),

    // ── Pets ──
    pets: INITIAL_PETS,

    feedPet: (petId) =>
        set((s) => {
            const { player, pets, missions } = s

            // No comida o ya alimentada
            if (player.food <= 0) return s
            const pet = pets.find((p) => p.id === petId)
            if (!pet || pet.isFed) return s

            const updatedPets = pets.map((p) =>
                p.id === petId ? { ...p, isFed: true } : p
            )

            // Actualizar estado de misiones
            const updatedMissions = missions.map((mission) => {
                if (mission.status === 'completed') return mission
                const allDone = mission.requiredPets.every(
                    (rid) => updatedPets.find((p) => p.id === rid)?.isFed
                )
                return {
                    ...mission,
                    status: allDone ? ('completed' as MissionStatus) : ('in-progress' as MissionStatus),
                }
            })

            return {
                player: { ...player, food: player.food - 1 },
                pets: updatedPets,
                missions: updatedMissions,
            }
        }),

    // ── Missions ──
    missions: INITIAL_MISSIONS,

    // ── Map Configuration ──
    board: processMap(3),
    regenerateBoard: () => set({ board: processMap(3) }),

    // ── Game control ──
    isPlaying: false,
    currentRoom: 'Desconocido',
    isInventoryOpen: false,

    setIsPlaying: (playing) => set({ isPlaying: playing }),
    setRoom: (roomName) => set({ currentRoom: roomName }),
    toggleInventory: () => set((s) => ({ isInventoryOpen: !s.isInventoryOpen })),

    // ── Helpers ──
    getPet: (id) => get().pets.find((p) => p.id === id),
    getActiveMission: () => get().missions.find((m) => m.status !== 'completed'),
    isMissionComplete: (missionId) =>
        get().missions.find((m) => m.id === missionId)?.status === 'completed',
}))
