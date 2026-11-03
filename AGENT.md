# agent.md — Clinic Appointment Platform (Frontend)

Guide for AI agents working in this repo. **This is an MVP: keep it simple.**
Ship working features over clever abstractions. If something feels over-engineered, it probably is.

## 1. What this project is

A web app for **one clinic with many doctors**.

- **Patients**: browse doctors, book a practice session, upload payment proof, see history and QR, rate doctors.
- **Admin/Staff**: manage doctors, schedules, quotas, and appointments; review payments; run check-in and the queue; view stats.

Source of truth for scope: [BRIEF.md](./BRIEF.md). `PRD.md` is empty for now.

This repo is **frontend only**. The backend is a separate project (`Mini-Project.api`), reached through
`NEXT_PUBLIC_API_URL` (default `http://localhost:8000/api/v1`). Business rules such as quota, status changes,
expiry, SQL transactions, emails, and QR tokens are **enforced by the backend**. The frontend shows that state and blocks obviously invalid actions.

---

## 2. Current status (audited against the code on 2026-11-03)

Legend: ✅ done · 🟡 partial · ❌ not started (placeholder `ComingSoon` or missing)

### Patient side
| Area | Status | Where / notes |
|---|---|---|
| Landing page (doctors + specializations) | ✅ | `app/(user)/page.tsx`, `components/user/landing-page/*` |
| Doctor browsing: filter by specialist, fee, and day; debounced search; pagination; empty state | ✅ | `components/user/doctor/*`, `use-doctor-filters.ts` (filters stored in the URL) |
| Doctor detail page | ✅ | `app/(user)/(panel)/doctor/[doctorDetail]` |
| Booking + remaining quota per slot | ✅ | `components/user/booking/booking-form.tsx`, `useGetAvailability` |
| Payment proof upload + 30-min countdown | ✅ | `payment/[appointmentId]`, `payment-countdown.tsx` |
| Cancel appointment | ✅ | `cancel-appointment-modal.tsx` |
| History + QR (when `done`) + rating | ✅ | `history/`, `appointment-qr.tsx`, `rating-form.tsx` |
| Register / login / logout | ✅ | `components/user/auth/*`, `use-auth.ts` |
| Edit profile (name/phone) | ✅ | `profile-section.tsx` → `useUpdateMyPatient` |
| Change password | 🟡 | `password-section.tsx` is UI only, **TODO: no API call yet** |
| Forgot / reset password | ❌ | The login form links to `/lupa-password`, but **that page doesn't exist** |
| Profile picture upload | ❌ | Not implemented for patients |
| Reminder preferences | 🟡 | `reminder-section.tsx` is UI only (TODO). Low priority; reminders are sent by the backend |
| Logout button on profile page | 🟡 | TODO in `profile-view.tsx:118`; wire it to `useLogout` |

### Admin side (`/admin/*`, guarded by `RequireRole roles={['ADMIN','STAFF']}`)
| Area | Status | Where / notes |
|---|---|---|
| Admin login + add admin | ✅ | `components/admin/auth/*` |
| Doctor CRUD + photo + practice schedule & quota | ✅ | `components/admin/doctor/*` |
| Specialist CRUD | ✅ | `components/admin/specialist/*` |
| Payment review (view proof, approve, reject) | ✅ | `components/admin/payment/*`, `use-admin-appointments.ts` |
| Dashboard (summary cards) | ❌ | `admin/(panel)/dashboard` → ComingSoon |
| Statistics (charts by year/month/day, per doctor) | ❌ | `admin/(panel)/statistic` → ComingSoon |
| Appointment list per doctor session (patient, queue no., status) | ❌ | `admin/(panel)/appointmentManagement` → ComingSoon |
| Queue: QR check-in scanner, call next, no-show | ❌ | `admin/(panel)/queueManagement` → ComingSoon |
| Patient management | ❌ | `admin/(panel)/patientManagement` → ComingSoon (not in brief, so lowest priority) |
| Admin profile edit / picture / password | ❌ | No page yet |

### Public
| Area | Status | Notes |
|---|---|---|
| Live queue display (no login) | ❌ | No route yet. Suggested: `app/queue/page.tsx` |

### Cross-cutting
| Item | Status | Notes |
|---|---|---|
| Unit tests | ❌ | No test runner installed |
| Confirm dialog on modify actions | 🟡 | Exists for delete/cancel/review. Check every new action |
| Duplicate style tokens | 🟡 | `lib/styles.ts` (user) and `components/admin/styles.ts` (admin) overlap. Don't create a third copy |
| Large files | 🟡 | `doctor-form-modal.tsx` (424 lines), `schedule-modal.tsx` (397), `booking-form.tsx` (330). Split them only when you're touching them anyway |

---

## 3. How to continue: next phases (do them in order)

Each phase is a small PR. Finish it, then run lint/build/tests, then commit.

**Phase 1: Test setup (do it first so later features ship with tests)**
1. Add `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, and `jsdom`. Add `"test": "vitest"` to the scripts.
2. Write tests for what already exists: zod schemas (`validations/*`), `lib/format.ts`, `lib/schedule.ts`, `lib/appointment.ts`, `use-debounce`, and the `STATUS_META` mapping.

**Phase 2: Close the auth/profile gaps (Feature 2: Auth, 2 pts)**
1. Wire `password-section.tsx` to the backend change-password endpoint (add a hook in `use-auth.ts`).
2. Add `/lupa-password` (request reset email) and `/reset-password?token=` pages.
3. Profile picture upload for patient and admin (reuse the `useUploadDoctorPhoto` pattern).
4. Simple admin profile page `/admin/profile`, plus the logout TODO.

**Phase 3: Admin appointment list (part of Admin Dashboard, 4 pts)**
- `appointmentManagement`: pick doctor + date → session → table of patient name, queue no., and status. On mobile, show cards instead of a table.

**Phase 4: QR check-in and queue (4 pts)**
1. `queueManagement`: pick the session (today only), then scan QR with the camera. Add **one** small lib such as `@yudiel/react-qr-scanner` or `html5-qrcode`, with a manual "enter code" input as a fallback.
2. Show the queue list with "Call next" (checked-in patients only) and "No-show" buttons. Each action needs a confirm dialog.
3. Public `/queue` page: current and next numbers per doctor's ongoing session, refreshed with `refetchInterval: 5000`. **No WebSockets.**

**Phase 5: Dashboard and statistics (Admin Dashboard, 4 pts)**
1. Dashboard: 4–6 summary cards (today's appointments, waiting confirmation, done, revenue in IDR).
2. Statistics: add **one** chart lib (`recharts`). Use year/month/day tabs and a doctor filter. Bar and line charts are enough.

**Phase 6: Polish**
- Test every page at 360px and 1280px. Check empty, loading, and error states everywhere. Add tests for the new flows. Use realistic seed data.

> Before each phase, confirm the backend endpoint exists (ask the user if unsure). Don't invent an API shape silently. If you have to assume one, write it in `types/` with a comment `// ASUMSI: belum dikonfirmasi backend`.

---

## 4. Tech stack (don't add more unless needed)

| Concern | Use |
|---|---|
| Framework | Next.js 16 (App Router, `cacheComponents`), React 19, TypeScript strict |
| Styling | Tailwind CSS v4 + daisyUI 5 |
| Server state | TanStack Query v5 (`src/hooks/api/*`) |
| HTTP | axios via `src/config/axiosInstance.ts` (`withCredentials: true`, cookie auth) |
| Validation | zod v4 (`src/validations/*`) |
| Icons | lucide-react |
| QR display | qrcode.react |

Approved future additions (one each, only in the phase that needs it): **vitest + testing-library**, **recharts**, **one QR scanner lib**.

---

## 5. Basic restrictions (must follow)

**Scope**
- Only build what is in BRIEF.md. Ask before adding anything else.
- Don't modify the backend, and don't reimplement backend rules (quota math, status transitions, expiry, queue order) on the client.
- Don't rename or move existing routes; the sidebar and navbar links depend on them.
- Don't do large refactors or mass file moves. Improve code only in the files you're already changing.

**Dependencies**
- Don't add a package without a clear need. Never add a second library for the same job (no second HTTP client, form lib, state lib, UI kit, or date lib).
- Don't hand-edit `package-lock.json`.

**Security**
- No secrets in `NEXT_PUBLIC_*` variables or in code. Never commit `.env`.
- Auth comes from the HTTP-only cookie (`withCredentials`). Don't store tokens in `localStorage` or `sessionStorage`.
- Client guards (`RequireRole`, `RequirePatient`) are only for UX. Assume the backend checks roles too.
- No `dangerouslySetInnerHTML`. Validate every form with zod before submitting.

**Code quality**
- No `any`; use proper types in `src/types/`. No leftover `console.log`.
- API calls go only in `src/hooks/api/*`. Components never import `axiosInstance`.
- Keep components under ~200 lines. Split once a file passes that.
- `npm run lint` and `npm run build` (and `npm test` once Phase 1 is done) must pass before you say a task is done.

**Git**
- Small commits, Conventional Commits, with the message in Indonesian.
- Don't push, force-push, or rewrite history unless the user asks.

**Complexity**
- Keep it simple. Avoid clever abstractions, over-engineered patterns, or premature optimizations
- makesure new programmer can understand the code easily. Favor readability over cleverness.


---

## 6. Atomic design rule

We use atomic design **lightly**, mapped onto the current folders so nothing has to be moved now.

| Level | What it is | Location | Examples |
|---|---|---|---|
| **Atoms** | Smallest UI piece, no business logic, styled by props | `src/components/ui/atoms/` | Button, Input, Badge, Spinner, Avatar |
| **Molecules** | A few atoms combined, still generic | `src/components/ui/molecules/` | Field (label + input + error), PasswordInput, SearchInput (debounced), Modal, ConfirmDialog, Pagination, EmptyState, StatusBadge |
| **Organisms** | Feature sections that know the domain and may call hooks | `src/components/{user,admin}/<feature>/` | DoctorBrowser, BookingForm, PaymentManagement, QueueBoard |
| **Templates** | Page skeletons / layouts | `app/**/layout.tsx`, `AdminShell`, `Navbar`, `Footer` | Admin panel shell, user layout |
| **Pages** | Route entry. Thin: guard + template + organism | `app/**/page.tsx` | `doctor/page.tsx` |

Rules:
1. **Import direction only goes down**: pages → templates → organisms → molecules → atoms. An atom never imports a molecule, and nothing in `ui/` imports from `user/` or `admin/`.
2. **Atoms and molecules are dumb**: no react-query hooks, no axios, no routing. Data comes in through props and events go out through callbacks.
3. **Organisms own data**: they call `hooks/api/*`, handle loading/empty/error, and pass data down.
4. **Promote, don't predict**: a piece moves into `ui/` only once **two or more** features need it. Until then it stays in its feature folder.
5. **Existing files**: `components/ui/{field,modal,pagination,password-input}.tsx` are molecules. Leave them where they are, and move them into `ui/molecules/` only if you're already editing them. Update their imports in the same commit.
6. **Styles**: atoms read class tokens from `src/lib/styles.ts`. When you build an atom such as `Button`, take its variants (primary/secondary/danger) from there instead of copying class strings.
7. **Named exports for `ui/`** atoms and molecules. Feature organisms keep the existing default-export style.

---

## 7. Responsive UI rule

Responsiveness is **required** by the brief. Build mobile-first.

- **Breakpoints**: write the base (mobile) styles first, then add `sm:` (640), `md:` (768), and `lg:` (1024). Don't design desktop-first and patch it with `max-*`.
- **Test widths**: 360px, 768px, and 1280px. There must be **no horizontal page scroll** at 360px.
- **Tap targets**: interactive elements are at least 44px (`min-h-11`, already used in the style tokens).
- **Layout**:
  - Grids: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` for cards (doctors, stats).
  - Forms: one column on mobile, two columns from `md:` only when the fields are short.
  - Containers: `mx-auto w-full max-w-6xl px-4 md:px-6`.
- **Tables (admin)**: on mobile, show a card list or wrap the table in `overflow-x-auto` with the key columns first. Show the table from `md:` up.
- **Navigation**: admin sidebar is a drawer on mobile and collapsible on `lg:`. Keep the existing `AdminShell` behavior.
- **Modals**: near full-screen on mobile (`w-full`, scrollable body) and centered `max-w-lg` on desktop.
- **Images**: use `next/image` with `sizes`, a fixed aspect ratio (`aspect-square`/`aspect-video`), and `object-cover`.
- **Text**: base 16px for body text. Never shrink below `text-sm` for important info such as price, time, or queue number.
- **Live queue page**: large numbers (`text-6xl md:text-8xl`), readable from a distance on a TV, and still usable on a phone.
- **Accessibility basics**: visible focus ring (the existing `focus-visible:outline-*` tokens), a label on every input, `alt` on images, and enough color contrast.

---

## 8. Folder layout

```
src/
  app/
    (user)/                 # patient: landing, login, register
      (panel)/              # patient pages: doctor, treatment/booking, payment, history, profile
    admin/
      login/
      (panel)/              # admin pages (guarded in layout.tsx)
    queue/                  # (to add) public live queue display
  components/
    ui/                     # atoms/ + molecules/ (see §6)
    user/<feature>/         # patient organisms
    admin/<feature>/        # admin organisms
  hooks/
    api/use-<resource>.ts   # react-query hooks, one file per backend resource
    use-*.ts                # generic hooks (debounce, now, escape key, ...)
  lib/                      # pure helpers (format, schedule, appointment, api-error, styles)
  types/<resource>.ts       # API types, snake_case like the backend
  validations/<feature>/<name>.schema.ts
  constants/                # static data and label maps (STATUS_META, treatments)
```

## 9. Conventions

- **Language**: UI text and code comments in **Bahasa Indonesia**. Identifiers in English.
- **Types**: prefix with `T` (`TDoctor`, `TAppointment`). Fields are `snake_case` to match the backend.
- **Files**: `kebab-case.tsx`. Import with the `@/` alias.
- **Query hooks**: `useGetX`, `useCreateX`, `useUpdateX`, `useDeleteX`. The query key starts with a string like `'get-doctors'`. Invalidate related keys on mutation success. Follow `hooks/api/use-doctors.ts`.
- **Errors**: show them with `getApiErrorMessage(error, fallback)` from `src/lib/api-error.ts`.
- **Currency**: IDR only. Use `formatRupiah()`, `formatDate`, `formatTime`, and `formatCountdown` from `src/lib/format.ts`.
- **Filters/search**: store them in the URL search params, as in `use-doctor-filters.ts`.
- **Readability over cleverness**: plain `if`/`for` over dense one-liners.

## 10. Feature checklist (every feature)

- [ ] Protected route (`RequireRole` / `RequirePatient`), except the public pages: landing, doctor list, and `/queue`
- [ ] Responsive at 360 / 768 / 1280 (§7)
- [ ] Debounced search where there's a search bar
- [ ] Confirm dialog before create, update, delete, accept, reject, cancel, call-next, or no-show
- [ ] Loading, error, and **empty** states
- [ ] Unit tests: happy path plus one failure case
- [ ] Realistic Indonesian data (names, specializations, IDR prices)

## 11. Domain rules to respect in the UI

```
waiting_payment ──upload proof──▶ waiting_confirmation ──admin accept──▶ done (QR shown)
      │ 30 min no proof                    │ admin reject ──▶ rejected
      ▼                                    │ session starts, no decision ──▶ canceled
   expired                    patient cancel (if can_cancel) ──▶ canceled
```

- Countdown uses the server's `remaining_seconds` / `payment_deadline`.
- Released quota (after `expired`, `rejected`, or `canceled`) comes from the backend. Refetch; don't fake it.
- Disable booking when the slot has `remaining === 0`.
- QR only when the status is `done`. Rating only when `can_rate` is true. Cancel only when `can_cancel` is true.
- Check-in only on the session date. Call next only for checked-in patients. No-show after the patient is called or the session ends.

## 12. Testing

- Vitest + Testing Library with jsdom. Test files sit next to the code as `*.test.ts(x)`.
- Test logic first: schemas, `lib/*`, hooks, status → UI mapping, and then the key organisms with mocked hooks.
- No end-to-end tests for the MVP.

## 13. Commands

```bash
cp example.env .env   # once
npm install
npm run dev           # http://localhost:3000
npm run lint
npm run build
npm test              # after Phase 1
```

## 14. Open questions (ask the user before building)

1. **Membership plans**: the brief's objective mentions them, but no feature section describes them. Out of scope until confirmed.
2. **Queue number timing**: the brief says it's assigned **at check-in**. Current types say it's assigned **after admin approval** (`queue_number`). Confirm with the backend before Phase 4.
3. **Treatments**: present in the code (skin clinic, `treatment_fee`) but not in the brief. Keep them; don't expand them.
4. **Roles**: the brief says patient and admin. The code has `ADMIN | STAFF | DOCTOR | PATIENT`. Check-in and queue actions go to `ADMIN` and `STAFF`.
5. **Backend endpoints** for change/reset password, check-in, queue, and statistics: confirm that they exist and what shape they return.
