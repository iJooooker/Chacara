import React from 'react';
import {
  Calendar,
  Hammer,
  ClipboardCheck,
  LayoutDashboard,
  PlusCircle,
  Settings,
  Share2,
  Database,
  RefreshCw,
} from 'lucide-react';
import { ChacaraDetails } from '../../types';
import { isSupabaseConfigured } from '../../services/supabaseClient';

interface HeaderProps {
  activeTab: 'dashboard' | 'reservations' | 'expenses' | 'checklists';
  setActiveTab: (tab: 'dashboard' | 'reservations' | 'expenses' | 'checklists') => void;
  onOpenNewReservation: () => void;
  onOpenNewExpense: () => void;
  onOpenSettings: () => void;
  onOpenPartnerReport: () => void;
  onOpenGoogleCalendar: () => void;
  settings: ChacaraDetails;
  pendingCheckinsCount: number;
  isSyncing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenNewReservation,
  onOpenNewExpense,
  onOpenSettings,
  onOpenPartnerReport,
  onOpenGoogleCalendar,
  settings,
  pendingCheckinsCount,
  isSyncing,
}) => {
  return (
    <header className="bg-[#1E251A] text-white border-b border-[#283022] sticky top-0 z-30 shadow-xs">
      {/* Top Brand Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3.5">
            <img
              src="/logo-solaris.png"
              alt={settings.name}
              className="w-11 h-11 rounded-full object-cover border-2 border-[#A4836E]/70 bg-[#FAF9F7] shadow-xs shrink-0"
            />
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {settings.name}
                </h1>
                {isSupabaseConfigured ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#283022] text-[#B7C7AD] border border-[#353F2E]">
                    <Database className="w-3 h-3 mr-1 text-[#9BB08E]" />
                    Supabase Live
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#283022] text-[#D4C9BC] border border-[#353F2E]">
                    <Database className="w-3 h-3 mr-1 text-[#B7C7AD]" />
                    Modo Local
                  </span>
                )}
                {isSyncing && (
                  <span className="inline-flex items-center text-[11px] text-[#B7C7AD] animate-pulse">
                    <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                    Sincronizando...
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#B7C7AD]/90 hidden sm:block truncate max-w-md">
                {settings.subtitle} • {settings.location}
              </p>
            </div>
          </div>

          {/* Quick Actions Buttons */}
          <div className="flex items-center space-x-2 sm:space-x-2.5">
            <button
              id="btn-google-calendar-header"
              type="button"
              onClick={onOpenGoogleCalendar}
              className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-[#E5ECE0] bg-[#283022]/90 hover:bg-[#353F2E] rounded-lg transition-colors border border-[#353F2E] cursor-pointer shadow-2xs"
              title="Sincronizar com Google Agenda"
            >
              <Calendar className="w-3.5 h-3.5 mr-1.5 text-[#B7C7AD]" />
              <span>Google Agenda</span>
            </button>

            <button
              id="btn-partner-report"
              type="button"
              onClick={onOpenPartnerReport}
              className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-[#E5ECE0] bg-[#283022]/90 hover:bg-[#353F2E] rounded-lg transition-colors border border-[#353F2E] cursor-pointer"
              title="Prestação de Contas para Sócios / Proprietário"
            >
              <Share2 className="w-3.5 h-3.5 mr-1.5 text-[#B7C7AD] hidden sm:inline" />
              <span>Prestação de Contas</span>
            </button>

            <button
              id="btn-new-expense-header"
              type="button"
              onClick={onOpenNewExpense}
              className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-[#F6ECE0] bg-[#624332]/40 hover:bg-[#624332]/70 border border-[#936B53]/50 rounded-lg transition-colors cursor-pointer"
            >
              <Hammer className="w-3.5 h-3.5 mr-1.5 text-[#D9B69B]" />
              <span>+ Reforma</span>
            </button>

            <button
              id="btn-new-reservation-header"
              type="button"
              onClick={onOpenNewReservation}
              className="inline-flex items-center px-3.5 py-1.5 text-xs font-bold text-white bg-[#936B53] hover:bg-[#7A5641] active:bg-[#624332] rounded-lg shadow-xs transition-all cursor-pointer border border-[#AE8A75]/40"
            >
              <PlusCircle className="w-3.5 h-3.5 mr-1.5 text-[#F6ECE0]" />
              <span>Nova Locação</span>
            </button>

            <button
              id="btn-settings-header"
              type="button"
              onClick={onOpenSettings}
              className="p-2 text-[#B7C7AD] hover:text-white hover:bg-[#283022] rounded-lg transition-colors cursor-pointer"
              title="Configurações & Backup"
              aria-label="Configurações"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-[#283022]">
        <nav className="flex space-x-1 sm:space-x-3 overflow-x-auto py-0.5 scrollbar-none" aria-label="Navegação">
          <button
            id="tab-dashboard"
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center px-3.5 py-2.5 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'dashboard'
                ? 'border-[#B7C7AD] text-white bg-[#283022]/70 rounded-t-md'
                : 'border-transparent text-[#B7C7AD]/75 hover:text-[#F4F7F1] hover:border-[#56634B]'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 mr-2" />
            <span>Visão Geral</span>
          </button>

          <button
            id="tab-reservations"
            type="button"
            onClick={() => setActiveTab('reservations')}
            className={`flex items-center px-3.5 py-2.5 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-colors relative cursor-pointer ${
              activeTab === 'reservations'
                ? 'border-[#B7C7AD] text-white bg-[#283022]/70 rounded-t-md'
                : 'border-transparent text-[#B7C7AD]/75 hover:text-[#F4F7F1] hover:border-[#56634B]'
            }`}
          >
            <Calendar className="w-4 h-4 mr-2" />
            <span>Reservas & Calendário</span>
            {pendingCheckinsCount > 0 && (
              <span className="ml-2 px-1.5 py-0.2 bg-[#AE8A75] text-white rounded-full text-[10px] font-black shadow-xs">
                {pendingCheckinsCount}
              </span>
            )}
          </button>

          <button
            id="tab-expenses"
            type="button"
            onClick={() => setActiveTab('expenses')}
            className={`flex items-center px-3.5 py-2.5 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'expenses'
                ? 'border-[#B7C7AD] text-white bg-[#283022]/70 rounded-t-md'
                : 'border-transparent text-[#B7C7AD]/75 hover:text-[#F4F7F1] hover:border-[#56634B]'
            }`}
          >
            <Hammer className="w-4 h-4 mr-2" />
            <span>Reformas & Custos</span>
          </button>

          <button
            id="tab-checklists"
            type="button"
            onClick={() => setActiveTab('checklists')}
            className={`flex items-center px-3.5 py-2.5 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'checklists'
                ? 'border-[#B7C7AD] text-white bg-[#283022]/70 rounded-t-md'
                : 'border-transparent text-[#B7C7AD]/75 hover:text-[#F4F7F1] hover:border-[#56634B]'
            }`}
          >
            <ClipboardCheck className="w-4 h-4 mr-2" />
            <span>Checklists & Vistorias</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
