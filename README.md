# 🌍 Evenly

> Free, self-hostable travel expense splitting for friend groups. A privacy-first, community-driven alternative to Splitwise.

---

## ✨ Why Evenly?

When traveling in groups, tracking expenses across foreign currencies, spotty cellular roaming, and complicated restaurant bills shouldn't require paid subscriptions or forced paywalls.

**Evenly** is designed for friend groups who want:
- **Zero cost**: 1-click self-host on Vercel + Supabase free tiers ($0/month).
- **Official Store Apps**: Friends install the official iOS / Android app from the App Store and Google Play—no sideloading or TestFlight expiration.
- **Magic Connect**: Scan a QR code or tap a link (`evenly://join?server=...`) to auto-connect to the host's server.
- **Travel-First**: Multi-currency support with offline exchange rate caching, offline expense queuing, and minimum-transfer debt simplification.
- **Settlement Reports**: Downloadable and printable PDF trip settlement summaries for group chats.

---

## 🏗 Monorepo Architecture

```
Evenly/
├── apps/
│   ├── mobile/         # React Native / Expo app (iOS & Android)
│   └── web/            # Next.js 15 (App Router) self-hosted portal & API
├── packages/
│   └── shared/         # Core split math, debt simplification, and TypeScript models
└── supabase/           # PostgreSQL schema, migrations, and Row Level Security
```

---

## 🚀 Roadmap

- [ ] Core monorepo setup and shared models (`packages/shared`)
- [ ] Supabase schema with individual user accounts and trip rosters
- [ ] Next.js self-hosted web portal with 1-click Vercel deployment
- [ ] Magic Connect QR code generator and deep linking
- [ ] Mobile app with offline receipt OCR and sync queue
- [ ] PDF settlement export
- [ ] Video setup guide for self-hosters

---

## 📄 License

[MIT](LICENSE)
