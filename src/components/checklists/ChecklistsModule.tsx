import React, { useState, useEffect } from 'react';
import { Checklist, ChecklistItem, ChacaraDetails } from '../../types';
import {
  ClipboardCheck,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  RotateCcw,
  FileDown,
  Sparkles,
  PlusCircle,
  User,
  ShieldCheck,
  CheckCheck,
  MessageSquare,
} from 'lucide-react';
import { NewChecklistModal } from './NewChecklistModal';

interface ChecklistsModuleProps {
  checklists: Checklist[];
  settings: ChacaraDetails;
  onAddChecklist: (data: Omit<Checklist, 'id' | 'created_at' | 'updated_at'>) => void;
  onUpdateChecklist: (id: string, updates: Partial<Checklist>) => void;
  onDeleteChecklist: (id: string) => void;
  onToggleItem: (checklistId: string, itemId: string) => void;
}

export const ChecklistsModule: React.FC<ChecklistsModuleProps> = ({
  checklists,
  settings,
  onAddChecklist,
  onUpdateChecklist,
  onDeleteChecklist,
  onToggleItem,
}) => {
  const [selectedChecklistId, setSelectedChecklistId] = useState<string>(
    checklists[0]?.id || ''
  );
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  const [editingNotesItemId, setEditingNotesItemId] = useState<string | null>(null);
  const [itemNoteText, setItemNoteText] = useState('');
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    setConfirmingReset(false);
    setConfirmingDelete(false);
  }, [selectedChecklistId]);

  useEffect(() => {
    if (checklists.length > 0 && !checklists.some((c) => c.id === selectedChecklistId)) {
      setSelectedChecklistId(checklists[0].id);
    }
  }, [checklists, selectedChecklistId]);

  const currentChecklist =
    checklists.find((c) => c.id === selectedChecklistId) || checklists[0];

  const totalItems = currentChecklist ? currentChecklist.items.length : 0;
  const completedItems = currentChecklist
    ? currentChecklist.items.filter((i) => i.completed).length
    : 0;
  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Add item on the fly to current checklist
  const handleAddQuickItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemText.trim() || !currentChecklist) return;

    const newItem: ChecklistItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      label: newItemText.trim(),
      category: newItemCategory.trim() || undefined,
      completed: false,
    };

    onUpdateChecklist(currentChecklist.id, {
      items: [...currentChecklist.items, newItem],
    });
    setNewItemText('');
    setNewItemCategory('');
  };

  // Remove single item
  const handleRemoveItem = (itemId: string) => {
    if (!currentChecklist) return;
    const updated = currentChecklist.items.filter((i) => i.id !== itemId);
    onUpdateChecklist(currentChecklist.id, { items: updated });
  };

  // Reset all items to uncompleted (inline confirmation)
  const handleExecuteReset = () => {
    if (!currentChecklist) return;
    const resetItems = currentChecklist.items.map((i) => ({ ...i, completed: false }));
    onUpdateChecklist(currentChecklist.id, { items: resetItems });
    setConfirmingReset(false);
  };

  // Delete checklist with inline confirmation and switch to next available
  const handleExecuteDelete = () => {
    if (!currentChecklist) return;
    const deletedId = currentChecklist.id;
    const remaining = checklists.filter((c) => c.id !== deletedId);
    setSelectedChecklistId(remaining[0]?.id || '');
    setConfirmingDelete(false);
    onDeleteChecklist(deletedId);
  };

  // Mark all items as complete
  const handleMarkAllComplete = () => {
    if (!currentChecklist) return;
    const allDone = currentChecklist.items.map((i) => ({ ...i, completed: true }));
    onUpdateChecklist(currentChecklist.id, { items: allDone });
  };

  // Save notes to an item
  const handleSaveItemNotes = (itemId: string) => {
    if (!currentChecklist) return;
    const updated = currentChecklist.items.map((i) =>
      i.id === itemId ? { ...i, notes: itemNoteText.trim() || undefined } : i
    );
    onUpdateChecklist(currentChecklist.id, { items: updated });
    setEditingNotesItemId(null);
    setItemNoteText('');
  };

  const handleGeneratePDF = (checklist: Checklist) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const total = checklist.items.length;
    const completed = checklist.items.filter((i) => i.completed).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>${checklist.title} - ${settings.name || 'Recanto da Paz'}</title>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 32px; color: #1f2937; margin: 0; }
          .header { border-bottom: 2px solid #059669; padding-bottom: 16px; margin-bottom: 24px; }
          .title { font-size: 24px; font-weight: bold; color: #065f46; margin: 0; }
          .subtitle { font-size: 14px; color: #6b7280; margin-top: 4px; }
          .meta { display: flex; justify-content: space-between; margin-top: 12px; font-size: 13px; background: #f0fdf4; padding: 10px 14px; border-radius: 6px; border: 1px solid #d1fae5; }
          .items-list { list-style: none; padding: 0; margin-top: 20px; }
          .item { display: flex; align-items: flex-start; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .status-badge { font-size: 11px; font-weight: bold; padding: 3px 8px; border-radius: 4px; margin-right: 12px; min-width: 90px; text-align: center; display: inline-block; }
          .completed { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
          .pending { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
          .item-text { font-size: 14px; font-weight: 500; color: #111827; }
          .item-notes { font-size: 12px; color: #059669; margin-top: 4px; font-style: italic; }
          .category-tag { font-size: 11px; background: #f3f4f6; color: #4b5563; padding: 2px 6px; border-radius: 4px; margin-left: 8px; font-weight: normal; }
          .signatures { margin-top: 48px; display: flex; justify-content: space-between; gap: 40px; page-break-inside: avoid; }
          .sig-box { flex: 1; border-top: 1px solid #9ca3af; padding-top: 8px; text-align: center; font-size: 12px; color: #4b5563; }
          .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #f3f4f6; padding-top: 12px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">${settings.name || 'Chácara Recanto da Paz'}</h1>
          <div class="subtitle">${checklist.title} ${checklist.description ? ` - ${checklist.description}` : ''}</div>
          <div class="meta">
            <span><strong>Responsável:</strong> ${checklist.assigned_to || 'Não informado'}</span>
            <span><strong>Progresso:</strong> ${completed}/${total} (${percent}%)</span>
            <span><strong>Emissão:</strong> ${new Date().toLocaleDateString('pt-BR')}</span>
          </div>
        </div>
        <ul class="items-list">
          ${checklist.items
            .map(
              (item) => `
            <li class="item">
              <span class="status-badge ${item.completed ? 'completed' : 'pending'}">
                ${item.completed ? '✓ CONCLUÍDO' : 'PENDENTE'}
              </span>
              <div>
                <span class="item-text">${item.label}</span>${
                item.category ? `<span class="category-tag">${item.category}</span>` : ''
              }
                ${item.notes ? `<div class="item-notes">Obs: ${item.notes}</div>` : ''}
              </div>
            </li>
          `
            )
            .join('')}
        </ul>
        <div class="signatures">
          <div class="sig-box">
            <strong>Responsável pela Vistoria</strong><br/>
            ${checklist.assigned_to || 'Administração / Caseiro'}
          </div>
          <div class="sig-box">
            <strong>Hóspede / Locatário</strong><br/>
            Ciência e De acordo
          </div>
        </div>
        <div class="footer">Documento gerado automaticamente pelo App Gestão Recanto da Paz</div>
        <script>
          window.onload = () => { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Checklists Operacionais & Vistorias
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Controle de vistorias de entrada, conferência de saída e rotinas de manutenção da chácara.
          </p>
        </div>

        <button
          id="btn-new-custom-checklist"
          type="button"
          onClick={() => setIsNewModalOpen(true)}
          className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs sm:text-sm font-bold shadow-xs flex items-center transition-all self-start sm:self-auto cursor-pointer"
        >
          <PlusCircle className="w-4 h-4 mr-1.5" />
          <span>+ Novo Modelo de Checklist</span>
        </button>
      </div>

      {/* Content: Empty State or Checklists View */}
      {checklists.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-8 sm:p-12 text-center shadow-xs space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-200">
            <ClipboardCheck className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Nenhum checklist cadastrado
            </h3>
            <p className="text-xs sm:text-sm text-slate-500">
              Crie modelos de vistoria de entrada, conferência de saída ou rotinas de manutenção para sua chácara.
            </p>
          </div>
          <div>
            <button
              type="button"
              onClick={() => setIsNewModalOpen(true)}
              className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs sm:text-sm font-bold shadow-xs inline-flex items-center cursor-pointer transition-colors"
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              <span>+ Criar Novo Checklist</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Checklist Selector Pills */}
          <div className="flex space-x-2.5 overflow-x-auto pb-2 scrollbar-none">
        {checklists.map((chk) => {
          const isSelected = chk.id === (currentChecklist ? currentChecklist.id : '');
          const total = chk.items.length;
          const done = chk.items.filter((i) => i.completed).length;
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;

          return (
            <button
              key={chk.id}
              type="button"
              onClick={() => setSelectedChecklistId(chk.id)}
              className={`p-3 rounded-xl border text-left whitespace-nowrap transition-all flex flex-col justify-between min-w-[200px] cursor-pointer ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-950 shadow-xs ring-1 ring-emerald-500'
                  : 'bg-white text-slate-700 border-stone-200 hover:bg-stone-50'
              }`}
            >
              <div className="flex items-center justify-between space-x-2">
                <span className="text-xs font-bold truncate max-w-[150px]">{chk.title}</span>
                <span
                  className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                    isSelected ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-stone-100 text-slate-600'
                  }`}
                >
                  {pct}%
                </span>
              </div>
              <p
                className={`text-[11px] mt-2 ${
                  isSelected ? 'text-slate-300' : 'text-slate-400'
                }`}
              >
                {done} de {total} concluídos
              </p>
            </button>
          );
        })}
      </div>

      {/* Active Checklist Card */}
      {currentChecklist && (
        <div className="bg-white rounded-xl border border-stone-200 p-5 sm:p-6 shadow-xs space-y-5">
          {/* Card Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-100">
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  {currentChecklist.title}
                </h3>
                {progressPercent === 100 && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center">
                    <Sparkles className="w-3 h-3 mr-1" /> 100% Concluído
                  </span>
                )}
              </div>
              {currentChecklist.description && (
                <p className="text-xs text-slate-500 mt-1">
                  {currentChecklist.description}
                </p>
              )}
              {currentChecklist.assigned_to && (
                <p className="text-xs text-emerald-800 font-semibold mt-1 flex items-center">
                  <User className="w-3.5 h-3.5 mr-1" />
                  Responsável: {currentChecklist.assigned_to}
                </p>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleMarkAllComplete}
                className="px-2.5 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-200 flex items-center cursor-pointer"
                title="Marcar todos como concluídos"
              >
                <CheckCheck className="w-3.5 h-3.5 mr-1" />
                <span>Marcar Todos</span>
              </button>

              {/* Reset with inline confirmation */}
              {confirmingReset ? (
                <div className="flex items-center space-x-1.5 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-md animate-fade-in shadow-2xs">
                  <span className="text-[11px] font-bold text-amber-900">Desmarcar tudo?</span>
                  <button
                    type="button"
                    onClick={handleExecuteReset}
                    className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-bold cursor-pointer transition-colors"
                  >
                    Confirmar Reinício
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingReset(false)}
                    className="px-1.5 py-0.5 bg-white text-slate-600 hover:text-slate-900 border border-slate-200 rounded text-[11px] font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setConfirmingReset(true);
                    setConfirmingDelete(false);
                  }}
                  className="px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-stone-100 hover:bg-stone-200 rounded-md border border-stone-200 flex items-center cursor-pointer transition-colors"
                  title="Reiniciar checklist para nova estadia"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  <span>Reiniciar</span>
                </button>
              )}

              <button
                id="btn-generate-checklist-pdf"
                type="button"
                onClick={() => handleGeneratePDF(currentChecklist)}
                className="px-2.5 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-200 flex items-center cursor-pointer shadow-xs transition-colors"
                title="Gerar PDF / Salvar termo de vistoria"
              >
                <FileDown className="w-3.5 h-3.5 mr-1 text-emerald-700" />
                <span>Gerar PDF</span>
              </button>

              {/* Delete with inline confirmation (allowed for any checklist) */}
              {confirmingDelete ? (
                <div className="flex items-center space-x-1.5 bg-rose-50 border border-rose-300 px-2.5 py-1 rounded-md animate-fade-in shadow-2xs">
                  <span className="text-[11px] font-bold text-rose-900">Excluir checklist?</span>
                  <button
                    type="button"
                    onClick={handleExecuteDelete}
                    className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-bold cursor-pointer transition-colors"
                  >
                    Sim, Excluir
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    className="px-1.5 py-0.5 bg-white text-slate-600 hover:text-slate-900 border border-slate-200 rounded text-[11px] font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setConfirmingDelete(true);
                    setConfirmingReset(false);
                  }}
                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-md border border-rose-200 cursor-pointer transition-colors"
                  title="Excluir checklist"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold mb-1.5">
              <span className="text-slate-700">Progresso da Vistoria</span>
              <span className="text-emerald-800">
                {progressPercent}% ({completedItems}/{totalItems} itens)
              </span>
            </div>
            <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden border border-stone-200">
              <div
                className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Items List */}
          <div className="space-y-2">
            {currentChecklist.items.map((item) => (
              <div
                key={item.id}
                className={`p-3 rounded-lg border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                  item.completed
                    ? 'bg-emerald-50/30 border-emerald-200/80'
                    : 'bg-white border-stone-200 hover:border-stone-300'
                }`}
              >
                <div className="flex items-start space-x-3 flex-1">
                  <button
                    type="button"
                    onClick={() => onToggleItem(currentChecklist.id, item.id)}
                    className="mt-0.5 text-emerald-700 hover:text-emerald-800 shrink-0 cursor-pointer focus:outline-hidden"
                  >
                    {item.completed ? (
                      <CheckCircle2 className="w-4 h-4 fill-emerald-700 text-white" />
                    ) : (
                      <Circle className="w-4 h-4 text-stone-300 hover:text-emerald-600" />
                    )}
                  </button>

                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        onClick={() => onToggleItem(currentChecklist.id, item.id)}
                        className={`text-xs sm:text-sm font-semibold cursor-pointer select-none ${
                          item.completed ? 'line-through text-slate-400 font-normal' : 'text-slate-900'
                        }`}
                      >
                        {item.label}
                      </span>
                      {item.category && (
                        <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-stone-100 text-slate-600 border border-stone-200">
                          {item.category}
                        </span>
                      )}
                    </div>

                    {item.notes && (
                      <p className="text-[11px] text-emerald-900 font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                        Obs: {item.notes}
                      </p>
                    )}

                    {editingNotesItemId === item.id && (
                      <div className="flex items-center space-x-2 pt-1">
                        <input
                          type="text"
                          placeholder="Adicionar nota técnica ou observação..."
                          value={itemNoteText}
                          onChange={(e) => setItemNoteText(e.target.value)}
                          className="px-2.5 py-1 text-xs border border-emerald-500 rounded-md flex-1 bg-white focus:outline-hidden"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveItemNotes(item.id)}
                          className="px-2.5 py-1 text-xs font-bold bg-emerald-700 text-white rounded-md cursor-pointer"
                        >
                          Salvar
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingNotesItemId(null)}
                          className="px-2 py-1 text-xs text-slate-500 cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingNotesItemId(item.id);
                      setItemNoteText(item.notes || '');
                    }}
                    className="p-1 text-slate-400 hover:text-slate-700 text-xs flex items-center cursor-pointer"
                    title="Adicionar observação técnica"
                  >
                    <MessageSquare className="w-3.5 h-3.5 mr-1" />
                    <span className="text-[11px]">{item.notes ? 'Editar nota' : '+ Nota'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    className="p-1 text-slate-300 hover:text-rose-600 rounded cursor-pointer"
                    title="Remover item do checklist"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Add Item to Current Checklist */}
          <form
            onSubmit={handleAddQuickItem}
            className="p-4 bg-stone-50 rounded-lg border border-stone-200 space-y-2"
          >
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Adicionar Novo Item a esta Vistoria
            </span>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                required
                placeholder="Ex: Verificar iluminação decorativa do quiosque..."
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs sm:text-sm bg-white border border-stone-200 rounded-md focus:ring-2 focus:ring-emerald-600 font-sans"
              />
              <input
                type="text"
                placeholder="Categoria (ex: Lazer)"
                value={newItemCategory}
                onChange={(e) => setNewItemCategory(e.target.value)}
                className="w-full sm:w-36 px-3 py-1.5 text-xs sm:text-sm bg-white border border-stone-200 rounded-md focus:ring-2 focus:ring-emerald-600 font-sans"
              />
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md text-xs font-bold flex items-center justify-center shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-1" />
                <span>Adicionar</span>
              </button>
            </div>
          </form>
        </div>
      )}
        </>
      )}

      {/* Modal for Creating New Custom Checklist */}
      <NewChecklistModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSave={onAddChecklist}
        settings={settings}
      />
    </div>
  );
};
