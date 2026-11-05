# Clinic Appointment Platform (MVP)

Platform janji temu berbasis web untuk **satu klinik kecantikan & estetika dengan banyak dokter spesialis**. Pasien dapat mencari dokter, memilih sesi berkuota, mengunggah bukti pembayaran (countdown 30 menit), menerima tiket QR code, dan memantau antrean. Admin dan staf klinik mengelola jadwal dokter, memverifikasi pembayaran, melakukan scan QR check-in saat pasien tiba di klinik, memanggil nomor antrean di layar TV ruang tunggu (`/queue`), serta melihat laporan statistik.

Proyek ini dibangun dengan arsitektur **3-Tier Modern**:
- **Frontend**: **Next.js 16 (App Router, React 19, Tailwind CSS v4, daisyUI 5)** berjalan pada `http://localhost:3000`. Frontend mengonsumsi data murni melalui **Backend REST API Gateway** (`NEXT_PUBLIC_API_URL`) dan tidak melakukan query/mutasi data langsung ke Supabase.
- **Backend Application Server**: **Express.js REST API** (`api-clinic-appointment` + Prisma 7) berjalan pada `http://localhost:8000/api/v1` sebagai *Single Source of Truth* untuk seluruh transaksi data, autentikasi, dan logika bisnis.
- **Database & Services**: **PostgreSQL Supabase Cloud** (RLS, Stored Procedures, Realtime CDC, dan Storage).

---

## 📚 Panduan Dokumentasi (Wajib Dibaca)

Untuk memastikan pengembang baru (*new programmer*) dapat langsung berkontribusi tanpa kesulitan, seluruh panduan telah dipisahkan secara rapi:

| Dokumen | Deskripsi | Kapan Dibaca? |
|---|---|---|
| [**BRIEF.md**](./BRIEF.md) | Spesifikasi asli kebutuhan MVP dan bobot penilaian fitur | Untuk mengetahui batas ruang lingkup (*scope*) asli |
| [**PRD.md**](./PRD.md) | *Product Requirements Document*: persona pengguna, spesifikasi fungsional & non-fungsional | Untuk memahami nilai bisnis & kebutuhan produk |
| [**PLAN.md**](./PLAN.md) | Roadmap pengerjaan bertahap (Phase 0 s/d Phase 9) sesuai alur BRIEF.md | **Wajib dibaca sebelum mulai ngoding fitur** |
| [**TECH.md**](./TECH.md) | Dokumentasi teknis cara kerja aplikasi secara menyeluruh, arsitektur 3-tier, API client, alur transaksi, ERD skema database, dan RPC | Untuk memahami arsitektur sistem & alur data |
| [**INT.md**](./INT.md) | Panduan integrasi Supabase & koordinasi multi-service (Frontend port 3000 & Backend port 8000) | **Wajib diikuti saat setup awal proyek** |
| [**AGENT.md**](./AGENT.md) | Standar penulisan kode, data layer hooks, aturan Atomic Design, panduan responsif mobile (360px), dan batasan ketat | Sebagai pedoman teknis saat membuat komponen/fitur |

---

## 🚀 Panduan Initial Run ("Zero to Running")

Ikuti langkah-langkah di bawah ini secara berurutan untuk menjalankan seluruh ekosistem aplikasi dari nol:

### 1. Prasyarat Sistem
- **Node.js** versi 20+ terpasang (`node -v`)
- **Git** terpasang (`git -v`)
- Dua terminal terpisah (Terminal 1 untuk Backend API, Terminal 2 untuk Frontend Next.js)
- Project Supabase aktif di [supabase.com](https://supabase.com)

---

### 2. Langkah 1: Setup Database Supabase
Pastikan database Supabase Anda telah menjalankan migrasi dan seed skema lengkap. Buka **SQL Editor** di Dashboard Supabase Anda, lalu jalankan file SQL berikut secara berurutan:
1. `supabase/migrations/20261103000000_init_schema.sql` (Skema tabel, RLS, Storage, & RPC Transaksional)
2. `supabase/migrations/20261103000100_cron_jobs.sql` (Otomasi kedaluwarsa 30 menit via `pg_cron`)
3. `supabase/migrations/20261103000200_allow_ongoing_booking.sql` (Peningkatan RPC booking, Base64 payment, & check-in fleksibel)
4. `supabase/wipe_and_seed_beauty_clinic.sql` (Wipe & seed data klinik kecantikan, dokter estetika, jadwal aktif hari ini, & akun demo)

---

### 3. Langkah 2: Menjalankan Backend REST API (Port 8000)
Di **Terminal 1**, jalankan backend application server Express:
```bash
# Buka folder backend (berdampingan dengan folder ini)
cd ../api-clinic-appointment

# Instal dependensi (jika belum)
npm install

# Jalankan server API backend
npm run dev
```
> **Verifikasi Backend**:  
> Server backend akan berjalan pada `http://localhost:8000`. Anda dapat memverifikasi dengan membuka `http://localhost:8000/api/v1` atau memeriksa log konsol memastikan Prisma terhubung ke database Supabase.

---

### 4. Langkah 3: Konfigurasi Environment Frontend
Di **Terminal 2**, kembali ke direktori frontend `clinic-appointment-platform`:
```bash
cd /Users/oktaviardi/Okta/clinic-appointment-platform
cp example.env .env.local
```
Pastikan file `.env.local` terisi dengan konfigurasi berikut:
```env
# 1. Konfigurasi Supabase Project (Database, Auth, Storage, Realtime)
NEXT_PUBLIC_SUPABASE_URL=https://wewieruvgvxupjndagnb.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_zdn0kiwPWaQXJciMAhVjFg_VbsdN6Eg

# 2. Konfigurasi Backend REST API Gateway (Express.js service pada port 8000)
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

---

### 5. Langkah 4: Menjalankan Frontend Next.js (Port 3000)
Di **Terminal 2**, pasang dependensi dan jalankan server pengembangan Next.js:
```bash
npm install
npm run dev
```
Buka browser Anda di [http://localhost:3000](http://localhost:3000).

---

### 6. Langkah 5: Masuk Menggunakan Akun Pengujian & Demo

> [!NOTE]
> Kredensial akun demo ini **hanya dicantumkan di dalam dokumen README repository ini** (tidak diekspos secara publik di antarmuka web). Gunakan akun-akun ini untuk menguji seluruh alur kerja sistem.

| Peran (Role) | Email | Password | URL Halaman Masuk | Hak Akses Utama |
|---|---|---|---|---|
| **Admin Klinik** | `admin@klinik.test` | `Admin123!` | [`/admin/login`](http://localhost:3000/admin/login) | Mengelola dokter & kuota sesi, review bukti bayar, scan QR check-in hari H, panggil antrean TV, lihat dashboard & statistik omzet. |
| **Pasien Demo** | `pasien@klinik.test` | `Pasien123!` | [`/login`](http://localhost:3000/login) | Cari dokter estetika, booking sesi kuota hari ini, upload bukti transfer (countdown 30m), lihat QR tiket kedatangan, beri ulasan dokter. |

> **Detail Arsitektur**:  
> Penjelasan mendalam mengenai mekanisme token Bearer, Axios interceptor, dan integrasi shared database dapat dibaca di [**TECH.md**](./TECH.md) dan [**INT.md**](./INT.md).

---

## 🛠️ Perintah Command Line

| Perintah | Deskripsi |
|---|---|
| `npm run dev` | Menjalankan server pengembangan lokal |
| `npm run build` | Menjalankan build produksi Next.js |
| `npm run start` | Menjalankan server produksi |
| `npm run lint` | Pengecekan standar kode dengan ESLint |
| `npm test` | Menjalankan unit test dengan Vitest (setelah Phase 1) |

---

## 💡 Fitur Utama

### 1. Pasien (Patient)
- **Discovery Dokter**: Cari dokter dengan *debounce*, filter berdasarkan spesialisasi, tarif konsultasi (IDR), dan hari praktik dokter.
- **Sisa Kuota Realtime**: Sisa kuota per sesi ditampilkan transparan (`kuota - booking aktif`).
- **Booking Atomik**: Mengunci baris kuota di database untuk mencegah bentrok pemesanan kuota terakhir.
- **Upload Bukti Bayar 30 Menit**: Timer countdown mundur 30 menit. Janji otomatis kedaluwarsa jika melewati batas.
- **Tiket QR Code**: QR code resmi terbit saat admin menyetujui transaksi (status `done`).
- **Riwayat & Rating**: Melihat rekam janji temu dan memberikan ulasan bintang (1–5) setelah konsultasi selesai.

### 2. Admin & Staf Klinik (Admin Panel di `/admin`)
- **Kelola Dokter & Jadwal**: Tambah dokter, foto resmi, dan tentukan kuota pasien per sesi praktik.
- **Verifikasi Bukti Transfer**: Tinjau bukti transfer pasien, terima untuk menerbitkan QR tiket, atau tolak dengan alasan.
- **Scanner QR Check-in**: Scan QR code pasien via kamera pada hari H untuk menerbitkan nomor antrean kedatangan.
- **Manajemen Antrean**: Panggil pasien berikutnya (*call next*), tandai pasien tidak hadir (*no-show*).
- **Dashboard & Statistik**: Ringkasan metrik harian dan visualisasi grafik per tahun/bulan/hari serta per dokter.

### 3. Display Antrean Publik (`/queue`)
- Tampilan layar penuh dengan angka besar (`text-7xl+`) yang menampilkan nomor antrean yang sedang dilayani dan nomor antrean berikutnya di ruang tunggu klinik secara *realtime* (Supabase Realtime).

### 4. Halaman Dokumentasi Terbuka (`/docs`)
- Halaman panduan sederhana di dalam aplikasi dengan sistem tab:
  - **Tab Pasien**: Panduan booking, pembayaran 30 menit, dan check-in.
  - **Tab Admin**: Panduan verifikasi transfer, scan QR kamera, dan panggilan antrean.
  - **Tab Status Transaksi**: Penjelasan visual 6 siklus status dan pemulihan kuota otomatis.

---

## 📁 Struktur Folder Proyek

```
src/
├── app/
│   ├── (user)/              # Halaman pasien: landing, login, register, dokter, payment, history, profil
│   ├── admin/               # Halaman admin panel (login & panel operasional)
│   ├── docs/                # Halaman dokumentasi alur aplikasi
│   └── queue/               # Layar antrean publik TV ruang tunggu klinik
├── components/
│   ├── ui/                  # Komponen Atomic Design: atoms/ dan molecules/ (modal, field, pagination)
│   ├── user/                # Organisme fitur pasien
│   └── admin/               # Organisme fitur admin
├── hooks/
│   ├── api/                 # React Query hooks mengonsumsi Backend REST API via Axios
│   └── use-*.ts             # Custom hook umum (debounce, countdown timer, dll)
├── lib/
│   ├── api-client.ts        # Axios singleton: Bearer token injection, unbox envelope, error handling
│   ├── supabase/            # Client Supabase (browser client untuk Realtime antrean TV)
│   ├── format.ts            # Formatter mata uang IDR, tanggal, waktu Indonesia
│   └── styles.ts            # Token desain Tailwind bersama
├── types/                   # Definisi tipe TypeScript
└── validations/             # Skema validasi Zod untuk seluruh formulir
supabase/
├── migrations/              # Skema SQL: tabel, RLS, RPC, dan pg_cron
└── wipe_and_seed_beauty_clinic.sql # Master data spesialis, dokter estetika, jadwal hari ini & akun demo
```

---

## 🤝 Alur Kontribusi Pengembang Baru

1. Pelajari spesifikasi di [PRD.md](./PRD.md) dan arsitektur di [TECH.md](./TECH.md).
2. Siapkan database Supabase & backend REST API mengikuti [INT.md](./INT.md).
3. Buka [PLAN.md](./PLAN.md), ambil fase yang belum selesai secara berurutan.
4. Ikuti aturan coding, larangan auto-commit, dan standar responsif di [AGENT.md](./AGENT.md).
5. Buat commit menggunakan format Conventional Commit berbahasa Indonesia (contoh: `feat(booking): tambah verifikasi kuota rpc`).
