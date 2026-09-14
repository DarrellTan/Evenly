# 🚀 Evenly — Getting Started Guide

> Complete, step-by-step setup guide for developers, self-hosters, and contributors.
> **Note**: This document is updated whenever new initialization steps, environment variables, or schema migrations are introduced.

---

## 📋 Table of Contents
1. [Prerequisites](#-prerequisites)
2. [Quickstart (3 Minutes)](#-quickstart-3-minutes)
3. [Environment Configuration](#-environment-configuration)
4. [Database Provisioning](#-database-provisioning)
5. [Running the Services](#-running-the-services)
6. [Initialization Steps Changelog](#-initialization-steps-changelog)

---

## 🛠 Prerequisites

Before starting, ensure you have the following installed on your machine:

- **Node.js**: `v20.x` or later (`node -v`)
- **npm**: `v10.x` or later (`npm -v`)
- **Docker Desktop**: *(Optional)* Required only if running Supabase locally.
- **Expo Go App**: *(Optional)* Installed on your iOS/Android device if testing mobile.

---

## ⚡️ Quickstart (3 Minutes)

```bash
# 1. Clone the repository
git clone https://github.com/DarrellTan/Evenly.git
cd Evenly

# 2. Install monorepo dependencies
npm install

# 3. Build the core mathematical calculation package
npm run build:shared

# 4. Configure your environment
cp apps/web/.env.example apps/web/.env.local

# 5. Push database migrations (see Database Provisioning below)
npm run db:push -- --db-url "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# 6. Launch the Next.js web portal
npm --workspace=apps/web run dev
```

The web dashboard will be available at **`http://localhost:3000`**.

---

## 🔐 Environment Configuration

Create `apps/web/.env.local` by copying `apps/web/.env.example` (or configure the variables directly):

| Variable | Required | Description | Example |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | Your Supabase Project API URL | `https://xyzcompany.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Yes** | Public anonymous JWT key (used by browser) | `eyJhbGciOiJIUzI1...` |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | Secret service role key (used by server actions) | `eyJhbGciOiJIUzI1...` |

*(For local development with Docker, run `npm run db:start` to receive your local URLs and keys).*

---

## 🗄 Database Provisioning

Evenly maintains an automated migration pipeline under `supabase/migrations/`. Choose your preferred setup:

### Method A: Remote Supabase via CLI (Recommended for Self-Hosters)
When hosting on the free Supabase tier, push all migrations in one command:
```bash
npm run db:push -- --db-url "postgresql://postgres:[YOUR-DB-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

### Method B: Local Supabase with Docker (Recommended for Core Devs)
```bash
npm run db:start
```
*This spins up PostgreSQL, Supabase Auth, Realtime, and Inbucket (email testing), applying all migrations automatically.*

To stop the local containers:
```bash
npm run db:stop
```

### Method C: Web Dashboard (1-Click Manual Paste)
If you prefer not to use the CLI:
1. Go to your [Supabase SQL Editor](https://supabase.com/dashboard).
2. Open [`supabase/full_schema.sql`](supabase/full_schema.sql).
3. Paste all contents and click **Run** (`Cmd + Enter`).

---

## 💻 Running the Services

### 1. Web Portal (Next.js 16)
```bash
# Development mode
npm --workspace=apps/web run dev

# Custom port (e.g. 3001)
npm --workspace=apps/web run dev -- -p 3001

# Production build
npm --workspace=apps/web run build
npm --workspace=apps/web run start
```

### 2. Mobile App (Expo / React Native)
```bash
npm --workspace=apps/mobile start
```
*Scan the generated QR code with your iOS Camera or Android Expo Go app.*

### 3. Shared Library Tests
```bash
npm --workspace=packages/shared test
```

---

## 📝 Initialization Steps Changelog

This log tracks every new setup step, dependency prerequisite, or configuration change added to Evenly.

| Date | Version / Milestone | New Initialization Step Added | Details |
| :--- | :--- | :--- | :--- |
| **2026-09-14** | `v0.1.0-alpha.1` | **Initial Monorepo Setup** | Run `npm install` and `npm run build:shared` before starting web or mobile apps. |
| **2026-09-14** | `v0.1.0-alpha.1` | **Supabase Environment Variables** | Added `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to `apps/web/.env.local`. |
| **2026-09-14** | `v0.1.0-alpha.1` | **Database Schema Migrations** | Initialized `supabase/config.toml`, `20260914000000_initial_schema.sql` (trips, expenses, profiles), and `20260914000001_invites_and_activities.sql` (invitations, notifications). Added `npm run db:push` command. |
| **2026-09-14** | `v0.1.0-alpha.1` | **Theme System & Turbopack Proxy** | Added `proxy.ts` conforming to Next.js 16 proxy routing convention. Anti-flicker theme script configured in `apps/web/src/app/layout.tsx`. |

---
*Maintained by the Evenly Core Team. Found an issue or outdated step? Please submit a PR!*
