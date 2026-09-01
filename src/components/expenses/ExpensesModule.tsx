import React, { useState, useMemo } from 'react';
import { Expense, ExpenseCategory, ExpenseStatus, ExpensePriority, ChacaraDetails, Reservation } from '../../types';
import {
  formatCurrency,
  formatDate,
  CATEGORY_LABELS,
  EXPENSE_STATUS_CONFIG,
  EXPENSE_PRIORITY_CONFIG,
} from '../../utils/formatters';
import {
  Hammer,
  Search,
  Filter,
  PlusCircle,
  Edit2,
  Trash2,
  Share2,
  CheckCircle2,
  Clock,
  Calendar,
  Layers,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { ExpenseCategoryChart } from './ExpenseCategoryChart';

interface ExpensesModuleProps {
  expenses: Expense[];
  reservations: Reservation[];
  settings: ChacaraDetails;
  onAddExpense: (data: Omit<Expense, 'id' | 'created_at' | 'updated_at'>) => void;
  onUpdateExpense: (id: string, updates: Partial<Expense>) => void;
  onDeleteExpense: (id: string) => void;
  onOpenNewModal: () => void;
  onEditExpense: (exp: Expense) => void;
  onOpenPartnerReport: () => void;
}

export const ExpensesModule: React.FC<ExpensesModuleProps> = ({
  expenses,
  reservations,
  settings,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
  onOpenNewModal,
  onEditExpense,
  onOpenPartnerReport,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Summary figures
  const totalInvested = useMemo(() => expenses.reduce((acc, curr) => acc + (curr.cost || 0), 0), [expenses]);
  const completedTotal = useMemo(
    () => expenses.filter((e) => e.status === 'completed').reduce((acc, curr) => acc + (curr.cost || 0), 0),
    [expenses]
  );
  const inProgressTotal = useMemo(
    () => expenses.filter((e) => e.status === 'in_progress').reduce((acc, curr) => acc + (curr.cost || 0), 0),
    [expenses]
  );
  const plannedTotal = useMemo(
    () => expenses.filter((e) => e.status === 'planned').reduce((acc, curr) => acc + (curr.cost || 0), 0),
    [expenses]
  );

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchesSearch =
        e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.responsible_person.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.receipt_url_or_ref && e.receipt_url_or_ref.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (e.notes && e.notes.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCat = categoryFilter === 'all' || e.category === categoryFilter;
      const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || e.priority === priorityFilter;

      return matchesSearch && matchesCat && matchesStatus && matchesPriority;
    });
  }, [expenses, searchTerm, categoryFilter, statusFilter, priorityFilter]);

  const handleToggleStatus = (exp: Expense) => {
    const nextStatus: ExpenseStatus =
      exp.status === 'planned' ? 'in_progress' : exp.status === 'in_progress' ? 'completed' : 'planned';
    onUpdateExpense(exp.id, { status: nextStatus });
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Gestão de Reformas, Melhorias & Custos
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Registro detalhado de manutenções na piscina, área gourmet, jardinagem e prestação de contas.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            id="btn-partner-report-exp"
            type="button"
            onClick={onOpenPartnerReport}
            className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-slate-800 rounded-lg text-xs sm:text-sm font-bold border border-stone-200 shadow-2xs flex items-center transition-all cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5 mr-1.5 text-slate-600" />
            <span>Prestação de Contas</span>
          </button>

          <button
            id="btn-add-expense-top"
            type="button"
            onClick={onOpenNewModal}
            className="px-3.5 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs sm:text-sm font-bold shadow-xs flex items-center transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 mr-1.5" />
            <span>+ Lançar Reforma</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Investido</span>
          <p className="text-xl font-black text-slate-900 mt-1">{formatCurrency(totalInvested)}</p>
          <span className="text-[11px] text-slate-400">{expenses.length} lançamentos totais</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Concluído & Pago</span>
          <p className="text-xl font-black text-emerald-700 mt-1">{formatCurrency(completedTotal)}</p>
          <span className="text-[11px] text-emerald-700 font-medium">Serviços finalizados</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Em Execução</span>
          <p className="text-xl font-black text-amber-800 mt-1">{formatCurrency(inProgressTotal)}</p>
          <span className="text-[11px] text-amber-700 font-medium">Obras em andamento</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Planejado / Orçamento</span>
          <p className="text-xl font-black text-slate-700 mt-1">{formatCurrency(plannedTotal)}</p>
          <span className="text-[11px] text-slate-400">Próximas melhorias</span>
        </div>
      </div>

      {/* Visual Chart of Categories */}
      <ExpenseCategoryChart expenses={expenses} />

      {/* Filter and Table Section */}
      <div className="space-y-4">
        {/* Filters */}
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="input-search-expenses"
              type="text"
              placeholder="Buscar por descrição, prestador, notas ou comprovante..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-600 font-sans"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              id="filter-exp-category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-semibold bg-stone-50 border border-stone-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-600 text-slate-700 cursor-pointer"
            >
              <option value="all">Todas as Categorias</option>
              {Object.entries(CATEGORY_LABELS).map(([key, item]) => (
                <option key={key} value={key}>
                  {item.label}
                </option>
              ))}
            </select>

            <select
              id="filter-exp-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-semibold bg-stone-50 border border-stone-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-600 text-slate-700 cursor-pointer"
            >
              <option value="all">Todos os Status</option>
              <option value="completed">Concluídos</option>
              <option value="in_progress">Em Andamento</option>
              <option value="planned">Planejados</option>
            </select>

            <select
              id="filter-exp-priority"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-semibold bg-stone-50 border border-stone-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-600 text-slate-700 cursor-pointer"
            >
              <option value="all">Todas as Prioridades</option>
              <option value="high">Alta</option>
              <option value="medium">Média</option>
              <option value="low">Baixa</option>
            </select>
          </div>
        </div>

        {/* Expenses Table */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
          {filteredExpenses.length === 0 ? (
            <div className="text-center py-16 px-4">
              <Hammer className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <h4 className="text-sm font-bold text-slate-700">Nenhum gasto ou reforma encontrado</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Não foram encontradas despesas com os filtros ativos.
              </p>
              <button
                type="button"
                onClick={onOpenNewModal}
                className="mt-4 px-3.5 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
              >
                + Lançar Nova Despesa
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Descrição & Categoria</th>
                    <th className="py-3 px-4">Prestador / Responsável</th>
                    <th className="py-3 px-4">Data</th>
                    <th className="py-3 px-4">Valor (R$)</th>
                    <th className="py-3 px-4">Prioridade</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-xs sm:text-sm">
                  {filteredExpenses.map((exp) => {
                    const catConfig = CATEGORY_LABELS[exp.category] || {
                      label: exp.category,
                      color: 'text-slate-700',
                      bg: 'bg-slate-100',
                    };
                    const statusConfig = EXPENSE_STATUS_CONFIG[exp.status];
                    const priorityConfig = EXPENSE_PRIORITY_CONFIG[exp.priority];

                    return (
                      <tr key={exp.id} className="hover:bg-stone-50 transition-colors group">
                        {/* Descrição */}
                        <td className="py-3.5 px-4">
                          <div>
                            <p className="font-bold text-slate-900 leading-snug">{exp.title}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${catConfig.bg} ${catConfig.color}`}>
                                {catConfig.label}
                              </span>
                              {exp.receipt_url_or_ref && (
                                <span className="text-[11px] text-slate-500 font-medium">
                                  Ref: {exp.receipt_url_or_ref}
                                </span>
                              )}
                            </div>
                            {exp.notes && (
                              <p className="text-[11px] text-slate-400 mt-1 line-clamp-1 italic">
                                {exp.notes}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Prestador */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-medium text-slate-800">{exp.responsible_person}</span>
                        </td>

                        {/* Data */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                          {formatDate(exp.date)}
                        </td>

                        {/* Valor */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-black text-slate-900">{formatCurrency(exp.cost)}</span>
                        </td>

                        {/* Prioridade */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${priorityConfig.badgeClass}`}>
                            {priorityConfig.label}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(exp)}
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border cursor-pointer transition-all hover:scale-105 ${statusConfig.badgeClass}`}
                            title="Clique para alternar status (Planejado → Em Andamento → Concluído)"
                          >
                            {statusConfig.label}
                          </button>
                        </td>

                        {/* Ações */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              id={`btn-edit-exp-${exp.id}`}
                              type="button"
                              onClick={() => onEditExpense(exp)}
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-stone-100 rounded-md transition-colors cursor-pointer"
                              title="Editar despesa"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            <button
                              id={`btn-del-exp-${exp.id}`}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteExpense(exp.id);
                              }}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                              title="Excluir despesa"
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
    </div>
  );
};
