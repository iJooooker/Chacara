import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Reservation, ChacaraDetails } from '../../types';
import { formatDate, formatCurrency, buildWhatsAppLink, formatPhone } from '../../utils/formatters';
import { MessageCircle, Copy, ExternalLink, Check, FileText, Key, AlertCircle } from 'lucide-react';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: Reservation | null;
  settings: ChacaraDetails;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  isOpen,
  onClose,
  reservation,
  settings,
}) => {
  const [templateType, setTemplateType] = useState<'confirmation' | 'checkin_guide' | 'payment_reminder' | 'checkout_guide'>('confirmation');
  const [copied, setCopied] = useState(false);

  if (!reservation) return null;

  const generateMessage = () => {
    switch (templateType) {
      case 'confirmation':
        return `🏡 *Confirmação de Reserva - ${settings.name}*

Olá, *${reservation.client_name}*! Tudo bem?

Sua reserva para a chácara está confirmada! Seguem os detalhes:

📅 *Check-in:* ${formatDate(reservation.check_in)} a partir das ${settings.check_in_time}
📅 *Check-out:* ${formatDate(reservation.check_out)} até as ${settings.check_out_time}
👥 *Hóspedes acordados:* até ${reservation.guests_count} pessoas
💰 *Valor Total:* ${formatCurrency(reservation.total_amount)}
💵 *Sinal Pago:* ${formatCurrency(reservation.amount_paid)}
${reservation.remaining_amount > 0 ? `⏳ *Saldo Restante:* ${formatCurrency(reservation.remaining_amount)} (a acertar na entrega das chaves)` : '✅ *Status:* Totalmente Quitado'}

📍 *Localização:* ${settings.location}
👨‍🌾 *Caseiro no local:* ${settings.caretaker_name} (${formatPhone(settings.caretaker_phone)})

Se precisar de algo antes da viagem, estamos à disposição!`;

      case 'checkin_guide':
        return `🌿 *Guia de Boas-Vindas & Check-in - ${settings.name}*

Olá, *${reservation.client_name}*! Estamos preparando a chácara para receber você e sua família!

🕒 *Horário de Entrada:* ${formatDate(reservation.check_in)} a partir das ${settings.check_in_time}
🔑 *Acesso:* ${settings.gate_code}
📶 *Wi-Fi da Chácara:*
• Rede: *${settings.wifi_network}*
• Senha: *${settings.wifi_password}*

⚡ *Energia Elétrica:* ${settings.energy_110_220}
🔊 *Regra de Convivência:* ${settings.quiet_hours}
👨‍🌾 *Caseiro de apoio:* ${settings.caretaker_name}

Desejamos um excelente final de semana de descanso e lazer!`;

      case 'payment_reminder':
        return `💰 *Lembrete de Saldo de Locação - ${settings.name}*

Olá, *${reservation.client_name}*, esperamos que esteja tudo bem!

Lembramos que o check-in da sua estadia está agendado para *${formatDate(reservation.check_in)}*.

💵 *Saldo restante para quitação:* ${formatCurrency(reservation.remaining_amount)}
O pagamento pode ser efetuado via chave PIX antes da entrada ou diretamente com o administrador.

Qualquer dúvida ou caso já tenha efetuado o PIX, nos avise por aqui! Muito obrigado!`;

      case 'checkout_guide':
        return `👋 *Informações de Check-out & Despedida - ${settings.name}*

Olá, *${reservation.client_name}*! Esperamos que tenham aproveitado momentos inesquecíveis no Recanto da Paz!

Lembramos que o horário limite de saída hoje é até as *${settings.check_out_time}*.

📋 *Lembretes rápidos:*
1. Por gentileza, recolher os sacos de lixo e descartar nas lixeiras externas.
2. Desligar luzes, ventiladores e a bomba da piscina.
3. Entregar as chaves e controles ao caseiro *${settings.caretaker_name}*.

Agradecemos imensamente a preferência e esperamos vocês de volta em breve!`;
    }
  };

  const messageText = generateMessage();
  const waLink = buildWhatsAppLink(reservation.client_phone, messageText);

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Enviar Mensagem via WhatsApp"
      subtitle={`Cliente: ${reservation.client_name} (${formatPhone(reservation.client_phone)})`}
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Template Selector */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Selecione o Modelo de Mensagem
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setTemplateType('confirmation')}
              className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                templateType === 'confirmation'
                  ? 'bg-emerald-50 border-emerald-600 text-emerald-900 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <FileText className="w-4 h-4 mb-1 text-emerald-600" />
              <span>1. Confirmação</span>
            </button>

            <button
              type="button"
              onClick={() => setTemplateType('checkin_guide')}
              className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                templateType === 'checkin_guide'
                  ? 'bg-emerald-50 border-emerald-600 text-emerald-900 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Key className="w-4 h-4 mb-1 text-emerald-600" />
              <span>2. Guia Check-in</span>
            </button>

            <button
              type="button"
              onClick={() => setTemplateType('payment_reminder')}
              className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                templateType === 'payment_reminder'
                  ? 'bg-emerald-50 border-emerald-600 text-emerald-900 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <AlertCircle className="w-4 h-4 mb-1 text-amber-600" />
              <span>3. Cobrança Saldo</span>
            </button>

            <button
              type="button"
              onClick={() => setTemplateType('checkout_guide')}
              className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                templateType === 'checkout_guide'
                  ? 'bg-emerald-50 border-emerald-600 text-emerald-900 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Check className="w-4 h-4 mb-1 text-teal-600" />
              <span>4. Check-out</span>
            </button>
          </div>
        </div>

        {/* Message Preview */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-600">Prévia formatada para WhatsApp</span>
            <button
              type="button"
              onClick={handleCopy}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 mr-1" /> Copiar Texto
                </>
              )}
            </button>
          </div>
          <div className="p-4 bg-emerald-950/90 text-emerald-100 rounded-xl font-sans text-xs sm:text-sm whitespace-pre-wrap leading-relaxed border border-emerald-900 shadow-inner max-h-72 overflow-y-auto">
            {messageText}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Fechar
          </button>
          <a
            id="btn-open-whatsapp-link"
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm flex items-center transition-all cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            <span>Abrir no WhatsApp Web/App</span>
            <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
          </a>
        </div>
      </div>
    </Modal>
  );
};
