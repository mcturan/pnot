/**
 * PNOT Types — TINC event consumer için veri tipleri
 * Kaynak: TINC MASTER_SPEC.md + EVENT_CONTRACTS.md
 */

export interface PnotNote {
  // Identity
  id: string;                    // Firestore doc ID
  userId: string;                // Firebase Auth UID
  sourceEventId: string;         // events_qrvee/{eventId} — deduplication key

  // Content
  title: string;                 // Otomatik üretilen başlık
  body: string;                  // Not içeriği
  type: PnotNoteType;            // Notun tipi

  // Metadata
  sourceApp: 'qrvee' | 'pnot';  // Hangi uygulama üretti
  eventType: string;             // Tetikleyen event tipi (session.started vs)

  // QSO specific (qso.logged eventlerinden)
  callsign?: string | null;
  band?: string | null;
  mode?: string | null;
  frequencyMHz?: number | null;

  // Session specific (session.started eventlerinden)
  sessionCallsign?: string | null;
  sessionBand?: string | null;
  sessionMode?: string | null;
  radiusKm?: number | null;

  // Timestamps
  createdAt: FirebaseFirestore.Timestamp;
  clientTime: string;            // ISO 8601 — orijinal event zamanı
}

export type PnotNoteType =
  | 'qso_contact'      // qso.logged
  | 'session_start'    // session.started
  | 'session_end'      // session.ended
  | 'broadcast'        // broadcast.sent
  | 'streak_milestone' // note.streak.reached
  | 'manual';          // Kullanıcı manuel oluşturdu
