import { create } from 'zustand'

interface TestState {
  fps: number
  timeLeft: number
  status: 'running' | 'completed'
  title: string
  setFps: (fps: number) => void
  setTimeLeft: (time: number) => void
  setStatus: (status: 'running' | 'completed') => void
  setTitle: (title: string) => void
  reset: (title: string, targetTime: number) => void
}

export const useTestStore = create<TestState>((set) => ({
  fps: 0,
  timeLeft: 60,
  status: 'running',
  title: 'Prueba de Rendimiento',
  setFps: (fps) => set({ fps }),
  setTimeLeft: (timeLeft) => set({ timeLeft }),
  setStatus: (status) => set({ status }),
  setTitle: (title) => set({ title }),
  reset: (title, targetTime) => set({ 
    title, 
    timeLeft: targetTime, 
    status: 'running', 
    fps: 0 
  })
}))
