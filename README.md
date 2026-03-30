# PNOT — Project Notebook & Notification Service

**Status:** Partial — TINC event integration in progress
**Domain:** pnot.app

---

## What is PNOT?

PNOT is a team project notebook application. It organizes project details that get lost in WhatsApp/Telegram threads. Features include gamification with Pinocchio characters (Pino/Pina), an XP system, and a global community.

---

## Relation to TINC

PNOT is a **consumer** in the [TINC](https://github.com/mcturan/tinc) event ecosystem. It receives events produced by QRVEE (session.started, qso.logged, etc.) and creates structured `pnot_notes` entries from them.

Event flow:
```
QRVEE client → events_qrvee (Firestore) → Router CF → PNOT handler → pnot_notes
```

The PNOT handler (`handlePnot`) is implemented and operational as of TASK-015/017.

---

## Stack

- **Web:** Next.js 14 (App Router), Tailwind CSS, TypeScript
- **Mobile:** Expo / React Native + `@react-native-firebase/*`
- **Backend:** Firebase (Firestore, Auth, Cloud Functions v2, FCM, Storage)
- **i18n:** 10 languages (TR, EN, DE, ES, FR, PT, JA, RU, AR [RTL], ZH)
- **Monorepo:** `packages/shared` → `@pnot/shared`

---

## Status

| Feature | Status |
|---------|--------|
| Project notebook core | Partial |
| TINC event consumer (handlePnot) | Operational (hosted in qrvee Firebase Functions) |
| Standalone PNOT Cloud Functions | Not started |
| pnot_notes creation from QRVEE events | Live |
| i18n (10 languages) | Implemented |
