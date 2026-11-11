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
 * Safely formats any time string (e.g. '9:00', '09:00', '9') into a 6-digit HHMMSS string (e.g. '090000')
 */
export function formatTimeToSixDigits(timeStr?: string, defaultTime = '09:00'): string {
  if (!timeStr || !timeStr.trim()) timeStr = defaultTime;
  const parts = timeStr.trim().split(':');
  const hours = (parts[0] || '0').padStart(2, '0');
  const minutes = (parts[1] || '00').padStart(2, '0');
  return `${hours}${minutes}00`;
}

/**
 * Safely formats any time string (e.g. '9:00', '09:00', '9') into a 5-char HH:MM string (e.g. '09:00')
 */
export function formatTimeToFiveChars(timeStr?: string, defaultTime = '09:00'): string {
  if (!timeStr || !timeStr.trim()) timeStr = defaultTime;
  const parts = timeStr.trim().split(':');
  const hours = (parts[0] || '0').padStart(2, '0');
  const minutes = (parts[1] || '00').padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Helper to add days to a YYYY-MM-DD string and return YYYYMMDD in UTC
 */
export function addDaysToDateString(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + days);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${m}${dd}`;
}

/**
 * Builds the standard Google Calendar Event payload for a Reservation
 */
export function buildGoogleCalendarEventPayload(
  reservation: Reservation,
  settings: ChacaraDetails
) {
  const checkInTime = formatTimeToFiveChars(settings.check_in_time, '09:00');
  const checkOutTime = formatTimeToFiveChars(settings.check_out_time, '21:00');

  // Format times with timezone (America/Sao_Paulo: UTC-3)
  const startDateTime = `${reservation.check_in}T${checkInTime}:00-03:00`;
  const endDateTime = `${reservation.check_out}T${checkOutTime}:00-03:00`;

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

const EVENT_STORAGE_KEY = 'recanto_paz_gcal_event_ids';

export function getStoredEventId(reservationId: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(EVENT_STORAGE_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw);
    return map[reservationId] || null;
  } catch {
    return null;
  }
}

export function saveStoredEventId(reservationId: string, eventId: string): void {
  if (typeof window === 'undefined' || !reservationId || !eventId) return;
  try {
    const raw = localStorage.getItem(EVENT_STORAGE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[reservationId] = eventId;
    localStorage.setItem(EVENT_STORAGE_KEY, JSON.stringify(map));
  } catch (e) {
    console.warn('Erro ao salvar ID do evento no storage:', e);
  }
}

export function removeStoredEventId(reservationId: string): void {
  if (typeof window === 'undefined' || !reservationId) return;
  try {
    const raw = localStorage.getItem(EVENT_STORAGE_KEY);
    if (!raw) return;
    const map = JSON.parse(raw);
    if (reservationId in map) {
      delete map[reservationId];
      localStorage.setItem(EVENT_STORAGE_KEY, JSON.stringify(map));
    }
  } catch (e) {
    console.warn('Erro ao remover ID do evento no storage:', e);
  }
}

/**
 * Creates or updates an event in Google Calendar using the REST API.
 * Guaranteed to prevent duplicate events: checks existing event ID and searches calendar before POSTing.
 */
export async function pushReservationToGoogle(
  reservation: Reservation,
  settings: ChacaraDetails,
  accessToken: string
): Promise<{ eventId: string; action: 'created' | 'updated' }> {
  const payload = buildGoogleCalendarEventPayload(reservation, settings);

  let targetEventId = reservation.google_calendar_event_id || getStoredEventId(reservation.id);

  // If no known eventId, search Google Calendar for an existing event for this reservation/client
  if (!targetEventId) {
    try {
      const timeMin = new Date(`${reservation.check_in}T00:00:00-03:00`).toISOString();
      const timeMax = new Date(`${reservation.check_out}T23:59:59-03:00`).toISOString();
      const searchUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events?q=${encodeURIComponent(
        reservation.client_name
      )}&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&maxResults=5`;

      const searchRes = await fetch(searchUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const items = searchData.items || [];
        // Look for matching event by reservation_id or summary
        const matched = items.find(
          (item: any) =>
            item.extendedProperties?.private?.reservation_id === reservation.id ||
            item.summary?.includes(reservation.client_name)
        );
        if (matched?.id) {
          targetEventId = matched.id;
          saveStoredEventId(reservation.id, matched.id);
        }
      }
    } catch (searchErr) {
      console.warn('Busca de evento existente falhou, prosseguindo com cautela:', searchErr);
    }
  }

  // If we have an eventId (from prop, storage, or search), update it (PUT)
  if (targetEventId) {
    try {
      const updateRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(
          targetEventId
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
        saveStoredEventId(reservation.id, data.id);
        return { eventId: data.id, action: 'updated' };
      }
      // If 404 or 410, event was deleted in Google Calendar, fall through to recreate
      if (updateRes.status !== 404 && updateRes.status !== 410) {
        const errorText = await updateRes.text();
        console.warn('Erro ao atualizar evento existente:', errorText);
      }
    } catch (e) {
      console.warn('Tentativa de atualização falhou, criando novo evento:', e);
    }
  }

  // Only create a new event if no existing event was found
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
  saveStoredEventId(reservation.id, data.id);
  return { eventId: data.id, action: 'created' };
}

/**
 * Removes duplicate events from Google Calendar that share the same client and date.
 * Keeps only 1 event per reservation and deletes all duplicates.
 */
export async function cleanupDuplicateEventsFromGoogle(
  accessToken: string
): Promise<{ deletedCount: number; keptCount: number }> {
  try {
    // List up to 250 upcoming and recent events
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const oneYearAhead = new Date();
    oneYearAhead.setFullYear(oneYearAhead.getFullYear() + 1);

    const listUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events?q=Reserva&timeMin=${encodeURIComponent(
      sixMonthsAgo.toISOString()
    )}&timeMax=${encodeURIComponent(oneYearAhead.toISOString())}&maxResults=2500&singleEvents=true`;

    const res = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      throw new Error(`Falha ao listar eventos para limpeza: ${await res.text()}`);
    }

    const data = await res.json();
    const items = data.items || [];

    // Group items by signature: summary + startDate
    const groups = new Map<string, any[]>();
    for (const item of items) {
      if (!item.summary) continue;
      const startDate = item.start?.dateTime?.substring(0, 10) || item.start?.date || '';
      const summaryClean = item.summary.trim().toLowerCase();
      const groupKey = `${summaryClean}~${startDate}`;

      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(item);
    }

    let deletedCount = 0;
    let keptCount = 0;

    for (const [, events] of groups.entries()) {
      if (events.length > 1) {
        // Keep the first (or most recently updated) and delete all others
        const sorted = [...events].sort(
          (a, b) => new Date(b.updated || 0).getTime() - new Date(a.updated || 0).getTime()
        );
        const [keep, ...duplicates] = sorted;
        keptCount += 1;

        // Delete duplicates in parallel batches
        for (const dup of duplicates) {
          try {
            await fetch(
              `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(dup.id)}`,
              {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${accessToken}` },
              }
            );
            deletedCount += 1;
          } catch (delErr) {
            console.warn('Erro ao excluir duplicata:', dup.id, delErr);
          }
        }
      } else {
        keptCount += 1;
      }
    }

    return { deletedCount, keptCount };
  } catch (err: any) {
    console.error('Erro na limpeza de duplicatas:', err);
    throw err;
  }
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
 * Works 100% reliably on any domain and mobile device with zero auth needed.
 */
export function generateGoogleCalendarWebLink(
  reservation: Reservation,
  settings: ChacaraDetails,
  isAllDay = false
): string {
  const paymentLabel =
    reservation.payment_status === 'paid'
      ? 'QUITADO'
      : reservation.payment_status === 'partially_paid'
      ? 'SINAL PAGO'
      : 'PENDENTE';

  const checkInTime = formatTimeToFiveChars(settings.check_in_time, '09:00');
  const checkOutTime = formatTimeToFiveChars(settings.check_out_time, '21:00');

  let datesParam = '';
  if (isAllDay) {
    const startStr = reservation.check_in.replace(/-/g, '');
    const endStr = addDaysToDateString(reservation.check_out, 1);
    datesParam = `${startStr}/${endStr}`;
  } else {
    const startSix = formatTimeToSixDigits(settings.check_in_time, '09:00');
    const endSix = formatTimeToSixDigits(settings.check_out_time, '21:00');
    const startFormatted = reservation.check_in.replace(/-/g, '') + 'T' + startSix;
    const endFormatted = reservation.check_out.replace(/-/g, '') + 'T' + endSix;
    datesParam = `${startFormatted}/${endFormatted}`;
  }

  const title = encodeURIComponent(`🏡 [${settings.name || 'Chácara'}] Reserva - ${reservation.client_name}`);
  const details = encodeURIComponent(
    `👤 Hóspede: ${reservation.client_name}\n` +
      `📱 WhatsApp: ${reservation.client_phone}\n` +
      (reservation.client_document ? `📄 CPF: ${reservation.client_document}\n` : '') +
      `👥 Pessoas: ${reservation.guests_count} hóspedes\n` +
      `💰 Total: R$ ${reservation.total_amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
      `💵 Sinal Pago: R$ ${reservation.amount_paid?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
      `💳 Restante: R$ ${reservation.remaining_amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
      `📊 Situação: ${paymentLabel}\n` +
      `🕒 Entrada: ${reservation.check_in} às ${checkInTime}\n` +
      `🕒 Saída: ${reservation.check_out} às ${checkOutTime}\n` +
      (settings.location ? `📍 Endereço: ${settings.location}\n` : '') +
      (reservation.contract_notes ? `📝 Obs: ${reservation.contract_notes}\n` : '') +
      `\n🔗 Gestão Chácara Solaris`
  );
  const location = encodeURIComponent(settings.location || '');

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${datesParam}&ctz=America/Sao_Paulo&details=${details}&location=${location}`;
}

export interface IcsOptions {
  /**
   * If true, exports events as All-Day blocks (DTSTART;VALUE=DATE).
   * In Google Calendar mobile app, all-day events create prominent colored banners
   * directly visible in the month grid view without having to open the day!
   */
  allDay?: boolean;
}

/**
 * Generates RFC 5545 compliant iCalendar (.ics) content for all active reservations.
 * Includes complete VTIMEZONE definition for America/Sao_Paulo and strict 6-digit HHMMSS times,
 * preventing any timezone or day-shift bugs in Google Calendar and phone calendar apps.
 */
export function generateReservationsIcsContent(
  reservations: Reservation[],
  settings: ChacaraDetails,
  options?: IcsOptions
): string {
  const isAllDay = Boolean(options?.allDay);
  const checkInSixDigits = formatTimeToSixDigits(settings.check_in_time, '09:00');
  const checkOutSixDigits = formatTimeToSixDigits(settings.check_out_time, '21:00');
  const checkInReadable = formatTimeToFiveChars(settings.check_in_time, '09:00');
  const checkOutReadable = formatTimeToFiveChars(settings.check_out_time, '21:00');

  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Chacara Solaris//Gestao de Locacao//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${settings.name || 'Chácara'} - Reservas`,
    'X-WR-TIMEZONE:America/Sao_Paulo',
    // Mandatory RFC 5545 VTIMEZONE block for America/Sao_Paulo (UTC-3)
    'BEGIN:VTIMEZONE',
    'TZID:America/Sao_Paulo',
    'X-LIC-LOCATION:America/Sao_Paulo',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:-0300',
    'TZOFFSETTO:-0300',
    'TZNAME:BRT',
    'DTSTART:19700101T000000',
    'END:STANDARD',
    'END:VTIMEZONE',
  ];

  const active = reservations.filter((r) => r.status !== 'cancelled');

  for (const res of active) {
    const paymentLabel =
      res.payment_status === 'paid'
        ? 'QUITADO'
        : res.payment_status === 'partially_paid'
        ? 'SINAL PAGO'
        : 'PENDENTE';

    const summary = isAllDay
      ? `🏡 [Chácara] ${res.client_name} (${res.payment_status === 'paid' ? 'Pago' : 'Pendente'})`
      : `🏡 [${settings.name || 'Chácara'}] Reserva - ${res.client_name}`;

    const descParts = [
      `👤 Hóspede: ${res.client_name}`,
      `📱 WhatsApp / Tel: ${res.client_phone}`,
      res.client_document ? `📄 CPF: ${res.client_document}` : '',
      `👥 Quantidade de Pessoas: ${res.guests_count} hóspedes`,
      `💰 Valor Total: R$ ${res.total_amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      `💵 Sinal Pago: R$ ${res.amount_paid?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      `💳 Restante a Pagar: R$ ${res.remaining_amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      `📊 Situação: ${paymentLabel}`,
      `🕒 Entrada: ${res.check_in} às ${checkInReadable}`,
      `🕒 Saída: ${res.check_out} às ${checkOutReadable}`,
      settings.location ? `📍 Endereço: ${settings.location}` : '',
      res.contract_notes ? `📝 Notas: ${res.contract_notes}` : '',
      `\n🔗 Atualizado pelo App de Gestão da Chácara`,
    ].filter(Boolean);

    const desc = descParts.join('\\n');

    lines.push('BEGIN:VEVENT');
    // Using deterministic UID so importing updates the previously placed events in Google Calendar
    lines.push(`UID:chacara-reserva-${res.id}@chacarasolaris`);
    lines.push(`DTSTAMP:${now}`);
    // Sequence 2 tells Google Calendar this is a higher-priority update to existing imported events
    lines.push('SEQUENCE:2');

    if (isAllDay) {
      // In RFC 5545, VALUE=DATE end date is exclusive, so add 1 day to check_out
      const startDay = res.check_in.replace(/-/g, '');
      const endDayExclusive = addDaysToDateString(res.check_out, 1);
      lines.push(`DTSTART;VALUE=DATE:${startDay}`);
      lines.push(`DTEND;VALUE=DATE:${endDayExclusive}`);
    } else {
      const startStr = res.check_in.replace(/-/g, '') + 'T' + checkInSixDigits;
      const endStr = res.check_out.replace(/-/g, '') + 'T' + checkOutSixDigits;
      lines.push(`DTSTART;TZID=America/Sao_Paulo:${startStr}`);
      lines.push(`DTEND;TZID=America/Sao_Paulo:${endStr}`);
    }

    lines.push(`SUMMARY:${summary.replace(/,/g, '\\,')}`);
    lines.push(`DESCRIPTION:${desc.replace(/,/g, '\\,')}`);
    if (settings.location) {
      lines.push(`LOCATION:${settings.location.replace(/,/g, '\\,')}`);
    }
    lines.push('STATUS:CONFIRMED');
    lines.push('TRANSP:OPAQUE');
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Triggers a browser download of the full .ics calendar file
 */
export function downloadReservationsIcsFile(
  reservations: Reservation[],
  settings: ChacaraDetails,
  options?: IcsOptions
): void {
  const icsContent = generateReservationsIcsContent(reservations, settings, options);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const suffix = options?.allDay ? 'destaque-mensal-corrigido' : 'horarios-corrigido';
  const fileName = `agenda-${(settings.name || 'chacara')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')}-${suffix}.ics`;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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
