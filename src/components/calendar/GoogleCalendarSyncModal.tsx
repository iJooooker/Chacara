import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Reservation, ChacaraDetails } from '../../types';
import {
  initAuth,
  googleSignIn,
  getAccessToken,
  logoutGoogle,
  getCurrentUser,
} from '../../services/googleAuth';
import {
  syncAllReservationsToGoogle,
  generateGoogleCalendarWebLink,
  downloadReservationsIcsFile,
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
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [showHowToGuide, setShowHowToGuide] = useState(false);
  const [iCalUrl, setICalUrl] = useState(
    settings.google_calendar_ical_url ||
      'https://calendar.google.com/calendar/ical/claudemirjappa%40gmail.com/private-2ed0c9f86539a0e24ed962b6adc9af35/basic.ics'
  );
  const [savedICalSuccess, setSavedICalSuccess] = useState(false);

  // Monitor auth state on mount
  useEffect(() => {
    const unsubscribe = initAuth(
      (authUser, token) => {
        setUser(authUser);
        setAccessToken(token);
        setUnauthorizedDomain(null);
      },
      () => {
        setUser(null);
        setAccessToken(null);
      }
    );

    // Initial check
    getAccessToken().then((tok) => {
      if (tok) {
        setAccessToken(tok);
        setUser(getCurrentUser());
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const handleSignIn = async () => {
    setIsAuthenticating(true);
    setSyncError(null);
    setUnauthorizedDomain(null);

    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        setUnauthorizedDomain(null);
      }
    } catch (err: any) {
      console.error('Falha ao conectar com Google:', err);
      const isUnauth =
        err?.isUnauthorizedDomain ||
        err?.code === 'auth/unauthorized-domain' ||
        err?.message?.includes('unauthorized-domain');

      if (isUnauth) {
        const domain =
          err?.domain || (typeof window !== 'undefined' ? window.location.hostname : 'este domínio');
        setUnauthorizedDomain(domain);
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

        {/* Unauthorized Domain Alert (Triggered when running on custom domain like controledelocacao.vercel.app) */}
        {unauthorizedDomain && (
          <div className="bg-amber-50/90 border border-amber-300 rounded-xl p-4.5 text-xs sm:text-sm space-y-3.5 shadow-xs">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-400/30 flex items-center justify-center shrink-0 text-amber-700">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-amber-900 text-sm">
                  Domínio Vercel Detectado: <span className="font-mono underline">{unauthorizedDomain}</span>
                </h4>
                <p className="text-amber-800 leading-relaxed text-xs">
                  Por segurança de privacidade do Google, autenticações diretas via popup exigem autorização do domínio no console do Firebase.
                </p>
              </div>
            </div>

            <div className="bg-white/90 border border-amber-200/80 rounded-lg p-3.5 space-y-2.5">
              <div className="flex items-center text-emerald-800 font-bold text-xs uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                Soluções 100% imediatas (sem erros e sem precisar configurar nada):
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {/* Method 1: Download full calendar file */}
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
                    Exibe faixas coloridas com o nome do cliente no mês. Datas 100% corrigidas!
                  </span>
                </button>

                {/* Method 2: Open import page */}
                <a
                  href="https://calendar.google.com/calendar/u/0/r/settings/export"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-stone-100 hover:bg-stone-200 text-slate-800 border border-stone-300 rounded-lg font-bold text-xs flex flex-col items-start space-y-1 transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center space-x-1.5">
                    <ExternalLink className="w-4 h-4 text-slate-600" />
                    <span>2. Importar no Google Agenda Web</span>
                  </div>
                  <span className="text-[11px] text-slate-600 font-normal">
                    Acesse a página oficial do Google Agenda e selecione o arquivo baixado.
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

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleSyncAll}
                  disabled={isSyncing}
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold text-xs sm:text-sm rounded-lg shadow-xs flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin text-white" />
                      <span>Sincronizando com Google...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2 text-emerald-300" />
                      <span>Sincronizar Todas as Reservas na Google Agenda</span>
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
              Link iCal da sua Agenda Pessoal Google (.ics)
            </h5>
            {savedICalSuccess && (
              <span className="text-[11px] font-semibold text-emerald-700">✓ Salvo!</span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Link privado da sua agenda Google fornecido para leitura e sincronização das datas já agendadas:
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
      </div>
    </Modal>
  );
};
