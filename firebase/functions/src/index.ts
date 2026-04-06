/**
 * PNOT Cloud Functions — Standalone Entry Point
 * FAZ-08: PNOT artık bağımsız Firebase Functions'a sahip.
 * handlePnot qrvee'den kaldırıldı, buraya taşındı.
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions/v2';
import {
  handleSessionStarted,
  handleSessionEnded,
  handleQsoLogged,
  handleBroadcastSent,
} from './events/handlers/qrveeEvents';

admin.initializeApp();

const db = admin.firestore();

/**
 * PNOT Event Consumer — events_qrvee dinler
 * Bu fonksiyon qrvee'deki Router CF'nin çağırdığı handlePnot'un yerine geçer.
 * LAW-005: Direkt API çağrısı yok — sadece Firestore event okur.
 */
export const processPnotEvent = functions.https.onCall(
  { region: 'us-central1' },
  async (request): Promise<{ status: string }> => {
    if (!request.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Giriş gerekli');
    }

    const { eventId, eventType, userId, payload, clientTime } = request.data as {
      eventId: string;
      eventType: string;
      userId: string;
      payload: Record<string, unknown>;
      clientTime: string;
    };

    if (!eventId || !eventType || !userId) {
      throw new functions.https.HttpsError('invalid-argument', 'eventId, eventType, userId zorunlu');
    }

    switch (eventType) {
      case 'session.started':
        await handleSessionStarted(eventId, userId, payload, clientTime);
        break;
      case 'session.ended':
        await handleSessionEnded(eventId, userId, payload, clientTime);
        break;
      case 'qso.logged':
        await handleQsoLogged(eventId, userId, payload, clientTime);
        break;
      case 'broadcast.sent':
        await handleBroadcastSent(eventId, userId, payload, clientTime);
        break;
      default:
        // Bilinmeyen event tipi — skip, hata değil
        return { status: 'skipped' };
    }

    return { status: 'done' };
  }
);

/**
 * PNOT Notes okuma — kullanıcının notlarını listeler
 */
export const getPnotNotes = functions.https.onCall(
  { region: 'us-central1' },
  async (request): Promise<{ notes: unknown[] }> => {
    if (!request.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Giriş gerekli');
    }

    const { limit = 20, type } = request.data as { limit?: number; type?: string };

    let query = db
      .collection('pnot_notes')
      .where('userId', '==', request.auth.uid)
      .orderBy('createdAt', 'desc')
      .limit(Math.min(limit, 100));

    if (type) {
      query = db
        .collection('pnot_notes')
        .where('userId', '==', request.auth.uid)
        .where('type', '==', type)
        .orderBy('createdAt', 'desc')
        .limit(Math.min(limit, 100));
    }

    const snap = await query.get();
    return { notes: snap.docs.map(d => ({ id: d.id, ...d.data() })) };
  }
);
