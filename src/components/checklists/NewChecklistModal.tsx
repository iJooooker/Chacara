import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Checklist, ChecklistType } from '../../types';
import { ClipboardCheck, Plus, Trash2, AlertCircle } from 'lucide-react';

interface NewChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Checklist, 'id' | 'created_at' | 'updated_at'>) => void;
}

export const NewChecklistModal: React.FC<NewChecklistModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ChecklistType>('custom');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('Seu Agenor (Caseiro)');
  const [items, setItems] = useState<string[]>([
    'Conferência de portas e janelas',
    'Higienização dos banheiros',
    'Conferência de utensílios da churrasqueira',
  ]);
  const [newItemText, setNewItemText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleAddItem = () => {
    if (!newItemText.trim()) return;
    setItems([...items, newItemText.trim()]);
    setNewItemText('');
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Informe o título do checklist.');
      return;
    }
    if (items.length === 0) {
      setErrorMessage('Adicione ao menos 1 item no checklist.');
      return;
    }

    onSave({
      title: title.trim(),
      type,
      description: description.trim() || undefined,
      assigned_to: assignedTo.trim() || undefined,
      items: items.map((label, idx) => ({
        id: `item-${Date.now()}-${idx}`,
        label,
        completed: false,
      })),
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Criar Novo Modelo de Checklist"
      subtitle="Chácara Recanto da Paz • Vistorias, Faxinas & Manutenção"
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
            Título do Checklist / Vistoria *
          </label>
          <input
            id="input-new-chk-title"
            type="text"
            required
            placeholder="Ex: Checklist de Faxina Pesada Pós-Temporada"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 font-sans"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tipo / Finalidade *
            </label>
            <select
              id="select-new-chk-type"
              value={type}
              onChange={(e) => setType(e.target.value as ChecklistType)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 font-sans"
            >
              <option value="check_in_inspection">Vistoria de Entrada (Check-in)</option>
              <option value="check_out_inspection">Vistoria de Saída (Check-out)</option>
              <option value="maintenance_works">Obras & Manutenção Periódica</option>
              <option value="custom">Personalizado / Rotinas Gerais</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Responsável pela Execução
            </label>
            <input
              id="input-new-chk-assigned"
              type="text"
              placeholder="Ex: Seu Agenor (Caseiro)"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 font-sans"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Descrição / Orientações Gerais
          </label>
          <input
            id="input-new-chk-desc"
            type="text"
            placeholder="Ex: Procedimento obrigatório para manter nota 10 dos hóspedes."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 font-sans"
          />
        </div>

        {/* Itens do Checklist */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            Itens a serem checados ({items.length})
          </label>

          <div className="flex space-x-2">
            <input
              id="input-new-chk-item-input"
              type="text"
              placeholder="Digite o item e clique em Adicionar (ex: Verificar botijão de gás)..."
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddItem();
                }
              }}
              className="flex-1 px-3 py-1.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
            <button
              id="btn-add-item-to-list"
              type="button"
              onClick={handleAddItem}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center"
            >
              <Plus className="w-4 h-4 mr-1" />
              <span>Adicionar</span>
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1.5 pt-1">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 text-xs"
              >
                <span className="font-medium text-slate-800">
                  {idx + 1}. {item}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveItem(idx)}
                  className="text-rose-500 hover:text-rose-700 p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
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
            id="btn-save-new-checklist"
            type="submit"
            className="px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            Criar Checklist
          </button>
        </div>
      </form>
    </Modal>
  );
};
