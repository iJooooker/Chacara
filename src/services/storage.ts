import { Reservation, Expense, Checklist, ChacaraDetails } from '../types';
import {
  INITIAL_RESERVATIONS,
  INITIAL_EXPENSES,
  INITIAL_CHECKLISTS,
  INITIAL_CHACARA_DETAILS,
} from './mockData';

const KEYS = {
  RESERVATIONS: 'recanto_paz_reservations',
  EXPENSES: 'recanto_paz_expenses',
  CHECKLISTS: 'recanto_paz_checklists',
  SETTINGS: 'recanto_paz_settings',
};

const STORAGE_EVENT = 'recanto_paz_storage_change';

function emitChange(key: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(STORAGE_EVENT, { detail: { key } }));
  }
}

export const StorageService = {
  // --- RESERVATIONS ---
  getReservations(): Reservation[] {
    try {
      const data = localStorage.getItem(KEYS.RESERVATIONS);
      if (!data) {
        localStorage.setItem(KEYS.RESERVATIONS, JSON.stringify(INITIAL_RESERVATIONS));
        return INITIAL_RESERVATIONS;
      }
      return JSON.parse(data);
    } catch (e) {
      console.error('Error loading reservations:', e);
      return INITIAL_RESERVATIONS;
    }
  },

  saveReservations(reservations: Reservation[]): void {
    try {
      localStorage.setItem(KEYS.RESERVATIONS, JSON.stringify(reservations));
      emitChange(KEYS.RESERVATIONS);
    } catch (e) {
      console.error('Error saving reservations:', e);
    }
  },

  addReservation(reservation: Omit<Reservation, 'id' | 'created_at' | 'updated_at'>): Reservation {
    const list = this.getReservations();
    const newReservation: Reservation = {
      ...reservation,
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `res-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.saveReservations([newReservation, ...list]);
    return newReservation;
  },

  updateReservation(id: string, updates: Partial<Reservation>): Reservation | null {
    const list = this.getReservations();
    const index = list.findIndex((r) => r.id === id);
    if (index === -1) return null;

    const updated: Reservation = {
      ...list[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    list[index] = updated;
    this.saveReservations(list);
    return updated;
  },

  deleteReservation(id: string): boolean {
    const list = this.getReservations();
    const filtered = list.filter((r) => r.id !== id);
    if (filtered.length === list.length) return false;
    this.saveReservations(filtered);
    return true;
  },

  // --- EXPENSES ---
  getExpenses(): Expense[] {
    try {
      const data = localStorage.getItem(KEYS.EXPENSES);
      if (!data) {
        localStorage.setItem(KEYS.EXPENSES, JSON.stringify(INITIAL_EXPENSES));
        return INITIAL_EXPENSES;
      }
      return JSON.parse(data);
    } catch (e) {
      console.error('Error loading expenses:', e);
      return INITIAL_EXPENSES;
    }
  },

  saveExpenses(expenses: Expense[]): void {
    try {
      localStorage.setItem(KEYS.EXPENSES, JSON.stringify(expenses));
      emitChange(KEYS.EXPENSES);
    } catch (e) {
      console.error('Error saving expenses:', e);
    }
  },

  addExpense(expense: Omit<Expense, 'id' | 'created_at' | 'updated_at'>): Expense {
    const list = this.getExpenses();
    const newExpense: Expense = {
      ...expense,
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `exp-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.saveExpenses([newExpense, ...list]);
    return newExpense;
  },

  updateExpense(id: string, updates: Partial<Expense>): Expense | null {
    const list = this.getExpenses();
    const index = list.findIndex((e) => e.id === id);
    if (index === -1) return null;

    const updated: Expense = {
      ...list[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    list[index] = updated;
    this.saveExpenses(list);
    return updated;
  },

  deleteExpense(id: string): boolean {
    const list = this.getExpenses();
    const filtered = list.filter((e) => e.id !== id);
    if (filtered.length === list.length) return false;
    this.saveExpenses(filtered);
    return true;
  },

  // --- CHECKLISTS ---
  getChecklists(): Checklist[] {
    try {
      const data = localStorage.getItem(KEYS.CHECKLISTS);
      if (!data) {
        localStorage.setItem(KEYS.CHECKLISTS, JSON.stringify(INITIAL_CHECKLISTS));
        return INITIAL_CHECKLISTS;
      }
      return JSON.parse(data);
    } catch (e) {
      console.error('Error loading checklists:', e);
      return INITIAL_CHECKLISTS;
    }
  },

  saveChecklists(checklists: Checklist[]): void {
    try {
      localStorage.setItem(KEYS.CHECKLISTS, JSON.stringify(checklists));
      emitChange(KEYS.CHECKLISTS);
    } catch (e) {
      console.error('Error saving checklists:', e);
    }
  },

  addChecklist(checklist: Omit<Checklist, 'id' | 'created_at' | 'updated_at'>): Checklist {
    const list = this.getChecklists();
    const newChecklist: Checklist = {
      ...checklist,
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `chk-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.saveChecklists([newChecklist, ...list]);
    return newChecklist;
  },

  updateChecklist(id: string, updates: Partial<Checklist>): Checklist | null {
    const list = this.getChecklists();
    const index = list.findIndex((c) => c.id === id);
    if (index === -1) return null;

    const updated: Checklist = {
      ...list[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    list[index] = updated;
    this.saveChecklists(list);
    return updated;
  },

  deleteChecklist(id: string): boolean {
    const list = this.getChecklists();
    const filtered = list.filter((c) => c.id !== id);
    if (filtered.length === list.length) return false;
    this.saveChecklists(filtered);
    return true;
  },

  // --- SETTINGS ---
  getSettings(): ChacaraDetails {
    try {
      const data = localStorage.getItem(KEYS.SETTINGS);
      if (!data) {
        localStorage.setItem(KEYS.SETTINGS, JSON.stringify(INITIAL_CHACARA_DETAILS));
        return INITIAL_CHACARA_DETAILS;
      }
      return JSON.parse(data);
    } catch (e) {
      return INITIAL_CHACARA_DETAILS;
    }
  },

  saveSettings(settings: ChacaraDetails): void {
    try {
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
      emitChange(KEYS.SETTINGS);
    } catch (e) {
      console.error('Error saving settings:', e);
    }
  },

  // --- DATA MANAGEMENT ---
  resetAllToMock(): void {
    localStorage.setItem(KEYS.RESERVATIONS, JSON.stringify(INITIAL_RESERVATIONS));
    localStorage.setItem(KEYS.EXPENSES, JSON.stringify(INITIAL_EXPENSES));
    localStorage.setItem(KEYS.CHECKLISTS, JSON.stringify(INITIAL_CHECKLISTS));
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(INITIAL_CHACARA_DETAILS));
    emitChange('all');
  },

  exportAllData(): string {
    const backup = {
      exported_at: new Date().toISOString(),
      chacara: 'Recanto da Paz',
      reservations: this.getReservations(),
      expenses: this.getExpenses(),
      checklists: this.getChecklists(),
      settings: this.getSettings(),
    };
    return JSON.stringify(backup, null, 2);
  },

  importData(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.reservations) localStorage.setItem(KEYS.RESERVATIONS, JSON.stringify(parsed.reservations));
      if (parsed.expenses) localStorage.setItem(KEYS.EXPENSES, JSON.stringify(parsed.expenses));
      if (parsed.checklists) localStorage.setItem(KEYS.CHECKLISTS, JSON.stringify(parsed.checklists));
      if (parsed.settings) localStorage.setItem(KEYS.SETTINGS, JSON.stringify(parsed.settings));
      emitChange('all');
      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  },

  onStorageChange(callback: () => void): () => void {
    const handler = () => callback();
    window.addEventListener(STORAGE_EVENT, handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener(STORAGE_EVENT, handler);
      window.removeEventListener('storage', handler);
    };
  },
};
