export type PaymentStatus = 'pending' | 'partially_paid' | 'paid';
export type ReservationStatus = 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

export interface Reservation {
  id: string;
  client_name: string;
  client_phone: string;
  client_document?: string;
  check_in: string; // YYYY-MM-DD
  check_out: string; // YYYY-MM-DD
  guests_count: number;
  daily_rate?: number;
  total_amount: number;
  amount_paid: number;
  remaining_amount: number;
  payment_status: PaymentStatus;
  status: ReservationStatus;
  contract_notes?: string;
  deposit_date?: string;
  created_at: string;
  updated_at: string;
}

export type ExpenseCategory =
  | 'piscina'
  | 'area_gourmet'
  | 'jardinagem'
  | 'eletrica_hidraulica'
  | 'pintura'
  | 'casa_principal'
  | 'moveis_decoracao'
  | 'outros';

export type ExpenseStatus = 'planned' | 'in_progress' | 'completed';
export type ExpensePriority = 'low' | 'medium' | 'high';

export interface Expense {
  id: string;
  title: string;
  category: ExpenseCategory;
  cost: number;
  responsible_person: string;
  date: string; // YYYY-MM-DD
  status: ExpenseStatus;
  priority: ExpensePriority;
  receipt_url_or_ref?: string;
  photos?: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type ChecklistType = 'check_in_inspection' | 'check_out_inspection' | 'maintenance_works' | 'custom';

export interface ChecklistItem {
  id: string;
  label: string;
  category?: string;
  completed: boolean;
  notes?: string;
}

export interface Checklist {
  id: string;
  title: string;
  type: ChecklistType;
  description?: string;
  related_reservation_id?: string;
  assigned_to?: string;
  items: ChecklistItem[];
  created_at: string;
  updated_at: string;
}

export interface ChacaraDetails {
  name: string;
  subtitle: string;
  location: string;
  max_guests: number;
  check_in_time: string;
  check_out_time: string;
  wifi_network: string;
  wifi_password: string;
  energy_110_220: string;
  gate_code: string;
  caretaker_name: string;
  caretaker_phone: string;
  quiet_hours: string;
}
