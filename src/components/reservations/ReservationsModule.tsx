import React, { useState, useMemo } from 'react';
import {
  Reservation,
  PaymentStatus,
  ReservationStatus,
  ChacaraDetails,
} from '../../types';
import {
  formatCurrency,
  formatDate,
  calculateDaysBetween,
  formatPhone,
  PAYMENT_STATUS_CONFIG,
  RESERVATION_STATUS_CONFIG,
} from '../../utils/formatters';
import {
  Calendar,
  List,
  Search,
  Filter,
  PlusCircle,
  MessageCircle,
  Edit2,
  Trash2,
  CheckCircle,
  UserCheck,
  DollarSign,
  Users,
  Clock,
  Eye,
  FileCheck,
} from 'lucide-react';
import { CalendarGrid } from './CalendarGrid';

interface ReservationsModuleProps {
  reservations: Reservation[];
  settings: ChacaraDetails;
  onAddReservation: (data: Omit<Reservation, 'id' | 'created_at' | 'updated_at'>) => void;
  onUpdateReservation: (id: string, updates: Partial<Reservation>) => void;
  onDeleteReservation: (id: string) => void;
  onOpenNewModal: (prefilledDate?: string) => void;
  onEditReservation: (res: Reservation) => void;
  onOpenWhatsApp: (res: Reservation) => void;
}

export const ReservationsModule: React.FC<ReservationsModuleProps> = ({
  reservations,
  settings,
  onAddReservation,
  onUpdateReservation,
  onDeleteReservation,
  onOpenNewModal,
  onEditReservation,
  onOpenWhatsApp,
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [selectedForDetails, setSelectedForDetails] = useState<Reservation | null>(null);

  // Financial summary of reservations
  const activeReservations = useMemo(
    () => reservations.filter((r) => r.status !== 'cancelled'),
    [reservations]
  );

  const totalAgreed = activeReservations.reduce((acc, curr) => acc + (curr.total_amount || 0), 0);
  const totalPaid = activeReservations.reduce((acc, curr) => acc + (curr.amount_paid || 0), 0);
  const totalPending = activeReservations.reduce((acc, curr) => acc + (curr.remaining_amount || 0), 0);

  // Filtered reservations for list view
  const filteredReservations = useMemo(() => {
    return reservations.filter((r) => {
      const matchesSearch =
        r.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.client_phone.includes(searchTerm) ||
        (r.client_document && r.client_document.includes(searchTerm)) ||
        (r.contract_notes && r.contract_notes.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      const matchesPayment = paymentFilter === 'all' || r.payment_status === paymentFilter;

      return matchesSearch && matchesStatus && matchesPayment;
    });
  }, [reservations, searchTerm, statusFilter, paymentFilter]);

  // Quick Action Handlers
  const handleQuickPayFull = (r: Reservation) => {
    onUpdateReservation(r.id, {
      amount_paid: r.total_amount,
      remaining_amount: 0,
      payment_status: 'paid',
    });
  };

  const handleToggleCheckinStatus = (r: Reservation) => {
    if (r.status === 'confirmed') {
      onUpdateReservation(r.id, { status: 'in_progress' });
    } else if (r.status === 'in_progress') {
      onUpdateReservation(r.id, { status: 'completed' });
    }
  };

  const handleDeleteReservation = (id: string) => {
    // Exclusão direta sem window.confirm nativo (bloqueado em iframes)
    onDeleteReservation(id);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Banner & Financial Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Gestão de Reservas & Calendário
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Controle de contratos, pagamentos de sinal, check-ins e calendário de locação da chácara.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="bg-stone-200/80 p-1 rounded-lg flex items-center border border-stone-300/60">
            <button
              id="btn-view-list"
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5 mr-1.5" />
              <span>Lista / Tabela</span>
            </button>
            <button
              id="btn-view-calendar"
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center transition-all cursor-pointer ${
                viewMode === 'calendar'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 mr-1.5" />
              <span>Calendário Mensal</span>
            </button>
          </div>

          <button
            id="btn-add-reservation-top"
            type="button"
            onClick={() => onOpenNewModal()}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs sm:text-sm font-bold shadow-xs flex items-center transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 mr-1.5" />
            <span>Nova Locação</span>
          </button>
        </div>
      </div>

      {/* Mini Financial Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Total Contratado
            </p>
            <p className="text-xl font-black text-slate-900">{formatCurrency(totalAgreed)}</p>
          </div>
          <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-stone-100 text-slate-700 border border-stone-200">
            {activeReservations.length} ativas
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              Total Já Recebido (Sinal + Quitado)
            </p>
            <p className="text-xl font-black text-emerald-700">{formatCurrency(totalPaid)}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
              Saldo Pendente a Receber
            </p>
            <p className="text-xl font-black text-amber-800">{formatCurrency(totalPending)}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Content based on View Mode */}
      {viewMode === 'calendar' ? (
        <CalendarGrid
          reservations={reservations}
          onSelectReservation={(res) => onEditReservation(res)}
          onSelectDateForNewReservation={(dateStr) => onOpenNewModal(dateStr)}
        />
      ) : (
        <div className="space-y-4">
          {/* Filters & Search Header */}
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="input-search-reservations"
                type="text"
                placeholder="Buscar por nome do cliente, telefone, CPF ou notas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-600 font-sans"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center space-x-1.5 text-xs text-slate-600">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-bold">Status:</span>
              </div>
              <select
                id="filter-res-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs font-semibold bg-stone-50 border border-stone-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-600 text-slate-700 cursor-pointer"
              >
                <option value="all">Todos os Status</option>
                <option value="confirmed">Confirmadas</option>
                <option value="in_progress">Em Andamento (Hospedado)</option>
                <option value="completed">Concluídas</option>
                <option value="cancelled">Canceladas</option>
              </select>

              <select
                id="filter-res-payment"
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs font-semibold bg-stone-50 border border-stone-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-600 text-slate-700 cursor-pointer"
              >
                <option value="all">Todos os Pagamentos</option>
                <option value="paid">Pago Total</option>
                <option value="partially_paid">Sinal Pago</option>
                <option value="pending">Pendente</option>
              </select>
            </div>
          </div>

          {/* Table of Reservations */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
            {filteredReservations.length === 0 ? (
              <div className="text-center py-16 px-4">
                <Calendar className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <h4 className="text-sm font-bold text-slate-700">Nenhuma locação encontrada</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Não foram encontradas locações com os filtros selecionados. Tente ajustar a busca ou adicione uma nova.
                </p>
                <button
                  type="button"
                  onClick={() => onOpenNewModal()}
                  className="mt-4 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                >
                  + Cadastrar Nova Locação
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 bg-stone-50 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4">Cliente / Contato</th>
                      <th className="py-3 px-4">Período & Diárias</th>
                      <th className="py-3 px-4">Hóspedes</th>
                      <th className="py-3 px-4">Financeiro (R$)</th>
                      <th className="py-3 px-4">Status Pagamento</th>
                      <th className="py-3 px-4">Status Locação</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-xs sm:text-sm">
                    {filteredReservations.map((res) => {
                      const daysStay = calculateDaysBetween(res.check_in, res.check_out);
                      const payConfig = PAYMENT_STATUS_CONFIG[res.payment_status];
                      const statusConfig = RESERVATION_STATUS_CONFIG[res.status];

                      return (
                        <tr
                          key={res.id}
                          className="hover:bg-stone-50 transition-colors group"
                        >
                          {/* Cliente */}
                          <td className="py-3.5 px-4">
                            <div>
                              <p className="font-bold text-slate-900 leading-snug">
                                {res.client_name}
                              </p>
                              <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
                                <span>{formatPhone(res.client_phone)}</span>
                                {res.client_document && (
                                  <>
                                    <span>•</span>
                                    <span>Doc: {res.client_document}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Período */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="text-slate-800 font-semibold">
                              {formatDate(res.check_in)} → {formatDate(res.check_out)}
                            </div>
                            <span className="text-[11px] font-bold text-emerald-800">
                              {res.check_in === res.check_out
                                ? '1 diária (Day Use)'
                                : `${daysStay} ${daysStay === 1 ? 'diária' : 'diárias'}`}
                            </span>
                          </td>

                          {/* Hóspedes */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center text-slate-700 font-semibold">
                              <Users className="w-3.5 h-3.5 mr-1 text-slate-400" />
                              <span>{res.guests_count} pessoas</span>
                            </div>
                          </td>

                          {/* Financeiro */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div>
                              <span className="font-black text-slate-900">
                                {formatCurrency(res.total_amount)}
                              </span>
                              <div className="text-[11px] text-slate-500">
                                Pago: <span className="text-emerald-700 font-bold">{formatCurrency(res.amount_paid)}</span>
                                {res.remaining_amount > 0 && (
                                  <span className="text-amber-700 font-semibold ml-1">
                                    (Falta {formatCurrency(res.remaining_amount)})
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Status Pagamento */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${payConfig.badgeClass}`}
                            >
                              {payConfig.label}
                            </span>
                          </td>

                          {/* Status Reserva */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${statusConfig.badgeClass}`}
                            >
                              {statusConfig.label}
                            </span>
                          </td>

                          {/* Ações */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end space-x-1">
                              {/* WhatsApp */}
                              <button
                                id={`btn-table-wa-${res.id}`}
                                type="button"
                                onClick={() => onOpenWhatsApp(res)}
                                className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                                title="Enviar mensagem pronta no WhatsApp"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </button>

                              {/* Quick checkin / checkout progress */}
                              {res.status === 'confirmed' && (
                                <button
                                  type="button"
                                  onClick={() => handleToggleCheckinStatus(res)}
                                  className="p-1.5 text-blue-700 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                                  title="Marcar Check-in realizado (Hóspede no local)"
                                >
                                  <UserCheck className="w-4 h-4" />
                                </button>
                              )}

                              {res.status === 'in_progress' && (
                                <button
                                  type="button"
                                  onClick={() => handleToggleCheckinStatus(res)}
                                  className="p-1.5 text-teal-700 hover:bg-teal-50 rounded-md transition-colors cursor-pointer"
                                  title="Concluir Check-out da estadia"
                                >
                                  <FileCheck className="w-4 h-4" />
                                </button>
                              )}

                              {/* Quick Pay Full if remaining */}
                              {res.remaining_amount > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleQuickPayFull(res)}
                                  className="p-1.5 text-amber-700 hover:bg-amber-50 rounded-md transition-colors cursor-pointer"
                                  title="Quitar saldo restante rapidamente"
                                >
                                  <DollarSign className="w-4 h-4" />
                                </button>
                              )}

                              {/* Edit */}
                              <button
                                id={`btn-table-edit-${res.id}`}
                                type="button"
                                onClick={() => onEditReservation(res)}
                                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                                title="Editar locação"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              {/* Delete */}
                              <button
                                id={`btn-table-del-${res.id}`}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteReservation(res.id);
                                }}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                                title="Excluir reserva"
                              >
                                <Trash2 className="w-4 h-4 pointer-events-none" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
