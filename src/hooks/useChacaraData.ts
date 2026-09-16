import { useState, useEffect, useCallback } from 'react';
import { Reservation, Expense, Checklist, ChacaraDetails } from '../types';
import { SupabaseService } from '../services/supabaseService';
import {
  INITIAL_RESERVATIONS,
  INITIAL_EXPENSES,
  INITIAL_CHECKLISTS,
  INITIAL_CHACARA_DETAILS,
} from '../services/mockData';

export function useChacaraData() {
  const [reservations, setReservations] = useState<Reservation[]>(() => {
    try {
      const cached = localStorage.getItem('recanto_paz_reservations');
      return cached ? JSON.parse(cached) : INITIAL_RESERVATIONS;
    } catch {
      return INITIAL_RESERVATIONS;
    }
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    try {
      const cached = localStorage.getItem('recanto_paz_expenses');
      return cached ? JSON.parse(cached) : INITIAL_EXPENSES;
    } catch {
      return INITIAL_EXPENSES;
    }
  });

  const [checklists, setChecklists] = useState<Checklist[]>(() => {
    try {
      const cached = localStorage.getItem('recanto_paz_checklists');
      return cached ? JSON.parse(cached) : INITIAL_CHECKLISTS;
    } catch {
      return INITIAL_CHECKLISTS;
    }
  });

  const [settings, setSettings] = useState<ChacaraDetails>(() => {
    try {
      const cached = localStorage.getItem('recanto_paz_settings');
      return cached ? JSON.parse(cached) : INITIAL_CHACARA_DETAILS;
    } catch {
      return INITIAL_CHACARA_DETAILS;
    }
  });

  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Initial load from Supabase database
  const refreshFromSupabase = useCallback(async () => {
    try {
      setIsSyncing(true);
      const [dbReservations, dbExpenses, dbChecklists, dbSettings] = await Promise.all([
        SupabaseService.getReservations(),
        SupabaseService.getExpenses(),
        SupabaseService.getChecklists(),
        SupabaseService.getSettings(),
      ]);

      if (dbReservations) setReservations(dbReservations);
      if (dbExpenses) setExpenses(dbExpenses);
      if (dbChecklists) setChecklists(dbChecklists);
      if (dbSettings) setSettings(dbSettings);
    } catch (err) {
      console.warn('Sync notice:', err);
    } finally {
      setIsSyncing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshFromSupabase();
  }, [refreshFromSupabase]);

  // Keep localStorage in sync with current states
  useEffect(() => {
    try {
      localStorage.setItem('recanto_paz_expenses', JSON.stringify(expenses));
    } catch (e) {
      console.error('Error saving expenses to localStorage:', e);
    }
  }, [expenses]);

  useEffect(() => {
    try {
      localStorage.setItem('recanto_paz_reservations', JSON.stringify(reservations));
    } catch (e) {
      console.error('Error saving reservations to localStorage:', e);
    }
  }, [reservations]);

  useEffect(() => {
    try {
      localStorage.setItem('recanto_paz_checklists', JSON.stringify(checklists));
    } catch (e) {
      console.error('Error saving checklists to localStorage:', e);
    }
  }, [checklists]);

  // ==========================================
  // RESERVATION ACTIONS
  // ==========================================
  const addReservation = useCallback(
    async (data: Omit<Reservation, 'id' | 'created_at' | 'updated_at'>) => {
      const tempId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `res-${Date.now()}`;
      const now = new Date().toISOString();
      const newReservation: Reservation = {
        ...data,
        id: tempId,
        created_at: now,
        updated_at: now,
      };

      // Optimistic update
      setReservations((prev) => [newReservation, ...prev]);

      // Server insert
      const saved = await SupabaseService.addReservation(data);
      if (saved && saved.id !== tempId) {
        setReservations((prev) =>
          prev.map((r) => (r.id === tempId ? saved : r))
        );
      }
      return saved || newReservation;
    },
    []
  );

  const updateReservation = useCallback(
    async (id: string, updates: Partial<Reservation>) => {
      // Optimistic update
      setReservations((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, ...updates, updated_at: new Date().toISOString() } : r
        )
      );

      // Server update
      const updated = await SupabaseService.updateReservation(id, updates);
      if (updated) {
        setReservations((prev) =>
          prev.map((r) => (r.id === id ? updated : r))
        );
      }
      return updated;
    },
    []
  );

  const deleteReservation = useCallback(
    async (id: string | number) => {
      const strId = String(id);
      // Optimistic update
      setReservations((prev) => prev.filter((r) => String(r.id) !== strId));

      // Server delete
      const ok = await SupabaseService.deleteReservation(strId);
      return ok;
    },
    []
  );

  // ==========================================
  // EXPENSE ACTIONS
  // ==========================================
  const addExpense = useCallback(
    async (data: Omit<Expense, 'id' | 'created_at' | 'updated_at'>) => {
      const tempId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `exp-${Date.now()}`;
      const now = new Date().toISOString();
      const newExpense: Expense = {
        ...data,
        id: tempId,
        created_at: now,
        updated_at: now,
      };

      // Optimistic update
      setExpenses((prev) => [newExpense, ...prev]);

      // Server insert
      const saved = await SupabaseService.addExpense(data);
      if (saved && saved.id !== tempId) {
        setExpenses((prev) =>
          prev.map((e) => (e.id === tempId ? saved : e))
        );
      }
      return saved || newExpense;
    },
    []
  );

  const updateExpense = useCallback(
    async (id: string, updates: Partial<Expense>) => {
      // Optimistic update
      setExpenses((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, ...updates, updated_at: new Date().toISOString() } : e
        )
      );

      // Server update
      const updated = await SupabaseService.updateExpense(id, updates);
      if (updated) {
        setExpenses((prev) =>
          prev.map((e) => (e.id === id ? updated : e))
        );
      }
      return updated;
    },
    []
  );

  const deleteExpense = useCallback(async (id: string) => {
    // Optimistic update
    setExpenses((prev) => prev.filter((e) => e.id !== id));

    // Server delete
    const ok = await SupabaseService.deleteExpense(id);
    return ok;
  }, []);

  // ==========================================
  // CHECKLIST ACTIONS
  // ==========================================
  const addChecklist = useCallback(
    async (data: Omit<Checklist, 'id' | 'created_at' | 'updated_at'>) => {
      const tempId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `chk-${Date.now()}`;
      const now = new Date().toISOString();
      const newChecklist: Checklist = {
        ...data,
        id: tempId,
        created_at: now,
        updated_at: now,
      };

      // Optimistic update
      setChecklists((prev) => [newChecklist, ...prev]);

      // Server insert
      const saved = await SupabaseService.addChecklist(data);
      if (saved && saved.id !== tempId) {
        setChecklists((prev) =>
          prev.map((c) => (c.id === tempId ? saved : c))
        );
      }
      return saved || newChecklist;
    },
    []
  );

  const updateChecklist = useCallback(
    async (id: string, updates: Partial<Checklist>) => {
      // Optimistic update
      setChecklists((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, ...updates, updated_at: new Date().toISOString() } : c
        )
      );

      // Server update
      const updated = await SupabaseService.updateChecklist(id, updates);
      if (updated) {
        setChecklists((prev) =>
          prev.map((c) => (c.id === id ? updated : c))
        );
      }
      return updated;
    },
    []
  );

  const deleteChecklist = useCallback(async (id: string) => {
    // Optimistic update
    setChecklists((prev) => prev.filter((c) => c.id !== id));

    // Server delete
    const ok = await SupabaseService.deleteChecklist(id);
    return ok;
  }, []);

  const toggleChecklistItem = useCallback(
    async (checklistId: string, itemId: string) => {
      let targetChecklist: Checklist | undefined;

      setChecklists((prev) => {
        return prev.map((c) => {
          if (c.id === checklistId) {
            const updatedItems = c.items.map((item) =>
              item.id === itemId ? { ...item, completed: !item.completed } : item
            );
            targetChecklist = { ...c, items: updatedItems, updated_at: new Date().toISOString() };
            return targetChecklist;
          }
          return c;
        });
      });

      if (targetChecklist) {
        await SupabaseService.updateChecklist(checklistId, {
          items: targetChecklist.items,
        });
      }
    },
    []
  );

  // ==========================================
  // SETTINGS & DATABASE MANAGEMENT
  // ==========================================
  const updateSettings = useCallback(async (newSettings: ChacaraDetails) => {
    setSettings(newSettings);
    await SupabaseService.updateSettings(newSettings);
  }, []);

  const resetToMock = useCallback(async () => {
    setLoading(true);
    await SupabaseService.resetAllToMock();
    await refreshFromSupabase();
  }, [refreshFromSupabase]);

  const exportAllData = useCallback(() => {
    const backup = {
      exported_at: new Date().toISOString(),
      provider: 'Supabase PostgreSQL',
      chacara: settings.name,
      reservations,
      expenses,
      checklists,
      settings,
    };
    return JSON.stringify(backup, null, 2);
  }, [reservations, expenses, checklists, settings]);

  const importData = useCallback(
    async (jsonStr: string) => {
      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed.reservations && Array.isArray(parsed.reservations)) {
          setReservations(parsed.reservations);
          for (const res of parsed.reservations) {
            await SupabaseService.addReservation(res);
          }
        }
        if (parsed.expenses && Array.isArray(parsed.expenses)) {
          setExpenses(parsed.expenses);
          for (const exp of parsed.expenses) {
            await SupabaseService.addExpense(exp);
          }
        }
        if (parsed.checklists && Array.isArray(parsed.checklists)) {
          setChecklists(parsed.checklists);
          for (const chk of parsed.checklists) {
            await SupabaseService.addChecklist(chk);
          }
        }
        if (parsed.settings) {
          setSettings(parsed.settings);
          await SupabaseService.updateSettings(parsed.settings);
        }
        await refreshFromSupabase();
        return true;
      } catch (e) {
        console.error('Import failed:', e);
        return false;
      }
    },
    [refreshFromSupabase]
  );

  return {
    reservations,
    expenses,
    checklists,
    settings,
    loading,
    isSyncing,
    refresh: refreshFromSupabase,
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
  };
}
