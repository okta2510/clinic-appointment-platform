# PLAN.md — Roadmap Eksekusi Platform Janji Temu Klinik (MVP)

Dokumen ini adalah rencana kerja bertahap (*step-by-step roadmap*) untuk membangun dan menyelesaikan Platform Janji Temu Klinik. Disusun dengan mengacu langsung pada alur fitur di [BRIEF.md](./BRIEF.md), dengan arsitektur modern berbasis **Next.js 16 + Supabase** (lihat [TECH.md](./TECH.md) dan [INT.md](./INT.md)).

> **Prinsip Utama**: **MVP Sederhana & Fungsional**. Hindari abstraksi berlebihan. Selesaikan satu fase hingga lolos uji (lint, build, test), baru lanjutkan ke fase berikutnya.

---

## Ringkasan Tahapan (Phase Overview)

```
[Phase 0] Integrasi Fondasi Supabase (Auth, DB Schema, Storage, Types)
   │
[Phase 1] Setup Testing Ringan (Vitest, Schema, Lib Helpers)
   │
[Phase 2] Modul 1: Discovery Dokter & Kelola Jadwal (Landing, Filter, CRUD)
   │
[Phase 3] Modul 2: Booking Janji & Transaksi (RPC Lock Kuota, Bukti Bayar 30m, pg_cron)
   │
[Phase 4] Modul 3: Riwayat Janji & Rating Dokter (Tiket QR, Ulasan Pasca Selesai)
   │
[Phase 5] Modul 4: Autentikasi & Profil (Role Guard, Reset Password, Avatar)
   │
[Phase 6] Modul 5: QR Check-In & Live Queue (Scan Kamera, Call Next, Layar TV Realtime)
   │
[Phase 7] Modul 6: Admin Dashboard & Statistik (Grafik Recharts, Review Pembayaran)
   │
[Phase 8] Halaman Dokumentasi Aplikasi (/docs) (Panduan Alur Pasien & Admin)
   │
[Phase 9] Audit Responsif Mobile (360px) & Final Polish
```

---

## Detail Tahapan Eksekusi

### Phase 0: Fondasi Integrasi Supabase (Pondasi Backend BaaS)
**Tujuan**: Mengganti ketergantungan API eksternal menjadi koneksi langsung ke Supabase dengan hak akses yang aman melalui RLS dan RPC.

- [ ] **Langkah 0.1**: Instal dependensi Supabase: `@supabase/supabase-js` dan `@supabase/ssr`.
- [ ] **Langkah 0.2**: Buat client helper di `src/lib/supabase/`:
  - `client.ts` (`createBrowserClient` untuk Client Components)
  - `server.ts` (`createServerClient` untuk Server Components & Route Handlers)
- [ ] **Langkah 0.3**: Setup `src/proxy.ts` (Next.js 16) untuk sinkronisasi cookie sesi autentikasi.
- [ ] **Langkah 0.4**: Eksekusi migrasi database di project Supabase:
  - `supabase/migrations/20261103000000_init_schema.sql` (Tabel, Enum, Trigger, RLS, Storage, RPC)
  - `supabase/migrations/20261103000100_cron_jobs.sql` (pg_cron pemulihan kuota & kedaluwarsa 30m)
  - `supabase/seed.sql` (Data awal spesialis, dokter, jadwal, dan akun admin)
- [ ] **Langkah 0.5**: Perbarui file tipe TypeScript `src/types/database.types.ts` agar sinkron dengan skema Supabase.
- **Verifikasi**: Jalankan `npm run dev`, pastikan client Supabase berhasil inisialisasi tanpa error console.

---

### Phase 1: Setup Testing Ringan (Test Setup)
**Tujuan**: Menyiapkan testing runner agar fitur-fitur berikutnya dapat diuji secara otomatis sejak dini (sesuai catatan BRIEF.md: *"Unit tests should be created for each flow"*).

- [ ] **Langkah 1.1**: Pasang `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, dan `jsdom`.
- [ ] **Langkah 1.2**: Tambahkan skrip `"test": "vitest run"` dan `"test:watch": "vitest"` di `package.json`.
- [ ] **Langkah 1.3**: Buat unit test awal untuk helper murni:
  - `src/lib/format.test.ts` (uji `formatRupiah`, `formatDate`, `formatTime`, `formatCountdown`)
  - `src/validations/login/login.schema.test.ts`
  - `src/validations/doctor/doctor.schema.test.ts`
- **Verifikasi**: `npm test` berjalan sukses dan hijau.

---

### Phase 2: Discovery Dokter & Kelola Jadwal (BRIEF.md Feature 1.1 - 4 Poin)
**Tujuan**: Pasien dapat mencari dan memfilter dokter dengan cepat; Admin dapat mengelola master dokter & kuota jadwal.

- [ ] **Langkah 2.1**: Refactor query `use-doctors.ts` dan `use-specialists.ts` agar membaca langsung dari tabel `doctors`, `specialists`, dan `doctor_schedules` via Supabase client.
- [ ] **Langkah 2.2**: Hubungkan landing page (`src/app/(user)/page.tsx`) dan halaman pencarian dokter (`/doctor`):
  - Pencarian dengan *debounce* 400ms (`use-debounce.ts`).
  - Filter: spesialisasi, rentang tarif konsultasi, dan hari praktik.
  - State kosong (*empty state*) bila dokter tidak ditemukan.
  - Paginasi dokter yang tersimpan pada URL query params.
- [ ] **Langkah 2.3**: Profil dokter (`/doctor/[id]`): menampilkan info dokter, tarif IDR, ulasan pasien, serta jadwal praktik aktif.
- [ ] **Langkah 2.4**: Admin Panel Dokter & Jadwal (`/admin/doctorManagement`):
  - Form modal tambah/edit dokter beserta upload foto ke bucket `doctor-photos`.
  - Form modal jadwal praktik: set hari, jam mulai, jam selesai, dan **kuota pasien** per sesi.
  - Modal konfirmasi sebelum menghapus atau menonaktifkan dokter.
- **Verifikasi**: Buat test pencarian & filter dokter (`use-doctor-filters.test.ts`).

---

### Phase 3: Booking Janji Temu & Transaksi (BRIEF.md Feature 1.2 - 4 Poin)
**Tujuan**: Pasien memilih sesi berkuota, sistem mengunci baris (*row lock*) untuk mencegah *overbooking*, upload bukti transfer 30 menit, dan pemulihan kuota otomatis.

- [ ] **Langkah 3.1**: Tampilkan ketersediaan kuota slot via RPC `get_availability(doctor_id, date)`:
  - Tampilkan `sisa kuota = quota - booked`.
  - Nonaktifkan tombol pilih jika sisa kuota = 0.
- [ ] **Langkah 3.2**: Alur Checkout Janji Temu (`/treatment/.../booking` atau `/doctor/[id]/booking`):
  - Panggil RPC database `book_appointment(p_schedule_id, p_date)`.
  - Otomatis menetapkan `status = 'waiting_payment'` dan `payment_deadline = now() + 30 menit`.
- [ ] **Langkah 3.3**: Halaman Pembayaran (`/payment/[appointmentId]`):
  - Tampilkan countdown mundur 30 menit dari `payment_deadline`.
  - Upload bukti transfer ke Storage Supabase bucket `payment-proofs` privat (path: `<user_id>/<file>`).
  - Panggil RPC `submit_payment_proof(appointment_id, path)` -> status berubah menjadi `waiting_confirmation`.
- [ ] **Langkah 3.4**: Pembatalan oleh Pasien:
  - Tombol batal aktif selama status `waiting_payment` atau `waiting_confirmation`.
  - Panggil RPC `cancel_appointment` dengan modal konfirmasi.
  - Kuota sesi langsung terlepas dan nomor urut antrean dirapikan kembali (`renumber_bookings`).
- [ ] **Langkah 3.5**: Otomasi Status (pg_cron):
  - Sesi yang tidak ada upload bukti dalam 30 menit -> otomatis `expired`.
  - Transaksi yang belum disetujui hingga jam mulai sesi praktik -> otomatis `canceled`.
- **Verifikasi**: Uji simulasi alur status transaksi di `src/lib/appointment.test.ts`.

---

### Phase 4: Riwayat Janji Temu & Rating Dokter (BRIEF.md Feature 1.3 - 2 Poin)
**Tujuan**: Pasien dapat memantau riwayat janji, melihat QR tiket resmi, dan memberikan ulasan objektif pasca layanan selesai.

- [ ] **Langkah 4.1**: Halaman Riwayat (`/history`):
  - List janji temu dengan badge warna 6 status (`STATUS_META`).
  - Menampilkan nama dokter, tanggal & jam sesi, nomor booking, dan biaya IDR.
- [ ] **Langkah 4.2**: Generate QR Code Tiket:
  - Jika status transaksi = `done`, render QR code menggunakan library `qrcode.react` dengan nilai `qr_token`.
  - Tampilkan tombol simpan/unduh gambar QR atau buka detail tiket.
- [ ] **Langkah 4.3**: Formulir Rating & Ulasan Dokter:
  - Rating (1–5 bintang) dan ulasan teks hanya muncul jika janji temu berstatus `done` dan telah selesai diperiksa (`can_rate = true`).
  - Panggil RPC `rate_appointment`.
  - Nilai rating langsung memperbarui rata-rata bintang dokter di profil publik.
- **Verifikasi**: Uji komponen rating dan aturan tampil QR code.

---

### Phase 5: Autentikasi & Manajemen Profil (BRIEF.md Feature 2.1 - 2 Poin)
**Tujuan**: Akses aman berbasis role (`patient` vs `admin`), proteksi rute, dan kelola profil mandiri.

- [ ] **Langkah 5.1**: Integrasi Supabase Auth pada form login & register pasien:
  - Pasien mendaftar -> otomatis membuat record di tabel `public.profiles` via database trigger `on_auth_user_created`.
  - Login menyimpan session token di cookie HTTP-only via `@supabase/ssr`.
- [ ] **Langkah 5.2**: Pembuatan Akun Admin (`/admin/register`):
  - Hanya dapat diakses oleh admin yang sudah login.
  - RPC/Function pendaftaran staf/admin baru.
- [ ] **Langkah 5.3**: Halaman Ubah Password & Lupa Password:
  - Sambungkan form ganti password di profil ke `supabase.auth.updateUser({ password: newPassword })`.
  - Buat halaman `/lupa-password` (kirim link reset ke email via `supabase.auth.resetPasswordForEmail`).
  - Buat halaman `/reset-password` untuk memasukkan password baru.
- [ ] **Langkah 5.4**: Upload Foto Profil Pasien & Admin ke bucket `avatars`.
- **Verifikasi**: Uji fungsi login gagal, form validasi password minimal 8 karakter, dan proteksi role.

---

### Phase 6: QR Check-In & Layar Antrean Langsung (BRIEF.md Feature 2.2 - 4 Poin)
**Tujuan**: Staf klinik melakukan check-in pasien via scan kamera fisik; nomor antrean diterbitkan sesuai urutan kedatangan; TV ruang tunggu menampilkan live queue realtime.

- [ ] **Langkah 6.1**: Scanner QR di Admin Queue Management (`/admin/queueManagement`):
  - Integrasi kamera pemindai QR (menggunakan `@yudiel/react-qr-scanner` atau `html5-qrcode`) dengan opsi input manual token jika kamera bermasalah.
  - Validasi hari H: sistem menolak jika tanggal sesi bukan hari ini.
  - Panggil RPC `check_in(p_qr_token)` -> mencatat waktu kedatangan & menetapkan `queue_number` (1, 2, 3...) sesuai urutan kedatangan fisik.
- [ ] **Langkah 6.2**: Pemanggilan Antrean (*Call Next Patient*):
  - Tombol "Panggil Berikutnya" di panel antrean admin.
  - Menampilkan konfirmasi popup sebelum memajukan nomor yang sedang dilayani.
  - Hanya pasien yang telah check-in yang dapat dipanggil.
- [ ] **Langkah 6.3**: Penanganan Pasien Tidak Hadir (*No-Show*):
  - Tombol "Tandai Tidak Hadir" (*mark no-show*) dengan popup konfirmasi.
  - Dapat ditandai jika sesi telah selesai atau antrean terlewati.
- [ ] **Langkah 6.4**: Layar Antrean Publik Realtime (`/queue`):
  - Halaman publik layar penuh (tanpa perlu login) cocok untuk display TV ruang tunggu klinik.
  - Tipografi besar (`text-7xl` / `text-9xl`) menampilkan nama dokter, nomor yang sedang dilayani, dan 3 nomor berikutnya.
  - Menggunakan **Supabase Realtime** (`postgres_changes` pada tabel `practice_sessions`), dengan fallback polling setiap 5 detik.
- **Verifikasi**: Uji alur check-in pada tanggal yang salah (harus ditolak), dan tes perubahan realtime live queue.

---

### Phase 7: Admin Dashboard & Visualisasi Statistik (BRIEF.md Feature 2.3 - 4 Poin)
**Tujuan**: Admin memantau operasional klinik, memverifikasi bukti bayar, dan melihat grafik performa.

- [ ] **Langkah 7.1**: Admin Dashboard Operasional (`/admin/dashboard`):
  - 4 Kartu Metrik Utama: Janji Hari Ini, Menunggu Verifikasi Pembayaran, Selesai Dilayani, dan Total Estimasi Pendapatan.
  - Shortcut cepat ke antrean hari ini dan verifikasi pembayaran.
- [ ] **Langkah 7.2**: Verifikasi Pembayaran (`/admin/payment`):
  - Tampilkan daftar pasien yang mengunggah bukti bayar (`waiting_confirmation`).
  - Modal peninjau foto bukti bayar dengan tombol:
    - **Terima**: Panggil RPC `approve_appointment` -> status menjadi `done` dan QR terbit.
    - **Tolak**: Modal konfirmasi dengan input alasan penolakan -> panggil RPC `reject_appointment` -> kuota dikembalikan.
- [ ] **Langkah 7.3**: Daftar Janji Temu Per Sesi (`/admin/appointmentManagement`):
  - Filter dokter dan tanggal sesi.
  - Tabel interaktif: Nama pasien, waktu, nomor antrean, status transaksi, status check-in.
- [ ] **Langkah 7.4**: Visualisasi Grafik Statistik (`/admin/statistic`):
  - Pasang satu library grafik ringan: `recharts`.
  - Filter rentang waktu: per hari, per bulan, dan per tahun, serta filter per dokter.
  - Grafik batang/garis: Tren jumlah kunjungan (selesai vs batal/ditolak) dan grafik total pendapatan (IDR).
- **Verifikasi**: Uji respon RPC `get_appointment_stats` dan render grafik tanpa error.

---

### Phase 8: Halaman Dokumentasi Aplikasi Terbuka (`/docs`) (Rencana Baru)
**Tujuan**: Memberikan panduan penggunaan aplikasi yang interaktif dan mudah dipahami oleh evaluator, pasien baru, maupun staf admin baru langsung di browser.

- [ ] **Langkah 8.1**: Buat halaman publik baru `src/app/docs/page.tsx` (dapat diakses dari footer/navbar).
- [ ] **Langkah 8.2**: Struktur Tab Sederhana (Clean & Minimalis):
  - **Tab 1: Panduan Pasien**:
    - Alur pencarian dokter & pemahaman sisa kuota sesi.
    - Batas waktu upload bukti transfer 30 menit.
    - Cara membawa tiket QR code saat datang ke klinik.
    - Cara memberikan rating setelah konsultasi.
  - **Tab 2: Panduan Admin / Staf**:
    - Cara mendaftarkan dokter baru & mengatur kuota jadwal praktik.
    - Prosedur verifikasi bukti transfer (terima vs tolak).
    - Prosedur scan QR check-in di pintu klinik.
    - Cara memanggil antrean (*call next*) dan mengaktifkan layar TV ruang tunggu (`/queue`).
  - **Tab 3: Kamus Status & Aturan Kuota**:
    - Diagram alur 6 status transaksi.
    - Aturan pemulihan kuota otomatis jika ada pembatalan/expired.
- [ ] **Langkah 8.3**: Tautan cepat ke halaman demo (misal: "Coba Layar Antrean TV ->", "Lihat Daftar Dokter ->").
- **Verifikasi**: Buka `/docs`, pastikan navigasi tab lancar, tidak ada layout berantakan di HP (360px), dan bahasa mudah dipahami orang non-teknis.

---

### Phase 9: Audit Responsif, Konfirmasi Dialog, & Final Polish
**Tujuan**: Memastikan seluruh poin catatan teknis (*Notes*) pada BRIEF.md terpenuhi secara menyeluruh.

- [ ] **Langkah 9.1**: Audit Responsif 3 Resolusi:
  - Ponsel kecil (360px): Form satu kolom, tabel berubah menjadi susunan kartu, modal muat di layar tanpa terpotong.
  - Tablet (768px): Grid 2 kolom, navigasi drawer rapi.
  - Desktop / TV (1280px+): Tampilan lega, live queue nomor antrean terbaca jelas dari jarak jauh.
- [ ] **Langkah 9.2**: Audit Dialog Konfirmasi:
  - Pastikan setiap aksi ubah/hapus (hapus dokter, tolak bayar, batalkan booking, call next, no show) memicu modal popup konfirmasi `src/components/ui/modal.tsx`.
- [ ] **Langkah 9.3**: Format Mata Uang IDR:
  - Pastikan tidak ada harga yang ditulis manual, semuanya menggunakan fungsi `formatRupiah()`.
- [ ] **Langkah 9.4**: Verifikasi Akhir:
  - `npm run lint` -> 0 error / warning.
  - `npm run build` -> berhasil tanpa warning SSR/Hydration.
  - `npm test` -> semua unit test hijau.

---

## Matriks Pelacakan Fitur BRIEF.md vs Tahapan PLAN.md

| Fitur di BRIEF.md | Bobot | Fase di PLAN.md | Status Target |
|---|---|---|---|
| **1.1 Doctor Discovery & Schedule** | 4 Poin | Phase 2 | Landing page, Debounce search, Filter, Admin CRUD Dokter & Kuota |
| **1.2 Booking & Transaction** | 4 Poin | Phase 3 | RPC Lock kuota, 30m countdown, 6 status, pg_cron auto cancel/expired |
| **1.3 History & Ratings** | 2 Poin | Phase 4 | List riwayat, QR done, rating pasca periksa |
| **2.1 Authentication & Auth** | 2 Poin | Phase 5 | Supabase Auth, Role guard, Reset password, Profile avatar |
| **2.2 QR Check-In & Live Queue** | 4 Poin | Phase 6 | Camera scanner, auto queue number, TV screen `/queue`, Call Next, No-show |
| **2.3 Admin Dashboard & Stats** | 4 Poin | Phase 7 | Ringkasan metrik, verifikasi bukti bayar, Recharts grafik statistik |
| **Dokumentasi In-App** | Nilai Tambah | Phase 8 | Halaman `/docs` interaktif (Pasien, Admin, Status) |
| **Quality & Tests** | Wajib | Phase 1 & 9 | Vitest, responsif 360px, modal konfirmasi, ACID RPC |

---

## Petunjuk untuk Pengembang Baru yang Melanjutkan Project Ini

1. **Jangan melompati fase**: Mulai dari Phase 0 (Supabase setup) dan Phase 1 (Testing), pastikan database sudah terpasang migration dan seed.
2. **Lihat dokumen pendukung**:
   - Jika bingung cara kerja teknis sistem -> baca [TECH.md](./TECH.md).
   - Jika bingung cara menghubungkan Supabase -> ikuti tutorial langkah demi langkah di [INT.md](./INT.md).
   - Jika ingin tahu aturan coding dan standar penulisan kode -> baca [agent.md](./agent.md).
3. **Commit secara berkala**: Setiap menyelesaikan satu sub-langkah (misal Langkah 2.1), jalankan lint dan test, lalu commit dengan format Conventional Commit bahasa Indonesia (misal: `feat(doctor): migrasi query dokter ke supabase client`).

