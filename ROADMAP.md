# PNOT — Yol Haritası & Karar Defteri

> Son güncelleme: 2026-03-19

---

## ✅ TAMAMLANANLAR

### v0.1 — Temel Altyapı
- [x] Monorepo yapısı (apps/web, apps/mobile, packages/shared, firebase/)
- [x] Firebase projesi bağlantısı (Auth, Firestore, Storage, Functions, FCM)
- [x] `packages/shared` — tüm TypeScript tipleri (UserProfile, Project, Page, Note, Classroom...)
- [x] Firestore güvenlik kuralları (rol tabanlı, üye kontrolü)
- [x] Storage kuralları (öğretmen belgeleri, proje ekleri)
- [x] Firestore composite indexler
- [x] 10+ Cloud Function (XP, bildirim, davet, classroom, login streak...)

### v0.2 — Web MVP
- [x] Landing sayfası (Pinocchio hero, özellikler, topluluk CTA)
- [x] Google Auth + kullanıcı profil oluşturma
- [x] Karakter seçim ekranı (Pino/Pina + 4 kıyafet, canlı önizleme)
- [x] Dashboard — proje listesi, proje oluşturma (emoji + renk seçici)
- [x] Proje sayfası — sayfa listesi, üye davet (7 günlük link)
- [x] Sayfa görünümü — notlar, thread (yanıt), görev yönetimi (todo/doing/done)
- [x] Kanban görünümü — görevleri duruma göre kolon

### v0.3 — Pinocchio Sistemi & Gamification
- [x] `PinoCharacter.tsx` — tam SVG karakter (Pino erkek / Pina kız)
  - 5 mood: happy, thinking, excited, sad, working
  - 4 outfit: casual, business, student, creative
  - Burun uzunluğu ↔ XP (xp≥500=kısa, 0-9=uzun)
- [x] `PinoHelper.tsx` — floating asistan (sağ alt, her sayfada)
- [x] `PinoGuide.tsx` — adım adım tur sistemi (localStorage ile tekrar göstermez)
  - dashboard, project, pageView, classroom, community turları
- [x] XP sistemi: not+5, görev+15, yardım+30, login+10, davet+20, paylaşım+25, classroom+50
- [x] Level hesaplama: `floor(sqrt(xp/50)) + 1`
- [x] Profil sayfası: XP bar, streak, karakter/kıyafet değiştirme, istatistikler

### v0.4 — i18n & Global Topluluk
- [x] 10 dil desteği: TR, EN, DE, ES, FR, PT, JA, RU, AR (RTL), ZH
- [x] `translations.ts` — 50+ çeviri anahtarı
- [x] `LanguageSwitcher.tsx` — bayrak dropdown
- [x] RTL desteği (Arapça için `document.dir = 'rtl'`)
- [x] Global topluluk sayfası — herkese açık, login gerekmez
- [x] Proje paylaşımı (+25 XP) — helpType + etiket
- [x] Yardım teklifi sistemi (+30 XP)

### v0.5 — Öğretmen Sistemi
- [x] Öğretmen başvuru sayfası (kimlik + okul belgesi yükleme)
- [x] Bekliyor ekranı (teacherStatus polling)
- [x] Admin paneli (başvuruları onayla/reddet → otomatik Pro)
- [x] Sınıf yönetimi (oluştur, davet kodu, öğrenci listesi)
- [x] Grup sistemi (öğrencileri gruplara ayır, grup projesi oluştur)
- [x] Sınıf detay sayfası (3 sekme: öğrenciler, gruplar, sınıf projesi)
- [x] Öğrencinin sınıfa katılması (join-class sayfası)

### v0.6 — AI & PWA & Mobile
- [x] WhatsApp/Telegram konuşma import (AI ile — claude-opus-4-6)
  - Konuşmayı yapıştır → AI ayrıştırır → notları seç → kaydet
- [x] PWA: `manifest.json` + `firebase-messaging-sw.js`
- [x] Background push notification handler
- [x] Mobile — Proje listesi, sınıfa katıl butonu
- [x] Mobile — Proje detayı (sayfalar listesi)
- [x] Mobile — Sayfa/not görünümü (thread + görev toggle + KeyboardAvoidingView)
- [x] Mobile — Sınıf listesi (kod ile katılma)
- [x] Mobile — Sınıf detayı (öğrenciler + gruplar sekmeleri)
- [x] Mobile — FCM izinleri, token kaydetme, foreground listener
- [x] Mobile — Bildirimler ekranı

### v0.7 — İstatistik Sayfası
- [x] Web — `/dashboard/projects/[projectId]/stats`
  - 4 özet kart (not, görev %, üye, sayfa)
  - 14 günlük aktivite bar chart (saf CSS)
  - Üye katılım barları + %pay + 🏆
  - SVG donut chart (todo/doing/done)
  - Sayfa aktivite barları
- [x] Mobile — `/project-stats/[projectId]`
  - 7 günlük chart, görev barları, üye listesi, sayfa listesi

---

## 🚧 YAPILACAKLAR

### Öncelik 1 — Ticari Altyapı
- [ ] **1 Haftalık Pro Trial** — yeni kayıtta otomatik pro, 7 gün sonra basic
- [ ] **Admin: kullanıcıya pro ver** — admin panelinden elle pro/basic toggle
- [ ] **Stripe entegrasyonu** (web ödeme)
  - Aylık plan: ~4$/ay
  - Yıllık plan: ~30$/yıl (%38 indirim)
- [ ] **RevenueCat** (iOS/Android in-app purchase)
- [ ] **Webhook sistemi** — not/görev olaylarında dışarı POST at
- [ ] **REST API** — 3. taraf entegrasyonlar için (Home Assistant vb.)

### Öncelik 2 — Platform Entegrasyonları
- [ ] **Home Assistant entegrasyonu**
  - HACS custom integration
  - HA sensörü: aktif görev sayısı, bugünkü notlar
  - HA bildirimi → PNOT notu (otomatik log)
- [ ] **Zapier / Make (Integromat) connector**
- [ ] **Webhook listener** — dışarıdan PNOT'a not ekleme (IoT, otomasyon)
- [ ] **MQTT bridge** (Node-RED uyumlu)

### Öncelik 3 — Özellikler
- [ ] **Medya yükleme** (Pro) — fotoğraf/video ekler (Firebase Storage)
- [ ] **Öğretmen bildirimleri** — öğrenci not eklediğinde öğretmene push
- [ ] **AI özeti** — "Bu projedeki son 7 günü özetle" (Claude)
- [ ] **Offline PWA** — service worker cache, offline not girişi
- [ ] **Kanban board mobil** — sürükle bırak görev yönetimi
- [ ] **Proje şablonları** — hazır sayfa yapıları (yazılım, etkinlik, ders...)
- [ ] **CSV/PDF dışa aktarım** — proje notlarını indir

### Öncelik 4 — Altyapı & Dağıtım
- [ ] **Firebase `.env.local` doldur** — gerçek proje credentials
- [ ] **Vercel deploy** — `vercel --prod`
- [ ] **EAS Build** — iOS + Android production build
- [ ] **App Store / Google Play** başvurusu
- [ ] **Self-host seçeneği** — Docker compose (CasaOS uyumlu)
- [ ] **Custom domain** — pnot.app

---

## 💡 KARARLAR & TARTIŞMALAR

### Monetization (Ticari Model)

**Karar: Freemium + Abonelik**

| Plan | Fiyat | Özellikler |
|------|-------|-----------|
| Basic (ücretsiz) | 0$ | 5 proje, sınırsız sayfa/not, topluluk |
| Pro | 4$/ay veya 30$/yıl | Sınırsız proje, medya, AI import, gelişmiş istatistik |
| Teacher | Ücretsiz (onay ile) | Pro tüm özellikler, sınıf yönetimi |

**İlk kullanım:** Kayıtta 7 gün otomatik Pro trial → süre bittikten sonra Basic'e düşer.

**Neden abonelik, tek seferlik değil?**
- Sürekli Firebase/hosting maliyeti var → abonelik bu maliyeti karşılar
- Kullanıcı sayısı arttıkça gelir de artar
- Tek seferlik satış → kullanıcı öder ama maliyetler devam eder

**Admin yetkileri:**
- Admin panelinden herhangi bir kullanıcıya el ile `plan: 'pro'` verebilme
- Süresiz veya belirli tarihli pro erişimi
- Kullanım: beta test kullanıcıları, influencer, kurumsal anlaşmalar

### Platform Entegrasyonları

**Home Assistant:**
```yaml
# Örnek HA configuration.yaml entegrasyonu
sensor:
  - platform: rest
    resource: https://pnot.app/api/ha/stats?token=XXX
    name: PNOT Aktif Görevler
    value_template: "{{ value_json.activeTasks }}"

automation:
  - alias: "Hareket algılandı → PNOT not ekle"
    trigger:
      platform: state
      entity_id: binary_sensor.motion_living_room
      to: "on"
    action:
      service: rest_command.pnot_add_note
      data:
        content: "Hareket algılandı: {{ now() }}"
        projectId: "ev-guvenlik-projesi"
```

**Webhook sistemi:**
- Ayarlardan webhook URL tanımla
- Not oluşunca → POST `{type, note, project, user, timestamp}`
- Node-RED, Zapier, Make.com ile bağlanabilir

### Kod Güvenliği

**Şifrelemeye gerek yok — asıl değer sunucu tarafında:**

| Katman | Durum | Açıklama |
|--------|-------|---------|
| Next.js frontend | Derlenmiş JS | Tersine mühendislik mümkün ama zahmetli |
| Firebase Functions | Sunucu taraflı | Hiç kimse göremez — asıl iş burada |
| Firestore Rules | Sunucu taraflı | Veri erişim kontrolü |
| Mobile (React Native) | Bundle olarak paketlenir | Obfuscation eklenebilir |

**Pratik önlemler:**
- `.env.local` → asla commit etme (zaten `.gitignore`'da)
- Firebase App Check → API'yi sadece kendi uygulamandan kullandır
- Rate limiting → Cloud Functions'a DDoS koruması
- Önemli iş mantığı → hep Cloud Functions'ta tut (client'ta değil)

### Hosting Stratejisi

**Başlangıç (Ücretsiz):**

| Servis | Plan | Limit |
|--------|------|-------|
| **Vercel** | Hobby (free) | Web deploy, CI/CD |
| **Firebase Spark** | Free | 1GB Firestore, 50K okuma/gün, 10GB depolama |
| **GitHub** | Free | Repo, Actions |
| Toplam maliyet | **0$** | ~500 aktif kullanıcıya kadar yeter |

**Büyüme (Pay-as-you-go):**

| Kullanıcı sayısı | Tahmini maliyet | Çözüm |
|-----------------|----------------|-------|
| 0–500 | 0$/ay | Firebase Spark + Vercel free |
| 500–5K | 10–50$/ay | Firebase Blaze (PAYG) + Vercel free |
| 5K–50K | 50–300$/ay | Firebase Blaze + Vercel Pro |
| 50K+ | Görüşülür | Dedicated infra veya GCP |

**Ev/Self-host (CasaOS + Raspberry Pi):**

```yaml
# docker-compose.yml (CasaOS uyumlu)
version: '3'
services:
  pnot-web:
    image: node:20-alpine
    working_dir: /app
    volumes:
      - ./apps/web:/app
    command: sh -c "npm install && npm run build && npm start"
    ports:
      - "3000:3000"
    env_file: .env.local
    restart: unless-stopped
```

**Ev hosting için uyarılar:**
- Firebase backend bulutta kalır (Functions, Firestore) → sadece web frontend evde
- Dinamik IP → DuckDNS veya Cloudflare Tunnel (ücretsiz) ile sabit domain
- Elektrik kesintisi → UPS veya cloud yedek
- Raspberry Pi 4 (4GB) → 100–200 eş zamanlı kullanıcıya kadar yeterli
- CasaOS Docker: mükemmel, tek tıkla deploy

**Öneri:** Başlangıçta Vercel ücretsiz → kullanıcı artınca ev sunucusuna veya Hetzner (4€/ay VPS) geç.

---

## 🏗️ TEKNİK BORÇ

- [ ] Firestore `collectionGroup` index — tüm notları proje bazlı sorgulamak için
- [ ] `packages/shared` — TypeScript build pipeline eksik (şu an direkt `.ts` import)
- [ ] Mobile — `app/(tabs)/index.tsx` classroom navigation tam değil
- [ ] Error boundary — Firebase hata yönetimi eksik sayfalarda
- [ ] Loading skeleton — veri gelene kadar boş sayfa var
