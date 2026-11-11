import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Reservation, Expense, Checklist, ChacaraDetails } from '../types';
import { StorageService } from './storage';
import { getStoredEventId } from './googleCalendarService';
import {
  INITIAL_RESERVATIONS,
  INITIAL_EXPENSES,
  INITIAL_CHECKLISTS,
  INITIAL_CHACARA_DETAILS,
} from './mockData';

function sanitizeReservationForDb(
  reservation: Partial<Reservation>
): Record<string, any> {
  const result: Record<string, any> = {};

  if (reservation.id) result.id = reservation.id;
  if (reservation.client_name) result.client_name = reservation.client_name.trim();
  if (reservation.client_phone) result.client_phone = reservation.client_phone.trim();
  if (reservation.check_in) result.check_in = reservation.check_in;
  if (reservation.check_out) result.check_out = reservation.check_out;

  result.client_document =
    reservation.client_document && reservation.client_document.trim()
      ? reservation.client_document.trim()
      : null;

  result.deposit_date =
    reservation.deposit_date && reservation.deposit_date.trim()
      ? reservation.deposit_date.trim()
      : null;

  result.contract_notes =
    reservation.contract_notes && reservation.contract_notes.trim()
      ? reservation.contract_notes.trim()
      : null;

  result.guests_count =
    typeof reservation.guests_count === 'number' && reservation.guests_count > 0
      ? reservation.guests_count
      : 1;

  result.total_amount =
    typeof reservation.total_amount === 'number'
      ? reservation.total_amount
      : 0;

  result.amount_paid =
    typeof reservation.amount_paid === 'number'
      ? reservation.amount_paid
      : 0;

  result.remaining_amount = Math.max(0, result.total_amount - result.amount_paid);

  result.payment_status = reservation.payment_status || 'pending';
  result.status = reservation.status || 'confirmed';

  if (reservation.daily_rate !== undefined && reservation.daily_rate !== null) {
    result.daily_rate = reservation.daily_rate;
  }

  if (reservation.google_calendar_event_id !== undefined) {
    result.google_calendar_event_id =
      reservation.google_calendar_event_id && reservation.google_calendar_event_id.trim()
        ? reservation.google_calendar_event_id.trim()
        : null;
  }

  if (reservation.last_synced_at !== undefined) {
    result.last_synced_at = reservation.last_synced_at || null;
  }

  if (reservation.created_at) result.created_at = reservation.created_at;
  result.updated_at = new Date().toISOString();

  return result;
}

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
        console.warn('Supabase getReservations notice, using local cache:', error.message);
        return StorageService.getReservations();
      }

      // Supabase is authoritative, but merge local Google Calendar info
      // if columns are null or empty in the remote table
      const remoteReservations = (data || []) as Reservation[];
      const localReservations = StorageService.getReservations();
      const localMap = new Map<string, Reservation>();
      localReservations.forEach((item) => {
        if (item.id) localMap.set(String(item.id), item);
      });

      const mergedReservations = remoteReservations.map((remote) => {
        const local = localMap.get(String(remote.id));
        const storedEventId = getStoredEventId(remote.id);
        const existingEventId =
          remote.google_calendar_event_id && remote.google_calendar_event_id.trim()
            ? remote.google_calendar_event_id.trim()
            : (local?.google_calendar_event_id || storedEventId || undefined);

        const existingLastSynced =
          remote.last_synced_at || local?.last_synced_at || undefined;

        return {
          ...remote,
          google_calendar_event_id: existingEventId,
          last_synced_at: existingLastSynced,
        };
      });

      StorageService.saveReservations(mergedReservations);
      return mergedReservations;
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
      const dbPayload = sanitizeReservationForDb({
        ...reservation,
        created_at: localSaved.created_at,
      });

      // Avoid passing custom client temporary IDs if Supabase generates standard IDs
      if (localSaved.id && !localSaved.id.startsWith('res-')) {
        dbPayload.id = localSaved.id;
      }

      let insertPayload: Record<string, any> = { ...dbPayload };

      let { data, error } = await supabase
        .from('reservations')
        .insert([insertPayload])
        .select()
        .single();

      if (
        error &&
        (error.code === 'PGRST204' ||
          error.message?.toLowerCase().includes('google_calendar_event_id') ||
          error.message?.toLowerCase().includes('last_synced_at') ||
          error.details?.toLowerCase().includes('google_calendar_event_id') ||
          error.details?.toLowerCase().includes('last_synced_at'))
      ) {
        console.info('Supabase reservations table missing calendar columns, retrying without them...');
        const { google_calendar_event_id: _g, last_synced_at: _l, ...payloadWithoutCalendar } = insertPayload;
        const retryResult = await supabase
          .from('reservations')
          .insert([payloadWithoutCalendar])
          .select()
          .single();
        data = retryResult.data;
        error = retryResult.error;
      }

      if (!error && data) {
        const savedRes: Reservation = {
          ...(data as Reservation),
          google_calendar_event_id:
            (data as any).google_calendar_event_id || localSaved.google_calendar_event_id,
          last_synced_at:
            (data as any).last_synced_at || localSaved.last_synced_at,
        };
        // Keep localStorage synchronized with the exact Supabase returned row
        const currentList = StorageService.getReservations();
        const updatedList = currentList.map((r) =>
          r.id === localSaved.id ? savedRes : r
        );
        StorageService.saveReservations(updatedList);
        return savedRes;
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
      const dbPayload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (updates.client_name !== undefined) dbPayload.client_name = updates.client_name.trim();
      if (updates.client_phone !== undefined) dbPayload.client_phone = updates.client_phone.trim();
      if (updates.check_in !== undefined) dbPayload.check_in = updates.check_in;
      if (updates.check_out !== undefined) dbPayload.check_out = updates.check_out;
      if (updates.guests_count !== undefined) dbPayload.guests_count = Number(updates.guests_count) || 1;
      if (updates.total_amount !== undefined) dbPayload.total_amount = Number(updates.total_amount) || 0;
      if (updates.amount_paid !== undefined) dbPayload.amount_paid = Number(updates.amount_paid) || 0;
      if (updates.remaining_amount !== undefined) dbPayload.remaining_amount = Number(updates.remaining_amount) || 0;
      if (updates.payment_status !== undefined) dbPayload.payment_status = updates.payment_status;
      if (updates.status !== undefined) dbPayload.status = updates.status;
      if (updates.daily_rate !== undefined) dbPayload.daily_rate = updates.daily_rate;

      if (updates.google_calendar_event_id !== undefined) {
        dbPayload.google_calendar_event_id =
          updates.google_calendar_event_id && updates.google_calendar_event_id.trim()
            ? updates.google_calendar_event_id.trim()
            : null;
      }
      if (updates.last_synced_at !== undefined) {
        dbPayload.last_synced_at = updates.last_synced_at || null;
      }

      if (updates.client_document !== undefined) {
        dbPayload.client_document =
          updates.client_document && updates.client_document.trim()
            ? updates.client_document.trim()
            : null;
      }
      if (updates.deposit_date !== undefined) {
        dbPayload.deposit_date =
          updates.deposit_date && updates.deposit_date.trim()
            ? updates.deposit_date.trim()
            : null;
      }
      if (updates.contract_notes !== undefined) {
        dbPayload.contract_notes =
          updates.contract_notes && updates.contract_notes.trim()
            ? updates.contract_notes.trim()
            : null;
      }

      let { data, error } = await supabase
        .from('reservations')
        .update(dbPayload)
        .eq('id', id)
        .select()
        .single();

      if (
        error &&
        (updates.google_calendar_event_id !== undefined || updates.last_synced_at !== undefined) &&
        (error.code === 'PGRST204' ||
          error.message?.toLowerCase().includes('google_calendar_event_id') ||
          error.message?.toLowerCase().includes('last_synced_at') ||
          error.details?.toLowerCase().includes('google_calendar_event_id') ||
          error.details?.toLowerCase().includes('last_synced_at'))
      ) {
        console.info('Supabase reservations table missing calendar columns on update, retrying without them...');
        const { google_calendar_event_id: _g, last_synced_at: _l, ...payloadWithoutCalendar } = dbPayload;
        const remainingKeys = Object.keys(payloadWithoutCalendar).filter((k) => k !== 'updated_at');

        if (remainingKeys.length === 0) {
          return localUpdated;
        }

        const retryResult = await supabase
          .from('reservations')
          .update(payloadWithoutCalendar)
          .eq('id', id)
          .select()
          .single();
        data = retryResult.data;
        error = retryResult.error;
      }

      if (!error && data) {
        const finalEventId =
          updates.google_calendar_event_id !== undefined
            ? updates.google_calendar_event_id
            : ((data as any).google_calendar_event_id || localUpdated?.google_calendar_event_id);
        const finalLastSynced =
          updates.last_synced_at !== undefined
            ? updates.last_synced_at
            : ((data as any).last_synced_at || localUpdated?.last_synced_at);

        const savedRes: Reservation = {
          ...(data as Reservation),
          google_calendar_event_id: finalEventId,
          last_synced_at: finalLastSynced,
        };

        StorageService.updateReservation(id, {
          google_calendar_event_id: finalEventId,
          last_synced_at: finalLastSynced,
        });

        return savedRes;
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

      const remoteExpenses = (data || []) as Expense[];
      const localExpenses = StorageService.getExpenses();
      const localMap = new Map<string, Expense>();
      localExpenses.forEach((item) => {
        if (item.id) localMap.set(String(item.id), item);
      });

      const mergedExpenses = remoteExpenses.map((remote) => {
        const local = localMap.get(String(remote.id));
        if (
          (!remote.photos || remote.photos.length === 0) &&
          local &&
          local.photos &&
          local.photos.length > 0
        ) {
          return {
            ...remote,
            photos: local.photos,
          };
        }
        return remote;
      });

      StorageService.saveExpenses(mergedExpenses);
      return mergedExpenses;
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
      let insertPayload: Record<string, any> = { ...localSaved };
      // Avoid passing custom client temporary IDs if Supabase generates standard IDs
      if (localSaved.id && localSaved.id.startsWith('exp-')) {
        delete insertPayload.id;
      }

      let { data, error } = await supabase
        .from('expenses')
        .insert([insertPayload])
        .select()
        .single();

      if (
        error &&
        (error.code === 'PGRST204' ||
          error.message?.toLowerCase().includes('photos') ||
          error.details?.toLowerCase().includes('photos'))
      ) {
        console.info('Supabase expenses table missing photos column, retrying without photos...');
        const { photos: _photos, ...payloadWithoutPhotos } = insertPayload;
        const retryResult = await supabase
          .from('expenses')
          .insert([payloadWithoutPhotos])
          .select()
          .single();
        data = retryResult.data;
        error = retryResult.error;
      }

      if (!error && data) {
        const savedExp: Expense = {
          ...(data as Expense),
          photos:
            (data as any).photos && (data as any).photos.length > 0
              ? (data as any).photos
              : localSaved.photos,
        };

        const currentList = StorageService.getExpenses();
        const updatedList = currentList.map((e) =>
          e.id === localSaved.id ? savedExp : e
        );
        StorageService.saveExpenses(updatedList);
        return savedExp;
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
      const payload: Record<string, any> = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      let { data, error } = await supabase
        .from('expenses')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (
        error &&
        updates.photos !== undefined &&
        (error.code === 'PGRST204' ||
          error.message?.toLowerCase().includes('photos') ||
          error.details?.toLowerCase().includes('photos'))
      ) {
        console.info('Supabase expenses table missing photos column on update, retrying without photos...');
        const { photos: _photos, ...payloadWithoutPhotos } = payload;
        const retryResult = await supabase
          .from('expenses')
          .update(payloadWithoutPhotos)
          .eq('id', id)
          .select()
          .single();
        data = retryResult.data;
        error = retryResult.error;
      }

      if (!error && data) {
        const finalPhotos =
          updates.photos !== undefined
            ? updates.photos
            : ((data as any).photos && (data as any).photos.length > 0
                ? (data as any).photos
                : localUpdated?.photos || []);

        const savedExp: Expense = {
          ...(data as Expense),
          photos: finalPhotos,
        };

        StorageService.updateExpense(id, { photos: finalPhotos });
        return savedExp;
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

      const remoteChecklists = (data || []) as Checklist[];
      StorageService.saveChecklists(remoteChecklists);
      return remoteChecklists;
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
        google_calendar_ical_url:
          data.google_calendar_ical_url || INITIAL_CHACARA_DETAILS.google_calendar_ical_url,
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
