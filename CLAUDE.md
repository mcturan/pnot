# PNOT — CLAUDE.md

## Proje Özeti
**PNOT** (pnot.app) — Takımlar için proje not defteri. WhatsApp/Telegram'da kaybolan proje detaylarını organize eder. Pinocchio karakterleri (Pino/Pina), XP sistemi ve global topluluk ile oyunlaştırılmış.

**Dizin:** `/home/turan/pnot-project`
**Dev server:** `cd apps/web && npm run dev` → http://localhost:3000
**GitHub:** https://github.com/mcturan/pnot

---

## Mimari

### Stack
- **Web:** Next.js 14.2.5 (App Router), Tailwind CSS, TypeScript
- **Mobile:** Expo + React Native (`@react-native-firebase/*`)
- **Backend:** Firebase (Firestore, Auth, Cloud Functions v2, FCM, Storage)
- **i18n:** 10 dil (TR, EN, DE, ES, FR, PT, JA, RU, AR[RTL], ZH)
- **Monorepo:** `packages/shared` → `@pnot/shared`

### Dizin Yapısı
```
pnot-project/
├── apps/
│   ├── web/src/
│   │   ├── app/
│   │   │   ├── page.tsx                      ← Landing (i18n + Pinocchio hero)
│   │   │   ├── community/page.tsx            ← Global topluluk (herkese açık)
│   │   │   ├── auth/login/page.tsx
│   │   │   └── dashboard/
│   │   │       ├── layout.tsx                ← Auth guard + i18n nav
│   │   │       ├── page.tsx                  ← Proje listesi
│   │   │       ├── projects/[projectId]/
│   │   │       │   ├── page.tsx              ← Proje sayfaları
│   │   │       │   └── [pageId]/page.tsx     ← Notlar + thread + görevler
│   │   │       └── invite/[token]/page.tsx
│   │   ├── components/
│   │   │   ├── PinoCharacter.tsx             ← SVG karakter (Pino/Pina, mood, outfit)
│   │   │   ├── PinoHelper.tsx               ← Floating asistan (sağ alt köşe)
│   │   │   └── LanguageSwitcher.tsx
│   │   ├── hooks/useAuth.ts
│   │   └── lib/
│   │       ├── firebase.ts
│   │       ├── auth.ts
│   │       ├── projects.ts
│   │       ├── notes.ts
│   │       └── i18n/
│   │           ├── translations.ts           ← 10 dil, 50+ anahtar
│   │           └── context.tsx              ← I18nProvider + useI18n()
│   └── mobile/                              ← Expo skeleton
├── packages/shared/src/types.ts             ← Tüm TypeScript tipleri
├── firebase/
│   ├── functions/src/index.ts               ← 8 Cloud Function
│   ├── firestore.rules
│   ├── storage.rules
│   └── firestore.indexes.json
├── CLAUDE.md
└── SETUP.md
```

---

## Veri Modeli

```
projects/{projectId}/pages/{pageId}/notes/{noteId}
  └── parentNoteId: null | string  ← thread sistemi

users/{uid}
  ├── plan: 'free' | 'pro'
  ├── character: 'pino' | 'pina'
  ├── characterOutfit: 'casual' | 'business' | 'student' | 'creative'
  ├── xp, level, streak
  ├── noteCount, taskCount, helpGivenCount
  └── lastLoginAt

globalProjects/{id}               ← Toplulukla paylaşılan projeler (herkese açık)
  ├── projectId, ownerUid, ownerCharacter
  ├── title, description, tags[], helpTypes[]
  ├── helpersCount, viewsCount
  └── isOpen

helpOffers/{id}                   ← Yardım teklifleri
  └── globalProjectId, helperUid, message

invites/{token}                   ← 7 günlük davet linkleri
fcmTokens/{uid}                   ← Push token
```

---

## Cloud Functions

| Function | XP | Açıklama |
|----------|-----|----------|
| `createInvite` | — | Proje daveti (7 günlük token) |
| `acceptInvite` | +20 | Daveti kabul et, projeye katıl |
| `checkProjectLimit` | — | Ücretsiz: max 5 proje kontrolü |
| `onNoteCreated` | +5 | Not yazınca XP + diğer üyelere push |
| `onNoteUpdated` | +15 | Görev tamamlanınca XP |
| `onHelpOfferCreated` | +30 | Toplulukta yardım edince XP |
| `recordLogin` | +10 | Günlük giriş → streak + XP |
| `shareProjectGlobally` | +25 | Projeyi toplulukla paylaş |

---

## Pinocchio Sistemi

### Karakterler
- **Pino** (erkek): şapka, iş kıyafeti, öğrenci kıyafeti, casual, creative
- **Pina** (kız): saç + fiyonk, aynı outfit seçenekleri
- Kayıtta seçilir, `users/{uid}.character` alanında tutulur

### Burun boyutu ↔ XP
| XP | Burun | Anlam |
|----|-------|-------|
| 0-9 | Çok uzun | Yeni başladı |
| 10-49 | Uzun | Çalışıyor |
| 50-199 | Orta | İyi gidiyor |
| 200-499 | Kısa | Üretken |
| 500+ | Çok kısa ★ | Usta |

### Mood sistemi
`happy | thinking | excited | sad | working` → göz kaşı + ağız şekli değişir

### PinoHelper (floating asistan)
- Sağ altta, her sayfada
- Tıklayınca konuşma balonu açılır
- XP, not sayısı, görev sayısı gösterir
- Periyodik ipuçları (8 sn)
- Bounce animasyonu

---

## i18n Sistemi

- `src/lib/i18n/translations.ts` → tüm key'ler, 10 dil
- `src/lib/i18n/context.tsx` → `I18nProvider`, `useI18n()` hook
- `src/components/LanguageSwitcher.tsx` → bayrak + isim dropdown
- Dil localStorage'da saklanıyor (`pnot_lang`)
- AR için RTL (`document.documentElement.dir = 'rtl'`)
- Kullanım: `const { t } = useI18n(); t('nav.projects')`

---

## Global Topluluk

- `/community` — herkese açık sayfa (login gerekmez görüntülemek için)
- Proje paylaşımı: `shareProjectGlobally` cloud function
- Yardım teklifi: `helpOffers` koleksiyonu
- Filtre: helpType (feedback/collaboration/mentorship/code-review) + tag
- Her yardım +30 XP

---

## Kritik Notlar

- `next.config.ts` desteklenmiyor → `.mjs` kullan
- `postcss.config.js` olmadan Tailwind çalışmıyor
- Mobile: `@react-native-firebase/*` (web JS SDK değil)
- Topluluk sayfası public, Firestore rules `allow read: if true`

---

## Tamamlanan (2026-03-18)

**v0.1:** Monorepo, Firebase, web MVP, mobile skeleton
**v0.2:** Pinocchio karakterleri (SVG), XP sistemi, i18n (10 dil), Global topluluk sayfası, Cloud Functions (8 adet), Gamification şeması

---

## Sonraki Adımlar

### Öncelikli
1. Firebase projesi + `.env.local` doldur
2. `firebase deploy --only firestore:rules,functions`
3. `npm install && npm run dev`
4. Karakter seçim ekranı (kayıt sonrası — `pino` vs `pina`)
5. Kullanıcı profil sayfası (XP bar, outfit seçimi, streak)
6. Kanban görünümü (görevleri kolona göre)

### İleride
- Stripe/RevenueCat Pro ödeme
- WhatsApp mesaj parse (AI ile)
- AI özeti ("Bu projedeki son 7 günü özetle")
- Offline PWA desteği
- iOS/Android EAS build
- Ana ekran widget
