import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { ChacaraDetails } from '../../types';
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
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ChacaraDetails;
  onSaveSettings: (settings: ChacaraDetails) => void;
  onResetToMock: () => void;
  onExportData: () => string;
  onImportData: (jsonStr: string) => boolean;
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
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const handleChange = (field: keyof ChacaraDetails, val: any) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1200);
  };

  const handleDownloadBackup = () => {
    const json = onExportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-recanto-da-paz-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      const ok = onImportData(content);
      if (ok) {
        setImportStatus('Backup importado com sucesso!');
        setTimeout(() => setImportStatus(null), 3000);
      } else {
        setImportStatus('Erro ao importar backup. Verifique o arquivo JSON.');
      }
    };
    reader.readAsText(file);
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
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs sm:text-sm font-bold flex items-center shadow-sm"
            >
              {saveSuccess ? (
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
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold">
              {importStatus}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleDownloadBackup}
              className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold flex items-center shadow-2xs"
            >
              <Download className="w-4 h-4 mr-1.5 text-emerald-700" />
              <span>Exportar Backup JSON</span>
            </button>

            <label className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold flex items-center shadow-2xs cursor-pointer">
              <Upload className="w-4 h-4 mr-1.5 text-blue-700" />
              <span>Importar Backup JSON</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={() => {
                onResetToMock();
                onClose();
              }}
              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold flex items-center ml-auto"
            >
              <RotateCcw className="w-4 h-4 mr-1.5" />
              <span>Restaurar Dados Padrão</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
