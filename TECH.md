# TECH.md — Dokumentasi Teknis Arsitektur & Cara Kerja Sistem

Dokumen ini menjelaskan secara menyeluruh cara kerja teknis dari **Clinic Appointment Platform (MVP)**. Ditulis dengan bahasa yang lugas dan terstruktur agar pengembang baru (*new programmer*) dapat langsung memahami arsitektur, basis data, alur transaksi, hingga detail implementasi fitur tanpa kebingungan.

---

## 1. Arsitektur Tingkat Tinggi (High-Level Architecture)

Aplikasi ini menggunakan pola arsitektur **Direct Backend-as-a-Service (BaaS)** berbasis **Next.js 16** dan **Supabase**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      Next.js 16 (React 19 + TypeScript)                 │
│                                                                         │
│   Client Components                 Server Components / Proxy           │
│   (TanStack Query v5)               (@supabase/ssr + proxy.ts)          │
│          │                                      │                       │
│          ▼                                      ▼                       │
│    createBrowserClient                   createServerClient             │
└──────────┬──────────────────────────────────────┬───────────────────────┘
           │                                      │
           │ HTTPS / WebSocket (Cookie HTTP-Only) │
           ▼                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           SUPABASE CLOUD                                │
│                                                                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │
│  │  Supabase Auth  │  │ Supabase Storage│  │   PostgreSQL Database   │  │
│  │ (Session/Cookie)│  │ (Avatars/Proofs)│  │  - Row Level Security   │  │
│  └─────────────────┘  └─────────────────┘  │  - Stored Procedures/RPC│  │
│                                            │  - pg_cron (Tiap Menit) │  │
│  ┌──────────────────────────────────────┐  │  - Realtime Engine      │  │
│  │   Realtime Channel (Live Queue TV)   │  └─────────────────────────┘  │
│  └──────────────────────────────────────┘                               │
└─────────────────────────────────────────────────────────────────────────┘
```

### Keunggulan Arsitektur Ini untuk MVP:
1. **Tanpa Server Express Terpisah**: Mengurangi kompleksitas deploy, biaya server, dan *maintenance* ganda.
2. **Keamanan di Level Database (RLS)**: Hak akses data dikunci di tingkat tabel Postgres. Sekalipun API dipanggil dari browser, data pasien lain tidak dapat diintip.
3. **Integritas Data Transaksional (ACID)**: Aturan ketat seperti kuota janji temu dan nomor antrean dikunci di database PostgreSQL lewat Stored Procedures (RPC).
4. **Realtime Bawaan**: Layar antrean TV dapat langsung mendengarkan perubahan data secara otomatis tanpa setup server WebSocket manual.

---

## 2. Cara Kerja Lengkap Web App (End-to-End Workflow)

Sistem melayani dua peran utama: **Pasien (Patient)** dan **Admin/Staf Klinik (Admin/Staff)**, ditambah tampilan publik **Layar Antrean TV (`/queue`)** dan **Halaman Panduan (`/docs`)**.

### 2.1 Alur Pengalaman Pasien (Patient Journey)

```
[1. Cari Dokter] ──▶ [2. Pilih Sesi & Cek Kuota] ──▶ [3. Checkout (Lock Kuota)]
                                                              │
                                                              ▼
[5. Konfirmasi Admin] ◀── [4. Unggah Bukti Bayar (Maks 30 Menit)]
         │
         ▼
[6. Tiket QR Terbit] ──▶ [7. Datang ke Klinik & Scan QR] ──▶ [8. Diperiksa & Rating]
```

1. **Discovery & Filter Dokter**:
   - Pasien mengunjungi landing page atau halaman `/doctor`.
   - Menggunakan pencarian nama (dengan *debounce* 400ms agar query database efisien).
   - Memfilter berdasarkan spesialisasi medis, rentang biaya konsultasi (IDR), dan hari praktik dokter.
   - Melihat profil dokter: bio, riwayat pengalaman (tahun), jadwal mingguan, dan rating bintang ulasan pasien sebelumnya.
2. **Pemilihan Sesi & Ketersediaan Kuota**:
   - Pasien memilih tanggal praktik dokter.
   - Sistem memanggil RPC `get_availability(doctor_id, date)` yang menghitung sisa kuota secara *realtime* (`quota - booked_active`).
   - Jika kuota habis (`remaining === 0`), tombol booking otomatis nonaktif.
3. **Booking Janji Temu (Lock Kuota)**:
   - Pasien yang sudah login menekan tombol booking.
   - Frontend memanggil RPC database `book_appointment(schedule_id, date)`.
   - **PostgreSQL mengunci baris sesi** (`FOR UPDATE`) untuk mencegah dua pasien memesan kuota terakhir secara bersamaan.
   - Record janji temu dibuat dengan status awal `waiting_payment`, dan `payment_deadline = waktu booking + 30 menit`.
4. **Unggah Bukti Transfer & Countdown 30 Menit**:
   - Halaman `/payment/[appointmentId]` menampilkan timer mundur akurat berdasarkan selisih waktu `payment_deadline` dari server.
   - Pasien mentransfer biaya konsultasi via rekening klinik, lalu mengunggah foto bukti transfer.
   - File bukti diunggah langsung ke bucket privat Supabase `payment-proofs` dengan path `<user_id>/<file>`.
   - RPC `submit_payment_proof` mengubah status janji menjadi `waiting_confirmation`.
   - *Jika dalam 30 menit pasien tidak mengunggah bukti, background job otomatis mengubah status menjadi `expired` dan kuota kembali bebas.*
5. **Penerbitan Tiket QR Code**:
   - Begitu admin menerima pembayaran, status janji menjadi `done`.
   - Kolom `qr_token` terisi UUID unik.
   - Pasien membuka menu `/history` atau detail janji dan melihat QR code resmi untuk check-in di klinik.
6. **Check-In di Hari H & Nomor Antrean**:
   - Pasien tiba di klinik pada hari praktik yang dijadwalkan, lalu memperlihatkan QR code di ponsel kepada staf resepsionis.
   - Setelah discan oleh staf, pasien resmi mendapatkan nomor antrean kunjungan (dimulai dari nomor 1 sesuai urutan kedatangan).
7. **Pemeriksaan & Ulasan / Rating**:
   - Pasien menunggu dipanggil sesuai nomor antrean di layar TV ruang tunggu klinik.
   - Setelah selesai berkonsultasi, status janji memungkinkan pasien mengisi ulasan dan rating bintang 1–5 melalui form di halaman riwayat.

---

### 2.2 Alur Pengalaman Admin / Staf Klinik (Admin Journey)

```
[1. Login Admin] ──▶ [2. Kelola Dokter & Kuota Jadwal]
                             │
                             ▼
                     [3. Review Pembayaran] ──(Tolak)──▶ Kuota Bebas Kembali
                             │ (Terima)
                             ▼
                     [4. Scan QR Check-In Hari H] ──▶ Nomor Antrean Terbit
                             │
                             ▼
                     [5. Panggil Pasien (Call Next)] / (Tandai No-Show)
                             │
                             ▼
                     [6. Pantau Statistik & Grafik Pendapatan]
```

1. **Otorisasi & Login Admin**:
   - Staf login melalui `/admin/login`. Route panel dilindungi oleh middleware/komponen penjaga `RequireRole roles={['ADMIN', 'STAFF']}`.
2. **Manajemen Master Dokter & Jadwal**:
   - Di `/admin/doctorManagement`, admin mendaftarkan dokter baru, foto dokter (ke bucket `doctor-photos`), bio, spesialisasi, dan tarif konsultasi.
   - Menetapkan jadwal praktik mingguan: hari (Senin–Minggu), jam mulai, jam selesai, dan **kuota maksimal pasien per sesi** (contoh: 10 pasien per sesi 2 jam).
3. **Verifikasi Pembayaran Pasien**:
   - Di `/admin/payment`, admin melihat daftar janji temu yang berstatus `waiting_confirmation`.
   - Admin membuka modal peninjau bukti transfer:
     - **Terima (Approve)**: Panggil RPC `approve_appointment` -> Status menjadi `done`, QR token terbit, pasien menerima notifikasi/tiket.
     - **Tolak (Reject)**: Admin mengisi alasan penolakan -> Panggil RPC `reject_appointment` -> Status menjadi `rejected`, kuota langsung dikembalikan ke sesi dokter.
4. **Operasional Check-In di Hari H**:
   - Di `/admin/queueManagement`, staf membuka scanner kamera.
   - Pasien menyodorkan QR code -> staf memindai QR tersebut.
   - Sistem memvalidasi bahwa sesi praktik adalah **hari ini**. Jika valid, panggil RPC `check_in(qr_token)`.
   - Sistem secara otomatis menetapkan nomor antrean fisik (`queue_number = nomor terakhir + 1`).
5. **Manajemen Antrean Langsung (Live Queue Management)**:
   - Staf menekan tombol **"Panggil Berikutnya" (Call Next)**: Sistem memanggil RPC `call_next(session_id)` yang memajukan `current_queue_number` ke nomor antrean pasien check-in berikutnya.
   - **Tandai Tidak Hadir (No-Show)**: Jika pasien sudah memiliki janji `done` tetapi tidak kunjung check-in hingga sesi selesai/terlewat, admin menekan tombol "No-Show" via RPC `mark_no_show`.
6. **Dashboard & Statistik Klinik**:
   - Di `/admin/dashboard`: Menampilkan kartu metrik janji hari ini, antrean menunggu, verifikasi tertunda, dan estimasi omzet.
   - Di `/admin/statistic`: Grafik interaktif (menggunakan Recharts) yang dapat difilter per hari, per bulan, dan per tahun, serta perbandingan performa jumlah pasien dan total pendapatan antar dokter.

---

## 3. Siklus Hidup Transaksi (State Machine 6 Status)

Status transaksi janji temu diatur secara ketat dengan aturan berikut:

```
                  ┌──────────────────────┐
                  │   waiting_payment    │
                  └──────────┬───────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │ Bukti diunggah     │ Lewat 30 menit     │ Pasien batal
        ▼ (Pasien)           ▼ (pg_cron)          ▼ (Pasien)
┌──────────────────────┐ ┌───────────────┐ ┌───────────────┐
│ waiting_confirmation │ │    expired    │ │   canceled    │
└──────────┬───────────┘ └───────────────┘ └───────────────┘
           │
     ┌─────┴─────────────────────┐
     │ Diterima                  │ Ditolak / Sesi mulai belum di-approve
     ▼ (Admin)                   ▼ (Admin / pg_cron)
┌──────────┐             ┌───────────────┐
│   done   │             │   rejected    │
└────┬─────┘             └───────────────┘
     │
     ├─▶ Check-in pada hari H  ──▶ Nomor Antrean fisik terbit
     ├─▶ Dipanggil dokter      ──▶ Layanan selesai
     └─▶ Pasca layanan selesai ──▶ Pasien dapat mengisi Rating (1-5)
```

### Aturan Pemulihan Kuota (Quota Restoration):
- Kuota sesi hanya terkonsumsi oleh status aktif: `waiting_payment`, `waiting_confirmation`, dan `done`.
- Begitu status berubah menjadi **`expired`**, **`rejected`**, atau **`canceled`**, kuota langsung otomatis tersedia kembali di database untuk dipesan pasien lain.
- Fungsi database `renumber_bookings(session_id)` secara otomatis merapikan kembali urutan antrean booking yang tersisa.

---

## 4. Desain Basis Data Supabase (PostgreSQL Schema)

Seluruh skema database telah didefinisikan secara deklaratif di folder `supabase/migrations/`:

### 4.1 Tabel-Tabel Inti

| Nama Tabel | Fungsi & Relasi | Hak Akses RLS |
|---|---|---|
| `public.profiles` | Menyimpan profil pengguna, sinkron 1:1 dengan `auth.users`. Kolom: `role` (`patient` / `admin`), `full_name`, `phone_number`, `avatar_url`. | Pasien baca/edit miliknya sendiri; Admin baca semua. Role dilindungi trigger database. |
| `public.specialists` | Kategori spesialisasi dokter (Dokter Umum, Spesialis Anak, Gigi, dll). | Publik baca (`SELECT`); Admin kelola penuh. |
| `public.doctors` | Data dokter: nama, tarif konsultasi (IDR), pengalaman kerja, bio, status aktif. | Publik baca (`SELECT`); Admin kelola penuh. |
| `public.doctor_schedules` | Template jadwal mingguan dokter: hari (`day_of_week` 0–6), jam mulai/selesai, kuota pasien per sesi. | Publik baca (`SELECT`); Admin kelola penuh. |
| `public.practice_sessions` | Sesi praktik konkret per tanggal kalender. Menyimpan `patient_quota` dan `current_queue_number`. | Publik baca (dibutuhkan untuk layar `/queue`); modifikasi hanya lewat RPC. |
| `public.appointments` | Transaksi janji temu pasien. Menyimpan kode unik, `status`, `payment_deadline`, `booking_number`, `qr_token`, `checked_in_at`, dan `queue_number`. | Pasien baca miliknya; Admin baca semua. **Insert/Update via client dimatikan (hanya via RPC)**. |
| `public.ratings` | Ulasan dan bintang (1–5) dari pasien untuk dokter. | Publik baca; tambah ulasan hanya via RPC `rate_appointment`. |

> **Jaring Pengaman Otomatis (Automatic RLS Event Trigger)**:
> Database dilengkapi dengan Event Trigger `ensure_rls` (`ON ddl_command_end`). Setiap kali ada tabel baru yang dibuat di skema `public`, PostgreSQL secara otomatis menjalankan `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`. Hal ini mencegah celah keamanan jika developer baru lupa mengaktifkan RLS saat menambah tabel baru di masa mendatang.

### 4.2 Fungsi Database & Transaksi SQL (RPC)

Untuk menjamin kepatuhan poin catatan *BRIEF.md* ("SQL transaction should be implemented on modify actions involving more than one action"), semua operasi krusial dijalankan sebagai **PostgreSQL Stored Procedure (RPC)** yang atomic:

1. `book_appointment(p_schedule_id, p_date)`:
   - Membuat/mengambil sesi praktik tanggal bersangkutan.
   - Mengunci baris sesi (`FOR UPDATE`) untuk memastikan tidak terjadi balapan kuota (*concurrency lock*).
   - Memastikan sisa kuota masih ada, lalu membuat appointment berstatus `waiting_payment` dengan batas waktu 30 menit.
2. `submit_payment_proof(p_appointment_id, p_path)`:
   - Memvalidasi kepemilikan dan batas waktu 30 menit, lalu menggeser status ke `waiting_confirmation`.
3. `cancel_appointment(p_appointment_id)`:
   - Membatalkan janji pasien, melepaskan kuota, dan menjalankan `renumber_bookings()`.
4. `approve_appointment(p_appointment_id)`:
   - Dijalankan khusus admin. Memastikan sesi belum lewat, mengesahkan pembayaran (`done`), dan menerbitkan `qr_token`.
5. `reject_appointment(p_appointment_id, p_reason)`:
   - Mengubah status ke `rejected`, menyimpan alasan, melepaskan kuota kembali.
6. `check_in(p_qr_token)`:
   - Memvalidasi bahwa tanggal sesi adalah hari ini (WIB). Mengunci sesi, menghitung nomor antrean urut berikutnya (`MAX(queue_number) + 1`), mencatat waktu check-in.
7. `call_next(p_session_id)`:
   - Memajukan nomor antrean sesi ke nomor pasien terdaftar berikutnya yang telah berstatus check-in.
8. `mark_no_show(p_appointment_id)`:
   - Menandai pasien yang tidak kunjung check-in sebagai tidak hadir (*no-show*).
9. `get_live_queue()`:
   - Mengembalikan data sesi hari ini yang sedang berlangsung, nomor yang sedang dilayani, dan 3 nomor antrean berikutnya (tanpa membuka identitas pribadi pasien).
10. `get_appointment_stats(p_period, p_from, p_to, p_doctor_id)`:
    - Melakukan agregasi jumlah transaksi (selesai, ditolak, batal, kedaluwarsa) dan total pendapatan per periode (hari/bulan/tahun).

---

## 5. Background Automation (pg_cron)

Berdasarkan aturan BRIEF.md:
- Janji temu kedaluwarsa jika bukti tidak diunggah dalam 30 menit.
- Janji temu dibatalkan otomatis jika admin belum mengonfirmasi sampai jam sesi dimulai.

Dijalankan secara otomatis di database via ekstensi `pg_cron` setiap 1 menit:
```sql
select cron.schedule(
  'process-expired-appointments',
  '* * * * *',
  $$ select public.process_expired_appointments(); $$
);
```
Fungsi `process_expired_appointments()` melakukan batch update atomik dan langsung memanggil `renumber_bookings()` untuk mengembalikan kuota ke sesi yang bersangkutan.

---

## 6. Penyimpanan File (Supabase Storage)

Ada 3 bucket penyimpanan dengan kebijakan keamanan terisolasi:

1. **`avatars` (Publik)**:
   - Foto profil user/pasien/admin.
   - Folder terisolasi: `<user_id>/avatar.png`. User hanya berhak upload/edit di foldernya sendiri.
2. **`doctor-photos` (Publik)**:
   - Foto resmi dokter untuk ditampilkan pada landing page dan profil.
   - Kebijakan upload: Hanya admin (`is_admin() = true`).
3. **`payment-proofs` (Privat / Restricted)**:
   - Foto transfer bukti bayar pasien.
   - Kebijakan baca/tulis: Pasien hanya bisa upload dan melihat file dalam folder miliknya sendiri (`<auth.uid()>/...`). Admin dapat membaca seluruh file untuk verifikasi.

---

## 7. Layar Antrean Publik Realtime (`/queue`)

Layar antrean dirancang untuk dipasang pada monitor TV di ruang tunggu klinik:
- **Teknologi**: Menggunakan fitur bawaan **Supabase Realtime**.
- **Mekanisme**: Tabel `practice_sessions` didaftarkan ke publikasi `supabase_realtime`. Saat admin memanggil `call_next()`, kolom `current_queue_number` diperbarui, memicu event websocket ke browser di `/queue` secara instan.
- **Reliability Fallback**: Ditambah *refetchInterval* 5 detik pada React Query jika koneksi websocket terputus sementara.

---

## 8. Halaman Dokumentasi Terintegrasi (`/docs`)

Untuk memudahkan pengguna baru, staf baru, maupun evaluator memahami cara kerja aplikasi, dibuat halaman khusus di `src/app/docs/page.tsx`:
- **Navigasi Tab Sederhana**:
  - **Tab Pasien**: Alur registrasi, pencarian dokter, batas waktu bayar 30m, penggunaan tiket QR saat datang.
  - **Tab Admin**: Panduan kelola jadwal & kuota, proses validasi pembayaran, penggunaan scanner QR di resepsionis, dan pemanggilan antrean.
  - **Tab Diagram Status**: Penjelasan visual 6 status transaksi dan pemulihan kuota otomatis.
- **Desain**: Menggunakan komponen UI atomik yang bersih, responsif di ponsel, dan dilengkapi tautan langsung ke halaman demo terkait.

---

## 9. Struktur Kode & Standar Kualitas

1. **Atomic Design Ringan**:
   - `components/ui/atoms/`: Tombol, input teks, badge status, spinner.
   - `components/ui/molecules/`: Field form + error label, modal dialog konfirmasi, pagination bar.
   - `components/{user,admin}/<fitur>/`: Komponen organisme fitur yang memanggil hook data.
2. **Aturan Responsif**:
   - Desain berbasis **Mobile-First**.
   - Bebas horizontal scrollbar pada lebar 360px.
   - Tabel otomatis berubah menjadi kartu (*stacked cards*) pada layar ponsel.
3. **Testing**:
   - Unit test pada layer helper (`formatRupiah`, format waktu, kalkulasi countdown).
   - Validasi skema Zod sebelum payload dikirim ke Supabase.
   - Mocking fungsi Supabase client saat pengujian komponen.

