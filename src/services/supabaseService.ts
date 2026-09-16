import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Reservation, Expense, Checklist, ChacaraDetails } from '../types';
import { StorageService } from './storage';
import {
  INITIAL_RESERVATIONS,
  INITIAL_EXPENSES,
  INITIAL_CHECKLISTS,
  INITIAL_CHACARA_DETAILS,
} from './mockData';

export const SupabaseService = {
  // ==========================================
  // RESERVATIONS
  // ==========================================
  async getReservations(): Promise<Reservation[]> {
    if (!isSupabaseConfigured || !supabase) {
      return StorageService.getReservations();
    }

    try {
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .order('check_in', { ascending: true });

      if (error) {
        console.warn('Supabase getReservations notice:', error.message);
        return StorageService.getReservations();
      }

      if (data && data.length > 0) {
        StorageService.saveReservations(data as Reservation[]);
        return data as Reservation[];
      }

      return StorageService.getReservations();
    } catch (err: any) {
      console.warn('Supabase getReservations unavailable, using local storage:', err?.message || err);
      return StorageService.getReservations();
    }
  },

  async addReservation(
    reservation: Omit<Reservation, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Reservation> {
    const localSaved = StorageService.addReservation(reservation);

    if (!isSupabaseConfigured || !supabase) {
      return localSaved;
    }

    try {
      const { data, error } = await supabase
        .from('reservations')
        .insert([localSaved])
        .select()
        .single();

      if (!error && data) {
        return data as Reservation;
      }
      if (error) {
        console.warn('Supabase addReservation notice:', error.message);
      }
      return localSaved;
    } catch (err: any) {
      console.warn('Supabase addReservation notice:', err?.message || err);
      return localSaved;
    }
  },

  async updateReservation(
    id: string,
    updates: Partial<Reservation>
  ): Promise<Reservation | null> {
    const localUpdated = StorageService.updateReservation(id, updates);

    if (!isSupabaseConfigured || !supabase) {
      return localUpdated;
    }

    try {
      const payload = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('reservations')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        return data as Reservation;
      }
      if (error) {
        console.warn('Supabase updateReservation notice:', error.message);
      }
      return localUpdated;
    } catch (err: any) {
      console.warn('Supabase updateReservation notice:', err?.message || err);
      return localUpdated;
    }
  },

  async deleteReservation(id: string): Promise<boolean> {
    StorageService.deleteReservation(id);

    if (!isSupabaseConfigured || !supabase) {
      return true;
    }

    try {
      const { error } = await supabase
        .from('reservations')
        .delete()
        .eq('id', id);

      if (error) {
        console.warn('Supabase deleteReservation notice:', error.message);
      }
      return true;
    } catch (err: any) {
      console.warn('Supabase deleteReservation notice:', err?.message || err);
      return true;
    }
  },

  // ==========================================
  // EXPENSES
  // ==========================================
  async getExpenses(): Promise<Expense[]> {
    if (!isSupabaseConfigured || !supabase) {
      return StorageService.getExpenses();
    }

    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        console.warn('Supabase getExpenses notice:', error.message);
        return StorageService.getExpenses();
      }

      if (data && data.length > 0) {
        StorageService.saveExpenses(data as Expense[]);
        return data as Expense[];
      }

      return StorageService.getExpenses();
    } catch (err: any) {
      console.warn('Supabase getExpenses unavailable, using local storage:', err?.message || err);
      return StorageService.getExpenses();
    }
  },

  async addExpense(
    expense: Omit<Expense, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Expense> {
    const localSaved = StorageService.addExpense(expense);

    if (!isSupabaseConfigured || !supabase) {
      return localSaved;
    }

    try {
      // Strip client-side photos array if present before sending to Supabase
      const { photos, ...dbPayload } = localSaved;
      const { data, error } = await supabase
        .from('expenses')
        .insert([dbPayload])
        .select()
        .single();

      if (!error && data) {
        return { ...(data as Expense), photos };
      }

      if (error) {
        console.warn('Supabase addExpense notice:', error.message);
      }
      return localSaved;
    } catch (err: any) {
      console.warn('Supabase addExpense notice:', err?.message || err);
      return localSaved;
    }
  },

  async updateExpense(
    id: string,
    updates: Partial<Expense>
  ): Promise<Expense | null> {
    const localUpdated = StorageService.updateExpense(id, updates);

    if (!isSupabaseConfigured || !supabase) {
      return localUpdated;
    }

    try {
      const { photos, ...dbUpdates } = updates;
      const payload = {
        ...dbUpdates,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('expenses')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        return { ...(data as Expense), photos: updates.photos ?? localUpdated?.photos };
      }

      if (error) {
        console.warn('Supabase updateExpense notice:', error.message);
      }
      return localUpdated;
    } catch (err: any) {
      console.warn('Supabase updateExpense notice:', err?.message || err);
      return localUpdated;
    }
  },

  async deleteExpense(id: string): Promise<boolean> {
    StorageService.deleteExpense(id);

    if (!isSupabaseConfigured || !supabase) {
      return true;
    }

    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) {
        console.warn('Supabase deleteExpense notice:', error.message);
      }
      return true;
    } catch (err: any) {
      console.warn('Supabase deleteExpense notice:', err?.message || err);
      return true;
    }
  },

  // ==========================================
  // CHECKLISTS
  // ==========================================
  async getChecklists(): Promise<Checklist[]> {
    if (!isSupabaseConfigured || !supabase) {
      return StorageService.getChecklists();
    }

    try {
      const { data, error } = await supabase
        .from('checklists')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase getChecklists notice:', error.message);
        return StorageService.getChecklists();
      }

      if (data && data.length > 0) {
        StorageService.saveChecklists(data as Checklist[]);
        return data as Checklist[];
      }

      return StorageService.getChecklists();
    } catch (err: any) {
      console.warn('Supabase getChecklists unavailable, using local storage:', err?.message || err);
      return StorageService.getChecklists();
    }
  },

  async addChecklist(
    checklist: Omit<Checklist, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Checklist> {
    const localSaved = StorageService.addChecklist(checklist);

    if (!isSupabaseConfigured || !supabase) {
      return localSaved;
    }

    try {
      const { data, error } = await supabase
        .from('checklists')
        .insert([localSaved])
        .select()
        .single();

      if (!error && data) {
        return data as Checklist;
      }
      if (error) {
        console.warn('Supabase addChecklist notice:', error.message);
      }
      return localSaved;
    } catch (err: any) {
      console.warn('Supabase addChecklist notice:', err?.message || err);
      return localSaved;
    }
  },

  async updateChecklist(
    id: string,
    updates: Partial<Checklist>
  ): Promise<Checklist | null> {
    const localUpdated = StorageService.updateChecklist(id, updates);

    if (!isSupabaseConfigured || !supabase) {
      return localUpdated;
    }

    try {
      const payload = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('checklists')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        return data as Checklist;
      }
      if (error) {
        console.warn('Supabase updateChecklist notice:', error.message);
      }
      return localUpdated;
    } catch (err: any) {
      console.warn('Supabase updateChecklist notice:', err?.message || err);
      return localUpdated;
    }
  },

  async deleteChecklist(id: string): Promise<boolean> {
    StorageService.deleteChecklist(id);

    if (!isSupabaseConfigured || !supabase) {
      return true;
    }

    try {
      const { error } = await supabase.from('checklists').delete().eq('id', id);
      if (error) {
        console.warn('Supabase deleteChecklist notice:', error.message);
      }
      return true;
    } catch (err: any) {
      console.warn('Supabase deleteChecklist notice:', err?.message || err);
      return true;
    }
  },

  // ==========================================
  // CHACARA DETAILS (SETTINGS)
  // ==========================================
  async getSettings(): Promise<ChacaraDetails> {
    if (!isSupabaseConfigured || !supabase) {
      return StorageService.getSettings();
    }

    try {
      const { data, error } = await supabase
        .from('chacara_details')
        .select('*')
        .eq('id', 'default')
        .single();

      if (error || !data) {
        return StorageService.getSettings();
      }

      const settings: ChacaraDetails = {
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
      };

      StorageService.saveSettings(settings);
      return settings;
    } catch (err: any) {
      console.warn('Supabase getSettings unavailable, using local storage:', err?.message || err);
      return StorageService.getSettings();
    }
  },

  async updateSettings(settings: ChacaraDetails): Promise<boolean> {
    // Always persist locally
    StorageService.saveSettings(settings);

    if (!isSupabaseConfigured || !supabase) {
      return true;
    }

    try {
      const payload = {
        id: 'default',
        ...settings,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('chacara_details')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        console.warn('Supabase updateSettings notice:', error.message);
      }
      return true;
    } catch (err: any) {
      console.warn('Supabase updateSettings notice:', err?.message || err);
      return true;
    }
  },

  // ==========================================
  // RESET ALL TO MOCK
  // ==========================================
  async resetAllToMock(): Promise<void> {
    StorageService.resetAllToMock();

    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      // Clear existing records
      await supabase.from('reservations').delete().neq('id', '___none___');
      await supabase.from('expenses').delete().neq('id', '___none___');
      await supabase.from('checklists').delete().neq('id', '___none___');

      // Re-insert initial mock data
      await supabase.from('reservations').insert(INITIAL_RESERVATIONS);
      await supabase.from('expenses').insert(INITIAL_EXPENSES);
      await supabase.from('checklists').insert(INITIAL_CHECKLISTS);
      await supabase.from('chacara_details').upsert({
        id: 'default',
        ...INITIAL_CHACARA_DETAILS,
        updated_at: new Date().toISOString(),
      });
    } catch (err: any) {
      console.warn('Error resetting remote Supabase tables:', err?.message || err);
    }
  },
};
