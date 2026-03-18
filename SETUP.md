# PNOT — Setup Guide

## Ön Koşullar
- Node.js 20+
- Firebase CLI: `npm install -g firebase-tools`
- Expo CLI: `npm install -g @expo/cli eas-cli`

## 1. Firebase Projesi Oluştur

1. [console.firebase.google.com](https://console.firebase.google.com) → Yeni proje → `pnot-app`
2. **Authentication** → Sign-in methods → Google (aktif et)
3. **Firestore Database** → Production mode
4. **Storage** → Aktif et
5. **Cloud Messaging** → Aktif et

### Config Al
- Project Settings → Your apps → Web app ekle
- Config değerlerini `apps/web/.env.local`'a koy

## 2. Web Uygulaması

```bash
cd apps/web
cp .env.local.example .env.local
# .env.local dosyasını Firebase değerleriyle doldur

npm install
npm run dev
# → http://localhost:3000
```

## 3. Firebase Deploy

```bash
cd firebase
firebase login
firebase use --add  # pnot-app projesini seç

# Rules + Functions
firebase deploy --only firestore:rules,firestore:indexes,storage:rules
cd functions && npm install && cd ..
firebase deploy --only functions
```

## 4. Mobil Uygulama

```bash
cd apps/mobile
npm install

# Firebase config dosyalarını indir (Firebase Console):
# Android: google-services.json → apps/mobile/
# iOS: GoogleService-Info.plist → apps/mobile/

# app/index.tsx içinde webClientId'yi güncelle
# (Firebase Console > Auth > Google > Web client ID)

npx expo start
```

### EAS ile Build (APK / TestFlight)
```bash
eas build --platform android --profile preview
eas build --platform ios --profile preview
```

## Proje Yapısı

```
pnot-project/
├── apps/
│   ├── web/          ← Next.js 14 + Tailwind (pnot.app)
│   └── mobile/       ← Expo + React Native
├── packages/
│   └── shared/       ← Ortak TypeScript tipleri
├── firebase/
│   ├── functions/    ← Cloud Functions
│   ├── firestore.rules
│   ├── storage.rules
│   └── firebase.json
├── CLAUDE.md         ← AI geliştirme rehberi
└── SETUP.md          ← Bu dosya
```

## Gerekli API Anahtarları

| Servis | Nereden |
|--------|---------|
| Firebase | console.firebase.google.com |
| Google OAuth | Firebase Auth → Google |
| Apple OAuth (iOS) | developer.apple.com |

## İlk Admin Kullanıcısı

1. Web uygulamasına Google ile giriş yap
2. Firestore'da `users/{uid}` → `plan: "pro"` yap (elle)
3. Artık pro özellikler açık
