import { useEffect, useRef, useCallback } from 'react';
import { Reservation, ChacaraDetails } from '../types';
import { getAccessToken } from '../services/googleAuth';
import { pushReservationToGoogle } from '../services/googleCalendarService';

interface AutoSyncOptions {
  reservations: Reservation[];
  settings: ChacaraDetails;
  onUpdateReservation: (id: string, updates: Partial<Reservation>) => Promise<Reservation | null> | void;
  onNotify?: (message: string) => void;
  enabled?: boolean;
}

/**
 * Generates a unique signature representing the calendar-critical properties of a reservation.
 */
function getReservationSignature(res: Reservation): string {
  return [
    res.id,
    res.client_name,
    res.client_phone,
    res.check_in,
    res.check_out,
    res.status,
    res.payment_status,
    res.guests_count,
    res.total_amount,
    res.amount_paid,
    res.remaining_amount,
    res.contract_notes || '',
    res.google_calendar_event_id || '',
  ].join('~');
}

/**
 * Hook to automatically detect new or updated reservations and push them
 * directly to Google Calendar via REST API in the background, without requiring
 * manual user confirmation or opening any tabs.
 */
export function useGoogleCalendarAutoSync({
  reservations,
  settings,
  onUpdateReservation,
  onNotify,
  enabled = true,
}: AutoSyncOptions) {
  const knownSignaturesRef = useRef<Map<string, string>>(new Map());
  const isInitialLoadRef = useRef<boolean>(true);
  const isSyncingRef = useRef<Set<string>>(new Set());

  const syncReservationToGoogle = useCallback(
    async (res: Reservation, isNew: boolean = false) => {
      if (isSyncingRef.current.has(res.id)) return;

      try {
        const token = await getAccessToken();
        if (!token) return;

        isSyncingRef.current.add(res.id);

        const result = await pushReservationToGoogle(res, settings, token);
        if (result?.eventId) {
          const updates: Partial<Reservation> = {
            google_calendar_event_id: result.eventId,
            last_synced_at: new Date().toISOString(),
          };

          // Update signature cache immediately to prevent loop
          const updatedRes: Reservation = { ...res, ...updates };
          knownSignaturesRef.current.set(res.id, getReservationSignature(updatedRes));

          await onUpdateReservation(res.id, updates);

          if (onNotify) {
            onNotify(
              isNew
                ? `📅 Nova locação de ${res.client_name} enviada automaticamente para a Google Agenda!`
                : `📅 Locação de ${res.client_name} atualizada na Google Agenda via API!`
            );
          }
        }
      } catch (err: any) {
        console.warn(`[AutoSync] Erro ao sincronizar reserva ${res.id} no Google Calendar:`, err);
      } finally {
        isSyncingRef.current.delete(res.id);
      }
    },
    [settings, onUpdateReservation, onNotify]
  );

  useEffect(() => {
    if (!enabled || reservations.length === 0) return;

    // First render: register existing reservations so we don't re-sync unchanged ones
    if (isInitialLoadRef.current) {
      reservations.forEach((r) => {
        knownSignaturesRef.current.set(r.id, getReservationSignature(r));
      });
      isInitialLoadRef.current = false;
      return;
    }

    // Check each reservation for changes or new additions
    reservations.forEach((res) => {
      // Don't auto-create Google events for cancelled reservations if they don't already have one
      if (res.status === 'cancelled' && !res.google_calendar_event_id) {
        return;
      }

      const prevSignature = knownSignaturesRef.current.get(res.id);
      const currentSignature = getReservationSignature(res);

      if (!prevSignature) {
        // Brand new reservation!
        knownSignaturesRef.current.set(res.id, currentSignature);
        syncReservationToGoogle(res, true);
      } else if (prevSignature !== currentSignature) {
        // Reservation was modified!
        knownSignaturesRef.current.set(res.id, currentSignature);
        syncReservationToGoogle(res, false);
      }
    });

    // Cleanup removed reservations
    const currentIds = new Set(reservations.map((r) => r.id));
    for (const id of knownSignaturesRef.current.keys()) {
      if (!currentIds.has(id)) {
        knownSignaturesRef.current.delete(id);
      }
    }
  }, [reservations, enabled, syncReservationToGoogle]);

  return {
    syncReservationToGoogle,
  };
}
