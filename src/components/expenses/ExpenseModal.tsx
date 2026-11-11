import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../common/Modal';
import { Expense, ExpenseCategory, ExpenseStatus, ExpensePriority, ChacaraDetails } from '../../types';
import { CATEGORY_LABELS, getLocalDateString } from '../../utils/formatters';
import { processImageFile } from '../../utils/imageUtils';
import { Hammer, User, DollarSign, Calendar, FileText, AlertCircle, Camera, X, Loader2 } from 'lucide-react';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (data: any) => void;
  onSaveExpense?: (data: any) => void;
  initialData?: Expense | null;
  settings?: ChacaraDetails;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onSaveExpense,
  initialData,
  settings,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('piscina');
  const [cost, setCost] = useState<string | number>('350');
  const [responsiblePerson, setResponsiblePerson] = useState('');
  const [date, setDate] = useState('');
  const [status, setStatus] = useState<ExpenseStatus>('completed');
  const [priority, setPriority] = useState<ExpensePriority>('medium');
  const [receiptUrlOrRef, setReceiptUrlOrRef] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setCategory(initialData.category || 'piscina');
      setCost(initialData.cost !== undefined ? String(initialData.cost) : '0');
      setResponsiblePerson(initialData.responsible_person || '');
      setDate(initialData.date || '');
      setStatus(initialData.status || 'completed');
      setPriority(initialData.priority || 'medium');
      setReceiptUrlOrRef(initialData.receipt_url_or_ref || '');
      setPhotos(initialData.photos || []);
      setNotes(initialData.notes || '');
    } else {
      const today = getLocalDateString();
      setTitle('');
      setCategory('piscina');
      setCost('350');
      setResponsiblePerson('');
      setDate(today);
      setStatus('completed');
      setPriority('medium');
      setReceiptUrlOrRef('');
      setPhotos([]);
      setNotes('');
    }
    setErrorMessage('');
  }, [initialData, isOpen]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingPhoto(true);
    try {
      const fileList = Array.from(files) as File[];
      const processed: string[] = [];
      for (const file of fileList) {
        if (file.type.startsWith('image/')) {
          const base64 = await processImageFile(file);
          processed.push(base64);
        }
      }
      setPhotos((prev) => [...prev, ...processed]);
    } catch (err) {
      console.error('Erro ao processar imagem:', err);
      setErrorMessage('Não foi possível processar algumas imagens. Tente novamente.');
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    setPhotos((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!title?.trim()) {
      setErrorMessage('Por favor, preencha a descrição/título da despesa.');
      return;
    }

    const numericCost = parseFloat(String(cost).replace(',', '.')) || 0;

    const expenseData: Omit<Expense, 'id' | 'created_at' | 'updated_at'> = {
      title: title.trim(),
      category: category || 'outros',
      cost: numericCost,
      responsible_person: responsiblePerson?.trim() || 'Não informado',
      date: date || getLocalDateString(),
      status: status || 'planned',
      priority: priority || 'medium',
      receipt_url_or_ref: receiptUrlOrRef?.trim() || '',
      notes: notes?.trim() || '',
      photos: photos || [],
    };

    const saveFunction = onSaveExpense || onSave;
    if (saveFunction) {
      saveFunction(expenseData);
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Editar Reforma / Despesa' : 'Registrar Nova Despesa ou Reforma'}
      subtitle={`${settings?.name || 'Chácara Solaris'} • Gestão de custos e melhorias`}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
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
            placeholder="Ex: Reforma da bomba d'água da piscina e troca de conexões"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (errorMessage) setErrorMessage('');
            }}
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
              Valor Total do Gasto (R$)
            </label>
            <input
              id="input-exp-cost"
              type="text"
              inputMode="decimal"
              placeholder="Ex: 350 ou 350,00"
              value={cost}
              onChange={(e) => {
                setCost(e.target.value);
                if (errorMessage) setErrorMessage('');
              }}
              className="w-full px-3 py-2 text-sm font-bold text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Prestador / Responsável
            </label>
            <input
              id="input-exp-responsible"
              type="text"
              placeholder="Ex: Pedreiro Marcos (ou Não informado)"
              value={responsiblePerson}
              onChange={(e) => setResponsiblePerson(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-sans"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Data do Gasto / Execução
            </label>
            <input
              id="input-exp-date"
              type="date"
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

        {/* Fotos e Anexos */}
        <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <div className="flex items-center space-x-2">
                <label className="block text-xs font-bold text-slate-800">
                  Fotos & Anexos da Reforma
                </label>
                {photos.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    📷 {photos.length} {photos.length === 1 ? 'foto' : 'fotos'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                Disjuntores, fiação, peças para compra, recibos ou fotos de antes/depois.
              </p>
            </div>

            <div>
              <input
                ref={fileInputRef}
                id="input-expense-photos"
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                id="btn-upload-expense-photo"
                type="button"
                disabled={isUploadingPhoto}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center px-3.5 py-2 text-xs font-bold text-emerald-900 bg-emerald-200/70 hover:bg-emerald-200 border border-emerald-400/80 rounded-lg transition-all shadow-2xs cursor-pointer disabled:opacity-50"
              >
                {isUploadingPhoto ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin text-emerald-900" />
                    <span>Processando fotos...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-3.5 h-3.5 mr-1.5 text-emerald-900" />
                    <span>Adicionar Foto / Tirar Foto</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Miniaturas das Fotos */}
          {photos.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5 pt-1">
              {photos.map((photo, index) => (
                <div
                  key={index}
                  className="relative group aspect-square rounded-lg overflow-hidden border border-stone-300 bg-black/5 shadow-2xs"
                >
                  <img
                    src={photo}
                    alt={`Foto anexo ${index + 1}`}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(index)}
                    className="absolute top-1 right-1 p-1 bg-black/75 hover:bg-rose-600 text-white rounded-full transition-colors cursor-pointer shadow-xs"
                    title="Remover foto"
                    aria-label="Remover foto"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 backdrop-blur-xs text-white text-[9px] font-bold rounded">
                    #{index + 1}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border border-dashed border-stone-300 rounded-lg py-3 px-4 text-center cursor-pointer hover:bg-stone-100/70 transition-colors"
            >
              <p className="text-xs text-slate-500">
                Nenhuma foto anexada. Clique em <strong className="text-emerald-700">Adicionar Foto / Tirar Foto</strong> para incluir imagens pelo celular ou computador.
              </p>
            </div>
          )}
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
