export type Role = 'admin' | 'porteria' | 'residente';

export interface Profile {
  id: string;
  condo_id: string;
  full_name: string;
  role: Role;
  apartment: string;
  phone: string;
  avatar_url: string;
  is_active: boolean;
  created_at: string;
}

export interface Condo {
  id: string;
  name: string;
  address: string;
  city: string;
  nit: string;
}

export interface Visitor {
  id: string;
  condo_id: string;
  name: string;
  document_id: string;
  vehicle_plate: string;
  photo_url: string;
  type: 'persona' | 'delivery' | 'proveedor' | 'familiar';
  created_at: string;
}

export interface VisitRecord {
  id: string;
  condo_id: string;
  visitor_id: string | null;
  visitor_name: string;
  visitor_document: string;
  visitor_vehicle: string;
  authorized_by: string | null;
  registered_by: string | null;
  apartment_destination: string;
  entry_at: string;
  exit_at: string | null;
  notes: string;
  status: 'pending' | 'authorized' | 'denied' | 'inside' | 'exited';
  created_at: string;
}

export interface CommonArea {
  id: string;
  condo_id: string;
  name: string;
  description: string;
  capacity: number;
  open_time: string;
  close_time: string;
  color: string;
  icon: string;
  is_active: boolean;
}

export interface Reservation {
  id: string;
  condo_id: string;
  area_id: string;
  resident_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  notes: string;
  created_at: string;
  common_areas?: CommonArea;
  profiles?: Profile;
}

export interface MaintenanceRequest {
  id: string;
  condo_id: string;
  reported_by: string | null;
  assigned_to: string | null;
  title: string;
  description: string;
  location: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  images: string[];
  created_at: string;
  updated_at: string;
  reporter?: Profile;
}

export interface Announcement {
  id: string;
  condo_id: string;
  author_id: string | null;
  title: string;
  body: string;
  category: 'general' | 'financial' | 'maintenance' | 'security' | 'event';
  is_pinned: boolean;
  published_at: string;
  created_at: string;
  author?: Profile;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface DashboardStats {
  totalResidents: number;
  visitorsToday: number;
  activeVisitors: number;
  pendingMaintenance: number;
  upcomingReservations: number;
  openAnnouncements: number;
}
