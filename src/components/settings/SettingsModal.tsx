import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { ChacaraDetails } from '../../types';
import { getLocalDateString } from '../../utils/formatters';
import {
  Settings,
  Download,
  Upload,
  RotateCcw,
  Check,
  Save,
  Building,
  Key,
  Wifi,
  Zap,
  Phone,
  Database,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ChacaraDetails;
  onSaveSettings: (settings: ChacaraDetails) => Promise<void> | void;
  onResetToMock: () => Promise<void> | void;
  onExportData: () => string;
  onImportData: (jsonStr: string) => Promise<boolean> | boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onResetToMock,
  onExportData,
  onImportData,
}) => {
  const [formData, setFormData] = useState<ChacaraDetails>(settings);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [importStatus, setImportStatus] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    setFormData(settings);
    setSaveSuccess(false);
    setImportStatus(null);
    setConfirmingReset(false);
  }, [settings, isOpen]);

  const handleChange = (field: keyof ChacaraDetails, val: any) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveSettings(formData);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1200);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadBackup = () => {
    const json = onExportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const sanitizedName = (settings?.name || 'chacara-solaris')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'chacara-solaris';
    a.download = `backup-${sanitizedName}-${getLocalDateString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      setIsImporting(true);
      setImportStatus(null);
      try {
        const content = evt.target?.result as string;
        const ok = await onImportData(content);
        if (ok) {
          setImportStatus({
            type: 'success',
            text: 'Backup importado e sincronizado com sucesso!',
          });
          setTimeout(() => setImportStatus(null), 4000);
        } else {
          setImportStatus({
            type: 'error',
            text: 'Erro ao importar backup. Verifique se o arquivo JSON é um backup válido.',
          });
        }
      } catch (err) {
        setImportStatus({
          type: 'error',
          text: 'Erro ao processar arquivo de backup.',
        });
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmReset = async () => {
    setIsResetting(true);
    try {
      await onResetToMock();
      setConfirmingReset(false);
      onClose();
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configurações da Chácara & Backup"
      subtitle="Parâmetros de locação, Wi-Fi, regras e persistência de dados"
      maxWidth="3xl"
    >
      <div className="space-y-6">
        {/* Settings Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center">
              <Building className="w-3.5 h-3.5 mr-1.5 text-emerald-700" />
              Identificação & Regras da Propriedade
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome da Chácara
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Endereço / Localização
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Horário Padrão de Check-in
                </label>
                <input
                  type="text"
                  value={formData.check_in_time}
                  onChange={(e) => handleChange('check_in_time', e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Horário Padrão de Check-out
                </label>
                <input
                  type="text"
                  value={formData.check_out_time}
                  onChange={(e) => handleChange('check_out_time', e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome da Rede Wi-Fi
                </label>
                <input
                  type="text"
                  value={formData.wifi_network}
                  onChange={(e) => handleChange('wifi_network', e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Senha do Wi-Fi
                </label>
                <input
                  type="text"
                  value={formData.wifi_password}
                  onChange={(e) => handleChange('wifi_password', e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Senha / Instruções do Portão Eletrônico
                </label>
                <input
                  type="text"
                  value={formData.gate_code}
                  onChange={(e) => handleChange('gate_code', e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Voltagem / Informações de Tomadas
                </label>
                <input
                  type="text"
                  value={formData.energy_110_220}
                  onChange={(e) => handleChange('energy_110_220', e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome do Caseiro
                </label>
                <input
                  type="text"
                  value={formData.caretaker_name}
                  onChange={(e) => handleChange('caretaker_name', e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  WhatsApp do Caseiro
                </label>
                <input
                  type="text"
                  value={formData.caretaker_phone}
                  onChange={(e) => handleChange('caretaker_phone', e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Regras de Convivência & Lei do Silêncio
                </label>
                <input
                  type="text"
                  value={formData.quiet_hours}
                  onChange={(e) => handleChange('quiet_hours', e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Link iCal Privado da Agenda do Google (.ics)</span>
                  <span className="text-[10px] text-emerald-700 font-normal">Sincronização Ativa</span>
                </label>
                <input
                  type="text"
                  value={formData.google_calendar_ical_url || ''}
                  onChange={(e) => handleChange('google_calendar_ical_url', e.target.value)}
                  placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
                  className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 text-slate-700"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  URL da agenda Google utilizada para ler e cruzar eventos de calendário no celular.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              id="btn-save-settings-data"
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs sm:text-sm font-bold flex items-center shadow-sm cursor-pointer transition-colors"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Salvando...
                </>
              ) : saveSuccess ? (
                <>
                  <Check className="w-4 h-4 mr-1.5" /> Salvo com Sucesso!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-1.5" /> Salvar Configurações
                </>
              )}
            </button>
          </div>
        </form>

        {/* Database Persistence & Backup Management */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
          <div className="flex items-center space-x-2">
            <Database className="w-4 h-4 text-emerald-700" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Backup, Exportação & Compatibilidade Supabase
            </h4>
          </div>
          <p className="text-xs text-slate-500">
            Todos os registros estão armazenados em <code>localStorage</code> com chaves primárias UUID, campos normalizados e timestamps ISO, prontos para sincronização ou exportação direta para tabelas PostgreSQL / Supabase.
          </p>

          {importStatus && (
            <div
              className={`p-2.5 rounded-lg text-xs font-semibold flex items-center ${
                importStatus.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              {importStatus.type === 'success' ? (
                <Check className="w-4 h-4 mr-1.5 shrink-0 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 mr-1.5 shrink-0 text-rose-600" />
              )}
              <span>{importStatus.text}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleDownloadBackup}
              className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold flex items-center shadow-2xs cursor-pointer transition-colors"
            >
              <Download className="w-4 h-4 mr-1.5 text-emerald-700" />
              <span>Exportar Backup JSON</span>
            </button>

            <label
              className={`px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold flex items-center shadow-2xs cursor-pointer transition-colors ${
                isImporting ? 'opacity-60 pointer-events-none' : ''
              }`}
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 text-blue-700 animate-spin" />
                  <span>Importando Backup...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-1.5 text-blue-700" />
                  <span>Importar Backup JSON</span>
                </>
              )}
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                disabled={isImporting}
                className="hidden"
              />
            </label>

            {!confirmingReset && (
              <button
                type="button"
                onClick={() => setConfirmingReset(true)}
                className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold flex items-center ml-auto cursor-pointer transition-colors"
              >
                <RotateCcw className="w-4 h-4 mr-1.5" />
                <span>Restaurar Dados Padrão</span>
              </button>
            )}
          </div>

          {/* Inline confirmation for reset to mock */}
          {confirmingReset && (
            <div className="mt-3 p-3.5 bg-rose-50 border border-rose-300 rounded-xl space-y-2.5 shadow-2xs">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                <p className="text-xs font-semibold text-rose-900 leading-relaxed">
                  Atenção: isso apagará reservas, despesas e checklists atuais do banco e restaurará os dados de exemplo. Deseja continuar?
                </p>
              </div>
              <div className="flex items-center justify-end space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmingReset(false)}
                  disabled={isResetting}
                  className="px-3 py-1.5 bg-white text-slate-700 hover:text-slate-900 border border-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReset}
                  disabled={isResetting}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-2xs flex items-center"
                >
                  {isResetting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      <span>Restaurando...</span>
                    </>
                  ) : (
                    <span>Confirmar Restauração</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
