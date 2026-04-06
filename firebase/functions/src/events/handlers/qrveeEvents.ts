/**
 * PNOT — QRVEE Event Consumer (Standalone)
 * Bu dosya qrvee/firebase/functions/src/events/handlers/pnot.ts'den taşındı.
 * FAZ-08: PNOT artık kendi Firebase Functions'ında çalışır.
 * LAW-005: QRVEE'ye doğrudan API çağrısı yapılmaz — events_qrvee üzerinden.
 * LAW-006: events_qrvee immutable — sadece okunur.
 */

import * as admin from 'firebase-admin';

const db = admin.firestore();

interface QrveeEventPayload {
  callsign?: string;
  band?: string | null;
  mode?: string | null;
  frequencyMHz?: number | null;
  city?: string | null;
  radiusKm?: number | null;
  note?: string | null;
  sessionId?: string;
  startedAt?: string;
  endedAt?: string;
  reason?: string;
  logbookId?: string;
  rstSent?: string | null;
  rstReceived?: string | null;
  datetimeMs?: number;
  notes?: string | null;
  streakDays?: number;
  noteCount?: number;
  lastNoteDate?: string;
}

/**
 * Deduplication kontrolü — sourceEventId ile daha önce işlenmiş mi?
 */
async function isDuplicate(sourceEventId: string): Promise<boolean> {
  const existing = await db
    .collection('pnot_notes')
    .where('sourceEventId', '==', sourceEventId)
    .limit(1)
    .get();
  return !existing.empty;
}

/**
 * session.started → pnot_notes
 */
export async function handleSessionStarted(
  eventId: string,
  userId: string,
  payload: QrveeEventPayload,
  clientTime: string
): Promise<void> {
  if (await isDuplicate(eventId)) return;

  const parts: string[] = [];
  if (payload.callsign) parts.push(`Çağrı: ${payload.callsign}`);
  if (payload.band) parts.push(`Bant: ${payload.band}`);
  if (payload.mode) parts.push(`Mod: ${payload.mode}`);
  if (payload.frequencyMHz) parts.push(`Frekans: ${payload.frequencyMHz} MHz`);
  if (payload.city) parts.push(`Konum: ${payload.city}`);
  if (payload.radiusKm) parts.push(`Yarıçap: ${payload.radiusKm} km`);
  if (payload.note) parts.push(`Not: ${payload.note}`);

  await db.collection('pnot_notes').add({
    userId,
    sourceEventId: eventId,
    title: `QRV: ${payload.callsign ?? '?'} — ${payload.band ?? payload.mode ?? 'Aktif'}`,
    body: parts.join('\n'),
    type: 'session_start',
    sourceApp: 'qrvee',
    eventType: 'session.started',
    sessionCallsign: payload.callsign ?? null,
    sessionBand: payload.band ?? null,
    sessionMode: payload.mode ?? null,
    radiusKm: payload.radiusKm ?? null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    clientTime,
  });
}

/**
 * session.ended → pnot_notes (duration kaydı)
 */
export async function handleSessionEnded(
  eventId: string,
  userId: string,
  payload: QrveeEventPayload,
  clientTime: string
): Promise<void> {
  if (await isDuplicate(eventId)) return;

  const startMs = payload.startedAt ? new Date(payload.startedAt).getTime() : null;
  const endMs = payload.endedAt ? new Date(payload.endedAt).getTime() : null;
  const durationMin = startMs && endMs ? Math.round((endMs - startMs) / 60000) : null;

  await db.collection('pnot_notes').add({
    userId,
    sourceEventId: eventId,
    title: `QRV Bitti: ${payload.callsign ?? '?'}${durationMin ? ` (${durationMin} dk)` : ''}`,
    body: [
      payload.callsign ? `Çağrı: ${payload.callsign}` : null,
      payload.startedAt ? `Başlangıç: ${payload.startedAt}` : null,
      payload.endedAt ? `Bitiş: ${payload.endedAt}` : null,
      durationMin ? `Süre: ${durationMin} dakika` : null,
      payload.reason ? `Neden: ${payload.reason}` : null,
    ].filter(Boolean).join('\n'),
    type: 'session_end',
    sourceApp: 'qrvee',
    eventType: 'session.ended',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    clientTime,
  });
}

/**
 * qso.logged → pnot_notes
 */
export async function handleQsoLogged(
  eventId: string,
  userId: string,
  payload: QrveeEventPayload,
  clientTime: string
): Promise<void> {
  if (await isDuplicate(eventId)) return;

  await db.collection('pnot_notes').add({
    userId,
    sourceEventId: eventId,
    title: `QSO: ${payload.callsign ?? '?'} — ${payload.band ?? ''} ${payload.mode ?? ''}`.trim(),
    body: [
      payload.callsign ? `Karşı: ${payload.callsign}` : null,
      payload.frequencyMHz ? `Frekans: ${payload.frequencyMHz} MHz` : null,
      payload.band ? `Bant: ${payload.band}` : null,
      payload.mode ? `Mod: ${payload.mode}` : null,
      payload.rstSent ? `RST Gönderilen: ${payload.rstSent}` : null,
      payload.rstReceived ? `RST Alınan: ${payload.rstReceived}` : null,
      payload.notes ? `Not: ${payload.notes}` : null,
    ].filter(Boolean).join('\n'),
    type: 'qso_contact',
    sourceApp: 'qrvee',
    eventType: 'qso.logged',
    callsign: payload.callsign ?? null,
    band: payload.band ?? null,
    mode: payload.mode ?? null,
    frequencyMHz: payload.frequencyMHz ?? null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    clientTime,
  });
}

/**
 * broadcast.sent → pnot_notes
 */
export async function handleBroadcastSent(
  eventId: string,
  userId: string,
  payload: QrveeEventPayload,
  clientTime: string
): Promise<void> {
  if (await isDuplicate(eventId)) return;

  await db.collection('pnot_notes').add({
    userId,
    sourceEventId: eventId,
    title: 'Yayın Mesajı Gönderildi',
    body: payload.note ?? '',
    type: 'broadcast',
    sourceApp: 'qrvee',
    eventType: 'broadcast.sent',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    clientTime,
  });
}
