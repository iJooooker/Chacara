import React, { useState } from 'react';
import { Reservation, ChacaraDetails } from '../../types';
import { formatDate, formatCurrency, getLocalDateString } from '../../utils/formatters';
import { ChevronLeft, ChevronRight, Users, MessageCircle, Calendar as CalendarIcon } from 'lucide-react';

interface CalendarGridProps {
  reservations: Reservation[];
  onSelectReservation: (res: Reservation) => void;
  onSelectDateForNewReservation: (dateStr: string) => void;
  settings?: ChacaraDetails;
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  reservations,
  onSelectReservation,
  onSelectDateForNewReservation,
  settings,
}) => {
  // Current displayed month & year
  const [currentDate, setCurrentDate] = useState(() => {
    // Default to month of earliest upcoming reservation or current date
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  // Calendar math
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Helper to format YYYY-MM-DD
  const formatYmd = (y: number, m: number, d: number) => {
    const mm = String(m + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  };

  // Find reservations active on a given date
  const getReservationsForDate = (dateStr: string) => {
    return reservations.filter((r) => {
      if (r.status === 'cancelled') return false;
      return dateStr >= r.check_in && dateStr <= r.check_out;
    });
  };

  // Build days grid
  const calendarCells = [];

  // Previous month padding days
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const prevMonthDate = new Date(year, month - 1, dayNum);
    const dateStr = formatYmd(prevMonthDate.getFullYear(), prevMonthDate.getMonth(), dayNum);
    calendarCells.push({
      dateStr,
      dayNum,
      isCurrentMonth: false,
      reservations: getReservationsForDate(dateStr),
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = formatYmd(year, month, d);
    calendarCells.push({
      dateStr,
      dayNum: d,
      isCurrentMonth: true,
      reservations: getReservationsForDate(dateStr),
    });
  }

  // Next month padding days to complete 35 or 42 grid cells
  const remainingCells = (7 - (calendarCells.length % 7)) % 7;
  for (let d = 1; d <= remainingCells; d++) {
    const nextMonthDate = new Date(year, month + 1, d);
    const dateStr = formatYmd(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), d);
    calendarCells.push({
      dateStr,
      dayNum: d,
      isCurrentMonth: false,
      reservations: getReservationsForDate(dateStr),
    });
  }

  const todayStr = getLocalDateString();

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
      {/* Calendar Header Navigation */}
      <div className="p-4 sm:p-5 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-stone-50">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-900 text-emerald-300 flex items-center justify-center font-bold">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {monthNames[month]} de {year}
            </h3>
            <p className="text-[11px] text-slate-500">
              Grade de ocupação da {settings?.name || 'Chácara'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleCurrentMonth}
            className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-stone-200 hover:bg-stone-100 rounded-md shadow-2xs cursor-pointer"
          >
            Mês Atual
          </button>
          <div className="flex items-center space-x-1">
            <button
              id="btn-calendar-prev"
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-stone-200 rounded-md border border-stone-200 bg-white transition-colors cursor-pointer"
              aria-label="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              id="btn-calendar-next"
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-stone-200 rounded-md border border-stone-200 bg-white transition-colors cursor-pointer"
              aria-label="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 border-b border-stone-200 bg-stone-100/70 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-600 py-2.5">
        <span className="text-rose-600">DOM</span>
        <span>SEG</span>
        <span>TER</span>
        <span>QUA</span>
        <span>QUI</span>
        <span className="text-emerald-800">SEX</span>
        <span className="text-emerald-800">SÁB</span>
      </div>

      {/* Month Days Grid */}
      <div className="grid grid-cols-7 divide-x divide-y divide-stone-200 bg-stone-200">
        {calendarCells.map((cell, idx) => {
          const isToday = cell.dateStr === todayStr;
          const isOccupied = cell.reservations.length > 0;

          return (
            <div
              key={idx}
              className={`group min-h-[90px] sm:min-h-[110px] p-1.5 sm:p-2 flex flex-col justify-between transition-colors ${
                !cell.isCurrentMonth
                  ? 'bg-stone-100/50 text-slate-400'
                  : isOccupied
                  ? 'bg-emerald-50/40 text-slate-800'
                  : 'bg-white text-slate-700 hover:bg-stone-50'
              }`}
            >
              {/* Day Number Header */}
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-bold w-5 h-5 flex items-center justify-center rounded-md ${
                    isToday
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : !cell.isCurrentMonth
                      ? 'text-slate-400'
                      : 'text-slate-700'
                  }`}
                >
                  {cell.dayNum}
                </span>

                {!isOccupied && cell.isCurrentMonth && (
                  <button
                    type="button"
                    onClick={() => onSelectDateForNewReservation(cell.dateStr)}
                    className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 text-[10px] font-bold text-emerald-800 hover:text-emerald-900 transition-opacity px-1 rounded hover:bg-emerald-100 cursor-pointer"
                    title="Reservar a partir deste dia"
                  >
                    + Locar
                  </button>
                )}
              </div>

              {/* Reserved badges */}
              <div className="mt-1 space-y-1 overflow-hidden">
                {cell.reservations.map((res) => {
                  const isCheckIn = res.check_in === cell.dateStr;
                  const isCheckOut = res.check_out === cell.dateStr;

                  return (
                    <button
                      key={res.id}
                      type="button"
                      onClick={() => onSelectReservation(res)}
                      className={`w-full text-left p-1 rounded-sm text-[10px] font-bold truncate block transition-all shadow-2xs cursor-pointer ${
                        res.payment_status === 'paid'
                          ? 'bg-emerald-800 text-white hover:bg-emerald-900'
                          : 'bg-teal-800 text-white hover:bg-teal-900'
                      }`}
                      title={`${res.client_name} • ${formatDate(res.check_in)} até ${formatDate(res.check_out)} • ${formatCurrency(res.total_amount)}`}
                    >
                      <div className="truncate flex items-center space-x-1">
                        {isCheckIn && <span className="opacity-90">🛬</span>}
                        {isCheckOut && <span className="opacity-90">🛫</span>}
                        <span className="truncate">{res.client_name.split(' ')[0]}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Free indicator */}
              {!isOccupied && cell.isCurrentMonth && (
                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider text-right self-end mt-auto">
                  Livre
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend Footer */}
      <div className="p-3 bg-stone-50 border-t border-stone-200 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-800 inline-block" />
            <span className="text-[11px] font-semibold text-slate-700">Locação 100% Paga</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-teal-800 inline-block" />
            <span className="text-[11px] font-semibold text-slate-700">Locação c/ Sinal Pago</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-white border border-stone-300 inline-block" />
            <span className="text-[11px] font-semibold text-slate-700">Dia Livre</span>
          </div>
        </div>
        <span className="text-[11px] text-slate-400">Clique na reserva para abrir detalhes ou editar.</span>
      </div>
    </div>
  );
};
