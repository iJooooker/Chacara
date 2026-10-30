import { Reservation, ChacaraDetails } from '../types';

export interface SyncResult {
  success: boolean;
  total: number;
  synced: number;
  failed: number;
  events: Array<{
    reservationId: string;
    clientName: string;
    eventId: string;
    action: 'created' | 'updated';
    dates: string;
  }>;
  errors?: string[];
}

export interface ICalEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  description: string;
  isChacaraReservation?: boolean;
}

/**
 * Builds the standard Google Calendar Event payload for a Reservation
 */
export function buildGoogleCalendarEventPayload(
  reservation: Reservation,
  settings: ChacaraDetails
) {
  const checkInTime = settings.check_in_time || '09:00';
  const checkOutTime = settings.check_out_time || '21:00';

  // Format times with timezone (America/Sao_Paulo: UTC-3)
  const startDateTime = `${reservation.check_in}T${checkInTime.padStart(5, '0')}:00-03:00`;
  const endDateTime = `${reservation.check_out}T${checkOutTime.padStart(5, '0')}:00-03:00`;

  const paymentLabel =
    reservation.payment_status === 'paid'
      ? '✅ QUITADO'
      : reservation.payment_status === 'partially_paid'
      ? '⏳ SINAL PAGO (Pendente Restante)'
      : '⚠️ PENDENTE';

  const statusLabel =
    reservation.status === 'confirmed'
      ? 'CONFIRMADA'
      : reservation.status === 'in_progress'
      ? 'EM ANDAMENTO (Hóspedes na Chácara)'
      : reservation.status === 'completed'
      ? 'FINALIZADA'
      : 'CANCELADA';

  const summary = `🏡 [${settings.name || 'Chácara'}] Reserva - ${reservation.client_name}`;

  const description = [
    `🏡 GESTÃO DA CHÁCARA - RESERVA ${statusLabel}`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `👤 Hóspede: ${reservation.client_name}`,
    `📱 WhatsApp / Tel: ${reservation.client_phone}`,
    reservation.client_document ? `📄 CPF/Doc: ${reservation.client_document}` : '',
    `👥 Quantidade de Pessoas: ${reservation.guests_count} hóspedes`,
    `💰 Valor Total: R$ ${reservation.total_amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
    `💵 Sinal Pago: R$ ${reservation.amount_paid?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
    `💳 Restante a Pagar: R$ ${reservation.remaining_amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
    `📊 Situação: ${paymentLabel}`,
    `🕒 Check-in: ${reservation.check_in} às ${checkInTime}`,
    `🕒 Check-out: ${reservation.check_out} às ${checkOutTime}`,
    settings.location ? `📍 Endereço: ${settings.location}` : '',
    settings.caretaker_name ? `🔑 Caseiro: ${settings.caretaker_name} (${settings.caretaker_phone || ''})` : '',
    reservation.contract_notes ? `📝 Notas / Observações: ${reservation.contract_notes}` : '',
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Sincronizado automaticamente pelo App de Gestão da Chácara.`,
  ]
    .filter(Boolean)
    .join('\n');

  return {
    summary,
    description,
    location: settings.location || '',
    start: {
      dateTime: startDateTime,
      timeZone: 'America/Sao_Paulo',
    },
    end: {
      dateTime: endDateTime,
      timeZone: 'America/Sao_Paulo',
    },
    colorId: reservation.payment_status === 'paid' ? '10' : '5', // 10 is Green (Basil), 5 is Yellow (Banana) in Google Calendar
    transparency: 'opaque',
    extendedProperties: {
      private: {
        chacara_app: 'chacara_solaris',
        reservation_id: reservation.id,
        client_name: reservation.client_name,
        client_phone: reservation.client_phone,
      },
    },
  };
}

/**
 * Creates or updates an event in Google Calendar using the REST API
 */
export async function pushReservationToGoogle(
  reservation: Reservation,
  settings: ChacaraDetails,
  accessToken: string
): Promise<{ eventId: string; action: 'created' | 'updated' }> {
  const payload = buildGoogleCalendarEventPayload(reservation, settings);

  // If we already have a google_calendar_event_id, attempt to update it
  if (reservation.google_calendar_event_id) {
    try {
      const updateRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(
          reservation.google_calendar_event_id
        )}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      if (updateRes.ok) {
        const data = await updateRes.json();
        return { eventId: data.id, action: 'updated' };
      }
      // If 404, event was removed in Google Calendar, so fall through to create a new one
    } catch (e) {
      console.warn('Tentativa de atualização falhou, criando novo evento:', e);
    }
  }

  // Create new event
  const createRes = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  if (!createRes.ok) {
    const errorBody = await createRes.text();
    throw new Error(`Erro ao criar evento no Google Calendar: ${errorBody}`);
  }

  const data = await createRes.json();
  return { eventId: data.id, action: 'created' };
}

/**
 * Removes an event from Google Calendar
 */
export async function removeReservationFromGoogle(
  eventId: string,
  accessToken: string
): Promise<boolean> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    return res.ok || res.status === 404 || res.status === 410;
  } catch (err) {
    console.error('Erro ao deletar evento do Google Calendar:', err);
    return false;
  }
}

/**
 * Syncs all reservations to Google Calendar
 */
export async function syncAllReservationsToGoogle(
  reservations: Reservation[],
  settings: ChacaraDetails,
  accessToken: string
): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    total: reservations.length,
    synced: 0,
    failed: 0,
    events: [],
    errors: [],
  };

  for (const res of reservations) {
    // Skip cancelled reservations if they don't have an event
    if (res.status === 'cancelled' && !res.google_calendar_event_id) {
      continue;
    }

    try {
      const { eventId, action } = await pushReservationToGoogle(res, settings, accessToken);
      result.synced += 1;
      result.events.push({
        reservationId: res.id,
        clientName: res.client_name,
        eventId,
        action,
        dates: `${res.check_in} a ${res.check_out}`,
      });
    } catch (err: any) {
      result.failed += 1;
      result.errors?.push(`${res.client_name}: ${err.message || err}`);
    }
  }

  if (result.failed > 0 && result.synced === 0) {
    result.success = false;
  }

  return result;
}

/**
 * Generates a direct Google Calendar Web Link (action=TEMPLATE)
 * Opens Google Calendar directly in browser/app with everything filled in!
 */
export function generateGoogleCalendarWebLink(
  reservation: Reservation,
  settings: ChacaraDetails
): string {
  const checkInTime = (settings.check_in_time || '09:00').replace(':', '');
  const checkOutTime = (settings.check_out_time || '21:00').replace(':', '');

  const startFormatted = reservation.check_in.replace(/-/g, '') + 'T' + checkInTime.padEnd(6, '0');
  const endFormatted = reservation.check_out.replace(/-/g, '') + 'T' + checkOutTime.padEnd(6, '0');

  const title = encodeURIComponent(`🏡 [${settings.name || 'Chácara'}] Reserva - ${reservation.client_name}`);
  const details = encodeURIComponent(
    `Hóspede: ${reservation.client_name}\nTelefone: ${reservation.client_phone}\nHóspedes: ${reservation.guests_count}\nTotal: R$ ${reservation.total_amount}\nPago: R$ ${reservation.amount_paid}\nRestante: R$ ${reservation.remaining_amount}\nLocal: ${settings.location}`
  );
  const location = encodeURIComponent(settings.location || '');

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startFormatted}/${endFormatted}&details=${details}&location=${location}`;
}

/**
 * Simple parser for .ics files (iCal feed)
 */
export function parseICalEvents(icsData: string): ICalEvent[] {
  const events: ICalEvent[] = [];
  const vevents = icsData.split('BEGIN:VEVENT');
  vevents.shift(); // remove header

  for (const block of vevents) {
    const summaryMatch = block.match(/SUMMARY:(.*)/);
    const descMatch = block.match(/DESCRIPTION:(.*)/);
    const startMatch = block.match(/DTSTART.*:(.*)/);
    const endMatch = block.match(/DTEND.*:(.*)/);
    const uidMatch = block.match(/UID:(.*)/);

    if (summaryMatch && startMatch) {
      const summary = summaryMatch[1].trim().replace(/\\,/g, ',').replace(/\\n/g, ' ');
      const desc = descMatch ? descMatch[1].trim().replace(/\\,/g, ',').replace(/\\n/g, ' ') : '';
      const start = startMatch[1].trim();
      const end = endMatch ? endMatch[1].trim() : start;
      const uid = uidMatch ? uidMatch[1].trim() : Math.random().toString(36).slice(2);

      // Format date for readable display (YYYYMMDD... -> YYYY-MM-DD)
      const cleanStart = start.length >= 8 ? `${start.slice(0, 4)}-${start.slice(4, 6)}-${start.slice(6, 8)}` : start;
      const cleanEnd = end.length >= 8 ? `${end.slice(0, 4)}-${end.slice(4, 6)}-${end.slice(6, 8)}` : end;

      const isChacara = summary.toLowerCase().includes('chácara') ||
        summary.toLowerCase().includes('chacara') ||
        desc.toLowerCase().includes('chácara') ||
        desc.toLowerCase().includes('chacara');

      events.push({
        id: uid,
        title: summary,
        start: cleanStart,
        end: cleanEnd,
        description: desc,
        isChacaraReservation: isChacara,
      });
    }
  }

  return events;
}
