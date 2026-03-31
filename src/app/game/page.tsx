import House from '@/components/world/House'
import Link from 'next/link'

export default function Page() {
  return (
    <main className="relative">
      {/* Botón flotante para el Dashboard de Pruebas */}
      <div className="fixed top-8 right-8 z-100 animate-pulse-slow">
        <Link 
          href="/test" 
          className="bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 text-white px-6 py-3 rounded-2xl flex items-center gap-2 group transition-all"
        >
          <span className="w-2 h-2 bg-blue-500 rounded-full group-hover:bg-blue-400"></span>
          Pruebas Técnicas
          <svg className="w-4 h-4 translate-x-0 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </Link>
      </div>

      {/* Escena 3D Principal (La Casa) */}
      <House />
    </main>
  )
}