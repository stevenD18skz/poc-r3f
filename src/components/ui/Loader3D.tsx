'use client'

import { Html, useProgress } from '@react-three/drei'

export default function Loader3D() {
  const { progress } = useProgress()

  return (
    <Html center>
      <div className="flex flex-col items-center justify-center w-64 text-center pointer-events-none select-none">
        {/* Spinner animado */}
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 rounded-full border-2 border-white/5" />
          <div 
            className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" 
            style={{ animationDuration: '0.8s' }}
          />
        </div>
        
        {/* Texto y Porcentaje */}
        <div className="space-y-1">
          <h3 className="text-white font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">
            Cargando Escena
          </h3>
          <div className="text-blue-400 font-mono text-[12px] font-bold">
            {progress.toFixed(0)}%
          </div>
          
          {/* Barra de progreso sutil */}
          <div className="w-full h-[2px] bg-white/5 rounded-full overflow-hidden mt-2">
            <div 
              className="h-full bg-blue-500 transition-all duration-300 ease-out shadow-[0_0_8px_#3b82f6]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </Html>
  )
}
