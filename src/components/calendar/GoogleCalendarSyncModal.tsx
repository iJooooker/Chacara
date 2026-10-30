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
  pushReservationToGoogle,
  generateGoogleCalendarWebLink,
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
  UserCheck,
  LogOut,
  Sparkles,
  Link as LinkIcon,
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
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
      }
    } catch (err: any) {
      console.error('Falha ao conectar com Google:', err);
      setSyncError(err.message || 'Falha ao autenticar com a conta Google. Tente novamente.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = async () => {
    await logoutGoogle();
    setUser(null);
    setAccessToken(null);
    setSyncResult(null);
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

  const handleSaveICalUrl = () => {
    onSaveSettings({
      ...settings,
      google_calendar_ical_url: iCalUrl,
    });
    setSavedICalSuccess(true);
    setTimeout(() => setSavedICalSuccess(false), 2500);
  };

  const activeReservationsCount = reservations.filter((r) => r.status !== 'cancelled').length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sincronização com a Google Agenda"
      subtitle="Acesse suas datas e contatos de locação diretamente pelo celular na rua"
      maxWidth="2xl"
    >
      <div className="space-y-6 text-slate-800">
        {/* Why this is useful banner */}
        <div className="bg-gradient-to-r from-emerald-900 to-teal-900 text-white p-4 rounded-xl shadow-xs flex items-start space-x-3.5">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5 text-emerald-300" />
          </div>
          <div className="text-xs sm:text-sm">
            <h4 className="font-bold text-white mb-0.5 flex items-center">
              <span>Sempre à mão no seu celular</span>
              <span className="ml-2 text-[10px] bg-emerald-400/20 text-emerald-300 px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold border border-emerald-400/30">
                Google Calendar
              </span>
            </h4>
            <p className="text-emerald-100/90 leading-relaxed">
              Quando alguém perguntar sobre uma data na rua, basta abrir o app <strong>Google Agenda</strong> no seu smartphone. As reservas aparecerão com o nome do cliente, WhatsApp, quantidade de pessoas e status do pagamento.
            </p>
          </div>
        </div>

        {/* Auth Section */}
        <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-full bg-white border border-slate-200 shadow-2xs flex items-center justify-center">
                <Calendar className="w-4 h-4 text-emerald-700" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Conta Google para Sincronização</h4>
                <p className="text-xs text-slate-500">
                  {user ? 'Conectado com autorização de eventos' : 'Faça login para permitir atualização da sua agenda'}
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
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              {/* Official Google Sign-in button */}
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
                Permite criar e atualizar os eventos diretamente na sua conta Google.
              </span>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1 border-t border-slate-200/60">
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
          )}
        </div>

        {/* Sync Action Area */}
        <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Atualizar Agenda do Google Agora</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Envia as reservas ativas ({activeReservationsCount} cadastrada{activeReservationsCount === 1 ? '' : 's'}) para o seu Google Calendar.
              </p>
            </div>
          </div>

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

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <button
              type="button"
              onClick={handleSyncAll}
              disabled={isSyncing || !user}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold text-xs sm:text-sm rounded-lg shadow-xs flex items-center justify-center transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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

        {/* Current Reservations Preview in this sync */}
        <div className="space-y-2">
          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Reservas Prontas para a Agenda
          </h5>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {reservations
              .filter((r) => r.status !== 'cancelled')
              .map((res) => {
                const directLink = generateGoogleCalendarWebLink(res, settings);
                return (
                  <div
                    key={res.id}
                    className="p-3 bg-stone-50 border border-stone-200 rounded-lg flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900">{res.client_name}</span>
                      <span className="text-slate-500 ml-2">
                        {res.check_in} até {res.check_out} ({res.guests_count} pessoas)
                      </span>
                      <div className="text-[11px] text-slate-600 mt-0.5">
                        WhatsApp: <span className="font-mono">{res.client_phone}</span> • Total: R$ {res.total_amount}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <a
                        href={directLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-800 border border-stone-300 hover:border-emerald-300 rounded font-semibold text-[11px] inline-flex items-center cursor-pointer transition-colors"
                        title="Adicionar ou visualizar individualmente no Google Agenda"
                      >
                        <ExternalLink className="w-3 h-3 mr-1 text-emerald-600" />
                        Adicionar Direto
                      </a>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* iCal Link Config */}
        <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center">
              <LinkIcon className="w-3.5 h-3.5 mr-1 text-slate-500" />
              Link iCal da sua Agenda Pessoal (.ics)
            </h5>
            {savedICalSuccess && (
              <span className="text-[11px] font-semibold text-emerald-700">✓ Salvo!</span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Link privado da sua agenda Google fornecido para integração e consulta de datas:
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
