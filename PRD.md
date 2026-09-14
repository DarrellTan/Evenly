# 🌍 Evenly — Product Requirements Document (PRD)

**Version:** 1.0.0  
**Status:** Active Development / In Progress  
**Target Delivery:** Q3/Q4 2026  
**Repository:** [DarrellTan/Evenly](https://github.com/DarrellTan/Evenly)  
**Authors:** Darrell Tan & AI Pair Programmer (Antigravity)

---

## 1. Executive Summary & Product Vision

### 1.1 The Problem
Existing expense-splitting applications (notably Splitwise, Tricount, and their clones) have become increasingly hostile to users:
- **Aggressive Paywalls & Artificial Rate Limits:** Capping daily expense submissions to 3–4 entries, locking receipt photo scanning, restricting currency conversions, and paywalling search behind monthly subscriptions ($4.99–$9.99/mo).
- **Intrusive Ads & Privacy Concerns:** Displaying full-screen video ads and monetizing personal group spending data.
- **Poor Travel Experiences:** Lack of seamless offline caching for international flights or spotty roaming, confusing multi-currency handling, and rigid bill splitting for itemized restaurant bills.
- **Proprietary Lock-in:** No easy self-hosting or straightforward data export for long-term trip archives.

### 1.2 The Solution: Evenly
**Evenly** is a 100% free, open-source, self-hostable travel expense-splitting platform engineered specifically for traveling friend groups and families.
- **Zero Cost for Life:** Architected to run entirely on free-tier infrastructure (Vercel Serverless + Supabase Free Tier = $0/month).
- **No Paywalls or Subscriptions:** Every feature—receipt scanning, multi-currency conversion, itemized breakdowns, and debt simplification—is free for everyone.
- **Travel-First Niche Focus:** Designed around international group trips: foreign currency support with offline exchange rate fallback, itemized restaurant receipts with sub-items and individual assignments, and proportional tax/service charge distribution.
- **Seamless Cross-Platform Ecosystem:**
  - **Next.js 15 Web Portal:** Full desktop dashboard for planning, auditing, and exporting printable trip reports.
  - **Expo React Native App:** Native iOS and Android mobile app for fast offline receipt scanning, quick payments, and on-the-go logging.
- **Offline-First Resilience:** Local SQLite cache on mobile keeps the app responsive in airplane mode or during spotty cellular coverage, syncing via an outbox queue when connectivity returns.
- **Smart Debt Simplification:** Greedy net-balance algorithm minimizes the total number of bank transfers needed to settle up at the end of a trip.
- **Frictionless Onboarding:** Instant trip joining via 8-character invite codes, universal web links, and "Magic QR code" pairing between web and mobile—no mandatory third-party email configuration required.

---

## 2. Target Personas & Use Cases

### 2.1 Persona A: "The Trip Organizer / Accountant Friend" (Alex)
- **Profile:** Plans the itinerary, books group accommodations, pays large restaurant checks, and settles group balances.
- **Key Needs:**
  - Fast receipt breakdowns: quickly designate who ordered which dish and split shared items.
  - Transparent currency handling: automatically convert foreign currencies (e.g. JPY, EUR) to the trip's home base currency (e.g. USD).
  - Clear summary reports: easily see who owes whom without spending hours in a spreadsheet.
- **Pain Points:** Frustrated by subscription prompts and entry limits while traveling.

### 2.2 Persona B: "The Casual Traveler" (Sam)
- **Profile:** Travel companion. Wants to know their net balance and pay debts quickly without friction.
- **Key Needs:**
  - Instant join: tap a link or scan a QR code without completing lengthy registration surveys.
  - Clarity on charges: inspect exactly which dishes or drinks they were assigned on a bill.
  - One-tap payment: click directly to Wise, Revolut, Venmo, PayPal, or DuitNow handles.
- **Pain Points:** Forgets receipts; dislikes installing bloated apps that require payment setups.

### 2.3 Persona C: "The Self-Hoster & Privacy Enthusiast" (Dev)
- **Profile:** Tech enthusiast or organization host who wants full ownership of their financial records.
- **Key Needs:**
  - 1-Click Vercel Deploy and turnkey Supabase database migrations.
  - Clean modular architecture where external dependencies (like email providers) are optional plugins.
  - Transparent PostgreSQL schema with strict Row Level Security (RLS).

---

## 3. Monorepo Architecture & Tech Stack

Evenly uses an npm workspaces monorepo:

```
Evenly/
├── apps/
│   ├── web/                    # Next.js 15 (App Router, SSR Supabase Auth, Tailwind CSS)
│   └── mobile/                 # Expo React Native (iOS, Android, expo-sqlite, Camera)
├── packages/
│   └── shared/                 # Pure TypeScript math, types, currency, debt simplification
├── supabase/                   # PostgreSQL schema, migrations, RLS policies, triggers
├── package.json                # Monorepo root workspace configuration
└── PRD.md                      # Product Requirements Document (Source of Truth)
```

### 3.1 Technology Stack Details

| Component | Technology | Rationale & Specifications |
| :--- | :--- | :--- |
| **Monorepo Engine** | npm workspaces | Native Node.js monorepo management with zero third-party build tool bloat |
| **Web Application** | Next.js 15 (App Router) | High-performance serverless SSR portal, secure pinned versioning, desktop dashboard |
| **Mobile Application** | Expo 56+ (React Native) | Universal iOS and Android support, native camera access, offline SQLite store |
| **Database & Auth** | Supabase (PostgreSQL 15+) | Managed PostgreSQL, Row Level Security (RLS), Supabase Auth (Email/Magic Link) |
| **Realtime Engine** | Supabase Realtime | WebSocket channels direct from clients to Supabase (bypassing Vercel serverless limitations) |
| **Offline Cache** | `expo-sqlite` | Local relational database on mobile devices for instant reads/writes without cell service |
| **Shared Logic** | `@evenly/shared` | 100% test-covered pure TypeScript engine for debt minimization, split math, and currencies |
| **Styling** | Tailwind CSS / Lucide Icons | Clean modern design system with curated dark and light mode aesthetics |
| **Transactional Email** | Optional / Modular (Resend) | Optional email dispatch; app defaults to direct link sharing and in-app notifications |

---

## 4. Feature Specifications & Requirements

### 4.1 Feature 1: Authentication & Profiles
- **Authentication Flows:**
  - Email + Password and passwordless Magic Link via Supabase Auth.
  - Web: Session cookies managed via `@supabase/ssr`.
  - Mobile: Secure token storage in native Keychain/Keystore.
- **Profile Fields (`public.profiles`):**
  - `id` (UUID, matches `auth.users.id`)
  - `email` (Text, unique)
  - `name` (Display name)
  - `avatar_url` (Image URL)
  - `payment_handles` (JSONB storing handles for Wise, Revolut, Venmo, PayPal, DuitNow, bank details)
- **Database Trigger:**
  - Automated trigger `on_auth_user_created` creates a profile row immediately upon Supabase user signup.

### 4.2 Feature 2: Trip & Group Management (Travel Niche)
- **Trip Attributes (`public.trips`):**
  - `id` (UUID)
  - `name` (e.g. "Tokyo Autumn 2026", "EuroTrip 2026")
  - `destination` (Text)
  - `start_date` / `end_date` (Date)
  - `base_currency` (e.g. `USD`, `EUR`, `JPY`, `SGD` — default `USD`)
  - `owner_id` (References `profiles.id`)
  - `invite_code` (Unique 8-character code, e.g. `a7b3c9d1`)
- **Membership & Roles (`public.trip_members`):**
  - Roles: `owner` (full administration) and `member` (collaborative member).
  - Automated trigger `on_trip_created` grants the creator the `owner` role.
  - Members can invite others, view trip rosters, create expenses, and settle balances.

### 4.3 Feature 3: Invitations & Onboarding
- **Direct Shareable Links & Codes:**
  - Standard join URL: `https://evenly.app/join/[invite_code]`
  - Deep-link scheme: `evenly://join?code=[invite_code]`
  - QR Code displayed on web dashboard for camera scanning by mobile users.
- **In-App Notification Invites:**
  - Trip members can invite friends by entering their email in the trip settings.
  - Creates a record in `public.trip_invitations`.
  - Database trigger `on_trip_invitation_created` checks if the email already has an account. If found, an instant in-app notification (`public.notifications`) is created with an "Accept / Decline" action.
- **Email Dispatch (Optional Plugin):**
  - Designed with an adapter pattern: self-hosters can enable Resend / SMTP via environment variables. If disabled, the UI highlights direct link / QR code sharing.

### 4.4 Feature 4: Expense Management (Individual & Itemized Receipts)
- **Expense Types:**
  1. **Standard / Simple Expense:** Single amount paid by one person and split equally or unequally across all members.
  2. **Itemized Receipt Breakdown:** Multi-item breakdown with individual items, quantities, and specific user assignments.
- **Multi-Currency Engine:**
  - Expenses can be logged in any global currency (e.g. JPY in Tokyo while the trip base currency is USD).
  - Exchange rate captured at time of creation, computing `base_currency_amount = amount * exchange_rate`.
  - Offline mode bundles cached conversion rates for the top 50 global currencies.
- **Sub-Items & Item Assignment (`expense_items` & `expense_assignments`):**
  - An expense contains multiple line items (e.g., Ramen Bowl $15, Gyoza $8, Sapporo Beer $7).
  - Items are assigned to one or more members with custom split weights (e.g., 50/50 split on an appetizer, 100% on an individual main course).
- **Taxes, Tips & Service Charges:**
  - Configurable `service_charge_percent` and `tax_percent`.
  - Distribution options:
    - **Proportional:** Members pay taxes/fees proportional to their consumed item subtotal.
    - **Equal:** Taxes and fees are divided equally among all participants on the bill.

### 4.5 Feature 5: Debt Simplification & Settlements
- **Net Balance Math:**
  - For every trip participant:
    $$\text{net\_balance} = \text{total\_paid\_in\_base\_currency} - \text{total\_consumed\_in\_base\_currency}$$
  - A positive balance means the group owes the user money (creditor).
  - A negative balance means the user owes the group money (debtor).
- **Greedy Min-Cash-Flow Algorithm (`simplifyDebts` in `@evenly/shared`):**
  - Matches the largest debtor with the largest creditor iteratively.
  - Reduces complex networks of $N(N-1)$ debts into at most $N-1$ clear payments.
- **Settlement Tracking (`public.settlements`):**
  - Members record debt payments (`from_user_id`, `to_user_id`, `amount`, `currency`).
  - Supports attaching payment confirmation screenshots/receipts (`proof_image_url`).
  - Immediate balance recalculation upon settlement completion.
  - Direct links to payment provider apps (Wise, Revolut, Venmo, PayPal, DuitNow) using stored user handles.

### 4.6 Feature 6: Activity Feed & Audit Trail
- **Unified Activity View (`public.trip_activities`):**
  - Combines expenses, settlements, and member joins into a single chronological feed.
  - Live updates pushed directly to clients via Supabase Realtime pub/sub (`trip:[id]`).

### 4.7 Feature 7: Offline-First Mobile Experience
- **Local SQLite Store:**
  - Powered by `expo-sqlite`.
  - Full relational schema mirroring the active trip, expenses, members, and profile locally.
- **Outbox Sync Queue:**
  - Offline changes are stored in a local `sync_outbox` table.
  - Network state listener (`@react-native-community/netinfo`) initiates batch sync to Supabase once connectivity is detected.
  - Conflict resolution uses last-write-wins with server timestamp verification.

### 4.8 Feature 8: Web Portal & Magic Pairing
- **Desktop Web Portal (Next.js 15):**
  - High-resolution trip overview, spending by category chart, balance matrix, and full expense ledger.
  - Export capabilities: Downloadable CSV and printable PDF trip settlement summaries for group messaging apps.
- **"Connect Mobile App" Magic QR Code:**
  - Users logged in on web can click "Connect Mobile App".
  - A dynamic QR code containing a secure one-time session exchange token allows instant pairing without mobile typing.

---

## 5. Security & Data Integrity

### 5.1 Next.js Security & Serverless Architecture
- Next.js version pinned strictly to secure, audited releases (avoiding historical CVEs related to server actions or cache poisoning).
- Next.js operates 100% stateless on Vercel; all persistent connections use Supabase Realtime WebSockets directly from the client.

### 5.2 Row Level Security (RLS) Policies
- All tables in the `public` schema have RLS enabled with restrictive policies.
- Helper function `public.is_trip_member(trip_id)` enforces strict multi-tenant boundary checks.
- Users cannot access, view, or modify expenses or member rosters of trips they do not belong to.
- `public.profiles` updates are restricted strictly to `auth.uid() = id`.
- Service role secret key (`SUPABASE_SERVICE_ROLE_KEY`) is strictly confined to server-side code and never exposed to client bundles.

---

## 6. Implementation Roadmap & Current Status

### Phase 0: Foundations & Core Engine (COMPLETED ✅)
- [x] Monorepo initialized at `DarrellTan/Evenly` with npm workspaces.
- [x] `@evenly/shared` package developed with 100% unit test coverage:
  - Debt simplification greedy algorithm (`simplifyDebts.ts`)
  - Itemized split calculations with proportional taxes and fees (`split.ts`)
  - Multi-currency conversion and formatting utilities (`currency/index.ts`)
- [x] Supabase PostgreSQL migrations authored and verified:
  - Migration 1: Profiles, Trips, Trip Members, Expenses, Expense Items, Assignments, Settlements, Realtime (`20260914000000_initial_schema.sql`)
  - Migration 2: Trip Invitations, In-app Notifications, Activity Feed View, Realtime (`20260914000001_invites_and_activities.sql`)
- [x] Environment configuration templates (`.env.example`) created for both `apps/web` and `apps/mobile`.

### Phase 1: Next.js 15 Web Portal (IN PROGRESS 🔄)
- [ ] Scaffold Next.js 15 App in `apps/web` with Tailwind CSS and Lucide icons.
- [ ] Supabase SSR Authentication (Login, Signup, Magic Link, Auth Callback route).
- [ ] Dashboard & Trip Management views:
  - Trip overview & member roster
  - Expense list & category breakdown
  - Create Expense dialog (Simple split + Itemized receipt builder)
  - Debt simplification & Settlement settlement dialog
  - Activity Feed tab
- [ ] Magic QR Code generator for mobile app pairing.

### Phase 2: Expo Mobile Application
- [ ] Scaffold Expo React Native app in `apps/mobile` (Expo SDK 56+).
- [ ] Implement `expo-sqlite` local database and outbox sync engine.
- [ ] Build mobile navigation (Trips, Activity, Quick Add, Profile).
- [ ] Implement QR code scanner to scan web pairing codes or trip invite codes.

### Phase 3: Receipt OCR & On-Device Scanning
- [ ] Port camera scanner and receipt parsing algorithms from `Splitter` into `Evenly`.
- [ ] Touch-friendly item assignment screen (tap to assign items to members).

### Phase 4: Export & Open Source Launch
- [ ] Export trip summary to PDF and CSV.
- [ ] 1-Click Deploy to Vercel integration in `README.md`.
- [ ] Video walk-through & documentation for self-hosters.
