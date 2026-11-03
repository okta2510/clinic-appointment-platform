# Product Requirements Document (PRD) — Clinic Appointment Platform

Dokumen kebutuhan produk untuk Platform Janji Temu Klinik (MVP). Dokumen ini ditujukan agar pengembang baru, desainer, dan pemangku kepentingan memiliki pemahaman yang selaras tentang tujuan produk, peran pengguna, dan spesifikasi fitur.

---

## 1. Ringkasan Eksekutif & Tujuan

### 1.1 Latar Belakang & Masalah
Pasien klinik sering mengalami kendala antrean panjang tanpa kepastian nomor antrean, proses booking manual via chat yang rawan bentrok kuota, serta pembayaran yang tidak transparan. Di sisi klinik, staf kesulitan mengatur jadwal dokter, membatasi kuota pasien secara adil, dan memanggil antrean secara teratur.

### 1.2 Tujuan Produk (MVP)
Membangun platform janji temu berbasis web yang sederhana, cepat, dan handal untuk **satu klinik dengan banyak dokter**:
1. **Pasien**: dapat mencari dokter, melihat jadwal & sisa kuota secara transparan, melakukan reservasi (booking), mengunggah bukti bayar, memantau riwayat & QR tiket, serta memberikan rating dokter.
2. **Admin/Staf Klinik**: dapat mengelola dokter & jadwal praktik, memverifikasi pembayaran, melakukan scan QR check-in saat pasien tiba di klinik, memanggil antrean secara langsung (live queue), dan memantau statistik kunjungan serta pendapatan.
3. **Dokumentasi Terbuka**: menyediakan halaman panduan/dokumentasi alur (`/docs`) di dalam aplikasi agar pasien baru, admin baru, maupun evaluator sistem memahami alur kerja dengan mudah.

---

## 2. Peran Pengguna (User Roles)

| Peran | Deskripsi | Hak Akses Utama |
|---|---|---|
| **Publik / Guest** | Pengunjung tanpa akun | Melihat landing page, daftar dokter, detail dokter, jadwal praktik, dan layar antrean publik (`/queue`). |
| **Pasien (Patient)** | Pasien terdaftar | Melakukan booking sesi, unggah bukti bayar (countdown 30 menit), melihat QR check-in, membatalkan booking (bila belum dikonfirmasi), melihat riwayat, memberikan ulasan/rating, mengedit profil. |
| **Admin / Staf Klinik** | Pengelola operasional klinik | Manajemen dokter & jadwal, konfirmasi/tolak pembayaran, scan QR check-in fisik di klinik, memanggil antrean (*call next*), menandai pasien tidak hadir (*no-show*), melihat laporan statistik. |

---

## 3. Spesifikasi Kebutuhan Fungsional (Berdasarkan BRIEF.md)

### 3.1 Modul 1: Discovery Dokter & Manajemen Jadwal (Bobot: 4 Poin)
- **Landing Page**: Menampilkan profil klinik, dokter unggulan, dan daftar spesialisasi.
- **Pencarian & Filter Dokter**:
  - Kolom pencarian nama dokter dengan *debounce* (400ms) untuk efisiensi beban server.
  - Filter berdasarkan spesialisasi, rentang biaya konsultasi, dan hari praktik (Senin–Minggu).
  - Tampilan kosong (*empty state*) yang informatif bila hasil filter/pencarian nihil.
  - Paginasi daftar dokter yang sinkron dengan URL params.
- **Profil Lengkap Dokter**: Pengalaman (tahun), bio, spesialisasi, biaya konsultasi, rata-rata rating bintang, dan ulasan pasien sebelumnya.
- **Kelola Dokter & Jadwal (Admin)**:
  - Tambah, edit, dan hapus dokter beserta foto, bio, dan tarif.
  - Tambah, edit, dan hapus jadwal praktik dokter per hari dengan penentuan jam mulai, jam selesai, dan kuota maksimum pasien (misal: 10:00–12:00, kuota 10 orang).

### 3.2 Modul 2: Booking Janji Temu & Transaksi Pembayaran (Bobot: 4 Poin)
- **Pemilihan Sesi**: Pasien memilih dokter, tanggal kunjungan, dan sesi yang masih memiliki sisa kuota.
- **Sisa Kuota Realtime**: Sistem menghitung `sisa kuota = kuota sesi - total booking aktif (waiting_payment, waiting_confirmation, done)`. Tombol booking dinonaktifkan jika sisa kuota = 0.
- **Siklus 6 Status Transaksi**:
  1. `waiting_payment`: Menunggu pasien mengunggah bukti bayar dalam batas waktu 30 menit.
  2. `waiting_confirmation`: Pasien sudah mengunggah bukti bayar, menunggu persetujuan admin.
  3. `done`: Disetujui admin. QR code resmi terbit.
  4. `rejected`: Ditolak admin (misal bukti transfer palsu/buram).
  5. `expired`: Otomatis kedaluwarsa bila lewat 30 menit tidak ada unggahan bukti bayar.
  6. `canceled`: Dibatalkan oleh pasien (sebelum konfirmasi admin) ATAU dibatalkan otomatis oleh sistem jika admin belum menyetujui sampai jam sesi praktik dimulai.
- **Pemulihan Kuota Otomatis**: Jika janji berstatus `expired`, `rejected`, atau `canceled`, kuota sesi langsung dikembalikan agar pasien lain dapat memesan. Nomor urut reservasi dirapikan kembali.
- **Countdown Pembayaran**: Menampilkan sisa waktu 30 menit secara akurat dari nilai server (`payment_deadline`).
- **Mata Uang**: Seluruh harga wajib dalam format Rupiah (IDR).

### 3.3 Modul 3: Riwayat Janji & Rating Dokter (Bobot: 2 Poin)
- **Riwayat Janji Temu**: Pasien dapat memfilter dan melihat riwayat janji (nama dokter, tanggal, jam, status transaksi, biaya konsultasi, dan tiket QR jika sudah `done`).
- **Rating & Ulasan**: Pasien hanya diizinkan memberi rating (1–5 bintang) dan ulasan teks setelah janji temu selesai dijalankan (sudah check-in dan telah dilayani oleh dokter).

### 3.4 Modul 4: Autentikasi & Otorisasi Akun (Bobot: 2 Poin)
- **Registrasi & Login**: Pasien mendaftar menggunakan nama lengkap, email, nomor HP, dan password.
- **Keamanan Peran (Role-Based Access Control)**:
  - Route user (`/payment`, `/history`, `/profile`, booking) dilindungi untuk role `patient`.
  - Route admin (`/admin/*`) dilindungi khusus untuk role `admin` dan `staff`.
- **Manajemen Profil**: Pasien dan admin dapat memperbarui data profil, foto profil, mengganti password, serta melakukan reset password saat lupa.

### 3.5 Modul 5: QR Check-In & Antrean Langsung (Live Queue) (Bobot: 4 Poin)
- **Tiket QR Unik**: Terbit otomatis saat transaksi berstatus `done`.
- **Scan Check-In di Klinik**: Staf klinik memindai QR code via kamera perangkat pada hari H sesi praktik. Sistem menolak pemindaian di luar tanggal sesi.
- **Penetapan Nomor Antrean**: Nomor antrean diterbitkan secara berurutan sesuai waktu check-in fisik pasien di klinik.
- **Layar Antrean Publik (`/queue`)**: Halaman terbuka yang dapat ditampilkan di TV ruang tunggu klinik, menampilkan dokter yang sedang praktik, nomor antrean yang sedang dilayani, dan nomor antrean berikutnya secara realtime.
- **Panggil Pasien (*Call Next*)**: Admin/asisten memajukan nomor antrean yang sedang diperiksa. Hanya pasien yang sudah check-in yang dapat dipanggil.
- **Penanganan Tidak Hadir (*No-Show*)**: Admin dapat menandai janji sebagai *no-show* jika pasien tidak melakukan check-in hingga sesi selesai atau nomor antrean terlewati.

### 3.6 Modul 6: Dashboard Admin & Statistik (Bobot: 4 Poin)
- **Ringkasan Operasional**: Metrik janji temu hari ini, jumlah pembayaran yang menunggu verifikasi, total pasien terlayani, dan total pendapatan.
- **Grafik & Laporan**: Visualisasi grafik janji temu per tahun, bulan, dan hari, serta perbandingan performa per dokter.
- **Daftar Janji Temu Per Sesi**: Tabel daftar pasien per jadwal dokter yang menampilkan nama pasien, nomor antrean, dan status pembayaran/kehadiran.
- **Verifikasi Pembayaran**: Admin dapat melihat foto bukti transfer, menyetujui, atau menolak dengan mencantumkan alasan.

### 3.7 Modul 7: Halaman Dokumentasi Alur Aplikasi (`/docs`)
- **Panduan Terintegrasi**: Halaman dokumentasi yang mudah dibaca langsung di browser:
  - **Tab Pasien**: Cara daftar akun, cara booking & tips transfer bukti bayar, cara penggunaan QR check-in di klinik.
  - **Tab Admin**: Cara kelola dokter & kuota, cara verifikasi pembayaran, cara menjalankan scan QR & layar antrean TV.
  - **Tab Alur Status**: Penjelasan visual 6 status transaksi dan aturan pemulihan kuota.

---

## 4. Kebutuhan Non-Fungsional

1. **Responsiveness (Wajib)**: Tampilan nyaman diakses mulai dari mobile smartphone (360px), tablet (768px), hingga layar desktop monitor/TV klinik (1280px+). Tidak boleh ada horizontal scrollbar liar.
2. **Integritas Transaksi Data (ACID)**: Booking kuota dan perubahan antrean harus menggunakan transaksi database (PostgreSQL Function/RPC) dengan row-locking (`FOR UPDATE`) untuk mencegah *overbooking*.
3. **Konfirmasi Tindakan Sensitif**: Dialog popup konfirmasi wajib muncul sebelum melakukan aksi hapus dokter, tolak pembayaran, batalkan booking, call next, atau tandai no-show.
4. **Keamanan & Privasi**:
   - Bukti pembayaran disimpan dalam storage privat.
   - Layar antrean publik tidak mengekspos data pribadi (hanya nomor antrean dan nama dokter).
   - Password terenkripsi via Supabase Auth; token sesi dikelola via cookie HTTP-only yang aman.
5. **Kualitas Pengujian**: Minimal unit testing pada schema validasi, format data, kalkulasi countdown, status transition, dan logika filter.

---

## 5. Indikator Keberhasilan MVP
- Pasien dapat menyelesaikan alur dari mencari dokter hingga menerima QR code tanpa galat.
- Kuota sesi tidak pernah melebihi kapasitas maksimum sekalipun ada request konkuren.
- Staf klinik dapat melakukan check-in QR dalam waktu < 3 detik per pasien.
- Pengembang baru dapat menjalankan aplikasi dan memahami seluruh arsitektur dalam waktu < 30 menit melalui dokumen `README.md`, `TECH.md`, `INT.md`, dan `PLAN.md`.

