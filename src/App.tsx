import React, { useState, useMemo } from 'react';
import { useChacaraData } from './hooks/useChacaraData';
import { useLocalStorage } from './hooks/useLocalStorage';
import { Header } from './components/common/Header';
import { DashboardOverview } from './components/dashboard/DashboardOverview';
import { ReservationsModule } from './components/reservations/ReservationsModule';
import { ExpensesModule } from './components/expenses/ExpensesModule';
import { ChecklistsModule } from './components/checklists/ChecklistsModule';
import { ReservationModal } from './components/reservations/ReservationModal';
import { ExpenseModal } from './components/expenses/ExpenseModal';
import { WhatsAppModal } from './components/reservations/WhatsAppModal';
import { PartnerReportModal } from './components/expenses/PartnerReportModal';
import { SettingsModal } from './components/settings/SettingsModal';
import { GoogleCalendarSyncModal } from './components/calendar/GoogleCalendarSyncModal';
import { Reservation, Expense } from './types';
import { isSupabaseConfigured } from './services/supabaseClient';
import { getAccessToken } from './services/googleAuth';
import { pushReservationToGoogle } from './services/googleCalendarService';
import { CheckCircle2, Trees, Database, RefreshCw, HardDrive } from 'lucide-react';

export default function App() {
  const {
    reservations,
    expenses,
    checklists,
    settings,
    loading,
    isSyncing,
    addReservation,
    updateReservation,
    deleteReservation,
    addExpense,
    updateExpense,
    deleteExpense,
    addChecklist,
    updateChecklist,
    deleteChecklist,
    toggleChecklistItem,
    updateSettings,
    resetToMock,
    importData,
    exportAllData,
  } = useChacaraData();

  const [activeTab, setActiveTab] = useLocalStorage<'dashboard' | 'reservations' | 'expenses' | 'checklists'>(
    'recanto_paz_active_tab',
    'reservations'
  );

  // Modals state
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsAppReservation, setWhatsAppReservation] = useState<Reservation | null>(null);

  const [isPartnerReportOpen, setIsPartnerReportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGoogleCalendarOpen, setIsGoogleCalendarOpen] = useState(false);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Pending checkins count for badge
  const pendingCheckinsCount = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return reservations.filter((r) => r.status === 'confirmed' && r.check_in >= today).length;
  }, [reservations]);

  // Handlers for Reservations
  const handleOpenNewReservation = (prefilledDate?: string) => {
    setEditingReservation(null);
    setIsReservationModalOpen(true);
  };

  const handleEditReservation = (res: Reservation) => {
    setEditingReservation(res);
    setIsReservationModalOpen(true);
  };

  const handleSaveReservation = async (
    data: Omit<Reservation, 'id' | 'created_at' | 'updated_at'>,
    syncWithGoogle?: boolean
  ) => {
    let saved: Reservation | null = null;
    if (editingReservation) {
      saved = await updateReservation(editingReservation.id, data);
    } else {
      saved = await addReservation(data);
    }

    if (syncWithGoogle && saved) {
      try {
        const token = await getAccessToken();
        if (token) {
          const pushRes = await pushReservationToGoogle(saved, settings, token);
          if (pushRes?.eventId) {
            await updateReservation(saved.id, {
              google_calendar_event_id: pushRes.eventId,
              last_synced_at: new Date().toISOString(),
            });
          }
          showToast('✅ Locação salva e enviada para a Google Agenda via API!');
          return;
        } else {
          showToast(
            isSupabaseConfigured
              ? '💾 Locação salva no Supabase! Conecte sua Google Agenda no botão acima para envio via API.'
              : '💾 Locação salva! Conecte sua Google Agenda no botão acima para envio via API.'
          );
          return;
        }
      } catch (apiErr: any) {
        console.error('Falha ao enviar reserva para a Google Agenda:', apiErr);
        showToast('⚠️ Locação salva no banco! Falha ao comunicar com a API Google Agenda.');
        return;
      }
    }

    showToast(isSupabaseConfigured ? 'Locação salva no Supabase com sucesso!' : 'Locação salva com sucesso!');
  };

  const handleDeleteReservation = async (id: string) => {
    await deleteReservation(id);
    showToast('Locação excluída com sucesso.');
  };

  const handleOpenWhatsApp = (res: Reservation) => {
    setWhatsAppReservation(res);
    setIsWhatsAppModalOpen(true);
  };

  // Handlers for Expenses
  const handleOpenNewExpense = () => {
    setEditingExpense(null);
    setIsExpenseModalOpen(true);
  };

  const handleEditExpense = (exp: Expense) => {
    setEditingExpense(exp);
    setIsExpenseModalOpen(true);
  };

  const handleSaveExpense = async (data: Omit<Expense, 'id' | 'created_at' | 'updated_at'>) => {
    if (editingExpense) {
      await updateExpense(editingExpense.id, data);
      showToast(isSupabaseConfigured ? 'Despesa/Reforma atualizada no Supabase!' : 'Despesa/Reforma atualizada com sucesso!');
    } else {
      await addExpense(data);
      showToast(isSupabaseConfigured ? 'Despesa salva no Supabase!' : 'Despesa salva com sucesso!');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    await deleteExpense(id);
    showToast('Despesa excluída com sucesso.');
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-slate-900 font-sans selection:bg-emerald-700 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-2xl border border-slate-800 flex items-center space-x-2 text-xs sm:text-sm font-semibold animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Header with Navigation & Quick Actions */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewReservation={() => handleOpenNewReservation()}
        onOpenNewExpense={handleOpenNewExpense}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenPartnerReport={() => setIsPartnerReportOpen(true)}
        onOpenGoogleCalendar={() => setIsGoogleCalendarOpen(true)}
        settings={settings}
        pendingCheckinsCount={pendingCheckinsCount}
        isSyncing={isSyncing}
      />

      {/* Main App Content View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        {loading && reservations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <RefreshCw className="w-8 h-8 text-emerald-700 animate-spin" />
            <p className="text-sm font-semibold text-slate-600">
              {isSupabaseConfigured ? 'Sincronizando dados com o Supabase...' : 'Carregando dados da chácara...'}
            </p>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <DashboardOverview
                reservations={reservations}
                expenses={expenses}
                checklists={checklists}
                settings={settings}
                onNavigateToReservations={() => setActiveTab('reservations')}
                onNavigateToExpenses={() => setActiveTab('expenses')}
                onNavigateToChecklists={() => setActiveTab('checklists')}
                onSelectReservationForWhatsApp={handleOpenWhatsApp}
                onOpenNewReservation={() => handleOpenNewReservation()}
                onOpenNewExpense={handleOpenNewExpense}
              />
            )}

            {activeTab === 'reservations' && (
              <ReservationsModule
                reservations={reservations}
                settings={settings}
                onAddReservation={addReservation}
                onUpdateReservation={updateReservation}
                onDeleteReservation={handleDeleteReservation}
                onOpenNewModal={handleOpenNewReservation}
                onEditReservation={handleEditReservation}
                onOpenWhatsApp={handleOpenWhatsApp}
                onOpenGoogleCalendar={() => setIsGoogleCalendarOpen(true)}
              />
            )}

            {activeTab === 'expenses' && (
              <ExpensesModule
                expenses={expenses}
                reservations={reservations}
                settings={settings}
                onAddExpense={addExpense}
                onUpdateExpense={updateExpense}
                onDeleteExpense={handleDeleteExpense}
                onOpenNewModal={handleOpenNewExpense}
                onEditExpense={handleEditExpense}
                onOpenPartnerReport={() => setIsPartnerReportOpen(true)}
              />
            )}

            {activeTab === 'checklists' && (
              <ChecklistsModule
                checklists={checklists}
                settings={settings}
                onAddChecklist={addChecklist}
                onUpdateChecklist={updateChecklist}
                onDeleteChecklist={deleteChecklist}
                onToggleItem={toggleChecklistItem}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white py-5 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <div className="flex items-center space-x-2">
            <Trees className="w-4 h-4 text-emerald-800" />
            <span className="font-bold text-slate-800">{settings.name}</span>
            <span>• Gestão de Locação por Temporada & Manutenções</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${
              isSupabaseConfigured
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-stone-50 text-stone-700 border-stone-300'
            }`}>
              {isSupabaseConfigured ? (
                <>
                  <Database className="w-3 h-3 mr-1 text-emerald-600" />
                  Supabase PostgreSQL Conectado
                </>
              ) : (
                <>
                  <HardDrive className="w-3 h-3 mr-1 text-stone-600" />
                  Armazenamento Local Seguro (Offline-First)
                </>
              )}
            </span>
          </div>
        </div>
      </footer>

      {/* Application Modals */}
      <ReservationModal
        isOpen={isReservationModalOpen}
        onClose={() => setIsReservationModalOpen(false)}
        onSave={handleSaveReservation}
        initialData={editingReservation}
        settings={settings}
      />

      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSave={handleSaveExpense}
        onSaveExpense={handleSaveExpense}
        initialData={editingExpense}
      />

      <WhatsAppModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        reservation={whatsAppReservation}
        settings={settings}
      />

      <PartnerReportModal
        isOpen={isPartnerReportOpen}
        onClose={() => setIsPartnerReportOpen(false)}
        expenses={expenses}
        reservations={reservations}
        settings={settings}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={updateSettings}
        onResetToMock={resetToMock}
        onExportData={exportAllData}
        onImportData={importData}
      />

      <GoogleCalendarSyncModal
        isOpen={isGoogleCalendarOpen}
        onClose={() => setIsGoogleCalendarOpen(false)}
        reservations={reservations}
        settings={settings}
        onUpdateReservation={updateReservation}
        onSaveSettings={updateSettings}
      />
    </div>
  );
}
