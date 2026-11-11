import { useState, useEffect, useCallback } from 'react';
import { Reservation, Expense, Checklist, ChacaraDetails } from '../types';
import { SupabaseService } from '../services/supabaseService';
import { supabase } from '../services/supabaseClient';
import { StorageService } from '../services/storage';
import {
  INITIAL_CHACARA_DETAILS,
} from '../services/mockData';

export function useChacaraData() {
  const [reservations, setReservations] = useState<Reservation[]>(() => {
    try {
      const cached = localStorage.getItem('recanto_paz_reservations');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    try {
      const cached = localStorage.getItem('recanto_paz_expenses');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [checklists, setChecklists] = useState<Checklist[]>(() => {
    try {
      const cached = localStorage.getItem('recanto_paz_checklists');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
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

  // Fetch immediately on mount & setup Realtime listeners
  useEffect(() => {
    refreshFromSupabase();

    if (!supabase) return;

    // Realtime channel for instant multi-device synchronization
    const channel = supabase
      .channel('chacara_sync_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newRes = payload.new as Reservation;
            setReservations((prev) => {
              const existingItem = prev.find((r) => r.id === newRes.id);
              const fallbackItem =
                existingItem || StorageService.getReservations().find((r) => r.id === newRes.id);
              const mergedRes: Reservation = {
                ...newRes,
                google_calendar_event_id:
                  newRes.google_calendar_event_id || fallbackItem?.google_calendar_event_id,
                last_synced_at:
                  newRes.last_synced_at || fallbackItem?.last_synced_at,
              };

              if (existingItem) {
                return prev.map((r) => (r.id === newRes.id ? mergedRes : r));
              }
              return [mergedRes, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedRes = payload.new as Reservation;
            setReservations((prev) =>
              prev.map((r) => {
                if (r.id === updatedRes.id) {
                  const fallbackItem =
                    r || StorageService.getReservations().find((item) => item.id === updatedRes.id);
                  return {
                    ...updatedRes,
                    google_calendar_event_id:
                      updatedRes.google_calendar_event_id || fallbackItem?.google_calendar_event_id,
                    last_synced_at:
                      updatedRes.last_synced_at || fallbackItem?.last_synced_at,
                  };
                }
                return r;
              })
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id?: string })?.id;
            if (deletedId) {
              setReservations((prev) => prev.filter((r) => r.id !== deletedId));
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newExp = payload.new as Expense;
            setExpenses((prev) => {
              const existingItem = prev.find((e) => e.id === newExp.id);
              const fallbackPhotos =
                existingItem?.photos ||
                StorageService.getExpenses().find((e) => e.id === newExp.id)?.photos ||
                [];
              const photos =
                newExp.photos && newExp.photos.length > 0 ? newExp.photos : fallbackPhotos;
              const mergedExp: Expense = { ...newExp, photos };

              if (existingItem) {
                return prev.map((e) => (e.id === newExp.id ? mergedExp : e));
              }
              return [mergedExp, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedExp = payload.new as Expense;
            setExpenses((prev) =>
              prev.map((e) => {
                if (e.id === updatedExp.id) {
                  const photos =
                    updatedExp.photos && updatedExp.photos.length > 0
                      ? updatedExp.photos
                      : e.photos ||
                        StorageService.getExpenses().find((item) => item.id === updatedExp.id)?.photos ||
                        [];
                  return { ...updatedExp, photos };
                }
                return e;
              })
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id?: string })?.id;
            if (deletedId) {
              setExpenses((prev) => prev.filter((e) => e.id !== deletedId));
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'checklists' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newChk = payload.new as Checklist;
            setChecklists((prev) => {
              if (prev.some((c) => c.id === newChk.id)) {
                return prev.map((c) => (c.id === newChk.id ? newChk : c));
              }
              return [newChk, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedChk = payload.new as Checklist;
            setChecklists((prev) =>
              prev.map((c) => (c.id === updatedChk.id ? updatedChk : c))
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id?: string })?.id;
            if (deletedId) {
              setChecklists((prev) => prev.filter((c) => c.id !== deletedId));
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chacara_details' },
        (payload) => {
          if (payload.new) {
            const data = payload.new as any;
            setSettings({
              name: data.name,
              subtitle: data.subtitle,
              location: data.location,
              max_guests: data.max_guests,
              check_in_time: data.check_in_time,
              check_out_time: data.check_out_time,
              wifi_network: data.wifi_network,
              wifi_password: data.wifi_password,
              energy_110_220: data.energy_110_220,
              gate_code: data.gate_code,
              caretaker_name: data.caretaker_name,
              caretaker_phone: data.caretaker_phone,
              quiet_hours: data.quiet_hours,
              google_calendar_ical_url:
                data.google_calendar_ical_url || INITIAL_CHACARA_DETAILS.google_calendar_ical_url,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshFromSupabase]);

  // Re-sync whenever user brings the app into view (tab switch or mobile screen wake)
  useEffect(() => {
    const handleFocusOrVisible = () => {
      if (document.visibilityState === 'visible') {
        refreshFromSupabase();
      }
    };

    window.addEventListener('visibilitychange', handleFocusOrVisible);
    window.addEventListener('focus', handleFocusOrVisible);

    return () => {
      window.removeEventListener('visibilitychange', handleFocusOrVisible);
      window.removeEventListener('focus', handleFocusOrVisible);
    };
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
    async (jsonStr: string): Promise<boolean> => {
      try {
        if (!jsonStr || typeof jsonStr !== 'string') return false;
        const parsed = JSON.parse(jsonStr);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          return false;
        }

        const hasValidKey =
          ('reservations' in parsed && Array.isArray(parsed.reservations)) ||
          ('expenses' in parsed && Array.isArray(parsed.expenses)) ||
          ('checklists' in parsed && Array.isArray(parsed.checklists)) ||
          ('settings' in parsed && typeof parsed.settings === 'object' && parsed.settings !== null);

        if (!hasValidKey) {
          return false;
        }

        // Avoid duplicates by checking existing IDs in state and local storage
        const currentReservations = StorageService.getReservations();
        const existingResIds = new Set(
          [...reservations, ...currentReservations]
            .map((r) => r?.id && String(r.id))
            .filter(Boolean) as string[]
        );

        if (parsed.reservations && Array.isArray(parsed.reservations)) {
          for (const res of parsed.reservations) {
            if (!res) continue;
            const resId = res.id ? String(res.id) : null;
            if (resId && existingResIds.has(resId)) {
              await SupabaseService.updateReservation(resId, res);
            } else {
              await SupabaseService.addReservation(res as any);
              if (resId) existingResIds.add(resId);
            }
          }
        }

        const currentExpenses = StorageService.getExpenses();
        const existingExpIds = new Set(
          [...expenses, ...currentExpenses]
            .map((e) => e?.id && String(e.id))
            .filter(Boolean) as string[]
        );

        if (parsed.expenses && Array.isArray(parsed.expenses)) {
          for (const exp of parsed.expenses) {
            if (!exp) continue;
            const expId = exp.id ? String(exp.id) : null;
            if (expId && existingExpIds.has(expId)) {
              await SupabaseService.updateExpense(expId, exp);
            } else {
              await SupabaseService.addExpense(exp as any);
              if (expId) existingExpIds.add(expId);
            }
          }
        }

        const currentChecklists = StorageService.getChecklists();
        const existingChkIds = new Set(
          [...checklists, ...currentChecklists]
            .map((c) => c?.id && String(c.id))
            .filter(Boolean) as string[]
        );

        if (parsed.checklists && Array.isArray(parsed.checklists)) {
          for (const chk of parsed.checklists) {
            if (!chk) continue;
            const chkId = chk.id ? String(chk.id) : null;
            if (chkId && existingChkIds.has(chkId)) {
              await SupabaseService.updateChecklist(chkId, chk);
            } else {
              await SupabaseService.addChecklist(chk as any);
              if (chkId) existingChkIds.add(chkId);
            }
          }
        }

        if (parsed.settings && typeof parsed.settings === 'object') {
          await SupabaseService.updateSettings(parsed.settings);
        }

        await refreshFromSupabase();
        return true;
      } catch (e) {
        console.error('Import failed:', e);
        return false;
      }
    },
    [reservations, expenses, checklists, refreshFromSupabase]
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
