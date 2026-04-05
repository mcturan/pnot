/**
 * PNOT — QRVEE Event Consumer
 *
 * Bu handler qrvee'nin events_qrvee koleksiyonundaki eventleri tüketir.
 * Kaynak: qrvee/firebase/functions/src/events/handlers/pnot.ts
 *
 * LAW-005: Bu handler QRVEE'ye doğrudan API çağrısı yapamaz.
 * Tüm veri events_qrvee üzerinden gelir.
 */

import * as admin from 'firebase-admin';
import { PnotNote } from '../../types';

const db = admin.firestore();

/**
 * session.started → pnot_notes kaydı
 */
export async function handleSessionStarted(
  eventId: string,
  userId: string,
  payload: Record<string, unknown>,
  clientTime: string
): Promise<void> {
  // Deduplication kontrolü
  const existing = await db
    .collection('pnot_notes')
    .where('sourceEventId', '==', eventId)
    .limit(1)
    .get();

  if (!existing.empty) return; // Zaten işlenmiş

  const note: Omit<PnotNote, 'id'> = {
    userId,
    sourceEventId: eventId,
    title: `QRV: ${payload.callsign} — ${payload.band || payload.mode || 'Aktif'}`,
    body: buildSessionBody(payload),
    type: 'session_start',
    sourceApp: 'qrvee',
    eventType: 'session.started',
    sessionCallsign: payload.callsign as string,
    sessionBand: payload.band as string | null,
    sessionMode: payload.mode as string | null,
    radiusKm: payload.radiusKm as number | null,
    createdAt: admin.firestore.FieldValue.serverTimestamp() as FirebaseFirestore.Timestamp,
    clientTime,
  };

  await db.collection('pnot_notes').add(note);
}

/**
 * qso.logged → pnot_notes kaydı
 */
export async function handleQsoLogged(
  eventId: string,
  userId: string,
  payload: Record<string, unknown>,
  clientTime: string
): Promise<void> {
  const existing = await db
    .collection('pnot_notes')
    .where('sourceEventId', '==', eventId)
    .limit(1)
    .get();

  if (!existing.empty) return;

  const note: Omit<PnotNote, 'id'> = {
    userId,
    sourceEventId: eventId,
    title: `QSO: ${payload.callsign} — ${payload.band || ''} ${payload.mode || ''}`.trim(),
    body: buildQsoBody(payload),
    type: 'qso_contact',
    sourceApp: 'qrvee',
    eventType: 'qso.logged',
    callsign: payload.callsign as string,
    band: payload.band as string | null,
    mode: payload.mode as string | null,
    frequencyMHz: payload.frequencyMHz as number | null,
    createdAt: admin.firestore.FieldValue.serverTimestamp() as FirebaseFirestore.Timestamp,
    clientTime,
  };

  await db.collection('pnot_notes').add(note);
}

function buildSessionBody(payload: Record<string, unknown>): string {
  const parts: string[] = [];
  if (payload.callsign) parts.push(`Çağrı: ${payload.callsign}`);
  if (payload.band) parts.push(`Bant: ${payload.band}`);
  if (payload.mode) parts.push(`Mod: ${payload.mode}`);
  if (payload.frequencyMHz) parts.push(`Frekans: ${payload.frequencyMHz} MHz`);
  if (payload.city) parts.push(`Konum: ${payload.city}`);
  if (payload.radiusKm) parts.push(`Yarıçap: ${payload.radiusKm} km`);
  if (payload.note) parts.push(`Not: ${payload.note}`);
  return parts.join('\n');
}

function buildQsoBody(payload: Record<string, unknown>): string {
  const parts: string[] = [];
  if (payload.callsign) parts.push(`Karşı: ${payload.callsign}`);
  if (payload.frequencyMHz) parts.push(`Frekans: ${payload.frequencyMHz} MHz`);
  if (payload.band) parts.push(`Bant: ${payload.band}`);
  if (payload.mode) parts.push(`Mod: ${payload.mode}`);
  if (payload.rstSent) parts.push(`RST Gönderilen: ${payload.rstSent}`);
  if (payload.rstReceived) parts.push(`RST Alınan: ${payload.rstReceived}`);
  if (payload.notes) parts.push(`Not: ${payload.notes}`);
  return parts.join('\n');
}
