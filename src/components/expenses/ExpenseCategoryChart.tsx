import React from 'react';
import { Expense } from '../../types';
import { formatCurrency, CATEGORY_LABELS } from '../../utils/formatters';
import { PieChart, DollarSign, Layers } from 'lucide-react';

interface ExpenseCategoryChartProps {
  expenses: Expense[];
}

export const ExpenseCategoryChart: React.FC<ExpenseCategoryChartProps> = ({ expenses }) => {
  const totalCost = expenses.reduce((acc, curr) => acc + (curr.cost || 0), 0);

  // Group by category
  const categoryTotals = expenses.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + (curr.cost || 0);
    return acc;
  }, {} as Record<string, number>);

  const sortedCategories = (Object.entries(categoryTotals) as [string, number][])
    .map(([cat, amount]) => ({
      categoryKey: cat,
      amount,
      percentage: totalCost > 0 ? Math.round((amount / totalCost) * 100) : 0,
      config: CATEGORY_LABELS[cat] || { label: cat, color: 'text-slate-700', bg: 'bg-slate-100' },
    }))
    .sort((a, b) => b.amount - a.amount);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
            <PieChart className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 font-sans">
              Divisão de Custos por Categoria
            </h3>
            <p className="text-xs text-slate-500">Distribuição percentual dos investimentos na chácara</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs font-semibold text-slate-400">Total Investido</span>
          <p className="text-base sm:text-lg font-black text-slate-900">{formatCurrency(totalCost)}</p>
        </div>
      </div>

      {sortedCategories.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-4">Nenhum gasto registrado ainda.</p>
      ) : (
        <div className="space-y-3 pt-2">
          {sortedCategories.map((item) => (
            <div key={item.categoryKey} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 flex items-center">
                  <span className={`w-2.5 h-2.5 rounded-full mr-2 inline-block ${item.config.bg.split(' ')[0]}`} />
                  {item.config.label}
                </span>
                <div className="flex items-center space-x-2 font-semibold">
                  <span className="text-slate-900">{formatCurrency(item.amount)}</span>
                  <span className="text-slate-400 font-normal">({item.percentage}%)</span>
                </div>
              </div>

              {/* Bar */}
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
