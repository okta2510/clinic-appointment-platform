# agent.md — Clinic Appointment Platform (Frontend & Supabase)

Operational guide for AI agents and developers working in this repo. **This is an MVP: keep it simple.**
Ship working features over clever abstractions. If something feels over-engineered, it probably is.

---

## 1. Project Overview & Architecture

A web platform for **one Beauty & Aesthetic Clinic with multiple aesthetic and dermatology doctors**.

- **Patients**: Browse aesthetic doctors with debounced search & filters (Dermatology Sp.D.V.E, Aesthetic Medicine Dipl. AAAM, Plastic Surgery Sp.B.P.R.E, Laser & Skincare Specialist, Trichology/Hair Care), select session, book appointment/treatment (with atomic quota lock), upload payment proof within 30 minutes, view appointment history & QR code, submit rating/review after consultation.
- **Admin & Staff**: Manage doctors and practice schedules with quota limits, review and approve/reject payment proofs (with Base64 compression & full preview), scan QR codes on session date (both via queue panel and public floating scanner), manage live queue & call next patient, mark no-shows, monitor dashboard metrics and revenue statistics.
- **In-App Documentation (`/docs`)**: A simple, dedicated tabbed documentation page explaining how the app works by role (Patient vs Admin) and feature lifecycle.
- **Public TV Queue Display (`/queue`)**: Fullscreen live queue display for the clinic waiting room powered by Supabase Realtime.

### Technology Stack
- **Framework**: Next.js 16 (App Router, React 19, TypeScript strict mode)
- **Styling**: Tailwind CSS v4 + daisyUI 5 (mobile-first, design tokens in `src/lib/styles.ts`)
- **Backend Application Server**: Express.js REST API (`api-clinic-appointment` running at `http://localhost:8000/api/v1` with Prisma ORM 7)
- **API Client Layer**: Axios client singleton (`src/lib/api-client.ts`) with automatic Bearer token injection, envelope unwrapping, and centralized error handling
- **Database-as-a-Service**: **PostgreSQL Supabase Cloud**
  - **Database**: PostgreSQL with Row Level Security (RLS) and atomic Stored Procedures (RPC).
  - **Auth**: Supabase Auth via `@supabase/ssr` & JWT Bearer token authentication.
  - **Storage**: Buckets `avatars` (public), `doctor-photos` (public), `payment-proofs` (private).
  - **Realtime**: PostgreSQL CDC publication for live queue display.
  - **Automation**: `pg_cron` for 30-minute auto-expiry and quota release.
- **State & Data Fetching**: TanStack Query v5 (`src/hooks/api/*`)
- **Validation**: zod v4 (`src/validations/*`)
- **Icons & QR**: `lucide-react`, `qrcode.react`
- **Charts (Phase 7)**: `recharts`
- **Testing (Phase 1)**: `vitest` + `@testing-library/react` + `jsdom`

---

## 2. Documentation Map (Source of Truth)

| Document | Purpose | Audience |
|---|---|---|
| [BRIEF.md](./BRIEF.md) | Original MVP assignment and score weight breakdown | All |
| [PRD.md](./PRD.md) | Product Requirements Document (Goals, Personas, Functional & Non-Functional Specs) | All |
| [PLAN.md](./PLAN.md) | Step-by-step phased execution roadmap from Phase 0 to Phase 9 | Developers / Agents |
| [TECH.md](./TECH.md) | Deep technical architecture, 3-tier structure, API client layer, database schemas, RPC functions, state machine | Developers / Architects |
| [INT.md](./INT.md) | Step-by-step Supabase integration & multi-service setup guide (Frontend port 3000 & Backend port 8000) | Developers / DevOps |
| [AGENT.md](./AGENT.md) | Coding rules, atomic design, responsive rules, restrictions, and conventions | AI Agents & Contributors |
| [README.md](./README.md) | Repository onboarding, initial run guide ("Zero to Running"), and quickstart commands | New Programmers |

---

## 3. Basic Restrictions & Guardrails (MUST FOLLOW)

### Scope & Architectural Boundaries
- **Follow BRIEF.md & PLAN.md strictly**: Only build features described in the roadmap.
- **External Backend Read-Only Rule**: Direktori backend `/Users/oktaviardi/Okta/api-clinic-appointment` adalah **STRICTLY READ-ONLY**. AI Agent dilarang keras mengubah, menambah, atau menghapus file apa pun di direktori backend tersebut saat bekerja di repo frontend ini.
- **Strictly No Auto-Commit Rule**: Dilarang keras menjalankan perintah `git commit` tanpa konfirmasi dan persetujuan eksplisit dari pengguna. Seluruh perubahan wajib disimpan di working tree.
- **Data Layer Standard**: Seluruh query dan mutasi data frontend wajib menggunakan custom hooks di `src/hooks/api/*` yang memanggil `apiClient` (`src/lib/api-client.ts`). Jangan melakukan fetch HTTP mentah di dalam komponen UI.

### Security
- **No secrets in client code**: Hanya variabel lingkungan `NEXT_PUBLIC_*` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_API_URL`) yang diizinkan di `.env.local`. Jangan pernah menyertakan service-role key di sisi client.
- **Token & Cookies**: Gunakan token JWT yang tersimpan di localStorage/cookie secara aman yang otomatis diinjeksikan oleh `apiClient`.
- **Private Files**: Bukti pembayaran wajib tetap tersimpan di bucket privat Supabase `payment-proofs` dengan isolasi path `<user_id>/...`.

### Code Quality & Simplicity
- **No `any`**: Strictly type all queries and RPC payloads in `src/types/`.
- **Clean separation**: UI components must never call Supabase or fetch directly; use custom hooks in `src/hooks/api/*`.
- **File size**: Keep components concise (under ~200 lines). Break large modals into subcomponents when touching them.
- **Pre-commit checks**: `npm run lint`, `npm run build`, and `npm test` must pass before marking any phase complete.

---

## 4. Light Atomic Design Rule

| Level | Purpose | Folder | Examples |
|---|---|---|---|
| **Atoms** | Smallest UI primitives, no business logic, styled by props | `src/components/ui/atoms/` | `Button`, `Input`, `Badge`, `Spinner`, `Avatar` |
| **Molecules** | Composition of 2–3 atoms, still generic | `src/components/ui/molecules/` | `Field` (label + input + error), `PasswordInput`, `Modal`, `ConfirmDialog`, `Pagination` |
| **Organisms** | Domain-aware feature components that invoke query hooks | `src/components/{user,admin}/<feature>/` | `DoctorBrowser`, `BookingForm`, `PaymentManagement`, `QueueBoard` |
| **Templates** | Layout structures | `app/**/layout.tsx`, `AdminShell`, `Navbar`, `Footer` | Page wrappers, sidebars |
| **Pages** | Route entry points (thin wrappers) | `app/**/page.tsx` | `doctor/page.tsx`, `admin/(panel)/dashboard/page.tsx` |

**Rules**:
1. Imports flow downward: Pages → Templates → Organisms → Molecules → Atoms.
2. Atoms and molecules do not import React Query, Supabase client, or Next.js router.
3. Promote to `ui/` only when a component is shared across two or more distinct features.
4. Atoms retrieve style tokens from `src/lib/styles.ts`.

---

## 5. Responsive UI Rules (Mobile-First)

Responsiveness is an explicit requirement of BRIEF.md.
- **Breakpoints**: Mobile base (`<640px`), `sm:` (640px), `md:` (768px), `lg:` (1024px).
- **Test Widths**: 360px (mobile), 768px (tablet), 1280px (desktop/TV).
- **No Horizontal Scroll**: Zero unwanted overflow on 360px viewport.
- **Tap Targets**: Minimum 44px height (`min-h-11`) for buttons, select inputs, and links.
- **Admin Tables**: Use stacked card layouts on mobile (`block md:hidden`), and full HTML tables on `md:` and above (`hidden md:table`).
- **Modals**: Full-width or bottom-sheet behavior on mobile (`w-full max-h-[90vh] overflow-y-auto`), centered `max-w-lg` on desktop.
- **Live Queue TV Display (`/queue`)**: High contrast, oversized typography (`text-7xl md:text-9xl`) readable from across a clinic waiting room.

---

## 6. Transaction State Machine & Domain Rules

```
waiting_payment ──upload proof──▶ waiting_confirmation ──admin approve──▶ done (QR issued)
      │ 30 min (pg_cron)                   │ admin reject ──▶ rejected
      ▼                                    │ session starts, unapproved ──▶ canceled
   expired                    patient cancel (if allowed) ──▶ canceled
```

1. **Countdown**: Render countdown timer strictly from server's `payment_deadline`.
2. **Quota Release**: Once an appointment moves to `expired`, `rejected`, or `canceled`, Supabase RPC immediately restores available quota.
3. **QR Generation**: Only generated upon reaching `done` status (`qr_token`).
4. **Check-In Validation**: Staff camera scanner only permits check-in on the exact date of the session (`session_date = today`).
5. **Queue Assignment**: Queue numbers are sequentially allocated upon physical check-in.
6. **Rating Restriction**: Patients may only rate and review a doctor after appointment completion (`done`, checked-in, and consultation finished).

---

## 7. In-App Documentation (`/docs`) Architecture

To keep evaluator and new user onboarding seamless:
- Accessible at `/docs` (linked from Navbar & Footer).
- Structured with clean tabs:
  - **Tab 1: Pasien (Patient Guide)**: Doctor search, quota explanation, 30m payment countdown, and QR check-in guide.
  - **Tab 2: Admin & Staf (Admin Guide)**: Doctor/schedule CRUD, payment review steps, camera QR scanning, call next, and TV queue setup.
  - **Tab 3: Status & Aturan Kuota**: Visual diagram of the 6 transaction statuses and quota restoration mechanics.

---

## 8. Conventions & Coding Standards

- **Language**: Indonesian for UI labels and code comments. English for variable names, types, and function names.
- **Commits**: Conventional Commits in Indonesian (e.g., `feat(queue): implementasi scan qr check-in dan call next`).
- **Types**: Prefixed with `T` (e.g., `TDoctor`, `TAppointment`, `TProfile`).
- **Currency**: IDR only. Always format numbers using `formatRupiah()` from `src/lib/format.ts`.
- **Feedback & Modals**: Every destructive or modifying action (delete doctor, reject payment, cancel booking, call next, mark no-show) must show a confirmation popup dialog using `src/components/ui/modal.tsx`.

## 9. Documents

- **BRIEF.md**: Original MVP assignment and score weight breakdown.
- **PRD.md**: Product Requirements Document (Goals, Personas, Functional & Non-Functional Specs).
- **PLAN.md**: Step-by-step phased execution roadmap from Phase 0 to Phase 9.
- **TECH.md**: Deep technical architecture, end-to-end user journeys, database schemas, RPC functions, state machine.
- **INT.md**: Step-by-step Supabase integration guide (Setup, Migrations, Seed, Next.js 16 clients, Storage).
- **AGENT.md**: Coding rules, atomic design, responsive rules, restrictions, and conventions.
- **README.md**: Repository onboarding, project setup, and quickstart commands.
- dont put technical complexity in the README.md, keep it simple and concise for new developers.
- technical complexity should be in TECH.md and INT.md, not README.md.
- big picture architecture and design decisions should be in PRD.md
- Application flow development base on PRD.md and BRIEF.md, will be written in PLAN.md, and implemented in TECH.md and INT.md.

## 10. Testing
- **Unit Tests**: Use `vitest` + `@testing-library/react` for unit testing. Focus on schema validation, countdown logic, status transitions, and filter logic.
- ** Integration Tests**: Use `vitest` + `@testing-library/react` for integration testing.
- makesure all page loaded
- create simple test for each page, and make sure all page loaded without error