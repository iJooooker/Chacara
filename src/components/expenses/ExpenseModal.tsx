import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Expense, ExpenseCategory, ExpenseStatus, ExpensePriority } from '../../types';
import { CATEGORY_LABELS } from '../../utils/formatters';
import { Hammer, User, DollarSign, Calendar, FileText, AlertCircle } from 'lucide-react';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Expense, 'id' | 'created_at' | 'updated_at'>) => void;
  initialData?: Expense | null;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('piscina');
  const [cost, setCost] = useState<number>(500);
  const [responsiblePerson, setResponsiblePerson] = useState('');
  const [date, setDate] = useState('');
  const [status, setStatus] = useState<ExpenseStatus>('completed');
  const [priority, setPriority] = useState<ExpensePriority>('medium');
  const [receiptUrlOrRef, setReceiptUrlOrRef] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setCategory(initialData.category || 'piscina');
      setCost(initialData.cost || 0);
      setResponsiblePerson(initialData.responsible_person || '');
      setDate(initialData.date || '');
      setStatus(initialData.status || 'completed');
      setPriority(initialData.priority || 'medium');
      setReceiptUrlOrRef(initialData.receipt_url_or_ref || '');
      setNotes(initialData.notes || '');
    } else {
      const today = new Date().toISOString().split('T')[0];
      setTitle('');
      setCategory('piscina');
      setCost(350);
      setResponsiblePerson('');
      setDate(today);
      setStatus('completed');
      setPriority('medium');
      setReceiptUrlOrRef('');
      setNotes('');
    }
    setErrorMessage('');
  }, [initialData, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Informe a descrição ou nome da reforma/despesa.');
      return;
    }
    if (!responsiblePerson.trim()) {
      setErrorMessage('Informe o prestador ou responsável pela despesa.');
      return;
    }
    if (!date) {
      setErrorMessage('Informe a data do gasto ou previsão.');
      return;
    }
    if (cost <= 0) {
      setErrorMessage('O valor da despesa deve ser maior que zero.');
      return;
    }

    onSave({
      title: title.trim(),
      category,
      cost: Number(cost),
      responsible_person: responsiblePerson.trim(),
      date,
      status,
      priority,
      receipt_url_or_ref: receiptUrlOrRef.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Editar Reforma / Despesa' : 'Registrar Nova Despesa ou Reforma'}
      subtitle="Chácara Recanto da Paz • Gestão de custos e melhorias"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center">
            <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Descrição do Serviço / Material Adquirido *
          </label>
          <input
            id="input-exp-title"
            type="text"
            required
            placeholder="Ex: Reforma da bomba d'água da piscina e troca de conexões"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-sans"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Categoria da Reforma / Manutenção *
            </label>
            <select
              id="select-exp-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-sans"
            >
              {Object.entries(CATEGORY_LABELS).map(([key, item]) => (
                <option key={key} value={key}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Valor Total do Gasto (R$) *
            </label>
            <input
              id="input-exp-cost"
              type="number"
              min="0"
              step="10"
              required
              value={cost}
              onChange={(e) => setCost(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm font-bold text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Prestador / Responsável *
            </label>
            <input
              id="input-exp-responsible"
              type="text"
              required
              placeholder="Ex: Pedreiro Marcos / Eletricista Rogério"
              value={responsiblePerson}
              onChange={(e) => setResponsiblePerson(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-sans"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Data do Gasto / Execução *
            </label>
            <input
              id="input-exp-date"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-sans"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Status da Execução
            </label>
            <select
              id="select-exp-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as ExpenseStatus)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-sans"
            >
              <option value="completed">Concluído & Pago</option>
              <option value="in_progress">Em Andamento</option>
              <option value="planned">Planejado / Orçamento</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Prioridade / Urgência
            </label>
            <select
              id="select-exp-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as ExpensePriority)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-sans"
            >
              <option value="high">Alta (Urgente p/ locação)</option>
              <option value="medium">Média (Melhoria contínua)</option>
              <option value="low">Baixa (Estética/Desejável)</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Comprovante / Referência (NF-e, Recibo PIX, Cupom)
            </label>
            <input
              id="input-exp-receipt"
              type="text"
              placeholder="Ex: NF-e 4492 ou Comprovante PIX Banco Inter"
              value={receiptUrlOrRef}
              onChange={(e) => setReceiptUrlOrRef(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-sans"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Observações Técnicas / Detalhes dos Materiais
          </label>
          <textarea
            id="input-exp-notes"
            rows={2}
            placeholder="Ex: Garantia de 6 meses no motor. Foram trocados também os rolamentos."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-sans"
          />
        </div>

        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            id="btn-save-expense"
            type="submit"
            className="px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            {initialData ? 'Salvar Alterações' : 'Registrar Despesa'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
