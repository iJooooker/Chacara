import React from 'react';
import {
  Trees,
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

interface HeaderProps {
  activeTab: 'dashboard' | 'reservations' | 'expenses' | 'checklists';
  setActiveTab: (tab: 'dashboard' | 'reservations' | 'expenses' | 'checklists') => void;
  onOpenNewReservation: () => void;
  onOpenNewExpense: () => void;
  onOpenSettings: () => void;
  onOpenPartnerReport: () => void;
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
  settings,
  pendingCheckinsCount,
  isSyncing,
}) => {
  return (
    <header className="bg-emerald-950 text-white border-b border-emerald-900 sticky top-0 z-30 shadow-xs">
      {/* Top Brand Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center text-emerald-950 font-black shadow-xs">
              <Trees className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {settings.name}
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-900/90 text-emerald-300 border border-emerald-800">
                  <Database className="w-3 h-3 mr-1 text-emerald-400" />
                  Supabase Live
                </span>
                {isSyncing && (
                  <span className="inline-flex items-center text-[11px] text-emerald-400 animate-pulse">
                    <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                    Sincronizando...
                  </span>
                )}
              </div>
              <p className="text-[11px] text-emerald-300/80 hidden sm:block truncate max-w-md">
                {settings.subtitle} • {settings.location}
              </p>
            </div>
          </div>

          {/* Quick Actions Buttons */}
          <div className="flex items-center space-x-2 sm:space-x-2.5">
            <button
              id="btn-partner-report"
              type="button"
              onClick={onOpenPartnerReport}
              className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-emerald-100 bg-emerald-900/80 hover:bg-emerald-800 rounded-lg transition-colors border border-emerald-800 cursor-pointer"
              title="Prestação de Contas para Sócios / Proprietário"
            >
              <Share2 className="w-3.5 h-3.5 mr-1.5 text-emerald-300 hidden sm:inline" />
              <span>Prestação de Contas</span>
            </button>

            <button
              id="btn-new-expense-header"
              type="button"
              onClick={onOpenNewExpense}
              className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-amber-200 bg-amber-950/60 hover:bg-amber-900/60 border border-amber-800/80 rounded-lg transition-colors cursor-pointer"
            >
              <Hammer className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
              <span>+ Reforma</span>
            </button>

            <button
              id="btn-new-reservation-header"
              type="button"
              onClick={onOpenNewReservation}
              className="inline-flex items-center px-3.5 py-1.5 text-xs font-bold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-200 rounded-lg shadow-xs transition-all cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5 mr-1.5 text-emerald-950" />
              <span>Nova Locação</span>
            </button>

            <button
              id="btn-settings-header"
              type="button"
              onClick={onOpenSettings}
              className="p-2 text-emerald-300 hover:text-white hover:bg-emerald-900/70 rounded-lg transition-colors cursor-pointer"
              title="Configurações & Backup"
              aria-label="Configurações"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-emerald-900/80">
        <nav className="flex space-x-1 sm:space-x-3 overflow-x-auto py-0.5 scrollbar-none" aria-label="Navegação">
          <button
            id="tab-dashboard"
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center px-3.5 py-2.5 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'dashboard'
                ? 'border-emerald-400 text-white bg-emerald-900/60 rounded-t-md'
                : 'border-transparent text-emerald-300/70 hover:text-emerald-100 hover:border-emerald-700'
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
                ? 'border-emerald-400 text-white bg-emerald-900/60 rounded-t-md'
                : 'border-transparent text-emerald-300/70 hover:text-emerald-100 hover:border-emerald-700'
            }`}
          >
            <Calendar className="w-4 h-4 mr-2" />
            <span>Reservas & Calendário</span>
            {pendingCheckinsCount > 0 && (
              <span className="ml-2 px-1.5 py-0.2 bg-emerald-500 text-emerald-950 rounded-full text-[10px] font-black">
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
                ? 'border-emerald-400 text-white bg-emerald-900/60 rounded-t-md'
                : 'border-transparent text-emerald-300/70 hover:text-emerald-100 hover:border-emerald-700'
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
                ? 'border-emerald-400 text-white bg-emerald-900/60 rounded-t-md'
                : 'border-transparent text-emerald-300/70 hover:text-emerald-100 hover:border-emerald-700'
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
