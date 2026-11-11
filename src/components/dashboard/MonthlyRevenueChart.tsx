import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Reservation } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';

interface MonthlyRevenueChartProps {
  reservations: Reservation[];
}

type ViewFilter = 'last6' | 'currentYear' | 'all';

interface MonthData {
  monthKey: string;
  monthLabel: string;
  fullMonthLabel: string;
  faturamento: number;
  recebido: number;
  pendente: number;
  reservasCount: number;
}

const MONTH_NAMES_SHORT = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

const MONTH_NAMES_FULL = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export const MonthlyRevenueChart: React.FC<MonthlyRevenueChartProps> = ({ reservations }) => {
  const [filter, setFilter] = useState<ViewFilter>('all');
  const [chartMode, setChartMode] = useState<'grouped' | 'stacked'>('grouped');

  // Compute monthly data
  const { chartData, totalPeriodo, mediaMensal, melhorMes, totalReservasPeriodo } = useMemo(() => {
    const active = reservations.filter((r) => r.status !== 'cancelled');

    // Month map to accumulate values
    const monthMap = new Map<string, { faturamento: number; recebido: number; pendente: number; count: number }>();

    active.forEach((r) => {
      if (!r.check_in) return;
      // Extract YYYY-MM
      const key = r.check_in.substring(0, 7);
      if (!monthMap.has(key)) {
        monthMap.set(key, { faturamento: 0, recebido: 0, pendente: 0, count: 0 });
      }
      const entry = monthMap.get(key)!;
      entry.faturamento += r.total_amount || 0;
      entry.recebido += r.amount_paid || 0;
      entry.pendente += r.remaining_amount || 0;
      entry.count += 1;
    });

    // If there are no reservations or very few, generate months around current date
    const now = new Date();
    const currentYear = now.getFullYear();

    // Collect all month keys
    let keys = Array.from(monthMap.keys()).sort();

    // If empty or less than 4 months, include the last 6 months so chart is not empty
    if (keys.length < 4) {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const k = `${y}-${m}`;
        if (!monthMap.has(k)) {
          monthMap.set(k, { faturamento: 0, recebido: 0, pendente: 0, count: 0 });
        }
      }
      keys = Array.from(monthMap.keys()).sort();
    }

    // Apply view filters
    if (filter === 'last6') {
      keys = keys.slice(-6);
    } else if (filter === 'currentYear') {
      const yearStr = String(currentYear);
      // Ensure all 12 months of current year exist
      for (let m = 1; m <= 12; m++) {
        const k = `${yearStr}-${String(m).padStart(2, '0')}`;
        if (!monthMap.has(k)) {
          monthMap.set(k, { faturamento: 0, recebido: 0, pendente: 0, count: 0 });
        }
      }
      keys = Array.from(monthMap.keys())
        .filter((k) => k.startsWith(yearStr))
        .sort();
    }

    const data: MonthData[] = keys.map((key) => {
      const [y, mStr] = key.split('-');
      const mIdx = parseInt(mStr, 10) - 1;
      const entry = monthMap.get(key) || { faturamento: 0, recebido: 0, pendente: 0, count: 0 };
      const shortYear = y.slice(-2);
      return {
        monthKey: key,
        monthLabel: `${MONTH_NAMES_SHORT[mIdx]}/${shortYear}`,
        fullMonthLabel: `${MONTH_NAMES_FULL[mIdx]} de ${y}`,
        faturamento: entry.faturamento,
        recebido: entry.recebido,
        pendente: entry.pendente,
        reservasCount: entry.count,
      };
    });

    // Summary calculations
    const totalPeriodo = data.reduce((acc, curr) => acc + curr.faturamento, 0);
    const monthsWithRevenue = data.filter((d) => d.faturamento > 0);
    const mediaMensal =
      monthsWithRevenue.length > 0 ? totalPeriodo / monthsWithRevenue.length : totalPeriodo / (data.length || 1);
    const totalReservasPeriodo = data.reduce((acc, curr) => acc + curr.reservasCount, 0);

    let melhorMes: MonthData | null = null;
    data.forEach((d) => {
      if (!melhorMes || d.faturamento > melhorMes.faturamento) {
        melhorMes = d;
      }
    });

    return {
      chartData: data,
      totalPeriodo,
      mediaMensal,
      melhorMes: melhorMes && (melhorMes as MonthData).faturamento > 0 ? melhorMes : null,
      totalReservasPeriodo,
    };
  }, [reservations, filter]);

  // Custom Tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const currentItem: MonthData = payload[0]?.payload;
      return (
        <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-xl border border-slate-700 text-xs min-w-56 space-y-2">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
            <span className="font-bold text-white text-sm">{currentItem?.fullMonthLabel || label}</span>
            <span className="text-[10px] bg-slate-800 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
              {currentItem?.reservasCount} locação(ões)
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#56634B] mr-1.5 inline-block" />
                Valor Recebido:
              </span>
              <span className="font-bold text-[#B7C7AD] font-mono">
                {formatCurrency(currentItem?.recebido || 0)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#AE8A75] mr-1.5 inline-block" />
                A Receber (Pendente):
              </span>
              <span className="font-bold text-[#D9B69B] font-mono">
                {formatCurrency(currentItem?.pendente || 0)}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1.5 border-t border-slate-800 font-bold">
              <span className="text-slate-300">Total Faturado:</span>
              <span className="text-white text-sm font-mono">
                {formatCurrency(currentItem?.faturamento || 0)}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs space-y-5">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 shadow-2xs">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Faturamento Mensal das Locações
              </h3>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Recharts
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Evolução dos valores recebidos e saldos a receber por mês
            </p>
          </div>
        </div>

        {/* Filter and Mode Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          {/* Mode Toggle (Grouped vs Stacked) */}
          <div className="bg-stone-100 p-0.5 rounded-lg flex items-center border border-stone-200 text-xs">
            <button
              type="button"
              onClick={() => setChartMode('grouped')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                chartMode === 'grouped'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Barras Lado a Lado"
            >
              Lado a Lado
            </button>
            <button
              type="button"
              onClick={() => setChartMode('stacked')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                chartMode === 'stacked'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Barras Empilhadas"
            >
              Empilhado
            </button>
          </div>

          {/* Time Filter Pills */}
          <div className="bg-stone-100 p-0.5 rounded-lg flex items-center border border-stone-200 text-xs">
            <button
              type="button"
              onClick={() => setFilter('last6')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                filter === 'last6'
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              6 Meses
            </button>
            <button
              type="button"
              onClick={() => setFilter('currentYear')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                filter === 'currentYear'
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Ano Atual
            </button>
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Todos
            </button>
          </div>
        </div>
      </div>

      {/* Mini KPI summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-stone-50 rounded-lg border border-stone-200/80">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Total do Período
          </span>
          <p className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
            {formatCurrency(totalPeriodo)}
          </p>
          <span className="text-[11px] text-slate-500 font-medium">
            {totalReservasPeriodo} locações
          </span>
        </div>

        <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-200/80">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
            Total Já Recebido
          </span>
          <p className="text-base sm:text-lg font-black text-emerald-700 mt-0.5">
            {formatCurrency(chartData.reduce((acc, curr) => acc + curr.recebido, 0))}
          </p>
          <span className="text-[11px] text-emerald-600 font-medium">
            Entradas confirmadas
          </span>
        </div>

        <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200/80">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
            Saldo a Receber
          </span>
          <p className="text-base sm:text-lg font-black text-amber-700 mt-0.5">
            {formatCurrency(chartData.reduce((acc, curr) => acc + curr.pendente, 0))}
          </p>
          <span className="text-[11px] text-amber-600 font-medium">
            A liquidar no check-in
          </span>
        </div>

        <div className="p-3 bg-teal-50/60 rounded-lg border border-teal-200/80">
          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800">
            Média por Mês
          </span>
          <p className="text-base sm:text-lg font-black text-teal-700 mt-0.5">
            {formatCurrency(mediaMensal)}
          </p>
          <span className="text-[11px] text-teal-600 font-medium">
            {melhorMes ? `Melhor: ${(melhorMes as MonthData).monthLabel}` : 'Média ativa'}
          </span>
        </div>
      </div>

      {/* Recharts Bar Chart Container */}
      <div className="w-full h-72 sm:h-80 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            barGap={4}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis
              dataKey="monthLabel"
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
            />
            <YAxis
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              tick={{ fill: '#64748b', fontSize: 11 }}
              tickFormatter={(val) => {
                if (val >= 1000) return `R$ ${(val / 1000).toFixed(0)}k`;
                return `R$ ${val}`;
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{ paddingBottom: 12, fontSize: 12 }}
              formatter={(value) => {
                if (value === 'recebido') return <span className="text-slate-700 font-bold">Valor Recebido</span>;
                if (value === 'pendente') return <span className="text-slate-700 font-bold">A Receber (Pendente)</span>;
                return value;
              }}
            />
            <Bar
              dataKey="recebido"
              name="recebido"
              fill="#56634B"
              stackId={chartMode === 'stacked' ? 'a' : undefined}
              radius={chartMode === 'stacked' ? [0, 0, 0, 0] : [4, 4, 0, 0]}
              maxBarSize={45}
            />
            <Bar
              dataKey="pendente"
              name="pendente"
              fill="#AE8A75"
              stackId={chartMode === 'stacked' ? 'a' : undefined}
              radius={[4, 4, 0, 0]}
              maxBarSize={45}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Footer note */}
      <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
        <div className="flex items-center space-x-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#56634B]" />
          <span>
            Os valores são calculados com base nas datas de check-in de todas as reservas ativas.
          </span>
        </div>
        <div className="flex items-center space-x-3 text-[11px]">
          <span className="flex items-center">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#56634B] mr-1 inline-block" />
            Recebido (Sinal ou Quitado)
          </span>
          <span className="flex items-center">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#AE8A75] mr-1 inline-block" />
            Pendente (Restante a Pagar)
          </span>
        </div>
      </div>
    </div>
  );
};
