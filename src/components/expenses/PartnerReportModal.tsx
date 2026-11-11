import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Expense, Reservation, ChacaraDetails } from '../../types';
import { formatCurrency, formatDate, CATEGORY_LABELS } from '../../utils/formatters';
import {
  Share2,
  Copy,
  Printer,
  Check,
  Building,
  DollarSign,
  TrendingUp,
  Percent,
  Calendar,
} from 'lucide-react';

interface PartnerReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenses: Expense[];
  reservations: Reservation[];
  settings: ChacaraDetails;
}

export const PartnerReportModal: React.FC<PartnerReportModalProps> = ({
  isOpen,
  onClose,
  expenses,
  reservations,
  settings,
}) => {
  const [partner1Name, setPartner1Name] = useState('Arrendatário / Gestor');
  const [partner2Name, setPartner2Name] = useState('Sócio / Proprietário');
  const [partner1Share, setPartner1Share] = useState<number>(50);
  const [copied, setCopied] = useState(false);

  const partner2Share = 100 - partner1Share;

  // Active reservations and expenses
  const activeRes = reservations.filter((r) => r.status !== 'cancelled');
  const totalGrossRevenue = activeRes.reduce((acc, curr) => acc + (curr.total_amount || 0), 0);
  const totalReceivedRevenue = activeRes.reduce((acc, curr) => acc + (curr.amount_paid || 0), 0);

  const completedExpenses = expenses.filter((e) => e.status === 'completed');
  const totalExpensesCost = completedExpenses.reduce((acc, curr) => acc + (curr.cost || 0), 0);

  const netBalance = totalReceivedRevenue - totalExpensesCost;

  const partner1Balance = (netBalance * partner1Share) / 100;
  const partner2Balance = (netBalance * partner2Share) / 100;

  const partner1ExpenseShare = (totalExpensesCost * partner1Share) / 100;
  const partner2ExpenseShare = (totalExpensesCost * partner2Share) / 100;

  const generateReportText = () => {
    return `📊 *RELATÓRIO DE PRESTAÇÃO DE CONTAS - ${settings.name.toUpperCase()}*
Data do Relatório: ${new Date().toLocaleDateString('pt-BR')}

🏢 *LOCAL:* ${settings.location}
👥 *DIVISÃO:* ${partner1Name} (${partner1Share}%) | ${partner2Name} (${partner2Share}%)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 *RESUMO FINANCEIRO:*
• Faturamento Total Contratado: ${formatCurrency(totalGrossRevenue)}
• Total de Receitas Efetivamente Recebidas: ${formatCurrency(totalReceivedRevenue)}
• Total de Despesas / Reformas Realizadas: ${formatCurrency(totalExpensesCost)}
• *LUCRO LÍQUIDO APURADO:* ${formatCurrency(netBalance)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤝 *RATEIO DO LUCRO LÍQUIDO:*
• *${partner1Name} (${partner1Share}%):* ${formatCurrency(partner1Balance)}
• *${partner2Name} (${partner2Share}%):* ${formatCurrency(partner2Balance)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔨 *DISCRIMINAÇÃO DAS REFORMAS & MANUTENÇÕES:*
${completedExpenses
  .map(
    (e, idx) =>
      `${idx + 1}. ${formatDate(e.date)} - ${e.title} [${CATEGORY_LABELS[e.category]?.label || e.category}]: ${formatCurrency(e.cost)} (Resp: ${e.responsible_person}${e.receipt_url_or_ref ? ` | Ref: ${e.receipt_url_or_ref}` : ''})`
  )
  .join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Relatório gerado pelo Sistema de Gestão - ${settings.name}.`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateReportText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Prestação de Contas & Divisão de Resultados"
      subtitle={`${settings.name} • Demonstrativo financeiro e divisão entre sócios/proprietário`}
      maxWidth="3xl"
    >
      <div className="space-y-6">
        {/* Partner Configuration */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center">
              <Percent className="w-3.5 h-3.5 mr-1.5 text-emerald-700" />
              Configuração de Participação / Cotas
            </h4>
            <span className="text-xs font-semibold text-slate-500">
              Ajuste as porcentagens conforme contrato
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nome do Gestor / Arrendatário
              </label>
              <input
                type="text"
                value={partner1Name}
                onChange={(e) => setPartner1Name(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nome do Sócio / Proprietário
              </label>
              <input
                type="text"
                value={partner2Name}
                onChange={(e) => setPartner2Name(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Divisão: {partner1Share}% / {partner2Share}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={partner1Share}
                onChange={(e) => setPartner1Share(Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer mt-2"
              />
            </div>
          </div>
        </div>

        {/* Financial Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
            <span className="text-[11px] font-bold uppercase text-slate-500">Receitas Recebidas</span>
            <p className="text-lg font-black text-emerald-700 mt-1">{formatCurrency(totalReceivedRevenue)}</p>
            <span className="text-[10px] text-slate-400">Total contratado: {formatCurrency(totalGrossRevenue)}</span>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
            <span className="text-[11px] font-bold uppercase text-slate-500">Total em Reformas</span>
            <p className="text-lg font-black text-amber-800 mt-1">{formatCurrency(totalExpensesCost)}</p>
            <span className="text-[10px] text-slate-400">{completedExpenses.length} notas/comprovantes</span>
          </div>

          <div className="p-3.5 rounded-xl border border-emerald-300 bg-emerald-50/60">
            <span className="text-[11px] font-bold uppercase text-emerald-800">Resultado Líquido</span>
            <p className={`text-lg font-black mt-1 ${netBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {formatCurrency(netBalance)}
            </p>
            <span className="text-[10px] text-emerald-600">Base para distribuição</span>
          </div>
        </div>

        {/* Partner Share Breakdown Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">{partner1Name}</span>
              <span className="text-xs font-black px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                {partner1Share}%
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200 text-xs space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Cota em Reformas:</span>
                <span>{formatCurrency(partner1ExpenseShare)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 pt-1">
                <span>Resultado a Repassar:</span>
                <span className="text-emerald-700">{formatCurrency(partner1Balance)}</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">{partner2Name}</span>
              <span className="text-xs font-black px-2 py-0.5 rounded bg-teal-100 text-teal-800">
                {partner2Share}%
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200 text-xs space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Cota em Reformas:</span>
                <span>{formatCurrency(partner2ExpenseShare)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 pt-1">
                <span>Resultado a Repassar:</span>
                <span className="text-teal-700">{formatCurrency(partner2Balance)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Itemized Expenses List */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Extrato de Comprovantes & Despesas do Período
          </h4>
          <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
            {completedExpenses.map((exp) => (
              <div key={exp.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50">
                <div>
                  <p className="font-bold text-slate-900">{exp.title}</p>
                  <p className="text-[11px] text-slate-500">
                    {formatDate(exp.date)} • {exp.responsible_person}
                    {exp.receipt_url_or_ref && ` • Ref: ${exp.receipt_url_or_ref}`}
                  </p>
                </div>
                <span className="font-black text-slate-800">{formatCurrency(exp.cost)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            Fechar
          </button>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center"
            >
              <Printer className="w-4 h-4 mr-1.5" />
              <span>Imprimir / PDF</span>
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="px-4 py-2 text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm flex items-center"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-1.5" />
                  <span>Relatório Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-1.5" />
                  <span>Copiar Resumo p/ WhatsApp</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
