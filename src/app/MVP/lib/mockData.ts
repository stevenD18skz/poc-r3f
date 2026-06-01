import { MaintenanceRequest, Announcement, VisitRecord, Reservation, CommonArea } from '../types';

export const MOCK_VISIT_RECORDS: VisitRecord[] = [
  {
    id: '1', condo_id: 'c1', visitor_id: 'v1', visitor_name: 'Carlos Mejía', visitor_document: '1020456789',
    visitor_vehicle: 'ABC-123', authorized_by: 'p2', registered_by: 'p3',
    apartment_destination: '401', entry_at: new Date(Date.now() - 10 * 60000).toISOString(),
    exit_at: null, notes: 'Técnico de internet', status: 'inside', created_at: new Date().toISOString(),
  },
  {
    id: '2', condo_id: 'c1', visitor_id: 'v2', visitor_name: 'Domicilios Rappi', visitor_document: '',
    visitor_vehicle: '', authorized_by: 'p4', registered_by: 'p3',
    apartment_destination: '203', entry_at: new Date(Date.now() - 25 * 60000).toISOString(),
    exit_at: new Date(Date.now() - 20 * 60000).toISOString(), notes: '', status: 'exited', created_at: new Date().toISOString(),
  },
  {
    id: '3', condo_id: 'c1', visitor_id: 'v3', visitor_name: 'María Torres', visitor_document: '52034567',
    visitor_vehicle: 'XYZ-789', authorized_by: 'p5', registered_by: 'p3',
    apartment_destination: '105', entry_at: new Date(Date.now() - 45 * 60000).toISOString(),
    exit_at: null, notes: 'Familiar frecuente', status: 'inside', created_at: new Date().toISOString(),
  },
  {
    id: '4', condo_id: 'c1', visitor_id: 'v4', visitor_name: 'Juan Rodríguez', visitor_document: '1019234567',
    visitor_vehicle: '', authorized_by: null, registered_by: 'p3',
    apartment_destination: '302', entry_at: new Date(Date.now() - 120 * 60000).toISOString(),
    exit_at: new Date(Date.now() - 90 * 60000).toISOString(), notes: '', status: 'exited', created_at: new Date().toISOString(),
  },
  {
    id: '5', condo_id: 'c1', visitor_id: 'v5', visitor_name: 'Mensajería Servientrega', visitor_document: '',
    visitor_vehicle: 'DEF-456', authorized_by: null, registered_by: 'p3',
    apartment_destination: 'Recepción', entry_at: new Date(Date.now() - 180 * 60000).toISOString(),
    exit_at: new Date(Date.now() - 170 * 60000).toISOString(), notes: 'Entrega de paquetes', status: 'exited', created_at: new Date().toISOString(),
  },
];

export const MOCK_MAINTENANCE: MaintenanceRequest[] = [
  {
    id: 'm1', condo_id: 'c1', reported_by: 'p2', assigned_to: null,
    title: 'Fuga de agua en tubería principal', description: 'Se detectó fuga en el piso 2 del costado norte.',
    location: 'Piso 2 - Zona norte', priority: 'critical', status: 'in_progress',
    images: [], created_at: new Date(Date.now() - 2 * 3600000).toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: 'm2', condo_id: 'c1', reported_by: 'p4', assigned_to: null,
    title: 'Iluminación dañada en parqueadero', description: 'Dos luminarias del parqueadero norte no funcionan.',
    location: 'Parqueadero nivel -1', priority: 'medium', status: 'open',
    images: [], created_at: new Date(Date.now() - 24 * 3600000).toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: 'm3', condo_id: 'c1', reported_by: 'p5', assigned_to: null,
    title: 'Ascensor con ruido anormal', description: 'El ascensor del bloque B hace un ruido metálico al bajar.',
    location: 'Bloque B - Ascensor', priority: 'high', status: 'open',
    images: [], created_at: new Date(Date.now() - 48 * 3600000).toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: 'm4', condo_id: 'c1', reported_by: 'p2', assigned_to: 'p6',
    title: 'Grieta en fachada exterior', description: 'Pequeña grieta visible en la fachada del bloque A.',
    location: 'Fachada Bloque A', priority: 'low', status: 'resolved',
    images: [], created_at: new Date(Date.now() - 7 * 24 * 3600000).toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: 'm5', condo_id: 'c1', reported_by: 'p3', assigned_to: null,
    title: 'Bomba de agua sin presión', description: 'La presión del agua en pisos 8-10 bajó considerablemente.',
    location: 'Cuarto de bombas', priority: 'high', status: 'in_progress',
    images: [], created_at: new Date(Date.now() - 5 * 3600000).toISOString(), updated_at: new Date().toISOString(),
  },
];

export const MOCK_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'a1', condo_id: 'c1', author_id: 'p1',
    title: 'Mantenimiento programado de ascensores', body: 'El día sábado 7 de junio se realizará mantenimiento preventivo en todos los ascensores del conjunto. El servicio estará suspendido de 8am a 2pm. Rogamos tomar las previsiones del caso.',
    category: 'maintenance', is_pinned: true, published_at: new Date(Date.now() - 1 * 24 * 3600000).toISOString(), created_at: new Date().toISOString(),
  },
  {
    id: 'a2', condo_id: 'c1', author_id: 'p1',
    title: 'Asamblea General Ordinaria de Copropietarios', body: 'Se convoca a todos los residentes a la Asamblea General del 15 de junio a las 7pm en el salón comunal. Orden del día: presupuesto 2026, obras de mejora y elección de consejo.',
    category: 'general', is_pinned: true, published_at: new Date(Date.now() - 2 * 24 * 3600000).toISOString(), created_at: new Date().toISOString(),
  },
  {
    id: 'a3', condo_id: 'c1', author_id: 'p1',
    title: 'Recordatorio de pago de administración', body: 'Se recuerda que la cuota de administración del mes de junio vence el 10 de junio. Valor: $320.000. Evite recargos por mora.',
    category: 'financial', is_pinned: false, published_at: new Date(Date.now() - 3 * 24 * 3600000).toISOString(), created_at: new Date().toISOString(),
  },
  {
    id: 'a4', condo_id: 'c1', author_id: 'p1',
    title: 'Refuerzo de seguridad nocturna', body: 'A partir del lunes se implementará ronda adicional de seguridad entre 11pm y 5am. Agradecemos informar cualquier actividad sospechosa.',
    category: 'security', is_pinned: false, published_at: new Date(Date.now() - 4 * 24 * 3600000).toISOString(), created_at: new Date().toISOString(),
  },
  {
    id: 'a5', condo_id: 'c1', author_id: 'p1',
    title: 'Festival de integración vecinal', body: 'Los invitamos al festival de integración el 21 de junio en las zonas comunes. Habrá música, juegos para niños y compartir gastronómico. Inscripciones en portería.',
    category: 'event', is_pinned: false, published_at: new Date(Date.now() - 5 * 24 * 3600000).toISOString(), created_at: new Date().toISOString(),
  },
];

export const MOCK_COMMON_AREAS: CommonArea[] = [
  { id: 'ca1', condo_id: 'c1', name: 'Piscina', description: 'Piscina olímpica con área de bronceado', capacity: 30, open_time: '06:00', close_time: '20:00', color: '#0EA5E9', icon: 'waves', is_active: true },
  { id: 'ca2', condo_id: 'c1', name: 'Gimnasio', description: 'Equipo completo de cardio y pesas', capacity: 15, open_time: '05:00', close_time: '22:00', color: '#10B981', icon: 'dumbbell', is_active: true },
  { id: 'ca3', condo_id: 'c1', name: 'Salón Comunal', description: 'Salón para eventos y reuniones', capacity: 80, open_time: '08:00', close_time: '22:00', color: '#F59E0B', icon: 'users', is_active: true },
  { id: 'ca4', condo_id: 'c1', name: 'BBQ & Terrazas', description: 'Zona de parrilla con vista panorámica', capacity: 20, open_time: '10:00', close_time: '21:00', color: '#EF4444', icon: 'flame', is_active: true },
  { id: 'ca5', condo_id: 'c1', name: 'Cancha Múltiple', description: 'Fútbol sala, baloncesto y tenis', capacity: 22, open_time: '06:00', close_time: '22:00', color: '#8B5CF6', icon: 'trophy', is_active: true },
];

export const MOCK_RESERVATIONS: Reservation[] = [
  {
    id: 'r1', condo_id: 'c1', area_id: 'ca1', resident_id: 'p2',
    date: new Date(Date.now() + 1 * 24 * 3600000).toISOString().split('T')[0],
    start_time: '10:00', end_time: '12:00', status: 'confirmed', notes: '',
    created_at: new Date().toISOString(),
    common_areas: MOCK_COMMON_AREAS[0],
  },
  {
    id: 'r2', condo_id: 'c1', area_id: 'ca3', resident_id: 'p4',
    date: new Date(Date.now() + 3 * 24 * 3600000).toISOString().split('T')[0],
    start_time: '18:00', end_time: '22:00', status: 'confirmed', notes: 'Cumpleaños',
    created_at: new Date().toISOString(),
    common_areas: MOCK_COMMON_AREAS[2],
  },
  {
    id: 'r3', condo_id: 'c1', area_id: 'ca2', resident_id: 'p2',
    date: new Date().toISOString().split('T')[0],
    start_time: '07:00', end_time: '08:00', status: 'confirmed', notes: '',
    created_at: new Date().toISOString(),
    common_areas: MOCK_COMMON_AREAS[1],
  },
];

export const WEEKLY_VISITS = [
  { day: 'Lun', count: 23 },
  { day: 'Mar', count: 31 },
  { day: 'Mié', count: 18 },
  { day: 'Jue', count: 27 },
  { day: 'Vie', count: 42 },
  { day: 'Sáb', count: 38 },
  { day: 'Dom', count: 15 },
];
