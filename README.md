# Clinic Appointment Platform (MVP)

Platform janji temu berbasis web untuk **satu klinik dengan banyak dokter**. Pasien dapat mencari dokter, memilih sesi berkuota, mengunggah bukti pembayaran (countdown 30 menit), menerima tiket QR code, dan memantau antrean. Admin dan staf klinik mengelola jadwal dokter, memverifikasi pembayaran, melakukan scan QR check-in saat pasien tiba di klinik, memanggil nomor antrean di layar TV ruang tunggu (`/queue`), serta melihat laporan statistik.

Proyek ini dibangun menggunakan **Next.js 16 (App Router)** dan **Supabase** (Database PostgreSQL dengan RLS & Stored Procedures, Autentikasi, Storage, Realtime, dan pg_cron).

---

## 📚 Panduan Dokumentasi (Wajib Dibaca)

Untuk memastikan pengembang baru (*new programmer*) dapat langsung berkontribusi tanpa kesulitan, seluruh panduan telah dipisahkan secara rapi:

| Dokumen | Deskripsi | Kapan Dibaca? |
|---|---|---|
| [**BRIEF.md**](./BRIEF.md) | Spesifikasi asli kebutuhan MVP dan bobot penilaian fitur | Untuk mengetahui batas ruang lingkup (*scope*) asli |
| [**PRD.md**](./PRD.md) | *Product Requirements Document*: persona pengguna, spesifikasi fungsional & non-fungsional | Untuk memahami nilai bisnis & kebutuhan produk |
| [**PLAN.md**](./PLAN.md) | Roadmap pengerjaan bertahap (Phase 0 s/d Phase 9) sesuai alur BRIEF.md | **Wajib dibaca sebelum mulai ngoding fitur** |
| [**TECH.md**](./TECH.md) | Dokumentasi teknis cara kerja aplikasi secara menyeluruh, alur transaksi, ERD skema database, dan RPC | Untuk memahami arsitektur sistem & alur data |
| [**INT.md**](./INT.md) | Panduan langkah demi langkah integrasi Supabase (Setup, Migrasi SQL, Seed, Storage, Realtime) | **Wajib diikuti saat setup awal proyek** |
| [**agent.md**](./agent.md) | Standar penulisan kode, aturan Atomic Design, panduan responsif mobile (360px), dan batasan ketat | Sebagai pedoman teknis saat membuat komponen/fitur |

---

## 🚀 Memulai (Quickstart)

### 1. Prasyarat
- Node.js versi 20+
- Akun Supabase gratis di [supabase.com](https://supabase.com)

### 2. Setup Database Supabase
Ikuti panduan lengkap di [INT.md](./INT.md) untuk membuat project Supabase, lalu jalankan file SQL berikut via SQL Editor Supabase:
1. `supabase/migrations/20261103000000_init_schema.sql` (Skema tabel, RLS, Storage, & RPC Transaksional)
2. `supabase/migrations/20261103000100_cron_jobs.sql` (Otomasi kedaluwarsa 30 menit via `pg_cron`)
3. `supabase/seed.sql` (Data awal spesialisasi dokter dan jadwal praktik)

### 3. Setup Lingkungan Lokal
Salin file konfigurasi environment dan isi kredensial Supabase Anda:
```bash
cp example.env .env.local
```
Sesuaikan isi `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://proyek-anda.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. Instalasi & Menjalankan Server Dev
```bash
npm install
npm run dev
```
Buka browser di [http://localhost:3000](http://localhost:3000).

---

## 🔐 Akun Pengujian & Demo (Khusus Evaluator / Developer)

> [!NOTE]
> Kredensial akun demo ini **hanya dicantumkan di dalam dokumen README repository ini** (tidak diekspos secara publik di antarmuka web). Gunakan akun-akun ini untuk menguji seluruh alur kerja sistem.

| Peran (Role) | Email | Password | URL Halaman Masuk | Hak Akses Utama |
|---|---|---|---|---|
| **Admin Klinik** | `admin@klinik.test` | `Admin123!` | [`/admin/login`](http://localhost:3000/admin/login) | Mengelola dokter & kuota sesi, review bukti bayar, scan QR check-in hari H, panggil antrean TV, lihat statistik. |
| **Pasien Demo** | `pasien@klinik.test` | `Pasien123!` | [`/login`](http://localhost:3000/login) | Cari dokter, booking sesi berkuota, upload bukti transfer (countdown 30m), lihat QR tiket, beri ulasan dokter. |

> **Panduan Setup Database & Akun Demo**:  
> Seluruh script database, migrasi SQL, dan cara pengisian akun demo telah didokumentasikan secara rinci pada [**INT.md (Langkah 8)**](./INT.md#9-langkah-8-menyiapkan-akun-demo-admin--pasien) serta file [`supabase/seed.sql`](./supabase/seed.sql). Untuk penjelasan arsitektur sistem secara mendalam, silakan baca [**TECH.md**](./TECH.md).

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
│   ├── docs/                # Halaman dokumentasi alur aplikasi (baru)
│   └── queue/               # Layar antrean publik TV ruang tunggu klinik
├── components/
│   ├── ui/                  # Komponen Atomic Design: atoms/ dan molecules/ (modal, field, pagination)
│   ├── user/                # Organisme fitur pasien
│   └── admin/               # Organisme fitur admin
├── hooks/
│   ├── api/                 # React Query hooks penghubung Supabase (use-doctors, use-appointments, dll)
│   └── use-*.ts             # Custom hook umum (debounce, countdown timer, dll)
├── lib/
│   ├── supabase/            # Client Supabase (client.ts, server.ts)
│   ├── format.ts            # Formatter mata uang IDR, tanggal, waktu Indonesia
│   └── styles.ts            # Token desain Tailwind bersama
├── types/                   # Definisi tipe TypeScript
└── validations/             # Skema validasi Zod untuk seluruh formulir
supabase/
├── migrations/              # Skema SQL: tabel, RLS, RPC, dan pg_cron
└── seed.sql                 # Data awal master dokter, spesialis, dan jadwal
```

---

## 🤝 Alur Kontribusi Pengembang Baru

1. Pelajari spesifikasi di [PRD.md](./PRD.md) dan arsitektur di [TECH.md](./TECH.md).
2. Siapkan Supabase mengikuti [INT.md](./INT.md).
3. Buka [PLAN.md](./PLAN.md), ambil fase yang belum selesai secara berurutan.
4. Ikuti aturan coding dan standar responsif di [agent.md](./agent.md).
5. Buat commit menggunakan format Conventional Commit berbahasa Indonesia (contoh: `feat(booking): tambah verifikasi kuota rpc`).
