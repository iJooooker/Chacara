import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Reservation, PaymentStatus, ReservationStatus } from '../../types';
import { calculateDaysBetween, formatCurrency } from '../../utils/formatters';
import { Calendar, User, Phone, Users, DollarSign, FileText, AlertCircle } from 'lucide-react';

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Reservation, 'id' | 'created_at' | 'updated_at'>) => void;
  initialData?: Reservation | null;
}

export const ReservationModal: React.FC<ReservationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientDocument, setClientDocument] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guestsCount, setGuestsCount] = useState<number>(10);
  const [totalAmount, setTotalAmount] = useState<number>(2000);
  const [amountPaid, setAmountPaid] = useState<number>(1000);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('partially_paid');
  const [status, setStatus] = useState<ReservationStatus>('confirmed');
  const [contractNotes, setContractNotes] = useState('');
  const [depositDate, setDepositDate] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (initialData) {
      setClientName(initialData.client_name || '');
      setClientPhone(initialData.client_phone || '');
      setClientDocument(initialData.client_document || '');
      setCheckIn(initialData.check_in || '');
      setCheckOut(initialData.check_out || '');
      setGuestsCount(initialData.guests_count || 10);
      setTotalAmount(initialData.total_amount || 0);
      setAmountPaid(initialData.amount_paid || 0);
      setPaymentStatus(initialData.payment_status || 'pending');
      setStatus(initialData.status || 'confirmed');
      setContractNotes(initialData.contract_notes || '');
      setDepositDate(initialData.deposit_date || '');
    } else {
      // Default to next upcoming weekend
      const today = new Date();
      const nextFri = new Date(today);
      nextFri.setDate(today.getDate() + ((5 - today.getDay() + 7) % 7 || 7));
      const nextSun = new Date(nextFri);
      nextSun.setDate(nextFri.getDate() + 2);

      const toIso = (d: Date) => d.toISOString().split('T')[0];

      setClientName('');
      setClientPhone('');
      setClientDocument('');
      setCheckIn(toIso(nextFri));
      setCheckOut(toIso(nextSun));
      setGuestsCount(12);
      setTotalAmount(2200);
      setAmountPaid(1100);
      setPaymentStatus('partially_paid');
      setStatus('confirmed');
      setContractNotes('');
      setDepositDate(toIso(today));
    }
    setErrorMessage('');
  }, [initialData, isOpen]);

  // Auto calculate remaining and payment status if amounts change
  const remaining = Math.max(0, (totalAmount || 0) - (amountPaid || 0));

  const handlePaidChange = (paid: number) => {
    setAmountPaid(paid);
    if (paid >= totalAmount && totalAmount > 0) {
      setPaymentStatus('paid');
    } else if (paid > 0) {
      setPaymentStatus('partially_paid');
    } else {
      setPaymentStatus('pending');
    }
  };

  const handleTotalChange = (total: number) => {
    setTotalAmount(total);
    if (amountPaid >= total && total > 0) {
      setPaymentStatus('paid');
    } else if (amountPaid > 0) {
      setPaymentStatus('partially_paid');
    } else {
      setPaymentStatus('pending');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      setErrorMessage('Por favor, informe o nome do cliente / responsável.');
      return;
    }
    if (!clientPhone.trim()) {
      setErrorMessage('Por favor, informe o telefone/WhatsApp do cliente.');
      return;
    }
    if (!checkIn || !checkOut) {
      setErrorMessage('Informe as datas de check-in e check-out.');
      return;
    }
    if (checkOut < checkIn) {
      setErrorMessage('A data de check-out não pode ser anterior à data de check-in.');
      return;
    }

    const daysStay = calculateDaysBetween(checkIn, checkOut);
    const calculatedRemaining = Math.max(0, totalAmount - amountPaid);
    const calculatedDailyRate = daysStay > 0 ? Math.round(Number(totalAmount) / daysStay) : Number(totalAmount);

    onSave({
      client_name: clientName.trim(),
      client_phone: clientPhone.trim(),
      client_document: clientDocument.trim() || undefined,
      check_in: checkIn,
      check_out: checkOut,
      guests_count: Number(guestsCount) || 1,
      daily_rate: calculatedDailyRate,
      total_amount: Number(totalAmount) || 0,
      amount_paid: Number(amountPaid) || 0,
      remaining_amount: calculatedRemaining,
      payment_status: paymentStatus,
      status: status,
      contract_notes: contractNotes.trim() || undefined,
      deposit_date: depositDate || undefined,
    });
    onClose();
  };

  const daysStay = calculateDaysBetween(checkIn, checkOut);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Editar Locação por Temporada' : 'Cadastrar Nova Locação'}
      subtitle="Chácara Recanto da Paz • Registro e contrato de locação"
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center">
            <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Informações do Cliente */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/70 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center">
            <User className="w-3.5 h-3.5 mr-1.5 text-emerald-700" />
            Dados do Locatário / Hóspede Principal
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nome Completo do Cliente *
              </label>
              <input
                id="input-res-client-name"
                type="text"
                required
                placeholder="Ex: Carlos Eduardo de Souza"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-sans"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Telefone / WhatsApp *
              </label>
              <input
                id="input-res-client-phone"
                type="text"
                required
                placeholder="Ex: 11987654321"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-sans"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                CPF / RG do Responsável (Opcional)
              </label>
              <input
                id="input-res-client-doc"
                type="text"
                placeholder="Ex: 123.456.789-00"
                value={clientDocument}
                onChange={(e) => setClientDocument(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-sans"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Qtd. de Pessoas / Hóspedes
              </label>
              <input
                id="input-res-guests"
                type="number"
                min="1"
                max="30"
                value={guestsCount}
                onChange={(e) => setGuestsCount(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-sans"
              />
            </div>
          </div>
        </div>

        {/* Datas e Estadia */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/70 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center">
              <Calendar className="w-3.5 h-3.5 mr-1.5 text-emerald-700" />
              Período da Locação
            </h4>
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
              {checkIn && checkOut && checkIn === checkOut
                ? '1 diária (Day Use)'
                : `${daysStay} ${daysStay === 1 ? 'diária' : 'diárias'}`}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Data de Check-in (Entrada) *
              </label>
              <input
                id="input-res-checkin"
                type="date"
                required
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-sans"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Data de Check-out (Saída) *
              </label>
              <input
                id="input-res-checkout"
                type="date"
                required
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-sans"
              />
            </div>
          </div>
        </div>

        {/* Valores e Pagamentos */}
        <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200/80 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center">
            <DollarSign className="w-3.5 h-3.5 mr-1.5 text-emerald-700" />
            Financeiro da Locação
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Valor Total Acordado (R$) *
              </label>
              <input
                id="input-res-total"
                type="number"
                min="0"
                step="50"
                required
                value={totalAmount}
                onChange={(e) => handleTotalChange(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-bold text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Valor Já Pago / Sinal (R$)
              </label>
              <input
                id="input-res-paid"
                type="number"
                min="0"
                step="50"
                value={amountPaid}
                onChange={(e) => handlePaidChange(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-bold text-emerald-700 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Valor Restante a Pagar
              </label>
              <div className="px-3 py-2 text-sm font-black bg-slate-100 text-amber-900 border border-slate-200 rounded-lg">
                {formatCurrency(remaining)}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status do Pagamento
              </label>
              <select
                id="select-res-pay-status"
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-sans"
              >
                <option value="pending">Pendente (R$ 0 pago)</option>
                <option value="partially_paid">Parcialmente Pago (Sinal)</option>
                <option value="paid">Pago Total (100% quitado)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status da Reserva
              </label>
              <select
                id="select-res-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ReservationStatus)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-sans"
              >
                <option value="confirmed">Confirmada</option>
                <option value="in_progress">Em Andamento (Hóspede no local)</option>
                <option value="completed">Concluída (Check-out ok)</option>
                <option value="cancelled">Cancelada</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Data do Sinal / Pagamento
              </label>
              <input
                id="input-res-deposit-date"
                type="date"
                value={depositDate}
                onChange={(e) => setDepositDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-sans"
              />
            </div>
          </div>
        </div>

        {/* Observações e Regras */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Observações, Regras Contratuais & Solicitações do Cliente
          </label>
          <textarea
            id="input-res-notes"
            rows={3}
            placeholder="Ex: Solicitou berço desmontável, permissão para 1 cachorro pequeno. Taxa de limpeza R$ 150 inclusa."
            value={contractNotes}
            onChange={(e) => setContractNotes(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-sans"
          />
        </div>

        {/* Botoes de Ação */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            id="btn-save-reservation"
            type="submit"
            className="px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            {initialData ? 'Salvar Alterações' : 'Confirmar & Salvar Locação'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
