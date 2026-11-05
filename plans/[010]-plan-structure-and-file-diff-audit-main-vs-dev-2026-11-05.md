# Plan [010] - Audit Perbedaan Struktur Folder & File: Branch main vs dev (Excluding /plans)

**Tanggal:** 2026-11-05  
**Konteks Repositori:** `clinic-appointment-platform`  
**Perbandingan Git:** `main..dev` *(Folder `plans/` Dikecualikan)*  
**Status:** ARCHITECTURE & CODEBASE DIFF AUDIT  

---

## 1. Ringkasan Eksekutif & Evolusi Arsitektur

Branch **`dev`** memuat evolusi platform dari implementasi pondasi awal (di branch `main`) menjadi sistem janji temu klinik kecantikan modern (*Beauty Clinic*) berbasis **Arsitektur 3-Tier**:
1. **Transisi Domain**: Dari klinik kesehatan umum menjadi klinik estetika & kecantikan (menampilkan dokter spesialis kulit/estetika, tindakan treatment dermapeel/laser/facial, dan konsultasi berkuota).
2. **Migrasi Data Layer**: Dari pemanggilan langsung Supabase di sisi browser dialihkan sepenuhnya menjadi konsumsi **Backend REST API Gateway** (`api-clinic-appointment` Express port 8000) via Axios singleton `apiClient`.
3. **Penyelesaian Modul Operasional**: Penyediaan panel admin lengkap (Scanner QR Check-in kamera, Panggilan Antrean Ruang Tunggu TV `/queue`, Dashboard Analitik Omzet & Grafik Recharts, serta Verifikasi Pembayaran 30 Menit).
4. **Peningkatan UX Pasien**: Penambahan fitur tiket QR dinamis, tombol Salin ID Reservasi ke clipboard, tombol Refresh Status reaktif, mekanisme auto-fetch nama dokter, dan alur pemulihan kata sandi.

Terdapat **76 file** yang ditambahkan atau dimodifikasi di branch `dev` di luar folder `plans/` (dengan total `+10.849` baris dan `-360` baris).

---

## 2. Listing File & Kegunaan Berdasarkan Kategori

### A. Root Config & Dokumentasi Proyek

| Path File | Status | Tujuan & Kegunaan Utama |
|---|:---:|---|
| **`AGENT.md`** | **Baru** | Pedoman baku teknis AI Agent/Developer: memuat *Frontend Pure REST API Rule*, aturan Atomic Design, checklist responsif mobile (360px), dan larangan keras auto-commit. |
| **`BRIEF.md`** | **Baru** | Spesifikasi kebutuhan MVP klinik janji temu asli dan pembagian bobot penilaian fitur. |
| **`PRD.md`** | **Baru** | *Product Requirements Document*: mendefinisikan persona pengguna (Pasien, Admin, Resepsionis), kebutuhan fungsional, dan batasan operasional klinik. |
| **`PLAN.md`** | **Baru** | Roadmap implementasi terstruktur dari Phase 0 hingga Phase 9 sesuai target pengerjaan. |
| **`TECH.md`** | **Baru** | Dokumentasi teknis arsitektur 3-tier, data fetching TanStack Query + Axios, alur transaksi pembayaran 30 menit, skema ERD PostgreSQL, dan RPC transaksional. |
| **`INT.md`** | **Baru** | Panduan integrasi sistem & koordinasi service: menghubungkan Frontend Next.js (port 3000) dan Backend Express API Gateway (port 8000). |
| **`README.md`** | Dimodifikasi | Panduan menjalankan aplikasi dari nol (*Zero-to-Running*), kredensial akun demo terverifikasi, dan struktur folder proyek. |
| **`example.env`** | Dimodifikasi | Template environment resmi yang menambahkan variabel `NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1`. |
| **`package.json`** | Dimodifikasi | Menambahkan dependensi baru (Axios, Lucide React, helper kompresi gambar, dan utility pendukung). |
| **`package-lock.json`** | Dimodifikasi | Lockfile dependensi npm yang tersinkronisasi. |

---

### B. Database PostgreSQL & Migrasi SQL (`supabase/`)

| Path File | Status | Tujuan & Kegunaan Utama |
|---|:---:|---|
| **`supabase/migrations/20261103000000_init_schema.sql`** | **Baru** | Skema awal seluruh tabel inti (`doctors`, `doctor_schedules`, `practice_sessions`, `appointments`, `payment_proofs`, `profiles`), RLS security policies, dan stored procedure booking atomik. |
| **`supabase/migrations/20261103000100_cron_jobs.sql`** | **Baru** | Konfigurasi job otomasi `pg_cron` untuk membatalkan booking yang melewati batas 30 menit serta mengembalikan kuota dokter secara otomatis. |
| **`supabase/migrations/20261103000200_allow_ongoing_booking.sql`** | **Baru** | Peningkatan fungsi RPC `book_appointment_atomic` agar mengizinkan reservasi sesi hari H yang sedang berjalan dan menerima bukti bayar Base64. |
| **`supabase/migrations/20261104000300_safe_checkin_anti_duplication.sql`** | **Baru** | Stored procedure transaksional `check_in_patient` dengan penguncian baris (`FOR UPDATE`) untuk mencegah duplikasi atau lompatan nomor antrean fisik saat multi-scanner aktif. |
| **`supabase/migrations/20261105000000_fix_rls_and_seed_dashboard.sql`** | **Baru** | Penyesuaian policy RLS pada tabel `appointments` dan perbaikan integritas status transaksi. |
| **`supabase/seed.sql`** | **Baru** | Dataset dasar master kategori spesialisasi dan profil dokter estetika. |
| **`supabase/wipe_and_seed_beauty_clinic.sql`** | **Baru** | Script SQL pembersihan total (*wipe*) dan pengisian ulang data ekosistem klinik kecantikan (5 dokter spesialis, jadwal hari ini, 3 akun demo, serta transaksi siap uji). |

---

### C. Scripts Utilitas & Pengujian Mandiri (`scripts/`)

| Path File | Status | Tujuan & Kegunaan Utama |
|---|:---:|---|
| **`scripts/seed-today-via-api.js`** | **Baru** | Script Node.js untuk membuat janji temu aktif hari ini murni melalui Backend REST API Gateway (`POST /appointments`). |
| **`scripts/seed-dashboard-data.js`** | **Baru** | Mengisi ragam data transaksi (menunggu verifikasi, antrean kedatangan, pendapatan) untuk menguji grafik & kartu metrik dashboard admin. |
| **`scripts/process-siti-checkin.js`** | **Baru** | Mensimulasikan alur verifikasi bukti bayar dan check-in resepsionis untuk akun pasien Siti. |
| **`scripts/complete-seed-flow.js`** | **Baru** | Script pengujian otomatis untuk memvalidasi siklus penuh 6 status janji temu (booking $\rightarrow$ bayar $\rightarrow$ verifikasi $\rightarrow$ check-in $\rightarrow$ selesai $\rightarrow$ rating). |

---

### D. Rute Aplikasi & Pages (`src/app/`)

| Path File | Status | Tujuan & Kegunaan Utama |
|---|:---:|---|
| **`src/app/queue/page.tsx`** | **Baru** | **Layar Antrean Publik TV**: Halaman monitor ruang tunggu klinik berlayar penuh dengan jam WIB realtime dan display nomor antrean yang sedang dilayani. |
| **`src/app/(user)/lupa-password/page.tsx`** | **Baru** | Halaman formulir pengiriman email instruksi pemulihan kata sandi pasien. |
| **`src/app/(user)/reset-password/page.tsx`** | **Baru** | Halaman formulir input password baru setelah pasien membuka link pemulihan di email. |
| **`src/app/(user)/(panel)/doctor/page.tsx`** | Dimodifikasi | Halaman direktori dokter estetika dengan debounce pencarian dan filter spesialisasi. |
| **`src/app/(user)/layout.tsx`** | Dimodifikasi | Layout pasien yang menyematkan navbar dan footer aesthetic clinic. |
| **`src/app/(user)/page.tsx`** | Dimodifikasi | Landing page klinik estetika: hero section, tab layanan perawatan kulit, dan kartu profil dokter unggulan. |
| **`src/app/admin/(panel)/appointmentManagement/page.tsx`** | Dimodifikasi | Rute panel admin yang memuat komponen tabel manajemen janji temu pasien. |
| **`src/app/admin/(panel)/dashboard/page.tsx`** | Dimodifikasi | Rute panel admin yang memuat komponen dashboard statistik operasional harian. |
| **`src/app/admin/(panel)/patientManagement/page.tsx`** | Dimodifikasi | Rute panel admin yang memuat direktori data pasien klinik. |
| **`src/app/admin/(panel)/queueManagement/page.tsx`** | Dimodifikasi | Rute panel admin yang memuat konsol antrean ruang dokter dan pemanggilan pasien. |
| **`src/app/admin/(panel)/statistic/page.tsx`** | Dimodifikasi | Rute panel admin yang memuat visualisasi grafik analitik pendapatan & tren pasien. |

---

### E. Komponen Panel Admin (`src/components/admin/`)

| Path File | Status | Tujuan & Kegunaan Utama |
|---|:---:|---|
| **`appointment/appointment-management.tsx`** | **Baru** | Tabel manajemen reservasi admin: pagination, pencarian kode/nama, filter status, tinjau bukti transfer, dan aksi pembatalan. |
| **`appointment/edit-appointment-modal.tsx`** | **Baru** | Modal popup bagi admin untuk mengubah sesi jadwal dokter atau status reservasi secara manual. |
| **`dashboard/admin-dashboard.tsx`** | **Baru** | Komponen dashboard admin: kartu statistik harian (Janji Hari Ini, Menunggu Antrean, Verifikasi Bayar, Pendapatan Hari Ini, Total Omzet) dengan tombol segarkan data. |
| **`patient/patient-management.tsx`** | **Baru** | Tabel administrasi pasien: melihat riwayat kunjungan pasien, kontak, dan status keaktifan. |
| **`queue/admin-floating-scanner.tsx`** | **Baru** | Komponen scanner QR Code kamera yang mengapung di layar admin agar resepsionis dapat memindai tiket pasien kapan saja. |
| **`queue/queue-management.tsx`** | **Baru** | Konsol antrean dokter: tombol panggil antrean berikutnya (*call next*), panggil ulang (*recall*), tandai tidak hadir (*no-show*), dan selesaikan konsultasi. |
| **`statistic/admin-statistic.tsx`** | **Baru** | Visualisasi analitik grafik pendapatan dan kunjungan pasien menggunakan Recharts (filter harian, bulanan, tahunan, atau per dokter). |
| **`admin-shell.tsx`** | Dimodifikasi | Layout wrapper admin dengan top navigation bar dan tombol aksi cepat. |
| **`sidebar.tsx`** | Dimodifikasi | Menu navigasi vertikal panel admin dengan indikator status rute aktif. |
| **`auth/admin-login-form.tsx`** | Dimodifikasi | Formulir login akun staf/admin klinik dengan validasi Zod dan integrasi REST API login. |
| **`payment/payment-management.tsx`** | Dimodifikasi | Tabel daftar pembayaran yang menunggu verifikasi admin beserta countdown batas waktu bayar. |
| **`payment/payment-review-modal.tsx`** | Dimodifikasi | Modal preview foto bukti transfer transfer bank dengan aksi terima (*approve*) atau tolak (*reject* dengan alasan). |

---

### F. Komponen Fitur Pasien (`src/components/user/`)

| Path File | Status | Tujuan & Kegunaan Utama |
|---|:---:|---|
| **`booking/appointment-qr.tsx`** | Dimodifikasi | Tiket QR Code kedatangan dinamis (sebelum check-in vs sesudah check-in), tombol Salin ID Reservasi ke clipboard, dan tombol Salin Kode Reservasi. |
| **`booking/payment-upload.tsx`** | Dimodifikasi | Halaman pembayaran 30 menit: dilengkapi tombol **Refresh Status** reaktif, countdown timer, informasi rekening, dan form upload bukti bayar. |
| **`booking/payment-summary.tsx`** | Dimodifikasi | Ringkasan janji temu yang dilengkapi mekanisme **auto-fetch detail dokter** jika nama belum terisi dan tombol salin ID. |
| **`booking/booking-form.tsx`** | Dimodifikasi | Formulir pemesanan sesi praktik dokter: pemilihan tanggal, slot kuota realtime, dan pencegahan booking ganda. |
| **`history/appointment-card.tsx`** | Dimodifikasi | Kartu riwayat janji temu dengan badge status visual, timer sisa bayar, modal bukti transfer, tombol salin kode, dan form ulasan bintang. |
| **`profile/profile-section.tsx`** | Dimodifikasi | Formulir edit profil pasien (nama, tanggal lahir, jenis kelamin, telepon, alamat) yang terhubung ke `PATCH /patients/me`. |
| **`profile/password-section.tsx`** | Dimodifikasi | Formulir perubahan kata sandi pasien dengan validasi kecocokan password baru. |
| **`profile/profile-utils.ts`** | Dimodifikasi | Helper format data form profil dan pemetaan nilai tanggal lahir. |
| **`landing-page/doctors-section.tsx`** | Dimodifikasi | Bagian profil dokter pilihan pada halaman beranda klinik estetika. |
| **`landing-page/treatment-tabs.tsx`** | Dimodifikasi | Tab navigasi pilihan paket treatment kecantikan (Acne, Glowing, Anti-Aging, Laser). |
| **`auth/login-form.tsx`** | Dimodifikasi | Form login pasien dengan direct link ke lupa password dan redirect dashboard. |
| **`account-menu.tsx`** | Dimodifikasi | Dropdown navigasi akun pasien (profil, riwayat janji temu, dan tombol keluar). |
| **`navbar.tsx`** | Dimodifikasi | Header navigasi publik yang responsif dengan link treatment, dokter, jadwal, dan status login. |
| **`footer.tsx`** | Dimodifikasi | Footer informasi klinik (jam operasional, alamat, kontak WhatsApp, dan legalitas). |
| **`components/ui/modal.tsx`** | Dimodifikasi | Komponen modal dialog atomik dengan aksesibilitas ESC keyboard dan backdrop blur. |

---

### G. Data Layer, Hooks & Utilities (`src/lib/`, `src/hooks/`, `src/types/`, `src/constants/`)

| Path File | Status | Tujuan & Kegunaan Utama |
|---|:---:|---|
| **`src/lib/api-client.ts`** | **Baru** | Singleton Axios instance yang menyematkan Bearer Token otomatis, meng-unbox envelope response API, dan menangani error HTTP secara terpusat. |
| **`src/lib/image-compression.ts`** | **Baru** | Utilitas kompresi gambar foto bukti transfer di sisi browser pasien sebelum dikirimkan ke server. |
| **`src/lib/supabase/client.ts`** | **Baru** | Helper inisialisasi browser Supabase client untuk kebutuhan channel WebSocket Realtime antrean TV. |
| **`src/lib/supabase/server.ts`** | **Baru** | Helper inisialisasi server-side Supabase client untuk autentikasi SSR. |
| **`src/proxy.ts`** | **Baru** | Server-side proxy middleware untuk validasi sesi cookie. |
| **`src/lib/format.ts`** | Dimodifikasi | Helper format waktu `formatTime` (mendukung PostgreSQL `time` `"10:00:00"`, ISO string, dan Date), `formatRupiah`, dan `formatDate`. |
| **`src/lib/api-error.ts`** | Dimodifikasi | Parser pesan error API standar backend (ekstraksi status code, pesan validasi Zod, dan network error). |
| **`src/constants/treatments.ts`** | Dimodifikasi | Master data katalog treatment estetika (slug, nama, kategori spesialisasi, deskripsi, estimasi durasi, dan rentang harga). |
| **`src/types/appointment.ts`** | Dimodifikasi | Interface TypeScript untuk entitas janji temu, slot ketersediaan dokter, review, dan bukti bayar. |
| **`src/types/auth.ts`** | Dimodifikasi | Tipe data sesi pengguna, profile, dan token payload JWT. |
| **`src/hooks/api/use-admin-appointments.ts`** | Dimodifikasi | React Query hooks untuk operasional admin (fetch metrik dashboard, daftar antrean, persetujuan pembayaran, check-in pasien, statistik Recharts). |
| **`src/hooks/api/use-appointments.ts`** | Dimodifikasi | React Query hooks untuk pasien (cek slot kuota dokter, booking sesi, unggah bukti bayar, detail janji temu, riwayat, dan rating). |
| **`src/hooks/api/use-doctors.ts`** | Dimodifikasi | React Query hooks untuk direktori dokter, pencarian dengan debounce, filter spesialis, dan detail profil dokter. |
| **`src/hooks/api/use-auth.ts`** | Dimodifikasi | React Query hooks untuk autentikasi (login, register, forgot password, reset password, dan sesi akun). |
| **`src/hooks/api/use-patient.ts`** | Dimodifikasi | React Query hooks untuk query dan mutasi data profil pasien (`useGetMyPatient`, `useUpdateMyPatient`). |
| **`src/hooks/api/use-schedules.ts`** | Dimodifikasi | React Query hooks untuk data jadwal praktik dokter. |
| **`src/hooks/api/use-specialists.ts`** | Dimodifikasi | React Query hooks untuk daftar spesialisasi dokter estetika. |

