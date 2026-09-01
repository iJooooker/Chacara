import React from 'react';
import {
  TrendingUp,
  DollarSign,
  Hammer,
  CalendarCheck,
  Percent,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  ArrowRight,
  MessageCircle,
  CheckCircle2,
  Calendar,
  Sparkles,
  Users,
  ShieldAlert,
} from 'lucide-react';
import { Reservation, Expense, Checklist, ChacaraDetails } from '../../types';
import {
  formatCurrency,
  formatDate,
  formatDateLong,
  calculateDaysBetween,
  formatPhone,
  buildWhatsAppLink,
  PAYMENT_STATUS_CONFIG,
  RESERVATION_STATUS_CONFIG,
  EXPENSE_PRIORITY_CONFIG,
  CATEGORY_LABELS,
} from '../../utils/formatters';

interface DashboardOverviewProps {
  reservations: Reservation[];
  expenses: Expense[];
  checklists: Checklist[];
  settings: ChacaraDetails;
  onNavigateToReservations: () => void;
  onNavigateToExpenses: () => void;
  onNavigateToChecklists: () => void;
  onSelectReservationForWhatsApp: (res: Reservation) => void;
  onOpenNewReservation: () => void;
  onOpenNewExpense: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  reservations,
  expenses,
  checklists,
  settings,
  onNavigateToReservations,
  onNavigateToExpenses,
  onNavigateToChecklists,
  onSelectReservationForWhatsApp,
  onOpenNewReservation,
  onOpenNewExpense,
}) => {
  // Calculations
  const activeReservations = reservations.filter((r) => r.status !== 'cancelled');

  const totalRevenueAgreed = activeReservations.reduce((acc, curr) => acc + (curr.total_amount || 0), 0);
  const totalAmountReceived = activeReservations.reduce((acc, curr) => acc + (curr.amount_paid || 0), 0);
  const totalAmountPending = activeReservations.reduce((acc, curr) => acc + (curr.remaining_amount || 0), 0);

  const totalExpenses = expenses.reduce((acc, curr) => acc + (curr.cost || 0), 0);
  const completedExpenses = expenses
    .filter((e) => e.status === 'completed')
    .reduce((acc, curr) => acc + (curr.cost || 0), 0);

  const netProfit = totalAmountReceived - completedExpenses;

  // Calculate total booked days
  const totalBookedDays = activeReservations.reduce((acc, curr) => {
    return acc + calculateDaysBetween(curr.check_in, curr.check_out);
  }, 0);

  // Approximate occupancy rate for next 60 days
  const occupancyRate = Math.min(100, Math.round((totalBookedDays / 60) * 100));

  // Upcoming check-ins (Next 7-14 days)
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const sevenDaysFromNow = new Date(now);
  sevenDaysFromNow.setDate(now.getDate() + 14);

  const upcomingCheckins = activeReservations
    .filter((r) => {
      if (r.status === 'completed' || r.status === 'cancelled') return false;
      const checkInDate = new Date(r.check_in + 'T00:00:00');
      return checkInDate >= now;
    })
    .sort((a, b) => new Date(a.check_in).getTime() - new Date(b.check_in).getTime());

  // High priority pending/in_progress expenses
  const urgentExpenses = expenses
    .filter((e) => e.status !== 'completed' && e.priority === 'high')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Pending checklist items from standard checklists
  const totalChecklistItems = checklists.reduce((acc, curr) => acc + curr.items.length, 0);
  const completedChecklistItems = checklists.reduce(
    (acc, curr) => acc + curr.items.filter((i) => i.completed).length,
    0
  );
  const checklistProgress = totalChecklistItems > 0 ? Math.round((completedChecklistItems / totalChecklistItems) * 100) : 100;

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-12">
      {/* Welcome Banner / Quick Action Bar */}
      <div className="bg-slate-900 rounded-xl text-white p-5 sm:p-6 border border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-md bg-emerald-950 text-emerald-400 text-[10px] font-bold uppercase tracking-wider mb-1.5 border border-emerald-800">
            <Sparkles className="w-3 h-3" />
            <span>Painel Executivo da Chácara</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Gestão Recanto da Paz
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-0.5 max-w-2xl">
            Locações por temporada, prestação de contas com o sócio/proprietário e manutenção da chácara.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:self-center">
          <button
            id="btn-quick-new-res"
            type="button"
            onClick={onOpenNewReservation}
            className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg text-xs font-bold shadow-xs transition-all flex items-center cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-950" />
            <span>Agendar Locação</span>
          </button>
          <button
            id="btn-quick-new-exp"
            type="button"
            onClick={onOpenNewExpense}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold border border-white/15 shadow-xs transition-all flex items-center cursor-pointer"
          >
            <Hammer className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
            <span>Lançar Reforma</span>
          </button>
        </div>
      </div>

      {/* KPI CARDS (5 Core KPIs requested in Clean Utility Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* KPI 1: Faturamento Total */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-stone-200 shadow-xs hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Faturamento Previsto
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <p className="text-2xl font-black text-slate-900 tracking-tight">
              {formatCurrency(totalRevenueAgreed)}
            </p>
            <div className="mt-1 flex items-center text-[11px] text-emerald-700 font-semibold">
              <span>{formatCurrency(totalAmountReceived)} já recebidos</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Gastos Reformas / Manutenção */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-stone-200 shadow-xs hover:border-amber-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Gastos & Reformas
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Hammer className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <p className="text-2xl font-black text-slate-900 tracking-tight">
              {formatCurrency(totalExpenses)}
            </p>
            <div className="mt-1 flex items-center text-[11px] text-amber-700 font-semibold">
              <span>{formatCurrency(completedExpenses)} já pagos</span>
            </div>
          </div>
        </div>

        {/* KPI 3: Lucro Líquido Realizado */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-stone-200 shadow-xs hover:border-teal-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Lucro Líquido Real
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <p className={`text-2xl font-black tracking-tight ${netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
              {formatCurrency(netProfit)}
            </p>
            <div className="mt-1 flex items-center text-[11px] text-slate-500 font-medium">
              <span>Recebidos menos despesas</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Taxa de Ocupação */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-stone-200 shadow-xs hover:border-blue-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Taxa de Ocupação
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <p className="text-2xl font-black text-slate-900 tracking-tight">
              {occupancyRate}%
            </p>
            <div className="mt-1 flex items-center text-[11px] text-blue-700 font-semibold">
              <span>Estimativa 60 dias</span>
            </div>
          </div>
        </div>

        {/* KPI 5: Total de Diárias Agendadas */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-stone-200 shadow-xs hover:border-purple-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Diárias Agendadas
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <p className="text-2xl font-black text-slate-900 tracking-tight">
              {totalBookedDays} <span className="text-sm font-semibold text-slate-400">dias</span>
            </p>
            <div className="mt-1 flex items-center text-[11px] text-purple-700 font-semibold">
              <span>{activeReservations.length} reservas registradas</span>
            </div>
          </div>
        </div>
      </div>

      {/* ALERTAS RÁPIDOS & PRÓXIMOS CHECK-INS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Próximos Check-ins (7 a 14 dias) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-stone-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-100">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-800 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Próximos Check-ins & Hóspedes</h3>
                  <p className="text-[11px] text-slate-500">Próximas entradas agendadas na chácara</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onNavigateToReservations}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center cursor-pointer"
              >
                Ver calendário <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </button>
            </div>

            {upcomingCheckins.length === 0 ? (
              <div className="text-center py-8 bg-stone-50 rounded-lg border border-dashed border-stone-200">
                <Calendar className="w-7 h-7 mx-auto text-slate-400 mb-2" />
                <p className="text-xs font-semibold text-slate-600">Nenhum check-in agendado nos próximos dias</p>
                <button
                  type="button"
                  onClick={onOpenNewReservation}
                  className="mt-2 text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
                >
                  + Cadastrar nova locação agora
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {upcomingCheckins.slice(0, 4).map((res) => {
                  const daysStay = calculateDaysBetween(res.check_in, res.check_out);
                  const payConfig = PAYMENT_STATUS_CONFIG[res.payment_status];

                  return (
                    <div
                      key={res.id}
                      className="p-3 rounded-lg border border-stone-200 bg-stone-50/60 hover:bg-stone-100/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-xs sm:text-sm text-slate-900">{res.client_name}</span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${payConfig.badgeClass}`}>
                            {payConfig.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-y-1 gap-x-2.5 text-xs text-slate-500">
                          <span className="font-semibold text-slate-700">
                            📅 {res.check_in === res.check_out ? `${formatDate(res.check_in)} (Day Use - 1 diária)` : `${formatDate(res.check_in)} até ${formatDate(res.check_out)} (${daysStay} diárias)`}
                          </span>
                          <span>•</span>
                          <span className="flex items-center">
                            <Users className="w-3 h-3 mr-1 text-slate-400" /> {res.guests_count} pessoas
                          </span>
                          {res.remaining_amount > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-amber-800 font-bold">
                                Falta: {formatCurrency(res.remaining_amount)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 self-end sm:self-center">
                        <button
                          id={`btn-wa-${res.id}`}
                          type="button"
                          onClick={() => onSelectReservationForWhatsApp(res)}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-md text-xs font-bold flex items-center transition-colors cursor-pointer"
                          title="Enviar WhatsApp com regras & confirmação"
                        >
                          <MessageCircle className="w-3 h-3 mr-1 text-emerald-700" />
                          <span>WhatsApp</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 gap-1">
            <span>Horário de entrada: <strong>{settings.check_in_time}</strong> | Saída: <strong>{settings.check_out_time}</strong></span>
            <span className="text-emerald-800 font-semibold">Caseiro: {settings.caretaker_name}</span>
          </div>
        </div>

        {/* Right Column: Reformas Urgentes & Status Operacional */}
        <div className="lg:col-span-5 space-y-4">
          {/* Obras / Reformas Prioritárias */}
          <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-stone-100">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-md bg-amber-50 text-amber-800 flex items-center justify-center">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Manutenções Prioritárias</h3>
                  <p className="text-[11px] text-slate-500">Reformas e reparos em andamento</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onNavigateToExpenses}
                className="text-xs font-bold text-amber-800 hover:text-amber-900 flex items-center cursor-pointer"
              >
                Ver todas <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </button>
            </div>

            {urgentExpenses.length === 0 ? (
              <div className="p-3.5 bg-emerald-50/60 rounded-lg border border-emerald-200/80 text-center">
                <CheckCircle2 className="w-5 h-5 mx-auto text-emerald-700 mb-1" />
                <p className="text-xs font-bold text-emerald-900">Tudo em ordem!</p>
                <p className="text-[11px] text-emerald-700 mt-0.5">Nenhuma reforma urgente pendente no momento.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {urgentExpenses.slice(0, 3).map((exp) => (
                  <div
                    key={exp.id}
                    className="p-2.5 rounded-lg border border-amber-200 bg-amber-50/50 flex items-start justify-between gap-2"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900 leading-tight">{exp.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Resp: <strong>{exp.responsible_person}</strong> • Data: {formatDate(exp.date)}
                      </p>
                    </div>
                    <span className="text-xs font-black text-amber-900 whitespace-nowrap">
                      {formatCurrency(exp.cost)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Status Geral dos Checklists */}
          <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-stone-100">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-md bg-teal-50 text-teal-800 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Vistorias & Checklists</h3>
                  <p className="text-[11px] text-slate-500">Padrão de conformidade da chácara</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onNavigateToChecklists}
                className="text-xs font-bold text-teal-800 hover:text-teal-900 flex items-center cursor-pointer"
              >
                Abrir <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </button>
            </div>

            <div className="mt-1">
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-slate-600">Itens verificados</span>
                <span className="text-teal-800">{checklistProgress}% ({completedChecklistItems}/{totalChecklistItems})</span>
              </div>
              <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden border border-stone-200">
                <div
                  className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                  style={{ width: `${checklistProgress}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Checklists de entrada, saída e rotinas de faxina sincronizados.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
