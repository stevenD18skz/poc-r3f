import React, { useState, useRef, useEffect } from 'react';
import {
  User, UserPlus, CalendarCheck, Wrench, MessageSquare, Bell, Home,
  ChevronRight, Plus, X, Check, LogOut, Send, Bot, Waves, Dumbbell,
  Users, Flame, Trophy, Clock, MapPin, AlertCircle, CheckCircle2,
  Calendar, Package, ArrowLeft, Loader2, Pin
} from 'lucide-react';
import { ChatMessage, Reservation, Announcement } from '../types';
import { MOCK_ANNOUNCEMENTS, MOCK_RESERVATIONS, MOCK_COMMON_AREAS } from '../lib/mockData';

interface ResidenteDashboardProps {
  onBack: () => void;
}

type View = 'home' | 'visitante' | 'reservar' | 'reporte' | 'chat' | 'comunicados';

const areaIcons: Record<string, React.ComponentType<any>> = {
  waves: Waves,
  dumbbell: Dumbbell,
  users: Users,
  flame: Flame,
  trophy: Trophy,
};

const categoryConfig = {
  general: { label: 'General', bg: 'bg-slate-100', text: 'text-slate-700' },
  financial: { label: 'Financiero', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  maintenance: { label: 'Mantenimiento', bg: 'bg-amber-50', text: 'text-amber-700' },
  security: { label: 'Seguridad', bg: 'bg-red-50', text: 'text-red-700' },
  event: { label: 'Evento', bg: 'bg-sky-50', text: 'text-sky-700' },
};

const chatResponses: Record<string, string> = {
  default: 'Entiendo tu consulta. ¿Puedes darme más detalles para ayudarte mejor?',
  visita: 'Para autorizar una visita, ve a la sección "Autorizar visita" desde el menú principal. Puedes pre-autorizar visitantes con nombre y cédula.',
  reserva: 'Las reservas se gestionan desde la sección "Reservar zona". Puedes ver la disponibilidad en tiempo real y hacer tu reserva en 2 pasos.',
  daño: 'Para reportar un daño, ve a "Reportar daño" e indica la ubicación y una descripción. También puedes adjuntar fotos.',
  administración: 'Puedes contactar a la administración al 300 123 4567 o enviar un comunicado desde el panel de anuncios.',
  pago: 'El pago de la cuota de administración se realiza por consignación o PSE. El NIT del conjunto es 900.123.456-7.',
  hola: '¡Hola! Soy el asistente virtual de CondoSmart. Puedo ayudarte con reservas, autorizaciones de visita, reportes y más. ¿En qué te puedo ayudar?',
  horario: 'Las zonas comunes tienen diferentes horarios. La piscina abre de 6am a 8pm, el gimnasio de 5am a 10pm y el salón comunal de 8am a 10pm.',
};

function getResponse(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes('visita') || lower.includes('autorizar')) return chatResponses.visita;
  if (lower.includes('reserva') || lower.includes('zona') || lower.includes('salon') || lower.includes('piscina')) return chatResponses.reserva;
  if (lower.includes('daño') || lower.includes('daño') || lower.includes('avería') || lower.includes('dañado')) return chatResponses.daño;
  if (lower.includes('admin') || lower.includes('contacto')) return chatResponses.administración;
  if (lower.includes('pago') || lower.includes('cuota') || lower.includes('administración')) return chatResponses.pago;
  if (lower.includes('hola') || lower.includes('buenos') || lower.includes('buenas')) return chatResponses.hola;
  if (lower.includes('horario') || lower.includes('hora')) return chatResponses.horario;
  return chatResponses.default;
}

function AnnouncementCard({ item }: { item: Announcement }) {
  const c = categoryConfig[item.category];
  return (
    <div className={`bg-white border rounded-2xl p-5 shadow-sm ${item.is_pinned ? 'border-amber-200' : 'border-slate-100'}`}>
      {item.is_pinned && (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 mb-3">
          <Pin className="w-3 h-3" /> Fijado
        </div>
      )}
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full mb-2 ${c.bg} ${c.text}`}>{c.label}</span>
          <h4 className="font-bold text-slate-900 text-sm mb-1.5 leading-snug">{item.title}</h4>
          <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{item.body}</p>
          <p className="text-xs text-slate-400 mt-2">{new Date(item.published_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })}</p>
        </div>
      </div>
    </div>
  );
}

function VisitanteForm({ onBack }: { onBack: () => void }) {
  const [name, setName] = useState('');
  const [doc, setDoc] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [success, setSuccess] = useState(false);

  if (success) return (
    <div className="flex flex-col items-center justify-center flex-1 py-16 text-center px-6">
      <div className="w-20 h-20 rounded-full bg-teal-100 flex items-center justify-center mb-5">
        <CheckCircle2 className="w-10 h-10 text-teal-600" />
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-2">Visita autorizada</h3>
      <p className="text-slate-500 text-sm mb-6">{name} ha sido autorizado para visitar su apartamento.</p>
      <button onClick={onBack} className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-semibold text-sm">
        Volver al inicio
      </button>
    </div>
  );

  return (
    <div className="p-5 pb-8 space-y-5">
      <div>
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Nombre del visitante *</label>
        <input
          type="text" placeholder="Nombre completo"
          value={name} onChange={(e) => setName(e.target.value)}
          className="w-full border-2 border-slate-200 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-teal-400 transition-colors"
        />
      </div>
      <div>
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Documento de identidad</label>
        <input
          type="text" placeholder="Cédula o pasaporte"
          value={doc} onChange={(e) => setDoc(e.target.value)}
          className="w-full border-2 border-slate-200 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-teal-400 transition-colors"
        />
      </div>
      <div>
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Fecha de visita</label>
        <input
          type="date"
          value={date} onChange={(e) => setDate(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
          className="w-full border-2 border-slate-200 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-teal-400 transition-colors"
        />
      </div>
      <div>
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Notas adicionales</label>
        <textarea
          placeholder="Indicaciones para portería..."
          value={notes} onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full border-2 border-slate-200 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-teal-400 transition-colors resize-none"
        />
      </div>
      <button
        disabled={!name}
        onClick={() => setSuccess(true)}
        className="w-full bg-teal-600 hover:bg-teal-500 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-4 rounded-2xl transition-colors text-sm flex items-center justify-center gap-2"
      >
        <UserPlus className="w-4 h-4" /> Autorizar visita
      </button>
    </div>
  );
}

function ReservarView({ onBack }: { onBack: () => void }) {
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('');
  const [success, setSuccess] = useState(false);

  const times = ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
  const bookedTimes = ['10:00', '18:00'];

  if (success) return (
    <div className="flex flex-col items-center justify-center flex-1 py-16 text-center px-6">
      <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-5">
        <CalendarCheck className="w-10 h-10 text-emerald-600" />
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-2">Reserva confirmada</h3>
      <p className="text-slate-500 text-sm mb-6">
        {MOCK_COMMON_AREAS.find(a => a.id === selectedArea)?.name} · {date} a las {time}
      </p>
      <button onClick={onBack} className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-semibold text-sm">
        Volver al inicio
      </button>
    </div>
  );

  return (
    <div className="p-5 pb-8 space-y-6">
      {/* Area selection */}
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Selecciona una zona</p>
        <div className="grid grid-cols-2 gap-3">
          {MOCK_COMMON_AREAS.map((area) => {
            const Icon = areaIcons[area.icon] || Home;
            const isSelected = selectedArea === area.id;
            return (
              <button
                key={area.id}
                onClick={() => setSelectedArea(area.id)}
                className={`relative border-2 rounded-2xl p-4 text-left transition-all duration-200 ${isSelected ? 'border-teal-500 bg-teal-50 shadow-md' : 'border-slate-200 bg-white hover:border-slate-300'}`}
              >
                {isSelected && <Check className="absolute top-3 right-3 w-4 h-4 text-teal-600" />}
                <div className="w-10 h-10 rounded-xl mb-3 flex items-center justify-center" style={{ backgroundColor: area.color + '20' }}>
                  <Icon className="w-5 h-5" style={{ color: area.color }} />
                </div>
                <p className={`text-sm font-bold ${isSelected ? 'text-teal-800' : 'text-slate-800'}`}>{area.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">Máx. {area.capacity} personas</p>
                <p className="text-xs text-slate-400">{area.open_time} – {area.close_time}</p>
              </button>
            );
          })}
        </div>
      </div>

      {selectedArea && (
        <>
          {/* Date */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Fecha</p>
            <input
              type="date" value={date} onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full border-2 border-slate-200 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-teal-400 transition-colors"
            />
          </div>

          {/* Time slots */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Hora de inicio</p>
            <div className="grid grid-cols-4 gap-2">
              {times.map((t) => {
                const isBooked = bookedTimes.includes(t);
                const isSelected = time === t;
                return (
                  <button
                    key={t}
                    onClick={() => !isBooked && setTime(t)}
                    disabled={isBooked}
                    className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all duration-150 ${
                      isBooked
                        ? 'bg-slate-100 border-slate-100 text-slate-300 cursor-not-allowed line-through'
                        : isSelected
                        ? 'bg-teal-600 border-teal-600 text-white shadow-md'
                        : 'border-slate-200 text-slate-700 hover:border-teal-400 hover:bg-teal-50'
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-400 mt-2">Los horarios en gris ya están reservados</p>
          </div>

          <button
            disabled={!time}
            onClick={() => setSuccess(true)}
            className="w-full bg-teal-600 hover:bg-teal-500 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-4 rounded-2xl transition-colors text-sm flex items-center justify-center gap-2"
          >
            <CalendarCheck className="w-4 h-4" /> Confirmar reserva
          </button>
        </>
      )}
    </div>
  );
}

function ReporteForm({ onBack }: { onBack: () => void }) {
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [success, setSuccess] = useState(false);

  if (success) return (
    <div className="flex flex-col items-center justify-center flex-1 py-16 text-center px-6">
      <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mb-5">
        <CheckCircle2 className="w-10 h-10 text-amber-600" />
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-2">Reporte enviado</h3>
      <p className="text-slate-500 text-sm mb-2">Tu reporte ha sido recibido por la administración.</p>
      <p className="text-xs text-slate-400 mb-6">Número de ticket: #MT-{Math.floor(1000 + Math.random() * 9000)}</p>
      <button onClick={onBack} className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-semibold text-sm">
        Volver al inicio
      </button>
    </div>
  );

  return (
    <div className="p-5 pb-8 space-y-5">
      <div>
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Título del daño *</label>
        <input
          type="text" placeholder="Ej: Luminaria dañada en pasillo"
          value={title} onChange={(e) => setTitle(e.target.value)}
          className="w-full border-2 border-slate-200 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-amber-400 transition-colors"
        />
      </div>
      <div>
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Ubicación</label>
        <input
          type="text" placeholder="Ej: Piso 4, pasillo norte"
          value={location} onChange={(e) => setLocation(e.target.value)}
          className="w-full border-2 border-slate-200 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-amber-400 transition-colors"
        />
      </div>
      <div>
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Prioridad</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'low' as const, label: 'Baja', color: 'border-slate-400 bg-slate-50 text-slate-700', active: 'bg-slate-800 border-slate-800 text-white' },
            { id: 'medium' as const, label: 'Media', color: 'border-amber-300 bg-amber-50 text-amber-700', active: 'bg-amber-500 border-amber-500 text-white' },
            { id: 'high' as const, label: 'Alta', color: 'border-red-300 bg-red-50 text-red-700', active: 'bg-red-600 border-red-600 text-white' },
          ].map((p) => (
            <button key={p.id} onClick={() => setPriority(p.id)} className={`py-3 border-2 rounded-xl text-sm font-bold transition-all duration-150 ${priority === p.id ? p.active : p.color}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Descripción</label>
        <textarea
          placeholder="Describe el problema con detalle..."
          value={description} onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="w-full border-2 border-slate-200 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-amber-400 transition-colors resize-none"
        />
      </div>
      <button
        disabled={!title}
        onClick={() => setSuccess(true)}
        className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-4 rounded-2xl transition-colors text-sm flex items-center justify-center gap-2"
      >
        <AlertCircle className="w-4 h-4" /> Enviar reporte
      </button>
    </div>
  );
}

function ChatView() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '0', role: 'assistant', content: '¡Hola! Soy el asistente virtual de CondoSmart. Estoy aquí para ayudarte con reservas, visitantes, reportes y cualquier consulta sobre tu conjunto. ¿En qué te puedo ayudar?', timestamp: new Date() },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function sendMessage() {
    if (!input.trim()) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: input, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    setTimeout(() => {
      const reply: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: getResponse(input),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, reply]);
      setLoading(false);
    }, 900);
  }

  const quickReplies = ['Autorizar visita', 'Hacer reserva', 'Reportar daño', 'Horarios zonas comunes'];

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto p-5 space-y-4 pb-2">
        {messages.map((m) => (
          <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            {m.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center flex-shrink-0 mt-1">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              m.role === 'user' ? 'bg-teal-600 text-white rounded-br-sm' : 'bg-white border border-slate-100 text-slate-800 rounded-bl-sm shadow-sm'
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick replies */}
      <div className="px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide flex-shrink-0">
        {quickReplies.map((r) => (
          <button
            key={r}
            onClick={() => { setInput(r); }}
            className="flex-shrink-0 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-3 py-2 rounded-full hover:bg-teal-100 transition-colors"
          >
            {r}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-100 flex gap-3 flex-shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Escribe tu consulta..."
          className="flex-1 border-2 border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-teal-400 transition-colors"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || loading}
          className="w-12 h-12 rounded-2xl bg-teal-600 hover:bg-teal-500 disabled:bg-slate-200 text-white flex items-center justify-center transition-colors flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

const quickActions = [
  { id: 'visitante' as View, icon: UserPlus, label: 'Autorizar visita', color: 'from-teal-500 to-teal-700', light: 'bg-teal-50 text-teal-700' },
  { id: 'reservar' as View, icon: CalendarCheck, label: 'Reservar zona', color: 'from-sky-500 to-sky-700', light: 'bg-sky-50 text-sky-700' },
  { id: 'reporte' as View, icon: Wrench, label: 'Reportar daño', color: 'from-amber-500 to-orange-600', light: 'bg-amber-50 text-amber-700' },
  { id: 'chat' as View, icon: MessageSquare, label: 'Soporte 24/7', color: 'from-slate-600 to-slate-800', light: 'bg-slate-50 text-slate-700' },
];

const viewTitles: Record<string, string> = {
  visitante: 'Autorizar visita',
  reservar: 'Reservar zona común',
  reporte: 'Reportar daño',
  chat: 'Asistente virtual',
  comunicados: 'Comunicados',
};

export default function ResidenteDashboard({ onBack }: ResidenteDashboardProps) {
  const [view, setView] = useState<View>('home');
  const pinnedCount = MOCK_ANNOUNCEMENTS.filter(a => a.is_pinned).length;

  const isSubView = view !== 'home';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-md mx-auto relative">
      {/* Header */}
      <header className={`sticky top-0 z-10 transition-colors duration-300 ${isSubView ? 'bg-white border-b border-slate-100 shadow-sm' : 'bg-gradient-to-r from-teal-700 to-teal-900'}`}>
        <div className="px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isSubView ? (
              <button onClick={() => setView('home')} className="p-1.5 rounded-xl hover:bg-slate-100 transition-colors">
                <ArrowLeft className="w-5 h-5 text-slate-700" />
              </button>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
            )}
            <div>
              {isSubView ? (
                <h2 className="font-bold text-slate-900">{viewTitles[view]}</h2>
              ) : (
                <>
                  <p className="text-teal-200 text-xs leading-none">Buenos días</p>
                  <h2 className="text-white font-bold text-lg leading-tight">Valentina López</h2>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isSubView && (
              <button onClick={() => setView('comunicados')} className="relative p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
                <Bell className="w-5 h-5 text-white" />
                {pinnedCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-amber-400 text-slate-900 text-xs font-bold flex items-center justify-center">
                    {pinnedCount}
                  </span>
                )}
              </button>
            )}
            <button onClick={onBack} className={`p-2 rounded-xl transition-colors ${isSubView ? 'text-slate-400 hover:bg-slate-100' : 'bg-white/10 hover:bg-white/20 text-white'}`}>
              <LogOut className="w-4.5 h-4.5 w-[18px] h-[18px]" />
            </button>
          </div>
        </div>

        {/* Home hero section */}
        {!isSubView && (
          <div className="px-5 pb-6">
            <div className="bg-white/10 rounded-2xl p-4 grid grid-cols-3 gap-2 text-center">
              {[
                { value: '401', label: 'Apartamento' },
                { value: '2', label: 'Visitas hoy' },
                { value: '1', label: 'Reserva activa' },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-xl font-bold text-white">{s.value}</p>
                  <p className="text-xs text-teal-200">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Content */}
      <div className={`flex-1 flex flex-col ${view === 'chat' ? 'min-h-0 overflow-hidden' : 'overflow-y-auto'}`}>
        {view === 'home' && (
          <div className="p-5 space-y-6 pb-24">
            {/* Quick actions grid */}
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Acciones rápidas</p>
              <div className="grid grid-cols-2 gap-3">
                {quickActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => setView(action.id)}
                    className={`bg-gradient-to-br ${action.color} rounded-2xl p-5 text-white text-left transition-all duration-200 hover:opacity-90 hover:shadow-lg hover:-translate-y-0.5 group`}
                  >
                    <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                      <action.icon className="w-6 h-6 text-white" />
                    </div>
                    <p className="font-bold text-sm leading-tight">{action.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* My reservations */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mis reservas</p>
                <button onClick={() => setView('reservar')} className="text-xs font-semibold text-teal-600 flex items-center gap-1">
                  + Nueva
                </button>
              </div>
              <div className="space-y-3">
                {MOCK_RESERVATIONS.slice(0, 2).map((r) => {
                  const area = r.common_areas;
                  const Icon = area ? (areaIcons[area.icon] || Home) : Home;
                  return (
                    <div key={r.id} className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: (area?.color || '#0EA5E9') + '20' }}>
                        <Icon className="w-6 h-6" style={{ color: area?.color || '#0EA5E9' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 text-sm">{area?.name}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            <Calendar className="w-3 h-3" />
                            {new Date(r.date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            <Clock className="w-3 h-3" />
                            {r.start_time} – {r.end_time}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex-shrink-0">
                        Confirmada
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Announcements preview */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Comunicados</p>
                <button onClick={() => setView('comunicados')} className="text-xs font-semibold text-teal-600 flex items-center gap-1">
                  Ver todos <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <div className="space-y-3">
                {MOCK_ANNOUNCEMENTS.filter(a => a.is_pinned).slice(0, 2).map((a) => (
                  <AnnouncementCard key={a.id} item={a} />
                ))}
              </div>
            </div>
          </div>
        )}

        {view === 'visitante' && <VisitanteForm onBack={() => setView('home')} />}
        {view === 'reservar' && <ReservarView onBack={() => setView('home')} />}
        {view === 'reporte' && <ReporteForm onBack={() => setView('home')} />}
        {view === 'chat' && <ChatView />}
        {view === 'comunicados' && (
          <div className="p-5 space-y-4 pb-24">
            {MOCK_ANNOUNCEMENTS.map((a) => <AnnouncementCard key={a.id} item={a} />)}
          </div>
        )}
      </div>

      {/* Bottom nav */}
      {view === 'home' && (
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-100 px-4 py-3 flex items-center justify-around safe-area-pb">
          {[
            { id: 'home' as View, icon: Home, label: 'Inicio' },
            { id: 'reservar' as View, icon: CalendarCheck, label: 'Reservas' },
            { id: 'comunicados' as View, icon: Bell, label: 'Comunicados', badge: pinnedCount },
            { id: 'chat' as View, icon: MessageSquare, label: 'Ayuda' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`relative flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all duration-150 ${
                view === item.id ? 'text-teal-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span className="absolute -top-0.5 right-1 w-4 h-4 rounded-full bg-amber-400 text-slate-900 text-xs font-bold flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
