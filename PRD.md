# Product Requirements Document (PRD) — Beauty & Aesthetic Clinic Platform

Dokumen kebutuhan produk untuk **Platform Janji Temu & Antrean Klinik Kecantikan & Estetika (MVP)**. Dokumen ini ditujukan agar pengembang baru, desainer, dan pemangku kepentingan memiliki pemahaman yang selaras tentang tujuan produk, peran pengguna, spesifikasi fitur klinis, dan arsitektur data.

---

## 1. Ringkasan Eksekutif & Tujuan

### 1.1 Latar Belakang & Masalah
Pasien klinik kecantikan dan estetika sering mengalami antrean konsultasi dokter kulit yang panjang tanpa kejelasan estimasi waktu, kesulitan memilih jadwal dokter spesialis yang sesuai dengan keluhan kulit (*acne*, *anti-aging*, *skin barrier*, *pigmentasi*), booking manual via chat admin WhatsApp yang rentan bentrok kuota tindakan, serta bukti pembayaran transfer yang lambat diverifikasi. Di sisi klinik estetika, dokter dan staf resepsionis membutuhkan sistem transparan untuk membatasi kuota tindakan per sesi, memvalidasi bukti bayar, memindai check-in barcode/QR di meja depan (*front desk*), dan memanggil giliran konsultasi/tindakan secara tertib.

### 1.2 Tujuan Produk (MVP)
Membangun platform reservasi janji temu dan antrean berbasis web yang modern, responsif, dan andal untuk **satu klinik kecantikan terpadu dengan banyak dokter spesialis estetika**:
1. **Pasien (Customer/Patient)**: dapat mencari dokter spesialis kulit & estetika, memfilter berdasarkan keahlian (*Dermatologi, Anti-Aging, Bedah Plastik Estetik, Laser & Skincare, Trikologi Rambut*), melihat sisa kuota sesi secara realtime, memesan jadwal konsultasi dan treatment, mengunggah bukti bayar, memperoleh tiket barcode antrean QR, serta memberikan ulasan/rating kepuasan setelah selesai perawatan.
2. **Admin & Resepsionis Klinik**: dapat mengelola profil dokter estetika & jadwal praktik, memverifikasi bukti transfer, melakukan scan barcode QR kedatangan pasien (via kamera pemindai langsung atau input token), memanggil antrean (*call next*), mengontrol display antrean ruang tunggu TV, dan menganalisis metrik pendapatan serta kepuasan pasien.
3. **Akses Cepat Admin di Halaman Publik**: staf/admin yang sedang membuka antarmuka publik dapat langsung menggunakan *Floating Action Button* pemindai QR untuk check-in pasien secara instan tanpa harus berpindah ke panel admin.

---

## 2. Peran Pengguna (User Roles)

| Peran | Deskripsi | Hak Akses Utama |
|---|---|---|
| **Publik / Guest** | Pengunjung tanpa akun | Melihat landing page klinik kecantikan, katalog dokter spesialis estetika, katalog perawatan (*treatments*), jadwal praktik, dan monitor antrean publik (`/queue`). |
| **Pasien (Patient)** | Pasien kecantikan terdaftar | Melakukan reservasi dokter/treatment, mengunggah bukti bayar (countdown 30 menit), melihat QR barcode antrean, membatalkan booking (sebelum konfirmasi), melihat riwayat reservasi, memberikan rating setelah check-in & selesai, mengedit profil. |
| **Admin / Staf Resepsionis** | Pengelola operasional klinik | Manajemen dokter estetika & jadwal praktik, verifikasi bukti bayar, scan barcode QR kedatangan fisik (di halaman panel antrean maupun floating scanner publik), memanggil antrean (*call next*), menandai tidak hadir (*no-show*), memantau laporan statistik. |

---

## 3. Spesifikasi Kebutuhan Fungsional

### 3.1 Modul 1: Discovery Dokter Estetika & Manajemen Jadwal (Bobot: 4 Poin)
- **Landing Page Estetika**: Menampilkan profil klinik kecantikan, banner layanan unggulan, dokter spesialis unggulan, dan kategori perawatan (*Acne & Scar, Brightening, Anti-Aging, Hair & Scalp, Slimming*).
- **Pencarian & Filter Dokter Spesialis**:
  - Kolom pencarian nama dokter dengan *debounce* (400ms).
  - Filter spesialisasi kecantikan:
    - *Dermatologi, Venereologi & Estetika (Sp.D.V.E / Sp.KK)*
    - *Dokter Estetika Medik & Anti-Aging (Dipl. AAAM)*
    - *Bedah Plastik Rekonstruksi & Estetik (Sp.B.P.R.E)*
    - *Laser & Kosmetika Kulit (Advanced Laser Energy)*
    - *Trikologi & Perawatan Kulit Kepala (Hair & Scalp)*
  - Filter rentang biaya konsultasi (IDR) dan filter hari praktik (Senin–Minggu).
  - Paginasi daftar dokter yang sinkron dengan URL parameter.
- **Profil Lengkap Dokter**: Pengalaman (tahun), bio klinis, spesialisasi, tarif konsultasi, ulasan pasien terverifikasi, dan jadwal praktik yang tersedia.
- **Kelola Dokter & Jadwal (Admin)**:
  - Tambah, edit, dan hapus dokter beserta foto profil, bio, dan tarif konsultasi.
  - Tambah, edit, dan hapus jadwal praktik mingguan per sesi dengan penentuan jam mulai, jam selesai, dan kuota maksimum pasien (misal: 09:00–13:00, kuota 12 pasien).

### 3.2 Modul 2: Booking Janji Temu & Transaksi Pembayaran (Bobot: 4 Poin)
- **Pemilihan Sesi**: Pasien memilih dokter, tanggal reservasi, dan sesi praktik yang masih memiliki sisa kuota.
- **Sisa Kuota Realtime**: Dihitung akurat dari `sisa kuota = kuota sesi - total booking aktif (waiting_payment, waiting_confirmation, done)`. Tombol booking otomatis dinonaktifkan jika kuota penuh.
- **Siklus 6 Status Transaksi**:
  1. `waiting_payment`: Menunggu unggah bukti transfer dengan hitung mundur 30 menit.
  2. `waiting_confirmation`: Bukti bayar telah diunggah (mendukung Base64/Storage), menunggu konfirmasi admin.
  3. `done`: Pembayaran diverifikasi admin. Tiket barcode antrean (QR Code) resmi diterbitkan.
  4. `rejected`: Ditolak admin dengan alasan penolakan yang transparan. Kuota otomatis dikembalikan.
  5. `expired`: Kedaluwarsa otomatis bila bukti bayar tidak diunggah dalam batas 30 menit.
  6. `canceled`: Dibatalkan pasien atau dibatalkan sistem bila belum disetujui sampai sesi berakhir.
- **Pemulihan Kuota Otomatis**: Transaksi yang `expired`, `rejected`, atau `canceled` otomatis melepas kuota agar pasien lain dapat memesan.
- **Hitung Mundur Pembayaran**: Akurat menggunakan waktu server (`payment_deadline`).

### 3.3 Modul 3: Riwayat Janji, Barcode Antrean & Rating Dokter (Bobot: 2 Poin)
- **Riwayat Reservasi Pasien**:
  - Menampilkan daftar reservasi lengkap dengan nama dokter estetika, tanggal sesi, biaya konsultasi, dan pratinjau bukti bayar.
  - **Nomor Kode Pendaftaran Antrean** (`appointment_code`) ditampilkan jelas dengan tombol **Salin Kode** (Copy to Clipboard).
  - **Aksi Cepat Barcode**: Jika status `done` tetapi belum check-in, tombol aksi menjadi **"Lihat Barcode Antrean"** yang membuka modal QR Code instan untuk ditunjukkan ke resepsionis.
- **Rating & Ulasan Pasien**:
  - Tombol **"Beri Rating"** hanya aktif bila status janji `done` dan pasien **sudah melakukan check-in kedatangan di klinik** (`checked_in_at` terisi).

### 3.4 Modul 4: Autentikasi & Akses Peran (Bobot: 2 Poin)
- **Registrasi & Login**: Autentikasi aman melalui Supabase Auth.
- **Role-Based Access Control (RBAC)**:
  - Route user (`/payment`, `/history`, `/profile`, booking) untuk role `patient`.
  - Route admin (`/admin/*`) khusus role `admin`.
- **Manajemen Profil**: Pengguna dapat mengubah foto profil, nomor telepon, dan password.

### 3.5 Modul 5: QR Check-In & Antrean Langsung (Live Queue) (Bobot: 4 Poin)
- **Pindai Barcode / QR dengan Kamera**:
  - Di halaman `/admin/queueManagement` dan komponen **Floating Action Button** di halaman publik, staf dapat membuka kamera pemindai.
  - Menggunakan API peramban `window.BarcodeDetector` untuk mendeteksi QR Code secara instan.
  - Dilengkapi suara konfirmasi *beep*, auto-stop kamera, dan tombol beralih Kamera Depan/Belakang.
  - Mendukung input manual kode janji (`APT-xxx`) atau token UUID jika layar pasien bermasalah.
- **Penetapan Nomor Antrean**: Diterbitkan berurutan sesuai waktu check-in fisik kedatangan pasien di klinik.
- **Monitor Antrean Publik (`/queue`)**: Layar display publik untuk ruang tunggu klinik yang menampilkan dokter yang sedang praktik, nomor antrean yang sedang dilayani, dan antrean berikutnya secara realtime.
- **Pengendali Antrean**: Tombol panggil antrean berikutnya (*call next*) dan penanda tidak hadir (*no-show*).

### 3.6 Modul 6: Dashboard Admin & Analitik (Bobot: 4 Poin)
- **Statistik & Metrik**: Total pasien hari ini, pendapatan konsultasi, transaksi menunggu verifikasi, dan performa per dokter spesialis kecantikan.
- **Verifikasi Pembayaran**: Modal peninjauan bukti transfer ukuran penuh (mendukung Base64 JPEG terkompresi).
- **Edit & Reschedule Reservasi**: Admin dapat memperbarui jadwal atau status janji jika terjadi kesalahan tanpa merusak kuota.

---

## 4. Database Reset & Re-Seed
Untuk memfasilitasi pengujian bersih (*clean slate testing*), disediakan skrip atomik:
- File SQL: [`supabase/wipe_and_seed_beauty_clinic.sql`](file:///Users/oktaviardi/Okta/clinic-appointment-platform/supabase/wipe_and_seed_beauty_clinic.sql)
- Seluruh tabel transaksi di-`TRUNCATE`, kemudian diinjeksi 5 spesialisasi estetika, 6 profil dokter estetika, jadwal praktik harian merata, sesi hari ini, akun demo (`admin@klinik.test` & `pasien@klinik.test`), serta sampel janji temu siap uji.

---

## 5. Indikator Keberhasilan MVP
- Pasien dapat memilih dokter kecantikan, melihat jadwal aktif hari ini, memesan slot kuota, dan mengunggah bukti bayar secara instan.
- Resepsionis klinik dapat memindai barcode QR pasien via kamera di halaman publik maupun panel admin dalam waktu < 2 detik.
- Kuota dokter terlindungi dari bentrok jadwal (*zero double booking*).
- Seluruh antarmuka konsisten bertema klinik estetika profesional.
