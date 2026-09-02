import { supabase } from './supabaseClient';
import { Reservation, Expense, Checklist, ChacaraDetails } from '../types';
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
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .order('check_in', { ascending: true });

      if (error) {
        console.error('Supabase getReservations error:', error.message);
        const local = localStorage.getItem('recanto_paz_reservations');
        return local ? JSON.parse(local) : INITIAL_RESERVATIONS;
      }

      if (data && data.length > 0) {
        localStorage.setItem('recanto_paz_reservations', JSON.stringify(data));
        return data as Reservation[];
      }

      // If database is empty, return local or mock
      const local = localStorage.getItem('recanto_paz_reservations');
      return local ? JSON.parse(local) : INITIAL_RESERVATIONS;
    } catch (err) {
      console.error('Failed to fetch reservations from Supabase:', err);
      const local = localStorage.getItem('recanto_paz_reservations');
      return local ? JSON.parse(local) : INITIAL_RESERVATIONS;
    }
  },

  async addReservation(
    reservation: Omit<Reservation, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Reservation> {
    const newId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `res-${Date.now()}`;
    const now = new Date().toISOString();

    const payload: Reservation = {
      ...reservation,
      id: newId,
      created_at: now,
      updated_at: now,
    };

    try {
      const { data, error } = await supabase
        .from('reservations')
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error('Supabase addReservation error:', error.message);
        return payload;
      }
      return (data as Reservation) || payload;
    } catch (err) {
      console.error('Failed to insert reservation into Supabase:', err);
      return payload;
    }
  },

  async updateReservation(
    id: string,
    updates: Partial<Reservation>
  ): Promise<Reservation | null> {
    const payload = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase
        .from('reservations')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Supabase updateReservation error:', error.message);
        return null;
      }
      return data as Reservation;
    } catch (err) {
      console.error('Failed to update reservation in Supabase:', err);
      return null;
    }
  },

  async deleteReservation(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('reservations')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Supabase deleteReservation error:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Failed to delete reservation from Supabase:', err);
      return false;
    }
  },

  // ==========================================
  // EXPENSES
  // ==========================================
  async getExpenses(): Promise<Expense[]> {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        console.error('Supabase getExpenses error:', error.message);
        const local = localStorage.getItem('recanto_paz_expenses');
        return local ? JSON.parse(local) : INITIAL_EXPENSES;
      }

      if (data && data.length > 0) {
        localStorage.setItem('recanto_paz_expenses', JSON.stringify(data));
        return data as Expense[];
      }

      const local = localStorage.getItem('recanto_paz_expenses');
      return local ? JSON.parse(local) : INITIAL_EXPENSES;
    } catch (err) {
      console.error('Failed to fetch expenses from Supabase:', err);
      const local = localStorage.getItem('recanto_paz_expenses');
      return local ? JSON.parse(local) : INITIAL_EXPENSES;
    }
  },

  async addExpense(
    expense: Omit<Expense, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Expense> {
    const newId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `exp-${Date.now()}`;
    const now = new Date().toISOString();

    const payload: Expense = {
      ...expense,
      id: newId,
      created_at: now,
      updated_at: now,
    };

    try {
      const { data, error } = await supabase
        .from('expenses')
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.warn('Supabase addExpense initial attempt notice:', error.message);
        // If error is caused by missing photos column or similar schema mismatch, retry without photos
        if (payload.photos && payload.photos.length > 0) {
          const { photos, ...payloadNoPhotos } = payload;
          const { data: retryData, error: retryError } = await supabase
            .from('expenses')
            .insert([payloadNoPhotos])
            .select()
            .single();

          if (!retryError && retryData) {
            return { ...(retryData as Expense), photos };
          }
        }
        return payload;
      }
      return (data as Expense) || payload;
    } catch (err) {
      console.error('Failed to insert expense into Supabase:', err);
      return payload;
    }
  },

  async updateExpense(
    id: string,
    updates: Partial<Expense>
  ): Promise<Expense | null> {
    const payload = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase
        .from('expenses')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.warn('Supabase updateExpense initial attempt notice:', error.message);
        if (payload.photos) {
          const { photos, ...payloadNoPhotos } = payload;
          const { data: retryData, error: retryError } = await supabase
            .from('expenses')
            .update(payloadNoPhotos)
            .eq('id', id)
            .select()
            .single();

          if (!retryError && retryData) {
            return { ...(retryData as Expense), photos };
          }
        }
        return null;
      }
      return data as Expense;
    } catch (err) {
      console.error('Failed to update expense in Supabase:', err);
      return null;
    }
  },

  async deleteExpense(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id);

      if (error) {
        console.error('Supabase deleteExpense error:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Failed to delete expense from Supabase:', err);
      return false;
    }
  },

  // ==========================================
  // CHECKLISTS
  // ==========================================
  async getChecklists(): Promise<Checklist[]> {
    try {
      const { data, error } = await supabase
        .from('checklists')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase getChecklists error:', error.message);
        const local = localStorage.getItem('recanto_paz_checklists');
        return local ? JSON.parse(local) : INITIAL_CHECKLISTS;
      }

      if (data && data.length > 0) {
        localStorage.setItem('recanto_paz_checklists', JSON.stringify(data));
        return data as Checklist[];
      }

      const local = localStorage.getItem('recanto_paz_checklists');
      return local ? JSON.parse(local) : INITIAL_CHECKLISTS;
    } catch (err) {
      console.error('Failed to fetch checklists from Supabase:', err);
      const local = localStorage.getItem('recanto_paz_checklists');
      return local ? JSON.parse(local) : INITIAL_CHECKLISTS;
    }
  },

  async addChecklist(
    checklist: Omit<Checklist, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Checklist> {
    const newId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `chk-${Date.now()}`;
    const now = new Date().toISOString();

    const payload: Checklist = {
      ...checklist,
      id: newId,
      created_at: now,
      updated_at: now,
    };

    try {
      const { data, error } = await supabase
        .from('checklists')
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error('Supabase addChecklist error:', error.message);
        return payload;
      }
      return (data as Checklist) || payload;
    } catch (err) {
      console.error('Failed to insert checklist into Supabase:', err);
      return payload;
    }
  },

  async updateChecklist(
    id: string,
    updates: Partial<Checklist>
  ): Promise<Checklist | null> {
    const payload = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase
        .from('checklists')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Supabase updateChecklist error:', error.message);
        return null;
      }
      return data as Checklist;
    } catch (err) {
      console.error('Failed to update checklist in Supabase:', err);
      return null;
    }
  },

  async deleteChecklist(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('checklists').delete().eq('id', id);

      if (error) {
        console.error('Supabase deleteChecklist error:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Failed to delete checklist from Supabase:', err);
      return false;
    }
  },

  // ==========================================
  // CHACARA DETAILS (SETTINGS)
  // ==========================================
  async getSettings(): Promise<ChacaraDetails> {
    try {
      const { data, error } = await supabase
        .from('chacara_details')
        .select('*')
        .eq('id', 'default')
        .single();

      if (error || !data) {
        console.error('Supabase getSettings error / not found:', error?.message);
        const local = localStorage.getItem('recanto_paz_settings');
        return local ? JSON.parse(local) : INITIAL_CHACARA_DETAILS;
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

      localStorage.setItem('recanto_paz_settings', JSON.stringify(settings));
      return settings;
    } catch (err) {
      console.error('Failed to fetch settings from Supabase:', err);
      const local = localStorage.getItem('recanto_paz_settings');
      return local ? JSON.parse(local) : INITIAL_CHACARA_DETAILS;
    }
  },

  async updateSettings(settings: ChacaraDetails): Promise<boolean> {
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
        console.error('Supabase updateSettings error:', error.message);
        return false;
      }
      localStorage.setItem('recanto_paz_settings', JSON.stringify(settings));
      return true;
    } catch (err) {
      console.error('Failed to update settings in Supabase:', err);
      return false;
    }
  },

  // ==========================================
  // RESET ALL TO MOCK
  // ==========================================
  async resetAllToMock(): Promise<void> {
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
    } catch (err) {
      console.error('Error resetting Supabase tables:', err);
    }
  },
};
