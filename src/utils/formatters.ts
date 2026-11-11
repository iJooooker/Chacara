export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
}

export function formatDate(dateString: string): string {
  if (!dateString) return '-';
  const parts = dateString.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  } catch {
    return dateString;
  }
}

export function formatDateLong(dateString: string): string {
  if (!dateString) return '-';
  try {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
  } catch {
    return dateString;
  }
}

export function calculateDaysBetween(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 1;
  if (startDate === endDate) return 1; // Mesmo dia = 1 diária (Day Use)
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= 0 ? 1 : diffDays;
}

export function cleanPhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function formatPhone(phone: string): string {
  const digits = cleanPhone(phone);
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

export function buildWhatsAppLink(phone: string, message: string): string {
  const clean = cleanPhone(phone);
  const fullNumber = clean.startsWith('55') ? clean : `55${clean}`;
  const encodedMsg = encodeURIComponent(message);
  return `https://wa.me/${fullNumber}?text=${encodedMsg}`;
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'id-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now();
}

export const CATEGORY_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  piscina: { label: 'Piscina & Área Molhada', color: 'text-cyan-700', bg: 'bg-cyan-50 border-cyan-200' },
  area_gourmet: { label: 'Área Gourmet / Churrasqueira', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  jardinagem: { label: 'Jardinagem & Pomar', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  eletrica_hidraulica: { label: 'Elétrica & Hidráulica', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  pintura: { label: 'Pintura & Acabamento', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
  casa_principal: { label: 'Casa Principal & Quartos', color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200' },
  moveis_decoracao: { label: 'Móveis & Utensílios', color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' },
  outros: { label: 'Outros / Diversos', color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200' },
};

export const PAYMENT_STATUS_CONFIG = {
  paid: { label: 'Pago Total', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  partially_paid: { label: 'Sinal Pago', badgeClass: 'bg-amber-100 text-amber-800 border-amber-200' },
  pending: { label: 'Pendente', badgeClass: 'bg-rose-100 text-rose-800 border-rose-200' },
};

export const RESERVATION_STATUS_CONFIG = {
  confirmed: { label: 'Confirmada', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  in_progress: { label: 'Hospedado', badgeClass: 'bg-blue-100 text-blue-800 border-blue-200' },
  completed: { label: 'Concluída', badgeClass: 'bg-slate-100 text-slate-700 border-slate-200' },
  cancelled: { label: 'Cancelada', badgeClass: 'bg-zinc-100 text-zinc-500 border-zinc-200' },
};

export const EXPENSE_STATUS_CONFIG = {
  completed: { label: 'Concluído', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  in_progress: { label: 'Em Andamento', badgeClass: 'bg-amber-100 text-amber-800 border-amber-200' },
  planned: { label: 'Planejado', badgeClass: 'bg-slate-100 text-slate-700 border-slate-200' },
};

export const EXPENSE_PRIORITY_CONFIG = {
  high: { label: 'Alta Prioridade', badgeClass: 'bg-rose-100 text-rose-700 border-rose-200' },
  medium: { label: 'Média', badgeClass: 'bg-amber-100 text-amber-700 border-amber-200' },
  low: { label: 'Baixa', badgeClass: 'bg-slate-100 text-slate-600 border-slate-200' },
};
