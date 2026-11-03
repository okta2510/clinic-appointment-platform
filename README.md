# Clinic Appointment Platform — Frontend

MVP web app for **one clinic with multiple doctors**. Patients browse doctors, book a practice session, pay (by uploading proof), and receive a QR code for check-in. Admin and staff manage doctors, schedules, payments, the queue, and statistics.

- Scope: [BRIEF.md](./BRIEF.md)
- Rules for AI agents and contributors: [agent.md](./agent.md)
- Backend: separate repo (`Mini-Project.api`), configured with `NEXT_PUBLIC_API_URL`

## Tech Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 + daisyUI 5 · TanStack Query v5 · axios · zod · lucide-react · qrcode.react

## Getting Started

```bash
cp example.env .env      # set NEXT_PUBLIC_API_URL (default http://localhost:8000/api/v1)
npm install
npm run dev              # http://localhost:3000
```

| Script | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | ESLint |

The backend must be running for login and data to work. Auth uses an HTTP-only cookie (`withCredentials: true`).

## Project Structure

```
src/
  app/(user)/        # patient pages (landing, auth, doctor, booking, payment, history, profile)
  app/admin/         # admin login + guarded panel (ADMIN, STAFF)
  components/ui/     # shared atoms and molecules
  components/user/   # patient feature components
  components/admin/  # admin feature components
  hooks/api/         # react-query hooks (the only place that calls the API)
  lib/  types/  validations/  constants/
```

The structure follows a light **atomic design** approach. See `agent.md` §6.

## Progress

### Done ✅
- Landing page, doctor browsing (search with debounce, filters by specialist, fee, and day; pagination; empty state), doctor detail
- Booking with remaining quota per slot, payment proof upload with a 30-minute countdown, cancel appointment
- Appointment history, QR code for confirmed appointments, rating after the appointment is completed
- Patient register/login/logout, edit profile
- Admin login, add admin, doctor CRUD (photo, practice schedule, quota), specialist CRUD, payment review (approve/reject)

### In progress / partial 🟡
- Change password (UI only, not connected to the API)
- Reminder preferences (UI only)

### To do ❌
- Forgot/reset password page (`/lupa-password` link exists, page missing), profile picture upload, admin profile
- Admin: dashboard, statistics charts, appointment list per session, patient management
- QR check-in scanner, call next, no-show, public live queue page (`/queue`)
- Unit tests (no test runner yet)

The order to build the remaining work in is described in `agent.md` §3:
1. Tests
2. Auth gaps
3. Admin appointment list
4. Check-in & queue
5. Dashboard & statistics
6. Polish

## Changelog

### 2026-11-03: Project analysis & agent guide
- Analyzed `BRIEF.md` against the existing codebase and recorded feature status.
- Added `agent.md` with:
  - the current status audit and the next phases
  - basic restrictions: scope, dependencies, security, code quality, git
  - the atomic design rule and responsive UI rules
  - conventions, a per-feature checklist, domain rules, and open questions
- Replaced the default create-next-app README with this project overview.

## Open Questions

See `agent.md` §14. These cover membership plans, when the queue number is assigned (at check-in or at approval), roles, and which backend endpoints exist for password reset, check-in, queue, and statistics.
