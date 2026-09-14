# 🌍 Evenly

> Free, self-hostable travel expense splitting for friend groups. A privacy-first, community-driven alternative to Splitwise.

📖 **New here? Follow the [Get Started Guide](GET_STARTED.md) to set up Evenly in 3 minutes.**

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
│   └── web/            # Next.js 16 (App Router) self-hosted portal & API
├── packages/
│   └── shared/         # Core split math, debt simplification, and TypeScript models
└── supabase/           # PostgreSQL schema, migrations, and Row Level Security
```

---

## ⚡️ Database Setup

Evenly supports three zero-friction database setup workflows:

### Option A: Local Development with Supabase CLI (Recommended for Devs)
Run local Supabase with Docker (Postgres, Auth, Realtime, and all migrations automatically applied):
```bash
npm run db:start
```

### Option B: Remote Database via CLI (`db:push`)
Push all migrations directly to your remote Supabase or Postgres database:
```bash
npm run db:push -- --db-url "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

### Option C: Supabase Web Dashboard (1-Click SQL Paste)
1. Open your Supabase Dashboard: `https://supabase.com/dashboard/project/[PROJECT-REF]/sql/new`
2. Paste the contents of [`supabase/full_schema.sql`](supabase/full_schema.sql)
3. Click **Run** (`Cmd + Enter`)

---

## 💻 Running the Web App

```bash
# 1. Install dependencies
npm install

# 2. Build shared packages
npm run build:shared

# 3. Start Next.js development server
npm --workspace=apps/web run dev
```

---

## 📄 License

[MIT](LICENSE)
