import React from 'react';
import { Role } from '../types';
import { Building2, ShieldCheck, User, ChevronRight, Bell, Users, Wrench, CalendarDays } from 'lucide-react';

interface RoleSelectorProps {
  onSelectRole: (role: Role) => void;
}

const roles = [
  {
    id: 'admin' as Role,
    label: 'Administrador',
    description: 'Panel de control centralizado, reportes, comunicados y gestión integral del conjunto.',
    icon: Building2,
    color: 'from-slate-700 to-slate-900',
    accent: 'bg-slate-800',
    border: 'border-slate-200 hover:border-slate-400',
    badge: 'bg-slate-100 text-slate-700',
    features: ['Dashboard con métricas', 'Gestión de mantenimientos', 'Comunicados oficiales'],
  },
  {
    id: 'porteria' as Role,
    label: 'Portería',
    description: 'Registro ultrarrápido de visitantes, verificación de autorizaciones y control de acceso.',
    icon: ShieldCheck,
    color: 'from-sky-600 to-sky-800',
    accent: 'bg-sky-700',
    border: 'border-sky-200 hover:border-sky-400',
    badge: 'bg-sky-100 text-sky-700',
    features: ['Registro de visitantes', 'Control de accesos', 'Verificación en 2 pasos'],
  },
  {
    id: 'residente' as Role,
    label: 'Residente',
    description: 'Autoriza visitas, reserva zonas comunes, reporta daños y consulta al chatbot 24/7.',
    icon: User,
    color: 'from-teal-600 to-teal-800',
    accent: 'bg-teal-700',
    border: 'border-teal-200 hover:border-teal-400',
    badge: 'bg-teal-100 text-teal-700',
    features: ['Autorizar visitantes', 'Reservar zonas comunes', 'Soporte chatbot 24/7'],
  },
];

const stats = [
  { icon: Users, label: 'Residentes', value: '248' },
  { icon: Bell, label: 'Comunicados', value: '12' },
  { icon: Wrench, label: 'Mantenimientos', value: '7' },
  { icon: CalendarDays, label: 'Reservas activas', value: '24' },
];

export default function RoleSelector({ onSelectRole }: RoleSelectorProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50 flex flex-col">
      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between border-b border-slate-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 flex items-center justify-center shadow-md">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-none">CondoSmart</h1>
            <p className="text-xs text-slate-500 leading-none mt-0.5">Gestión Residencial</p>
          </div>
        </div>
        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
          Torres del Parque — Bogotá
        </span>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-12 max-w-xl">
          <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest text-sky-600 uppercase bg-sky-50 border border-sky-200 px-3 py-1.5 rounded-full mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse"></span>
            Sistema activo
          </div>
          <h2 className="text-4xl font-bold text-slate-900 leading-tight mb-4">
            Bienvenido a <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-teal-500">CondoSmart</span>
          </h2>
          <p className="text-slate-500 text-lg leading-relaxed">
            Plataforma integral para la gestión de su conjunto residencial. Seleccione su perfil para continuar.
          </p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-3 mb-12 max-w-2xl w-full">
          {stats.map((s) => (
            <div key={s.label} className="bg-white border border-slate-100 rounded-2xl p-4 text-center shadow-sm">
              <s.icon className="w-4 h-4 text-slate-400 mx-auto mb-1.5" />
              <div className="text-xl font-bold text-slate-900">{s.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Role cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl w-full">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => onSelectRole(role.id)}
              className={`group relative bg-white border-2 ${role.border} rounded-3xl p-7 text-left transition-all duration-300 hover:shadow-xl hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-sky-400`}
            >
              {/* Icon */}
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${role.color} flex items-center justify-center mb-5 shadow-lg group-hover:scale-105 transition-transform duration-300`}>
                <role.icon className="w-7 h-7 text-white" />
              </div>

              {/* Content */}
              <h3 className="text-xl font-bold text-slate-900 mb-2">{role.label}</h3>
              <p className="text-sm text-slate-500 leading-relaxed mb-5">{role.description}</p>

              {/* Features */}
              <ul className="space-y-2 mb-6">
                {role.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${role.accent}`}></span>
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <div className={`flex items-center justify-between ${role.badge} rounded-xl px-4 py-3 transition-all duration-200`}>
                <span className="text-sm font-semibold">Ingresar como {role.label}</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
              </div>
            </button>
          ))}
        </div>
      </main>

      <footer className="text-center py-6 text-xs text-slate-400">
        © 2026 CondoSmart · Hecho con para Colombia
      </footer>
    </div>
  );
}
