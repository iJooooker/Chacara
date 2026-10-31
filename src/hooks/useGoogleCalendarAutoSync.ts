import { useEffect, useRef, useCallback } from 'react';
import { Reservation, ChacaraDetails } from '../types';
import { getAccessToken } from '../services/googleAuth';
import { pushReservationToGoogle, saveStoredEventId } from '../services/googleCalendarService';

interface AutoSyncOptions {
  reservations: Reservation[];
  settings: ChacaraDetails;
  onUpdateReservation: (id: string, updates: Partial<Reservation>) => Promise<Reservation | null> | void;
  onNotify?: (message: string) => void;
  enabled?: boolean;
}

/**
 * Generates a signature strictly based on user-editable business properties.
 * IMPORTANT: NEVER include google_calendar_event_id, updated_at, or timestamps here,
 * as updating them would cause an infinite loop!
 */
function getBusinessSignature(res: Reservation): string {
  return [
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
  ].join('~');
}

/**
 * Hook to automatically synchronize reservations with Google Calendar safely:
 * - Anti-loop protection: 60-second cooldown per reservation
 * - In-flight lock preventing parallel duplicate requests
 * - Business-data-only signature (ignores metadata/timestamps)
 * - Safe debounce to avoid rapid re-triggering
 */
export function useGoogleCalendarAutoSync({
  reservations,
  settings,
  onUpdateReservation,
  onNotify,
  enabled = true,
}: AutoSyncOptions) {
  const knownSignaturesRef = useRef<Map<string, string>>(new Map());
  const cooldownMapRef = useRef<Map<string, number>>(new Map());
  const isSyncingRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef<boolean>(false);

  const syncReservationToGoogle = useCallback(
    async (res: Reservation, isNew: boolean = false) => {
      if (!res?.id || !res?.client_name) return;

      // Anti-loop Check 1: Already syncing right now
      if (isSyncingRef.current.has(res.id)) {
        return;
      }

      // Anti-loop Check 2: Cooldown (minimum 45 seconds between syncs for the same reservation)
      const now = Date.now();
      const lastSync = cooldownMapRef.current.get(res.id) || 0;
      if (now - lastSync < 45000) {
        return;
      }

      try {
        const token = await getAccessToken();
        if (!token) return;

        // Acquire lock & stamp cooldown
        isSyncingRef.current.add(res.id);
        cooldownMapRef.current.set(res.id, Date.now());

        const result = await pushReservationToGoogle(res, settings, token);
        if (result?.eventId) {
          saveStoredEventId(res.id, result.eventId);

          // Update signature to match current business state
          knownSignaturesRef.current.set(res.id, getBusinessSignature(res));

          // Only update app state if eventId is different, and do not trigger re-sync
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

  useEffect(() => {
    if (!enabled || reservations.length === 0) return;

    // First load: initialize known signatures without syncing existing items
    if (!initializedRef.current) {
      reservations.forEach((r) => {
        knownSignaturesRef.current.set(r.id, getBusinessSignature(r));
        // Seed cooldown on load to avoid syncing all existing items at once
        cooldownMapRef.current.set(r.id, Date.now());
      });
      initializedRef.current = true;
      return;
    }

    // Debounce checking to avoid rapid re-renders
    const timer = setTimeout(() => {
      reservations.forEach((res) => {
        if (res.status === 'cancelled' && !res.google_calendar_event_id) {
          return;
        }

        const prevSig = knownSignaturesRef.current.get(res.id);
        const currSig = getBusinessSignature(res);

        if (!prevSig) {
          // Brand new reservation added
          knownSignaturesRef.current.set(res.id, currSig);
          syncReservationToGoogle(res, true);
        } else if (prevSig !== currSig) {
          // Business details changed by user
          knownSignaturesRef.current.set(res.id, currSig);
          syncReservationToGoogle(res, false);
        }
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [reservations, enabled, syncReservationToGoogle]);

  return {
    syncReservationToGoogle,
  };
}
