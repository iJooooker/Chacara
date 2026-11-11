import { useEffect, useRef, useCallback } from 'react';
import { Reservation, ChacaraDetails } from '../types';
import { getAccessToken } from '../services/googleAuth';
import { pushReservationToGoogle, saveStoredEventId } from '../services/googleCalendarService';

export interface AutoSyncOptions {
  reservations: Reservation[];
  settings: ChacaraDetails;
  onUpdateReservation: (id: string, updates: Partial<Reservation>) => Promise<Reservation | null> | void;
  onNotify?: (message: string) => void;
  enabled?: boolean;
  debounceMs?: number;
}

/**
 * Calculates a deterministic 32-bit FNV-1a hash of the reservation's business state.
 * Any change to client details, dates, financial status, or property rules produces a new hash.
 * Internal timestamps and local IDs that don't affect Google Calendar are strictly excluded.
 */
export function calculateReservationHash(res: Reservation, settings?: ChacaraDetails): string {
  const parts = [
    res.id,
    (res.client_name || '').trim().toLowerCase(),
    (res.client_phone || '').trim(),
    res.check_in,
    res.check_out,
    res.status,
    res.payment_status,
    Number(res.guests_count) || 1,
    Number(res.total_amount) || 0,
    Number(res.amount_paid) || 0,
    Number(res.remaining_amount) || 0,
    (res.contract_notes || '').trim(),
    settings?.check_in_time || '',
    settings?.check_out_time || '',
    settings?.location || '',
  ].join('|');

  let hash = 0x811c9dc5;
  for (let i = 0; i < parts.length; i++) {
    hash ^= parts.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16);
}

/**
 * Hook to automatically synchronize reservations with Google Calendar using:
 * 1. Hash & Versioning: Computes a hash of business fields; only pushes if the hash actually changed.
 * 2. Debouncing: Enqueues changes and delays the API push, discarding stale intermediate updates.
 * 3. In-flight Lock: Prevents parallel push attempts for the same reservation.
 * 4. Cooldown Guard: Enforces minimum spacing between syncs to eliminate runaway loops.
 */
export function useGoogleCalendarAutoSync({
  reservations,
  settings,
  onUpdateReservation,
  onNotify,
  enabled = true,
  debounceMs = 1500,
}: AutoSyncOptions) {
  // Hash map tracking the last successfully synced hash for each reservation
  const lastSyncedHashMap = useRef<Map<string, string>>(new Map());

  // Version counter for each reservation to invalidate stale debounced executions
  const versionMap = useRef<Map<string, number>>(new Map());

  // Debounce timers per reservation
  const debounceTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // In-flight sync lock per reservation
  const isSyncingRef = useRef<Set<string>>(new Set());

  // Minimum timestamp between pushes per reservation (anti-loop)
  const lastSyncTimestampRef = useRef<Map<string, number>>(new Map());

  // Initial load flag to register existing reservations without mass-pushing
  const isInitialLoadRef = useRef<boolean>(true);

  /**
   * Executes the push to Google Calendar if hash or versioning validates.
   */
  const executePush = useCallback(
    async (
      res: Reservation,
      expectedVersion: number,
      isNew: boolean = false,
      notifyIfNoToken: boolean = false
    ) => {
      if (!res?.id || !res?.client_name) return;

      // 1. Check if another update arrived after this debounced call was scheduled
      const currentVersion = versionMap.current.get(res.id) || 0;
      if (currentVersion !== expectedVersion) {
        // Stale debounced push; a newer version is already queued or synced
        return;
      }

      // 2. Check if the current hash is already synced
      const currentHash = calculateReservationHash(res, settings);
      const lastSyncedHash = lastSyncedHashMap.current.get(res.id);
      if (lastSyncedHash === currentHash) {
        // Data has not changed since the last successful sync
        return;
      }

      // 3. Concurrency lock
      if (isSyncingRef.current.has(res.id)) {
        return;
      }

      // 4. Cooldown check: minimum 30 seconds between consecutive API pushes for the same reservation
      const now = Date.now();
      const lastSyncTime = lastSyncTimestampRef.current.get(res.id) || 0;
      if (now - lastSyncTime < 30000) {
        return;
      }

      try {
        const token = await getAccessToken();
        if (!token) {
          if (notifyIfNoToken && onNotify) {
            onNotify(
              '⚠️ Reserva salva no banco! Para enviar também à Google Agenda, conecte sua conta Google nesta sessão.'
            );
          }
          return;
        }

        isSyncingRef.current.add(res.id);
        lastSyncTimestampRef.current.set(res.id, Date.now());

        const result = await pushReservationToGoogle(res, settings, token);

        if (result?.eventId) {
          saveStoredEventId(res.id, result.eventId);

          // Update hash to mark this state as synced
          lastSyncedHashMap.current.set(res.id, currentHash);

          // Only update app state if eventId is different
          if (res.google_calendar_event_id !== result.eventId) {
            await onUpdateReservation(res.id, {
              google_calendar_event_id: result.eventId,
              last_synced_at: new Date().toISOString(),
            });
          }

          if (onNotify) {
            onNotify(
              isNew
                ? `📅 Nova locação de ${res.client_name} enviada para a Google Agenda!`
                : `📅 Locação de ${res.client_name} atualizada na Google Agenda via API!`
            );
          }
        }
      } catch (err: any) {
        console.warn(`[AutoSync] Erro ao sincronizar ${res.client_name}:`, err?.message || err);
      } finally {
        isSyncingRef.current.delete(res.id);
      }
    },
    [settings, onUpdateReservation, onNotify]
  );

  /**
   * Schedules a debounced push for a single reservation.
   */
  const scheduleDebouncedPush = useCallback(
    (res: Reservation, isNew: boolean = false, notifyIfNoToken: boolean = false) => {
      if (!res?.id) return;

      // Increment version for this reservation
      const nextVersion = (versionMap.current.get(res.id) || 0) + 1;
      versionMap.current.set(res.id, nextVersion);

      // Clear existing debounce timer for this reservation if any
      const existingTimer = debounceTimersRef.current.get(res.id);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Set new debounce timer
      const timer = setTimeout(() => {
        debounceTimersRef.current.delete(res.id);
        executePush(res, nextVersion, isNew, notifyIfNoToken);
      }, debounceMs);

      debounceTimersRef.current.set(res.id, timer);
    },
    [executePush, debounceMs]
  );

  /**
   * Direct push method exposed to components (e.g., when saving a reservation modal)
   */
  const syncReservationToGoogle = useCallback(
    (res: Reservation, isNew: boolean = false) => {
      scheduleDebouncedPush(res, isNew, true);
    },
    [scheduleDebouncedPush]
  );

  /**
   * Monitor reservations collection with hash comparison & debouncing
   */
  useEffect(() => {
    if (!enabled || reservations.length === 0) return;

    // First load: seed hashes for all existing reservations so we don't spam Google Calendar
    if (isInitialLoadRef.current) {
      reservations.forEach((r) => {
        const hash = calculateReservationHash(r, settings);
        lastSyncedHashMap.current.set(r.id, hash);
        lastSyncTimestampRef.current.set(r.id, Date.now());
      });
      isInitialLoadRef.current = false;
      return;
    }

    // Evaluate each reservation
    reservations.forEach((res) => {
      // Don't auto-sync cancelled reservations if they have no Google event
      if (res.status === 'cancelled' && !res.google_calendar_event_id) {
        return;
      }

      const currentHash = calculateReservationHash(res, settings);
      const prevHash = lastSyncedHashMap.current.get(res.id);

      if (!prevHash) {
        // Brand new reservation created
        scheduleDebouncedPush(res, true, false);
      } else if (prevHash !== currentHash) {
        // Existing reservation with modified business details
        scheduleDebouncedPush(res, false, false);
      }
    });

    // Cleanup timers and caches for deleted reservations
    const currentIds = new Set(reservations.map((r) => r.id));
    for (const [id, timer] of debounceTimersRef.current.entries()) {
      if (!currentIds.has(id)) {
        clearTimeout(timer);
        debounceTimersRef.current.delete(id);
        lastSyncedHashMap.current.delete(id);
        versionMap.current.delete(id);
        lastSyncTimestampRef.current.delete(id);
      }
    }
    lastSyncedHashMap.current.forEach((_, id) => {
      if (!currentIds.has(id)) {
        lastSyncedHashMap.current.delete(id);
        versionMap.current.delete(id);
        lastSyncTimestampRef.current.delete(id);
      }
    });
  }, [reservations, settings, enabled, scheduleDebouncedPush]);

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      debounceTimersRef.current.forEach((timer) => clearTimeout(timer));
      debounceTimersRef.current.clear();
    };
  }, []);

  return {
    syncReservationToGoogle,
    calculateReservationHash: (res: Reservation) => calculateReservationHash(res, settings),
  };
}
