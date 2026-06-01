import React, { useState } from 'react';
import {
  ShieldCheck, UserPlus, Clock, Car, Package, Briefcase, User, Users,
  CheckCircle2, XCircle, LogOut, Search, AlertTriangle, Bell, Phone,
  Hash, Home, ChevronRight, X, Check, Building2, Loader2
} from 'lucide-react';
import { VisitRecord } from '../types';
import { MOCK_VISIT_RECORDS } from '../lib/mockData';

interface PorteriaDashboardProps {
  onBack: () => void;
}

type VisitorType = 'persona' | 'delivery' | 'proveedor' | 'familiar';

const visitorTypes: { id: VisitorType; label: string; icon: React.ComponentType<any>; color: string; bg: string }[] = [
  { id: 'persona', label: 'Persona', icon: User, color: 'text-slate-700', bg: 'bg-slate-100 border-slate-300 hover:border-slate-500' },
  { id: 'delivery', label: 'Delivery', icon: Package, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200 hover:border-amber-500' },
  { id: 'proveedor', label: 'Proveedor', icon: Briefcase, color: 'text-sky-700', bg: 'bg-sky-50 border-sky-200 hover:border-sky-500' },
  { id: 'familiar', label: 'Familiar', icon: Users, color: 'text-teal-700', bg: 'bg-teal-50 border-teal-200 hover:border-teal-500' },
];

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 60000;
  if (diff < 1) return 'justo ahora';
  if (diff < 60) return `hace ${Math.round(diff)} min`;
  return `hace ${Math.round(diff / 60)}h`;
}

function VisitorCard({ record }: { record: VisitRecord }) {
  const isInside = record.status === 'inside';
  return (
    <div className={`bg-white border-2 rounded-2xl p-4 transition-all duration-200 ${isInside ? 'border-emerald-200 shadow-emerald-50 shadow-md' : 'border-slate-100'}`}>
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold flex-shrink-0 ${isInside ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
          {record.visitor_name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-slate-900 text-base truncate">{record.visitor_name}</p>
            {isInside && (
              <span className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Adentro
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Home className="w-3 h-3" /> Apto {record.apartment_destination}
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-xs text-slate-400">{timeAgo(record.entry_at)}</span>
            {record.visitor_document && (
              <>
                <span className="text-slate-300">·</span>
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <Hash className="w-3 h-3" /> {record.visitor_document}
                </span>
              </>
            )}
          </div>
        </div>
        {isInside && (
          <button className="flex-shrink-0 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors">
            Salida
          </button>
        )}
      </div>
    </div>
  );
}

function RegisterModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [visitorType, setVisitorType] = useState<VisitorType>('persona');
  const [name, setName] = useState('');
  const [doc, setDoc] = useState('');
  const [plate, setPlate] = useState('');
  const [apt, setApt] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  function handleSubmit() {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      setTimeout(() => onClose(), 1800);
    }, 1200);
  }

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="bg-white rounded-3xl p-10 shadow-2xl text-center max-w-sm w-full animate-bounce-in">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-2">Ingreso registrado</h3>
          <p className="text-slate-500">{name || 'Visitante'} — Apto {apt}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-7 py-6 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white">Registrar visitante</h3>
            <p className="text-slate-400 text-sm mt-0.5">Paso {step} de 2</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress */}
        <div className="h-1 bg-slate-100">
          <div className="h-full bg-sky-500 transition-all duration-500" style={{ width: step === 1 ? '50%' : '100%' }} />
        </div>

        <div className="p-7">
          {step === 1 ? (
            <div>
              <p className="text-sm font-semibold text-slate-600 mb-4">Tipo de visitante</p>
              <div className="grid grid-cols-2 gap-3 mb-7">
                {visitorTypes.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setVisitorType(t.id)}
                    className={`flex items-center gap-3 border-2 rounded-2xl px-4 py-4 transition-all duration-150 ${
                      visitorType === t.id
                        ? 'border-sky-500 bg-sky-50 shadow-sm'
                        : `${t.bg} border-2`
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0`}>
                      <t.icon className={`w-5 h-5 ${visitorType === t.id ? 'text-sky-600' : t.color}`} />
                    </div>
                    <span className={`font-semibold text-sm ${visitorType === t.id ? 'text-sky-700' : 'text-slate-700'}`}>{t.label}</span>
                    {visitorType === t.id && <Check className="w-4 h-4 text-sky-600 ml-auto" />}
                  </button>
                ))}
              </div>

              <div className="mb-5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Apartamento destino *</label>
                <div className="flex gap-2">
                  {['101', '202', '301', '401', '502'].map((a) => (
                    <button key={a} onClick={() => setApt(a)} className={`flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-all ${apt === a ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-600 hover:border-slate-400'}`}>{a}</button>
                  ))}
                </div>
                <input
                  type="text" placeholder="Otro apartamento..."
                  value={!['101', '202', '301', '401', '502'].includes(apt) ? apt : ''}
                  onChange={(e) => setApt(e.target.value)}
                  className="mt-2 w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-sky-400 transition-colors"
                />
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!apt}
                className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-4 rounded-2xl transition-colors text-sm flex items-center justify-center gap-2"
              >
                Continuar <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div>
              <p className="text-sm font-semibold text-slate-600 mb-4">Datos del visitante</p>
              <div className="space-y-4 mb-7">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Nombre completo *</label>
                  <input
                    type="text" placeholder="Nombre y apellido"
                    value={name} onChange={(e) => setName(e.target.value)}
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-sky-400 transition-colors font-medium"
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Documento</label>
                    <input
                      type="text" placeholder="Cédula / Pasaporte"
                      value={doc} onChange={(e) => setDoc(e.target.value)}
                      className="w-full border-2 border-slate-200 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-sky-400 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Placa vehículo</label>
                    <input
                      type="text" placeholder="ABC-123"
                      value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())}
                      className="w-full border-2 border-slate-200 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-sky-400 transition-colors uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-100">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-slate-400">Tipo:</span> <span className="font-semibold text-slate-800 capitalize">{visitorType}</span></div>
                  <div><span className="text-slate-400">Apto:</span> <span className="font-semibold text-slate-800">{apt}</span></div>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 border-2 border-slate-200 hover:border-slate-400 text-slate-700 font-bold py-4 rounded-2xl transition-colors text-sm">
                  Atrás
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!name || loading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-4 rounded-2xl transition-colors text-sm flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {loading ? 'Registrando...' : 'Confirmar ingreso'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PorteriaDashboard({ onBack }: PorteriaDashboardProps) {
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'inside' | 'exited'>('all');

  const now = new Date();
  const activeVisitors = MOCK_VISIT_RECORDS.filter(v => v.status === 'inside').length;

  const filteredRecords = MOCK_VISIT_RECORDS.filter(v => {
    const matchSearch = searchQuery
      ? v.visitor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.apartment_destination.includes(searchQuery) ||
        v.visitor_document.includes(searchQuery)
      : true;
    const matchFilter = filter === 'all' ? true : filter === 'inside' ? v.status === 'inside' : v.status === 'exited';
    return matchSearch && matchFilter;
  });

  return (
    <div className="min-h-screen bg-slate-100">
      {showModal && <RegisterModal onClose={() => setShowModal(false)} />}

      {/* Header */}
      <header className="bg-slate-900 text-white px-6 py-4 sticky top-0 z-10 shadow-xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-sky-500 flex items-center justify-center shadow-lg">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-none">Control de Acceso</h1>
              <p className="text-slate-400 text-xs mt-0.5">
                {now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })} · {now.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Live counter */}
            <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/30 rounded-xl px-4 py-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-emerald-300 text-sm font-bold">{activeVisitors} adentro</span>
            </div>
            <button onClick={onBack} className="text-slate-400 hover:text-white transition-colors p-2 rounded-xl hover:bg-slate-800">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Quick actions */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <button
            onClick={() => setShowModal(true)}
            className="col-span-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl p-6 flex items-center gap-5 shadow-lg shadow-emerald-900/20 transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 group"
          >
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <UserPlus className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold">Registrar ingreso</p>
              <p className="text-emerald-200 text-sm mt-0.5">Nuevo visitante — 2 pasos</p>
            </div>
          </button>

          {[
            { label: 'Autorizar visita', icon: CheckCircle2, color: 'from-sky-600 to-sky-700', light: 'bg-sky-500/20 text-sky-300' },
            { label: 'Emergencia', icon: AlertTriangle, color: 'from-red-600 to-red-700', light: 'bg-red-500/20 text-red-300' },
          ].map((action) => (
            <button
              key={action.label}
              className={`bg-gradient-to-br ${action.color} text-white rounded-2xl p-5 flex flex-col items-center justify-center gap-3 shadow-lg transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 group`}
            >
              <div className={`w-12 h-12 rounded-2xl ${action.light} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                <action.icon className="w-7 h-7" />
              </div>
              <span className="text-sm font-bold text-center leading-tight">{action.label}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Visitor log */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-50">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-slate-900 text-lg">Registro de hoy</h2>
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
                    {MOCK_VISIT_RECORDS.length} registros
                  </span>
                </div>
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre, apartamento, documento..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-sky-400 transition-colors"
                  />
                </div>
                {/* Filters */}
                <div className="flex gap-2 mt-3">
                  {([['all', 'Todos'], ['inside', 'Adentro'], ['exited', 'Salieron']] as const).map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => setFilter(id)}
                      className={`text-xs font-semibold px-4 py-2 rounded-lg transition-colors ${filter === id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                      {label}
                      {id === 'inside' && (
                        <span className="ml-1.5 bg-emerald-500 text-white text-xs rounded-full w-4 h-4 inline-flex items-center justify-center">{activeVisitors}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 space-y-3 max-h-[480px] overflow-y-auto">
                {filteredRecords.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Sin resultados para "{searchQuery}"</p>
                  </div>
                ) : (
                  filteredRecords.map((r) => <VisitorCard key={r.id} record={r} />)
                )}
              </div>
            </div>
          </div>

          {/* Right panel */}
          <div className="space-y-4">
            {/* Clock */}
            <div className="bg-slate-900 text-white rounded-2xl p-6 text-center">
              <p className="text-4xl font-bold tabular-nums tracking-tight mb-1">
                {now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
              <p className="text-slate-400 text-sm capitalize">
                {now.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="bg-slate-800 rounded-xl p-3">
                  <p className="text-2xl font-bold text-emerald-400">{activeVisitors}</p>
                  <p className="text-xs text-slate-400">Adentro</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-3">
                  <p className="text-2xl font-bold text-sky-400">{MOCK_VISIT_RECORDS.length}</p>
                  <p className="text-xs text-slate-400">Total hoy</p>
                </div>
              </div>
            </div>

            {/* Emergency contacts */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4 text-sm">Contactos de emergencia</h3>
              <div className="space-y-3">
                {[
                  { name: 'Administración', phone: '300 123 4567', color: 'bg-slate-100 text-slate-700' },
                  { name: 'Policía Nacional', phone: '123', color: 'bg-sky-50 text-sky-700' },
                  { name: 'Bomberos', phone: '119', color: 'bg-red-50 text-red-700' },
                  { name: 'Ambulancia', phone: '125', color: 'bg-amber-50 text-amber-700' },
                ].map((c) => (
                  <div key={c.name} className={`flex items-center justify-between rounded-xl px-3.5 py-3 ${c.color}`}>
                    <span className="text-sm font-semibold">{c.name}</span>
                    <div className="flex items-center gap-1.5 text-sm font-bold">
                      <Phone className="w-3.5 h-3.5" />
                      {c.phone}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Last registered */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-3 text-sm">Último ingreso</h3>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg flex-shrink-0">
                  {MOCK_VISIT_RECORDS[0].visitor_name.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-slate-900">{MOCK_VISIT_RECORDS[0].visitor_name}</p>
                  <p className="text-xs text-slate-400">Apto {MOCK_VISIT_RECORDS[0].apartment_destination} · {timeAgo(MOCK_VISIT_RECORDS[0].entry_at)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
