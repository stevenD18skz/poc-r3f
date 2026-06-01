import React, { useState } from 'react';
import {
  Building2, Users, ShieldCheck, Wrench, Bell, TrendingUp, TrendingDown,
  LogOut, ChevronRight, AlertTriangle, CheckCircle2, Clock, Calendar,
  BarChart3, FileText, Settings, Home, Menu, X, Plus, Eye
} from 'lucide-react';
import { Role, MaintenanceRequest, Announcement } from '../types';
import {
  MOCK_MAINTENANCE, MOCK_ANNOUNCEMENTS, WEEKLY_VISITS, MOCK_VISIT_RECORDS
} from '../lib/mockData';

interface AdminDashboardProps {
  onBack: () => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'visitors', label: 'Visitantes', icon: Users },
  { id: 'maintenance', label: 'Mantenimientos', icon: Wrench },
  { id: 'announcements', label: 'Comunicados', icon: Bell },
  { id: 'reports', label: 'Reportes', icon: BarChart3 },
  { id: 'settings', label: 'Configuración', icon: Settings },
];

const priorityConfig = {
  low: { label: 'Baja', color: 'text-slate-600', bg: 'bg-slate-100', dot: 'bg-slate-400' },
  medium: { label: 'Media', color: 'text-amber-700', bg: 'bg-amber-50', dot: 'bg-amber-400' },
  high: { label: 'Alta', color: 'text-orange-700', bg: 'bg-orange-50', dot: 'bg-orange-500' },
  critical: { label: 'Crítica', color: 'text-red-700', bg: 'bg-red-50', dot: 'bg-red-500' },
};

const statusConfig = {
  open: { label: 'Abierto', color: 'text-sky-700', bg: 'bg-sky-50' },
  in_progress: { label: 'En proceso', color: 'text-amber-700', bg: 'bg-amber-50' },
  resolved: { label: 'Resuelto', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  closed: { label: 'Cerrado', color: 'text-slate-600', bg: 'bg-slate-100' },
};

const categoryConfig = {
  general: { label: 'General', color: 'text-slate-700', bg: 'bg-slate-100' },
  financial: { label: 'Financiero', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  maintenance: { label: 'Mantenimiento', color: 'text-amber-700', bg: 'bg-amber-50' },
  security: { label: 'Seguridad', color: 'text-red-700', bg: 'bg-red-50' },
  event: { label: 'Evento', color: 'text-sky-700', bg: 'bg-sky-50' },
};

function StatCard({ title, value, subtitle, icon: Icon, trend, trendUp, color }: {
  title: string; value: string | number; subtitle: string; icon: React.ComponentType<any>;
  trend?: string; trendUp?: boolean; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trendUp ? 'text-emerald-600' : 'text-red-500'}`}>
            {trendUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {trend}
          </div>
        )}
      </div>
      <div className="text-3xl font-bold text-slate-900 mb-1">{value}</div>
      <div className="text-sm font-medium text-slate-700">{title}</div>
      <div className="text-xs text-slate-400 mt-0.5">{subtitle}</div>
    </div>
  );
}

function VisitChart() {
  const max = Math.max(...WEEKLY_VISITS.map(d => d.count));
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-bold text-slate-900">Visitas esta semana</h3>
          <p className="text-xs text-slate-400 mt-0.5">Ingresos registrados por portería</p>
        </div>
        <span className="text-xs font-semibold text-sky-600 bg-sky-50 px-3 py-1 rounded-full">194 total</span>
      </div>
      <div className="flex items-end gap-3 h-36">
        {WEEKLY_VISITS.map((d) => {
          const height = Math.max(8, (d.count / max) * 100);
          const isToday = d.day === 'Dom';
          return (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-2">
              <span className="text-xs font-bold text-slate-700">{d.count}</span>
              <div className="w-full rounded-t-lg transition-all duration-500 relative group cursor-pointer"
                style={{ height: `${height}%`, backgroundColor: isToday ? '#0EA5E9' : '#E2E8F0' }}>
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {d.count} visitas
                </div>
              </div>
              <span className={`text-xs ${isToday ? 'font-bold text-sky-600' : 'text-slate-400'}`}>{d.day}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MaintenanceTable({ items }: { items: MaintenanceRequest[] }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-5 border-b border-slate-50">
        <div>
          <h3 className="font-bold text-slate-900">Mantenimientos activos</h3>
          <p className="text-xs text-slate-400 mt-0.5">{items.filter(i => i.status !== 'resolved' && i.status !== 'closed').length} pendientes de atención</p>
        </div>
        <button className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1 transition-colors">
          Ver todos <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="divide-y divide-slate-50">
        {items.slice(0, 5).map((item) => {
          const p = priorityConfig[item.priority];
          const s = statusConfig[item.status];
          return (
            <div key={item.id} className="px-6 py-4 hover:bg-slate-50/50 transition-colors group cursor-pointer">
              <div className="flex items-center gap-4">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${p.dot}`}></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-slate-800 truncate">{item.title}</p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${p.bg} ${p.color}`}>{p.label}</span>
                  </div>
                  <p className="text-xs text-slate-400">{item.location} · {new Date(item.created_at).toLocaleDateString('es-CO', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${s.bg} ${s.color}`}>{s.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AnnouncementList({ items }: { items: Announcement[] }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-5 border-b border-slate-50">
        <div>
          <h3 className="font-bold text-slate-900">Comunicados recientes</h3>
          <p className="text-xs text-slate-400 mt-0.5">{items.filter(i => i.is_pinned).length} fijados</p>
        </div>
        <button className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors">
          <Plus className="w-3.5 h-3.5" /> Nuevo
        </button>
      </div>
      <div className="divide-y divide-slate-50">
        {items.slice(0, 4).map((item) => {
          const c = categoryConfig[item.category];
          return (
            <div key={item.id} className="px-6 py-4 hover:bg-slate-50/50 transition-colors cursor-pointer">
              <div className="flex items-start gap-3">
                {item.is_pinned && (
                  <div className="w-1.5 h-full min-h-4 bg-amber-400 rounded-full mt-1 flex-shrink-0"></div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.bg} ${c.color}`}>{c.label}</span>
                    {item.is_pinned && <span className="text-xs text-amber-600 font-semibold">Fijado</span>}
                  </div>
                  <p className="text-sm font-semibold text-slate-800 leading-snug mb-0.5">{item.title}</p>
                  <p className="text-xs text-slate-400">{new Date(item.published_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })}</p>
                </div>
                <Eye className="w-4 h-4 text-slate-300 flex-shrink-0 mt-1" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RecentActivity() {
  const active = MOCK_VISIT_RECORDS.filter(v => v.status === 'inside');
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-5 border-b border-slate-50">
        <div>
          <h3 className="font-bold text-slate-900">Visitantes en el conjunto</h3>
          <p className="text-xs text-slate-400 mt-0.5">{active.length} personas actualmente adentro</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-xs font-medium text-emerald-600">En vivo</span>
        </div>
      </div>
      <div className="divide-y divide-slate-50">
        {MOCK_VISIT_RECORDS.slice(0, 5).map((v) => (
          <div key={v.id} className="px-6 py-3.5 hover:bg-slate-50/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                v.status === 'inside' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {v.visitor_name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{v.visitor_name}</p>
                <p className="text-xs text-slate-400">Apto {v.apartment_destination} · {new Date(v.entry_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${
                v.status === 'inside' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {v.status === 'inside' ? 'Adentro' : 'Salió'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboard({ onBack }: AdminDashboardProps) {
  const [activeNav, setActiveNav] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 flex flex-col transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Logo */}
        <div className="px-5 py-6 flex items-center gap-3 border-b border-slate-700/50">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 flex items-center justify-center shadow-lg">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-white font-bold text-sm leading-none">CondoSmart</div>
            <div className="text-slate-400 text-xs mt-0.5">Torres del Parque</div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto text-slate-400 hover:text-white lg:hidden transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role badge */}
        <div className="px-5 py-4 border-b border-slate-700/50">
          <div className="bg-slate-800 rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center text-xs font-bold text-white">JM</div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">Juan Martínez</p>
              <p className="text-slate-400 text-xs">Administrador</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                activeNav === item.id
                  ? 'bg-sky-500/20 text-sky-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <item.icon className="w-4.5 h-4.5 w-[18px] h-[18px]" />
              {item.label}
              {activeNav === item.id && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sky-400"></span>
              )}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-slate-700/50">
          <button
            onClick={onBack}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-all duration-150"
          >
            <LogOut className="w-[18px] h-[18px]" />
            Cambiar perfil
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:ml-64 min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-slate-500 hover:text-slate-700 lg:hidden transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Dashboard</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border-2 border-white"></span>
            </button>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-xs font-bold text-white">JM</div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-y-auto">
          {/* Alert banner */}
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-center gap-4">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">Requiere atención inmediata</p>
              <p className="text-xs text-amber-600 mt-0.5">Fuga de agua en tubería principal — Piso 2 zona norte</p>
            </div>
            <button className="text-xs font-semibold text-amber-700 hover:text-amber-800 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0">
              Ver detalles
            </button>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <StatCard title="Residentes activos" value="248" subtitle="12 nuevos este mes" icon={Users} trend="+5%" trendUp={true} color="bg-gradient-to-br from-slate-700 to-slate-900" />
            <StatCard title="Visitantes hoy" value="37" subtitle="8 actualmente adentro" icon={ShieldCheck} trend="+12%" trendUp={true} color="bg-gradient-to-br from-sky-500 to-sky-700" />
            <StatCard title="Mantenimientos" value="5" subtitle="2 críticos pendientes" icon={Wrench} trend="-3%" trendUp={false} color="bg-gradient-to-br from-amber-500 to-orange-600" />
            <StatCard title="Reservas activas" value="24" subtitle="Para los próximos 7 días" icon={Calendar} trend="+8%" trendUp={true} color="bg-gradient-to-br from-teal-500 to-teal-700" />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
            <div className="xl:col-span-2">
              <VisitChart />
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-1">Estado de mantenimientos</h3>
              <p className="text-xs text-slate-400 mb-6">Distribución actual</p>
              {[
                { label: 'Abiertos', count: 3, color: 'bg-sky-500', total: 5 },
                { label: 'En proceso', count: 2, color: 'bg-amber-400', total: 5 },
                { label: 'Resueltos', count: 1, color: 'bg-emerald-500', total: 5 },
              ].map((item) => (
                <div key={item.label} className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-slate-600">{item.label}</span>
                    <span className="text-sm font-bold text-slate-900">{item.count}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${item.color}`}
                      style={{ width: `${(item.count / item.total) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              <div className="mt-6 pt-5 border-t border-slate-50">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Tiempo promedio resolución</span>
                  <span className="text-sm font-bold text-slate-900">2.3 días</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2">
              <MaintenanceTable items={MOCK_MAINTENANCE} />
            </div>
            <div className="space-y-4">
              <RecentActivity />
              <AnnouncementList items={MOCK_ANNOUNCEMENTS} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
