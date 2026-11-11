import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Reservation, ChacaraDetails } from '../../types';
import {
  initAuth,
  googleSignIn,
  getAccessToken,
  logoutGoogle,
  getCurrentUser,
  getOAuthClientId,
  setCustomOAuthClientId,
} from '../../services/googleAuth';
import {
  syncAllReservationsToGoogle,
  generateGoogleCalendarWebLink,
  downloadReservationsIcsFile,
  cleanupDuplicateEventsFromGoogle,
  SyncResult,
} from '../../services/googleCalendarService';
import {
  Calendar,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  Smartphone,
  ShieldCheck,
  LogOut,
  Sparkles,
  Link as LinkIcon,
  Download,
  Info,
  Check,
  CalendarCheck,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  Key,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { User } from 'firebase/auth';

interface GoogleCalendarSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservations: Reservation[];
  settings: ChacaraDetails;
  onUpdateReservation: (id: string, updates: Partial<Reservation>) => void;
  onSaveSettings: (settings: ChacaraDetails) => void;
}

export const GoogleCalendarSyncModal: React.FC<GoogleCalendarSyncModalProps> = ({
  isOpen,
  onClose,
  reservations,
  settings,
  onUpdateReservation,
  onSaveSettings,
}) => {
  const [user, setUser] = useState<User | null>(getCurrentUser());
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [isOriginMismatch, setIsOriginMismatch] = useState(false);
  const [currentOrigin, setCurrentOrigin] = useState<string>(
    typeof window !== 'undefined' ? window.location.origin : 'https://controledelocacao.vercel.app'
  );
  const [copiedOrigin, setCopiedOrigin] = useState(false);
  const [customClientIdInput, setCustomClientIdInput] = useState<string>('');
  const [showAdvancedOAuth, setShowAdvancedOAuth] = useState(false);
  const [savedClientIdSuccess, setSavedClientIdSuccess] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [showHowToGuide, setShowHowToGuide] = useState(false);
  const [iCalUrl, setICalUrl] = useState(settings.google_calendar_ical_url || '');
  const [savedICalSuccess, setSavedICalSuccess] = useState(false);
  const [isCleaningDuplicates, setIsCleaningDuplicates] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<{ deletedCount: number; keptCount: number } | null>(null);

  // Monitor auth state on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentOrigin(window.location.origin);
      setCustomClientIdInput(getOAuthClientId());
    }

    const unsubscribe = initAuth(
      (authUser, token) => {
        setUser(authUser);
        setAccessToken(token);
        setUnauthorizedDomain(null);
        setIsOriginMismatch(false);
      },
      () => {
        getAccessToken().then((tok) => {
          if (!tok) {
            setAccessToken(null);
          } else {
            setAccessToken(tok);
            setUser(getCurrentUser());
          }
        });
      },
      (detectedUser) => {
        setUser(detectedUser);
      }
    );

    // Initial check from persisted credentials
    getAccessToken().then((tok) => {
      if (tok) {
        setAccessToken(tok);
        setUser(getCurrentUser());
      } else {
        const currentUserDetected = getCurrentUser();
        if (currentUserDetected) {
          setUser(currentUserDetected);
        }
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const handleCopyOrigin = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(currentOrigin);
      setCopiedOrigin(true);
      setTimeout(() => setCopiedOrigin(false), 2500);
    }
  };

  const handleSaveCustomClientId = () => {
    setCustomOAuthClientId(customClientIdInput);
    setSavedClientIdSuccess(true);
    setTimeout(() => setSavedClientIdSuccess(false), 2500);
  };

  const handleSignIn = async () => {
    setIsAuthenticating(true);
    setSyncError(null);
    setUnauthorizedDomain(null);
    setIsOriginMismatch(false);

    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        setUnauthorizedDomain(null);
        setIsOriginMismatch(false);
      }
    } catch (err: any) {
      console.error('Falha ao conectar com Google:', err);
      const isUnauth =
        err?.isUnauthorizedDomain ||
        err?.code === 'auth/unauthorized-domain' ||
        err?.message?.includes('unauthorized-domain');

      const isMismatch =
        err?.isOriginMismatch ||
        err?.code === 'origin_mismatch' ||
        err?.message?.includes('origin_mismatch') ||
        err?.message?.includes('origin');

      const domain =
        err?.domain || (typeof window !== 'undefined' ? window.location.hostname : 'controledelocacao.vercel.app');
      const origin =
        err?.origin || (typeof window !== 'undefined' ? window.location.origin : 'https://controledelocacao.vercel.app');

      if (isUnauth || isMismatch) {
        setUnauthorizedDomain(domain);
        setCurrentOrigin(origin);
        setIsOriginMismatch(true);
        setSyncError(null);
      } else {
        setSyncError(err?.message || 'Falha ao autenticar com a conta Google. Tente novamente.');
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = async () => {
    await logoutGoogle();
    setUser(null);
    setAccessToken(null);
    setSyncResult(null);
    setUnauthorizedDomain(null);
  };

  const handleSyncAll = async () => {
    if (!accessToken) {
      setSyncError('Conecte sua conta Google antes de sincronizar.');
      return;
    }

    setIsSyncing(true);
    setSyncError(null);
    setSyncResult(null);

    try {
      const activeReservations = reservations.filter((r) => r.status !== 'cancelled');
      const res = await syncAllReservationsToGoogle(activeReservations, settings, accessToken);
      setSyncResult(res);

      // Update reservation records with the event IDs and timestamp
      res.events.forEach((ev) => {
        onUpdateReservation(ev.reservationId, {
          google_calendar_event_id: ev.eventId,
          last_synced_at: new Date().toISOString(),
        });
      });
    } catch (err: any) {
      console.error('Erro na sincronização:', err);
      setSyncError(err.message || 'Ocorreu um erro ao enviar eventos para a Google Agenda.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCleanupDuplicates = async () => {
    if (!accessToken) {
      setSyncError('Conecte sua conta Google antes de limpar duplicados.');
      return;
    }

    setIsCleaningDuplicates(true);
    setSyncError(null);
    setCleanupResult(null);

    try {
      const res = await cleanupDuplicateEventsFromGoogle(accessToken);
      setCleanupResult(res);
    } catch (err: any) {
      console.error('Erro ao limpar duplicados:', err);
      setSyncError(err.message || 'Erro ao remover eventos duplicados do Google Calendar.');
    } finally {
      setIsCleaningDuplicates(false);
    }
  };

  const [downloadSuccessAllDay, setDownloadSuccessAllDay] = useState(false);
  const [downloadSuccessTimed, setDownloadSuccessTimed] = useState(false);

  const handleDownloadIcsAllDay = () => {
    downloadReservationsIcsFile(reservations, settings, { allDay: true });
    setDownloadSuccessAllDay(true);
    setTimeout(() => setDownloadSuccessAllDay(false), 3000);
  };

  const handleDownloadIcsTimed = () => {
    downloadReservationsIcsFile(reservations, settings, { allDay: false });
    setDownloadSuccessTimed(true);
    setTimeout(() => setDownloadSuccessTimed(false), 3000);
  };

  const handleSaveICalUrl = () => {
    onSaveSettings({
      ...settings,
      google_calendar_ical_url: iCalUrl,
    });
    setSavedICalSuccess(true);
    setTimeout(() => setSavedICalSuccess(false), 2500);
  };

  const activeReservations = reservations.filter((r) => r.status !== 'cancelled');
  const activeReservationsCount = activeReservations.length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sincronização com a Google Agenda"
      subtitle="Consulte suas datas e contatos de locação pelo celular na rua quando alguém perguntar"
      maxWidth="3xl"
    >
      <div className="space-y-6 text-slate-800">
        {/* Why this is useful banner */}
        <div className="bg-gradient-to-r from-emerald-900 to-teal-900 text-white p-4.5 rounded-xl shadow-xs flex items-start space-x-3.5">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0 mt-0.5">
            <Smartphone className="w-5 h-5 text-emerald-300" />
          </div>
          <div className="text-xs sm:text-sm">
            <h4 className="font-bold text-white mb-0.5 flex items-center">
              <span>Sempre à mão no seu celular na rua</span>
              <span className="ml-2 text-[10px] bg-emerald-400/20 text-emerald-300 px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold border border-emerald-400/30">
                Google Agenda
              </span>
            </h4>
            <p className="text-emerald-100/90 leading-relaxed text-xs sm:text-[13px]">
              Quando alguém perguntar sobre uma data na rua, você não precisa abrir planilhas: basta abrir o aplicativo <strong>Google Agenda</strong> no seu smartphone. As reservas aparecem com o <strong>nome do cliente, WhatsApp, quantidade de pessoas e status do pagamento</strong>.
            </p>
          </div>
        </div>

        {/* Unauthorized Domain / Erro 400: origin_mismatch Guide */}
        {(unauthorizedDomain || isOriginMismatch) && (
          <div className="bg-amber-50/95 border-2 border-amber-400 rounded-xl p-5 text-xs sm:text-sm space-y-4 shadow-sm animate-fade-in">
            <div className="flex items-start space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0 text-amber-800 mt-0.5">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-200 text-amber-900 border border-amber-300">
                    Erro 400: origin_mismatch
                  </span>
                  <span className="text-xs font-semibold text-amber-800">Bloqueio de Segurança do Google</span>
                </div>
                <h4 className="font-bold text-amber-950 text-sm sm:text-base">
                  Como autorizar o domínio <span className="font-mono text-emerald-900 bg-white/80 px-1.5 py-0.5 rounded border border-amber-300">{unauthorizedDomain || 'controledelocacao.vercel.app'}</span> no Google Cloud
                </h4>
                <p className="text-amber-900/90 leading-relaxed text-xs">
                  O Google bloqueou a conexão porque o seu site no Vercel (ou domínio customizado) ainda não está cadastrado na lista de <strong>Origens JavaScript autorizadas</strong> do projeto Google Cloud.
                </p>
              </div>
            </div>

            {/* Quick 1-Click Copy Box */}
            <div className="bg-white/95 border border-amber-300/80 rounded-lg p-3.5 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Sua Origem Web Exata (para colar no Google Cloud):
                  </span>
                  <div className="font-mono text-xs sm:text-sm font-bold text-slate-800 select-all mt-0.5">
                    {currentOrigin}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyOrigin}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg flex items-center justify-center space-x-1.5 shrink-0 transition-all cursor-pointer shadow-xs"
                >
                  {copiedOrigin ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Origem Copiada!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copiar Origem</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Step-by-step instructions */}
            <div className="bg-white/90 border border-amber-200/90 rounded-lg p-4 space-y-3">
              <h5 className="font-bold text-amber-950 text-xs sm:text-sm flex items-center">
                <span className="w-5 h-5 rounded-full bg-amber-600 text-white font-bold flex items-center justify-center text-[11px] mr-2">!</span>
                3 Passos rápidos para liberar no Google Cloud Console:
              </h5>

              <div className="space-y-2.5 text-xs text-slate-700">
                <div className="flex items-start space-x-2">
                  <span className="font-black text-amber-800">1.</span>
                  <div>
                    <span className="font-semibold text-slate-900">Acesse o Google Cloud Console: </span>
                    <a
                      href="https://console.cloud.google.com/apis/credentials?project=gen-lang-client-0768173310"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-emerald-700 font-bold hover:underline"
                    >
                      <span>Abrir Credenciais no Google Cloud</span>
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <span className="font-black text-amber-800">2.</span>
                  <div>
                    <span className="font-semibold text-slate-900">Edite o ID do cliente OAuth 2.0 Web: </span>
                    <span>
                      Clique no cliente Web listado. Na seção <strong>"Origens JavaScript autorizadas"</strong>, clique em <strong>+ Adicionar URI</strong> e cole: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold text-emerald-800">{currentOrigin}</code>. Em <strong>"URIs de redirecionamento autorizados"</strong>, adicione também o mesmo link e clique em <strong>Salvar</strong>.
                    </span>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <span className="font-black text-amber-800">3.</span>
                  <div>
                    <span className="font-semibold text-slate-900">No Firebase Console: </span>
                    <a
                      href="https://console.firebase.google.com/project/gen-lang-client-0768173310/authentication/settings"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-emerald-700 font-bold hover:underline"
                    >
                      <span>Abrir Domínios Autorizados no Firebase</span>
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                    <span> — na aba "Domínios autorizados", clique em Adicionar domínio e insira <code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold text-emerald-800">{unauthorizedDomain || 'controledelocacao.vercel.app'}</code>.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Alternatives that work immediately */}
            <div className="bg-emerald-50/90 border border-emerald-300 rounded-lg p-3.5 space-y-2">
              <div className="flex items-center text-emerald-900 font-bold text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4 mr-1.5 text-emerald-600" />
                Soluções 100% imediatas (sem precisar configurar o Google Cloud):
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleDownloadIcsAllDay}
                  className="p-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs flex flex-col items-start space-y-1 shadow-xs transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center space-x-1.5">
                    <Download className="w-4 h-4 text-emerald-200" />
                    <span>1. Baixar Calendário (Destaque Mensal .ics)</span>
                  </div>
                  <span className="text-[11px] text-emerald-100 font-normal">
                    Importe no seu celular e veja todas as datas corrigidas no mês!
                  </span>
                </button>

                <a
                  href="https://calendar.google.com/calendar/u/0/r/settings/export"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-white hover:bg-stone-100 text-slate-800 border border-emerald-300 rounded-lg font-bold text-xs flex flex-col items-start space-y-1 transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center space-x-1.5">
                    <ExternalLink className="w-4 h-4 text-emerald-700" />
                    <span>2. Importar no Google Agenda Web</span>
                  </div>
                  <span className="text-[11px] text-slate-600 font-normal">
                    Abre a tela de importação oficial do Google Agenda.
                  </span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Correction Explanation Banner */}
        <div className="bg-emerald-50/90 border border-emerald-300/80 rounded-xl p-4 text-xs space-y-2 text-emerald-950 shadow-2xs">
          <div className="flex items-center space-x-2 font-bold text-emerald-900 text-sm">
            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
            <span>Datas Corrigidas com Fuso Horário de Brasília (America/Sao_Paulo)</span>
          </div>
          <p className="text-emerald-800/90 leading-relaxed text-[12px]">
            O arquivo anterior sofreu um deslocamento de 3 dias no Google Calendar porque o horário inicial <code className="bg-emerald-200/60 px-1 py-0.5 rounded font-mono text-[11px]">9:00</code> sem o zero à esquerda foi interpretado como 90 horas pelo aplicativo. 
            <strong> Já corrigimos a formatação internacional RFC 5545 com fuso horário oficial e atualizador automático de eventos.</strong>
          </p>
        </div>

        {/* Primary Action Card: 1-Click Sync or Download .ICS with 2 Formats */}
        <div className="bg-white border-2 border-emerald-600/30 rounded-xl p-5 shadow-xs space-y-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                100% Corrigido
              </span>
              <span className="text-xs text-slate-500 font-medium">Compatível com Android, iPhone e Google Web</span>
            </div>
            <h4 className="text-base font-bold text-slate-900 mt-1">
              Baixar Arquivo da Agenda Corrigido ({activeReservationsCount} reservas ativas)
            </h4>
            <p className="text-xs text-slate-600 mt-0.5">
              Escolha abaixo o formato visual que você prefere ver no aplicativo Google Agenda do seu celular:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Format 1: All-Day Month Banner (Recommended for Month View) */}
            <div className="p-4 rounded-xl border-2 border-emerald-500/40 bg-emerald-50/40 flex flex-col justify-between space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-950 flex items-center">
                    <Sparkles className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    Opção 1: Destaque no Mês (Recomendado)
                  </span>
                  <span className="text-[10px] font-bold bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded">
                    Visual do seu print
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800/90 leading-relaxed">
                  Cria uma <strong>faixa colorida com o nome do cliente</strong> direto na tela do mês. Ideal para bater o olho rápido na rua sem precisar clicar no dia.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadIcsAllDay}
                className="w-full py-2.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg shadow-xs flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                {downloadSuccessAllDay ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-200" />
                    <span>Baixado com Sucesso!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-emerald-200" />
                    <span>Baixar Formato Destaque no Mês (.ics)</span>
                  </>
                )}
              </button>
            </div>

            {/* Format 2: Timed Events (09:00 to 21:00) */}
            <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 flex flex-col justify-between space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    Opção 2: Com Horário Marcado
                  </span>
                  <span className="text-[10px] font-bold bg-stone-200 text-slate-700 px-1.5 py-0.5 rounded">
                    09h00 às 21h00
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Salva com horário específico de entrada (check-in {settings.check_in_time}) e saída (check-out {settings.check_out_time}) com fuso oficial de Brasília.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadIcsTimed}
                className="w-full py-2.5 px-3 bg-stone-700 hover:bg-stone-800 text-white font-bold text-xs rounded-lg shadow-xs flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                {downloadSuccessTimed ? (
                  <>
                    <Check className="w-4 h-4 text-stone-200" />
                    <span>Baixado com Sucesso!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-stone-200" />
                    <span>Baixar Formato com Horários (.ics)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick instructions on how to use .ics */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
            <div className="flex items-center space-x-1.5">
              <CalendarCheck className="w-4 h-4 text-emerald-600" />
              <span>Ao importar o novo arquivo, o Google Agenda move os eventos para as datas certas automaticamente.</span>
            </div>
            <a
              href="https://calendar.google.com/calendar/u/0/r/settings/export"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
            >
              <span>Abrir Importação no Google Agenda Web</span>
              <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </div>
        </div>

        {/* Direct Google Account API Sync Section */}
        <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-full bg-white border border-slate-200 shadow-2xs flex items-center justify-center">
                <Calendar className="w-4 h-4 text-emerald-700" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Sincronização Direta por API Google</h4>
                <p className="text-xs text-slate-500">
                  {user ? 'Conectado com autorização de eventos' : 'Permite sincronizar automaticamente com 1 clique'}
                </p>
              </div>
            </div>

            {user && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                Conectado
              </span>
            )}
          </div>

          {!user ? (
            <div className="pt-1 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={handleSignIn}
                disabled={isAuthenticating}
                className="w-full sm:w-auto flex items-center justify-center space-x-3 px-5 py-2.5 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 font-semibold text-xs sm:text-sm rounded-lg border border-slate-300 shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {isAuthenticating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-700" />
                    <span>Conectando com o Google...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Conectar com Google Agenda</span>
                  </>
                )}
              </button>

              <span className="text-xs text-slate-500 text-center sm:text-left">
                Permite enviar as reservas em lote diretamente para sua conta Google.
              </span>
            </div>
          ) : (
            <div className="space-y-4 pt-1">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-200/60 pt-3">
                <div className="flex items-center space-x-3">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'Google User'}
                      className="w-9 h-9 rounded-full border border-slate-300"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-sm">
                      {user.email ? user.email[0].toUpperCase() : 'G'}
                    </div>
                  )}
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-slate-900">
                      {user.displayName || 'Usuário Google'}
                    </p>
                    <p className="text-xs text-slate-500 font-mono">{user.email}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center text-xs font-semibold text-rose-700 hover:text-rose-800 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 mr-1" />
                  Desconectar
                </button>
              </div>

              {/* Token renewal notice after page reload (F5) */}
              {!accessToken && (
                <div className="p-3.5 bg-amber-50/90 border-2 border-amber-300 rounded-xl text-xs text-amber-950 space-y-2.5 animate-fade-in shadow-2xs">
                  <div className="flex items-center space-x-2 font-bold text-amber-900">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Permissão da Google Agenda expirou ao recarregar a página</span>
                  </div>
                  <p className="text-[11px] text-amber-900/90 leading-relaxed">
                    Sua conta está identificada como <strong>{user.email}</strong>, mas a Google exige reautorização da API ao abrir uma nova sessão para enviar eventos. Clique abaixo para reativar:
                  </p>
                  <div>
                    <button
                      type="button"
                      onClick={handleSignIn}
                      disabled={isAuthenticating}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold text-xs rounded-lg shadow-xs flex items-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isAuthenticating ? 'animate-spin text-emerald-200' : 'text-white'}`} />
                      <span>Renovar Acesso à Agenda (1 clique)</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={handleSyncAll}
                  disabled={!accessToken || isSyncing || isCleaningDuplicates}
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold text-xs sm:text-sm rounded-lg shadow-xs flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
                  title={!accessToken ? 'Renove o acesso à agenda acima para sincronizar' : 'Sincronizar todas as reservas'}
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin text-white" />
                      <span>Sincronizando com Google...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2 text-emerald-300" />
                      <span>Sincronizar Todas as Reservas</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleCleanupDuplicates}
                  disabled={!accessToken || isCleaningDuplicates || isSyncing}
                  className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 font-bold text-xs sm:text-sm rounded-lg flex items-center justify-center transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
                  title={!accessToken ? 'Renove o acesso à agenda acima para limpar duplicatas' : 'Remove centenas de eventos repetidos da mesma data no Google Calendar'}
                >
                  {isCleaningDuplicates ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin text-rose-700" />
                      <span>Removendo repetidos...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-1.5 text-rose-600" />
                      <span>Limpar Repetidos da Google Agenda</span>
                    </>
                  )}
                </button>

                <a
                  href="https://calendar.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-slate-700 font-semibold text-xs sm:text-sm rounded-lg flex items-center justify-center transition-colors cursor-pointer border border-stone-200"
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                  <span>Abrir Google Agenda</span>
                </a>
              </div>
            </div>
          )}

          {cleanupResult && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-lg text-xs text-emerald-900 space-y-1 animate-fade-in">
              <div className="flex items-center font-bold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600" />
                <span>Limpeza de duplicatas concluída com sucesso!</span>
              </div>
              <p className="text-[11px] text-emerald-700">
                Foram removidos <strong>{cleanupResult.deletedCount}</strong> evento(s) duplicados da sua Google Agenda. <strong>{cleanupResult.keptCount}</strong> evento(s) únicos foram preservados.
              </p>
            </div>
          )}

          {syncError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{syncError}</span>
            </div>
          )}

          {syncResult && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 space-y-2">
              <div className="flex items-center font-bold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600" />
                <span>
                  Sincronização concluída com sucesso! ({syncResult.synced} evento(s) na agenda)
                </span>
              </div>
              <ul className="space-y-1 pl-5 list-disc text-emerald-800 text-[11px]">
                {syncResult.events.map((ev) => (
                  <li key={ev.reservationId}>
                    <strong>{ev.clientName}</strong> ({ev.dates}) — {ev.action === 'created' ? 'Criado na agenda' : 'Atualizado na agenda'}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Current Reservations Preview with 1-Click Direct Links */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Reservas Cadastradas ({activeReservationsCount}) — Adicionar com 1 Toque
            </h5>
            <span className="text-[11px] text-slate-500">
              Abre no Google Agenda oficial sem precisar de login
            </span>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {activeReservations.map((res) => {
              const directLink = generateGoogleCalendarWebLink(res, settings);
              return (
                <div
                  key={res.id}
                  className="p-3 bg-stone-50 border border-stone-200 hover:border-stone-300 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-colors"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900 text-sm">{res.client_name}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                        {res.check_in} até {res.check_out}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                      <span>👥 {res.guests_count} hóspedes</span>
                      <span>📱 WhatsApp: <strong className="font-mono">{res.client_phone}</strong></span>
                      <span>💰 Total: R$ {res.total_amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      <span className={res.payment_status === 'paid' ? 'text-emerald-700 font-bold' : 'text-amber-700 font-semibold'}>
                        {res.payment_status === 'paid' ? '✓ Quitado' : `R$ ${res.remaining_amount} restante`}
                      </span>
                    </div>
                  </div>

                  <a
                    href={directLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-md font-bold text-xs inline-flex items-center justify-center shrink-0 shadow-2xs hover:shadow-xs transition-all cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                    <span>Adicionar à Google Agenda</span>
                  </a>
                </div>
              );
            })}
          </div>
        </div>

        {/* Accordion: How to access on smartphone guide */}
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
          <button
            type="button"
            onClick={() => setShowHowToGuide(!showHowToGuide)}
            className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <div className="flex items-center space-x-2 text-xs sm:text-sm font-bold text-slate-800">
              <HelpCircle className="w-4 h-4 text-emerald-700" />
              <span>Como ver suas datas na rua pelo celular (Passo a Passo)</span>
            </div>
            {showHowToGuide ? (
              <ChevronUp className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {showHowToGuide && (
            <div className="p-4 pt-1 border-t border-slate-200 text-xs text-slate-700 space-y-3 bg-white">
              <div className="flex items-start space-x-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[11px] shrink-0">1</span>
                <p>
                  <strong>No celular ou no computador:</strong> Clique no botão verde <strong>"Baixar Arquivo da Agenda (.ics)"</strong> acima.
                </p>
              </div>
              <div className="flex items-start space-x-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[11px] shrink-0">2</span>
                <p>
                  <strong>No smartphone (Android ou iPhone):</strong> Abra o arquivo baixado. O celular perguntará com qual app abrir: escolha <strong>Google Agenda</strong> e toque em <strong>"Adicionar tudo"</strong>.
                </p>
              </div>
              <div className="flex items-start space-x-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[11px] shrink-0">3</span>
                <p>
                  <strong>No computador:</strong> Abra o Google Agenda Web (<a href="https://calendar.google.com/calendar/u/0/r/settings/export" target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline font-bold">Importar & Exportar</a>), selecione o arquivo baixado e clique em Importar.
                </p>
              </div>
              <div className="flex items-start space-x-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[11px] shrink-0">4</span>
                <p>
                  <strong>Pronto na rua:</strong> Quando qualquer pessoa ligar ou perguntar no WhatsApp se você tem uma data disponível, abra o app da <strong>Google Agenda</strong> no seu celular. O evento estará lá com todos os dados da locação!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* iCal Link Config (Private iCal link from Google Calendar) */}
        <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center">
              <LinkIcon className="w-3.5 h-3.5 mr-1 text-slate-500" />
              Link iCal da sua Agenda Google (.ics)
            </h5>
            {savedICalSuccess && (
              <span className="text-[11px] font-semibold text-emerald-700">✓ Salvo!</span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Este link identifica sua agenda Google no aplicativo. Devido a restrições de segurança de CORS impostas pelo Google para leitura direta de links <code>.ics</code> externos no navegador sem servidor proxy, utilize a <strong>Sincronização Direta por API</strong> acima ou o download do arquivo <code>.ics</code> para enviar e visualizar os eventos.
          </p>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={iCalUrl}
              onChange={(e) => setICalUrl(e.target.value)}
              className="flex-1 text-xs font-mono p-2 bg-white border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-700"
              placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
            />
            <button
              type="button"
              onClick={handleSaveICalUrl}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold cursor-pointer"
            >
              Salvar
            </button>
          </div>
        </div>

        {/* Advanced OAuth Client ID configuration (Optional for user's own GCP project) */}
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
          <button
            type="button"
            onClick={() => setShowAdvancedOAuth(!showAdvancedOAuth)}
            className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <div className="flex items-center space-x-2 text-xs sm:text-sm font-bold text-slate-800">
              <Key className="w-4 h-4 text-slate-600" />
              <span>Configuração do ID do Cliente OAuth (Google Cloud Console)</span>
            </div>
            {showAdvancedOAuth ? (
              <ChevronUp className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {showAdvancedOAuth && (
            <div className="p-4 pt-1 border-t border-slate-200 text-xs text-slate-700 space-y-3 bg-white">
              <p className="text-[11px] text-slate-500 leading-relaxed">
                ID do cliente Web OAuth atualmente configurado no app. Se você criou um Client ID próprio no seu Google Cloud Console, você pode inseri-lo aqui:
              </p>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={customClientIdInput}
                  onChange={(e) => setCustomClientIdInput(e.target.value)}
                  className="flex-1 text-xs font-mono p-2 bg-white border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  placeholder="502953849635-...apps.googleusercontent.com"
                />
                <button
                  type="button"
                  onClick={handleSaveCustomClientId}
                  className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
                >
                  {savedClientIdSuccess ? '✓ Salvo!' : 'Salvar ID'}
                </button>
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-between">
                <span>Projeto Padrão: <code className="font-mono text-slate-700">gen-lang-client-0768173310</code></span>
                <a
                  href="https://console.cloud.google.com/apis/credentials?project=gen-lang-client-0768173310"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-700 font-bold hover:underline inline-flex items-center"
                >
                  <span>Abrir Console</span>
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
