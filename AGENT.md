# agent.md — Clinic Appointment Platform (Frontend)

Guide for AI agents working in this repo. **This is an MVP: keep it simple.**
Ship working features over clever abstractions. If something feels over-engineered, it probably is.

## 1. What this project is

A web app for **one clinic with many doctors**.

- **Patients**: browse doctors, book a practice session, upload payment proof, see history and QR, rate doctors.
- **Admin**: manage doctors, schedules, quotas, and appointments; review payments; run check-in and the queue; view stats.

Source of truth for scope: [BRIEF.md](./BRIEF.md). `PRD.md` is empty for now.

This repo is **frontend only**. The backend is a separate project (`Mini-Project.api`), reached through
`NEXT_PUBLIC_API_URL` (default `http://localhost:8000/api/v1`). Business rules such as quota, status changes,
expiry, SQL transactions, emails, and QR tokens are **enforced by the backend**. The frontend shows that state and blocks obviously invalid actions.

## 2. Tech stack (don't add more unless needed)

| Concern | Use |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript strict |
| Styling | Tailwind CSS v4 + daisyUI 5 |
| Server state | TanStack Query v5 (`src/hooks/api/*`) |
| HTTP | axios via `src/config/axiosInstance.ts` (`withCredentials: true`, cookie auth) |
| Validation | zod v4 (`src/validations/*`) |
| Icons | lucide-react |
| QR | qrcode.react |

**Don't** add Redux/Zustand, a UI kit, a form library, or a date library unless a feature really can't be done without it.
Planned additions that are OK: a chart lib for statistics (e.g. `recharts`), a QR scanner for check-in, and Vitest + Testing Library for unit tests.

## 3. Folder layout

```
src/
  app/
    (user)/            # patient pages: landing, login, register
      (panel)/         # patient pages that need login: doctor, booking, payment, history, profile
    admin/
      login/
      (panel)/         # admin pages: dashboard, doctor/specialist/patient/appointment/queue mgmt, payment, statistic
  components/
    ui/                # generic reusable pieces (modal, field, pagination, password-input)
    user/<feature>/    # patient feature components
    admin/<feature>/   # admin feature components
  hooks/
    api/use-<resource>.ts   # one file per backend resource (react-query hooks)
    use-*.ts                # generic hooks (debounce, escape key, now, ...)
  lib/                 # pure helpers (format, schedule, appointment, api-error)
  types/<resource>.ts  # API response/request types (match backend shape)
  validations/<feature>/<name>.schema.ts
  constants/           # static data and label maps (e.g. STATUS_META)
```

Placement rules:
- `page.tsx` stays thin: guard, layout, and one feature component.
- Feature logic goes in `components/<area>/<feature>/`. Move it to `components/ui` only once **two or more** features use it.
- API calls go **only** in `hooks/api/*`. Never call axios directly from components.
- Pure functions (formatting, date math) go in `lib/`.

## 4. Conventions

- **Language**: UI text and code comments in **Bahasa Indonesia**. Identifiers in English.
- **Commits**: Conventional Commits with an Indonesian message, e.g. `feat(booking): tampilkan sisa kuota sesi`.
- **Types**: prefix with `T` (`TDoctor`, `TAppointment`). Fields are `snake_case` to match the backend.
- **Files**: `kebab-case.tsx`. Components use a default export. Hooks and helpers use named exports.
- **Imports**: use the `@/` alias for `src/`.
- **Query hooks**: `useGetX`, `useCreateX`, `useUpdateX`, `useDeleteX`. The query key starts with a string like `'get-doctors'`. Invalidate related keys on mutation success.
- **Errors**: show messages with `getApiErrorMessage(error, fallback)` from `src/lib/api-error.ts`.
- **Currency**: IDR only. Always use `formatRupiah()` from `src/lib/format.ts`; never hand-format prices. Use `formatDate`, `formatTime`, and `formatCountdown` from the same file.
- **Readability over cleverness**: write code that is easy to explain. Prefer plain `if`/`for` to dense one-liners.

## 5. Required in every feature (from the brief)

- [ ] **Protected route**: wrap with `RequireRole` (admin) or `RequirePatient` (patient).
- [ ] **Responsive**: mobile first, check at ~375px and desktop.
- [ ] **Debounced search**: use `useDebounce` / `useDebouncedCallback`.
- [ ] **Confirmation dialog** before any create, update, delete, accept, reject, cancel, or no-show action (use `components/ui/modal.tsx`).
- [ ] **Empty state** when a list, filter, or search returns nothing.
- [ ] **Loading and error states** for every query.
- [ ] **Unit tests** for each flow (see §7).
- [ ] **Realistic data**: Indonesian doctor names, specializations, and IDR prices.

## 6. Domain rules to respect in the UI

**Transaction status** (`TTransactionStatus`, labels in `src/constants/transaction-status.ts`):

```
waiting_payment ──upload proof──▶ waiting_confirmation ──admin accept──▶ done (QR shown)
      │ 30 min no proof                    │ admin reject ──▶ rejected
      ▼                                    │ session starts, no decision ──▶ canceled
   expired                    patient cancel (if can_cancel) ──▶ canceled
```

- Show a **30-minute countdown** on the payment page using the server's `remaining_seconds`/`payment_deadline`, not a client-only timer.
- After `expired`, `rejected`, or `canceled` the quota is released by the backend. Refetch availability; don't fake it on the client.
- Show **remaining quota** per session and disable booking when `remaining === 0`.
- **QR** is only shown when status is `done` (`qr_token`).
- **Rating** is only allowed when `can_rate` is true (appointment completed).
- **Check-in** happens only on the session date. Staff scan the QR, then the queue number follows check-in order.
- **Call next** applies only to checked-in patients. **No-show** can be marked once the number has been called or the session has ended.
- **Live queue page** is public (no login) and shows the current number plus the next numbers per doctor. Polling with react-query `refetchInterval` (e.g. 5s) is enough for the MVP; skip WebSockets.

## 7. Testing (keep it light)

- Use Vitest + @testing-library/react with jsdom.
- Test **logic first**: zod schemas, `lib/*` helpers, filter/countdown hooks, and status → UI mapping.
- Add one happy-path test plus one key failure test per flow (auth, browse/filter, booking, payment, admin review, check-in/queue, rating).
- Mock the API at the hook level. No end-to-end tests for the MVP.

## 8. Commands

```bash
cp example.env .env   # once
npm install
npm run dev           # http://localhost:3000
npm run lint
npm run build         # must pass before finishing a task
```

## 9. MVP scope guardrails

Do:
- Reuse existing components, hooks, and helpers before writing new ones.
- Follow the existing patterns in `hooks/api/use-doctors.ts` and `components/user/doctor/*`.
- Keep each change small and focused on one feature.

Don't:
- Add i18n, theming systems, SSR data fetching refactors, or global state libraries.
- Build generic "framework" layers (base repositories, HOCs for everything, config-driven forms).
- Reimplement backend rules (quota math, status transitions) on the client.
- Add features that aren't in BRIEF.md without asking.

## 10. Open questions (check with the user before building)

1. **Membership plans**: the brief's objective mentions them, but no feature section describes them. Treat as out of scope until confirmed.
2. **Queue number timing**: the brief says it's assigned **at check-in**. Current types say it's assigned **after admin approval**. Confirm which the backend does.
3. **Treatments**: the code has treatments (skin clinic, `treatment_fee`), which the brief doesn't mention. Keep them, but don't expand them.
4. **Roles**: the brief lists `patient` and `admin`. The code also has `STAFF` and `DOCTOR`. Use `ADMIN`/`STAFF` for check-in and queue actions unless told otherwise.
