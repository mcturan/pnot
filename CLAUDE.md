# PNOT — CLAUDE.md

## Proje Özeti
**PNOT** (pnot.app) — Takımlar için proje not defteri. WhatsApp/Telegram'da kaybolan proje detaylarını, görevleri ve kararları organize eder.

**Dizin:** `/home/turan/pnot-project`
**Dev server:** `cd apps/web && npm run dev` → http://localhost:3000
**GitHub:** https://github.com/mcturan/pnot

---

## Mimari

### Stack
- **Web:** Next.js 14.2.5 (App Router), Tailwind CSS, TypeScript
- **Mobile:** Expo + React Native (`@react-native-firebase/*`)
- **Backend:** Firebase (Firestore, Auth, Cloud Functions v2, FCM, Storage)
- **Monorepo:** `packages/shared` → `@pnot/shared` (ortak TypeScript tipleri)

### Dizin Yapısı
```
pnot-project/
├── apps/
│   ├── web/          ← Next.js 14 + Tailwind
│   └── mobile/       ← Expo + React Native
├── packages/
│   └── shared/       ← Ortak tipler (Project, Page, Note, Invite...)
├── firebase/
│   ├── functions/    ← Cloud Functions v2 (TypeScript)
│   ├── firestore.rules
│   ├── storage.rules
│   ├── firestore.indexes.json
│   └── firebase.json
├── CLAUDE.md
└── SETUP.md
```

---

## Veri Modeli (Firestore)

```
projects/{projectId}
  ├── name, description, emoji, color
  ├── ownerUid, members[{uid, displayName, photoURL, role}]
  ├── isArchived: boolean
  └── createdAt

projects/{projectId}/pages/{pageId}
  ├── title, icon, order
  └── createdBy, createdAt

projects/{projectId}/pages/{pageId}/notes/{noteId}
  ├── content (string)
  ├── authorUid, authorName, authorPhoto
  ├── parentNoteId: null | string   ← null = root, string = thread reply
  ├── isPinned: boolean
  ├── isTask: boolean
  ├── taskStatus: 'todo' | 'doing' | 'done'
  ├── assignedTo: string[]
  ├── replyCount: number
  └── createdAt, updatedAt

invites/{token}
  ├── projectId, projectName, projectEmoji
  ├── role: 'owner' | 'editor' | 'viewer'
  ├── createdBy, createdByName
  └── expiresAt (7 gün)

users/{uid}
  ├── displayName, email, photoURL
  ├── plan: 'free' | 'pro'
  └── createdAt

fcmTokens/{uid}
  └── token (FCM push token)
```

---

## Cloud Functions (firebase/functions/src/index.ts)

| Function | Açıklama |
|----------|----------|
| `createInvite` | Proje sahibi çağırır, 7 günlük davet token'ı oluşturur |
| `acceptInvite` | Davet linki ile üyeliği onaylar, projeye ekler |
| `onNoteCreated` | Yeni not yazıldığında diğer üyelere FCM push gönderir |
| `checkProjectLimit` | Ücretsiz plan: max 5 proje kontrolü |

---

## İş Mantığı

### Ücretsiz Plan Limiti
- `FREE_PROJECT_LIMIT = 5` (`packages/shared/src/types.ts`)
- `checkProjectLimit` Cloud Function server-side doğrular
- Client-side `ownedCount >= FREE_PROJECT_LIMIT` kontrolü ile UI engeller

### Note Thread Sistemi
- `parentNoteId: null` → root not
- `parentNoteId: "someNoteId"` → thread yanıtı
- UI'da derinlik 2-3 seviyede sınırlandırılmalı (okunabilirlik)

### Görev (Task) Sistemi
- Her not göreve dönüştürülebilir: `isTask: true`
- Durum sırası: `todo → doing → done` (tıklayarak değişir)
- Kanban view: sayfanın görev notlarını kolona göre grupla

### Davet Sistemi
- Sadece proje sahibi davet linki oluşturabilir
- Link: `pnot.app/dashboard/invite/{token}`
- Token 7 gün geçerli

---

## Kritik Notlar

### Tuzaklar
- `next.config.ts` Next.js 14.2.5'te desteklenmiyor → `.mjs` kullan
- `postcss.config.js` olmadan Tailwind çalışmıyor
- Mobile'da `@react-native-firebase/*` kullanılıyor (web'deki JS SDK değil)
- Firestore rules: `members.map(m, m.uid)` syntax'ı dikkatli kullan

### Ortam Değişkenleri
- `apps/web/.env.local` → Firebase config + `NEXT_PUBLIC_APP_URL`
- Hiçbir `.env` dosyası commit'lenmez!

---

## Tamamlanan İşler (2026-03-18)

- Monorepo yapısı kuruldu
- Ortak TypeScript tipleri (`@pnot/shared`)
- Firebase: Firestore rules, Storage rules, indexes, Cloud Functions v2
- Web: Landing, Login (Google Auth), Dashboard (proje listesi), Proje sayfası, Sayfa görünümü (notlar + thread + görev), Davet linki kabul sayfası
- Mobile: Expo skeleton, Google Auth, Proje listesi ekranı

---

## Sonraki Adımlar

### Öncelikli
1. Firebase projesi oluştur (console.firebase.google.com) → `.env.local` doldur
2. `firebase deploy --only firestore:rules,functions`
3. `cd apps/web && npm install && npm run dev`
4. Kanban view ekle (görevleri kolona göre grupla)
5. @mention sistemi

### İleride
- iOS/Android build (EAS)
- Pro plan + Stripe/RevenueCat ödeme entegrasyonu
- Medya ekleme (Firebase Storage, pro only)
- AI özeti ("Bu projedeki son 7 günü özetle")
- PWA manifest + offline destek
