# [006] Plan: Rekomendasi Peningkatan Backend API (Profil Pasien & Endpoint Ganti Password)

**Tanggal Dibuat**: 5 November 2026  
**Status**: Usulan Rencana Backend (Awaiting User Review / Implementation on Backend Repo)  
**Target Repository**: `/Users/oktaviardi/Okta/api-clinic-appointment`  
**Tujuan**: Menyempurnakan endpoint `/patients/me` di backend agar menyertakan email pasien secara konsisten dengan `API.md`, serta menambahkan endpoint REST API untuk fitur perubahan password (`/auth/password`).

---

## 1. Analisis Kebutuhan Penyesuaian Backend (Backend Gap Analysis)

Berdasarkan audit komparasi antara implementasi frontend `/profile`, dokumentasi resmi [**`API.md`**](/Users/oktaviardi/Okta/api-clinic-appointment/API.md), dan kode backend di `api-clinic-appointment`:

### Kesenjangan 1: `GET /patients/me` Mengembalikan Nilai `email: ""`
- **Temuan di Kode Backend** (`src/features/patient/patient.service.ts:18`):
  Saat mengambil data dari tabel Supabase `profiles`, query hanya membaca tabel `profiles`:
  ```typescript
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  ```
  Di basis data PostgreSQL Supabase, tabel `profiles` sengaja tidak menyimpan kolom email (kolom email berada di tabel `auth.users` dan tabel `users`). Akibatnya, backend mengembalikan objek dengan `email: ""`.
- **Spesifikasi di `API.md` (Bagian 2.1)**:
  Respon resmi mendokumentasikan bahwa `email` pasien harus terisi:
  ```json
  {
    "id": "bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb",
    "full_name": "Budi Pasien Demo",
    "email": "pasien@klinik.test",
    "phone_number": "081234567890",
    ...
  }
  ```
- **Solusi Sementara di Frontend**:
  Frontend telah diperbaiki untuk melakukan fallback otomatis mengambil email dari cache `/auth/me` atau JWT token, sehingga tampilan antarmuka tetap menampilkan email pengguna secara lengkap.

---

### Kesenjangan 2: Ketiadaan Endpoint Ubah Password di Backend REST API
- **Temuan**:
  Pada `API.md` dan `postman_collection.json`, backend saat ini baru memiliki endpoint:
  - `POST /auth/login`
  - `POST /auth/register`
  - `POST /auth/admins`
  - `GET /auth/me`
  - `POST /auth/logout`
  - `GET /patients/me`
  - `PATCH /patients/me` (hanya menerima `full_name`, `phone_number`, `date_of_birth`, `gender`, `address`)
- **Masalah**:
  Belum tersedia endpoint REST API untuk pasien/user mengganti password akun mereka (misalnya `PATCH /auth/password` atau `PATCH /patients/me/password`).
- **Dampak**:
  Aplikasi web tidak dapat melakukan verifikasi password lama dan hashing password baru via REST API Express.

---

## 2. Rencana Implementasi di Backend (`api-clinic-appointment`)

Jika Anda memutuskan untuk memperbarui backend repository, berikut adalah arsitektur kode yang direkomendasikan:

### Langkah BE-1: Mengisi Field `email` pada `PatientService.getMe`
- **File**: `src/features/patient/patient.controller.ts` & `src/features/patient/patient.service.ts`
- **Implementasi**:
  Teruskan `authPayload` dari `res.locals.auth` ke dalam `PatientService.getMe(auth.id, auth)`:
  ```typescript
  // Di patient.service.ts
  static async getMe(userId: string, authPayload?: any) {
    const profile = await this.findPatientOrFail(userId);
    if (!profile.email && authPayload?.email) {
      profile.email = authPayload.email;
    }
    return profile;
  }
  ```
  *Atau query tabel `prisma.user` / `auth.users` berdasarkan `userId` untuk membaca email akun login.*

---

### Langkah BE-2: Menambahkan Endpoint `PATCH /api/v1/auth/password`
- **File Baru / Diperbarui**:
  1. `src/validators/auth.validator.ts`:
     ```typescript
     export const changePasswordSchema = z.object({
       body: z.object({
         current_password: z.string().min(1, 'Password saat ini wajib diisi'),
         new_password: z.string().min(8, 'Password baru minimal 8 karakter').max(72),
       }),
     });
     ```
  2. `src/features/auths/auth.controller.ts`:
     ```typescript
     static async changePassword(req: Request, res: Response) {
       const { body } = validate(changePasswordSchema, { body: req.body });
       const auth = res.locals.auth as TAuthPayload;
       await AuthsService.changePassword(auth.id, body);
       res.status(200).json({ success: true, message: 'Password berhasil diperbarui' });
     }
     ```
  3. `src/features/auths/auth.service.ts`:
     - Ambil user dari database `prisma.user` atau `auth.users`.
     - Validasi `current_password` menggunakan `Bcrypt.compare(body.current_password, user.password)`.
     - Hash `new_password` dengan `Bcrypt.hashPassword(body.new_password)`.
     - Perbarui password di PostgreSQL dan Supabase Auth.
  4. `src/features/auths/auth.route.ts`:
     ```typescript
     AuthRouter.patch('/password', verifyToken, AuthsController.changePassword);
     ```

---

### Langkah BE-3: Memperbarui Dokumentasi `API.md` & `postman_collection.json`
- Tambahkan dokumentasi request & response `PATCH /auth/password` di `API.md` Bagian 1.
- Tambahkan request item `Change Password` di folder `1. Authentication` pada `postman_collection.json`.

---

## 3. Penyesuaian yang Sudah Selesai di Sisi Frontend (`clinic-appointment-platform`)

Frontend telah diadaptasi secara preventif agar kompatibel 100% dengan kondisi backend saat ini tanpa menunggu update backend:

1. **Email Fallback Enriched**:
   [`src/hooks/api/use-patient.ts`](file:///Users/oktaviardi/Okta/clinic-appointment-platform/src/hooks/api/use-patient.ts) secara cerdas mengisi `email` dari sesi aktif `/auth/me` / token JWT saat backend mengembalikan `email: ""`.
2. **Proteksi Anti-422 pada `PATCH /patients/me`**:
   [`src/hooks/api/use-patient.ts`](file:///Users/oktaviardi/Okta/clinic-appointment-platform/src/hooks/api/use-patient.ts) menghapus field `email` kosong dari payload sebelum dikirim ke backend, mencegah error validasi HTTP 422 `"Email is not valid"`.
3. **Email Field Read-Only**:
   Komponen [`src/components/user/profile/profile-section.tsx`](file:///Users/oktaviardi/Okta/clinic-appointment-platform/src/components/user/profile/profile-section.tsx) mengunci kolom email saat edit profil dengan keterangan *"Email terdaftar sebagai identitas login utama"*, melindungi akun dari ketidaksinkronan data otentikasi.
4. **Validasi Form Tidak Memblokir Simpan**:
   [`src/components/user/profile/profile-utils.ts`](file:///Users/oktaviardi/Okta/clinic-appointment-platform/src/components/user/profile/profile-utils.ts) memperbarui logika validasi agar pasien dapat mengedit nama, nomor telepon, tanggal lahir, jenis kelamin, dan alamat dengan lancar.

