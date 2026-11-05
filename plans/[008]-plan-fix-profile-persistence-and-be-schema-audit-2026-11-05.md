# Plan [008] - Audit Skema Backend & Investigasi Persistensi Edit Profil Pasien (/profile) via REST API

**Tanggal Dibuat:** 2026-11-05  
**Domain:** Pasien Profile, Backend REST API Gateway, Prisma & Database Persistence  
**Prinsip Arsitektur:** **Frontend Murni Menggunakan Backend REST API (Tidak Memanggil Supabase Langsung)**  
**Status:** PROPOSED & BACKEND ALIGNMENT PLAN  

---

## 1. Konteks Arsitektur & Pertanyaan User

### Prinsip Arsitektur Saat Ini:
> **PENTING**: Di fase ini, frontend Next.js (`clinic-appointment-platform`) **SUDAH TIDAK MEMANGGIL SUPABASE SECARA LANGSUNG**.  
> Seluruh komunikasi data, autentikasi, dan manipulasi profil pasien berjalan 100% melalui **Backend REST API Gateway** (`http://localhost:8000/api/v1`) via Axios `apiClient` (`src/lib/api-client.ts`).  
> Database Supabase adalah infrastruktur data yang hanya diakses oleh **Backend Application Server** (Express.js / Prisma).

---

### Pertanyaan 1: Apakah butuh request update Backend Schema untuk email, date of birth, dan gender?
- **Date of Birth (`date_of_birth`)**: **TIDAK BUTUH PERUBAHAN SKEMA**.
  - Kolom `date_of_birth` (tipe `date`) sudah tersedia di skema database PostgreSQL `public.profiles` dan sudah terdaftar di `prisma/schema.prisma` baris 57.
- **Gender (`gender`)**: **TIDAK BUTUH PERUBAHAN SKEMA**.
  - Kolom `gender` dengan enum `male`, `female`, `other` sudah tersedia di skema database `public.profiles` dan sudah terdaftar di `prisma/schema.prisma` baris 58.
- **Email (`email`)**: **TIDAK BUTUH PERUBAHAN SKEMA TABEL `profiles`**.
  - Di arsitektur database, `email` adalah identitas akun autentikasi login (disimpan di `auth.users` dan tabel `users`).
  - Di formulir data diri frontend (`/profile`), input email sudah tepat dikunci (**disabled / read-only**) karena email merupakan username identitas login akun.
  - Yang dibutuhkan dari sisi backend API hanyalah: **Backend `GET /patients/me` wajib membaca dan mengembalikan email** dari sesi/token autentikasi JWT (`res.locals.auth.email`), agar response API tidak mengembalikan `email: ""`.

---

### Pertanyaan 2: Mengapa perubahan data diri tidak tersimpan setelah reload?

Pengguna mengisi formulir (nama, nomor telepon, tanggal lahir, jenis kelamin, alamat), menekan tombol "Simpan perubahan", lalu me-reload halaman (F5), namun nilai tanggal lahir dan gender kembali kosong (`-`).

**Akar Masalah (Root Cause) di Backend REST API Server:**
Frontend telah memanggil `PATCH /api/v1/patients/me` secara benar melalui `apiClient`, namun **Backend API Express (`api-clinic-appointment`) gagal menyimpan data secara permanen ke database**. Hal ini disebabkan oleh:

1. **Backend Memakai Token Klien yang Terhalang RLS saat Menyimpan**:
   - Di `api-clinic-appointment/src/features/patient/patient.service.ts` (`updateMe`), backend menggunakan Supabase JS client (`getSupabaseUserClient(userId)`).
   - Ketika request update dikirim ke database Supabase, token yang digunakan backend terkena aturan Row Level Security (RLS) PostgreSQL (`using (id = auth.uid())`).
   - Karena token sesi di backend tidak match atau fallback ke admin token yang berbeda ID dengan pasien, Supabase menolak operasi UPDATE dan mengembalikan `0 baris ter-update` tanpa melemparkan error (`{ data: [], count: 0, error: null }`).
2. **Ketiadaan Real Service Role Key di Backend `.env`**:
   - Backend `.env` menggunakan kunci publik (`sb_publishable_...`) untuk konfigurasi `SUPABASE_SERVICE_ROLE_KEY`. Kunci publik tidak memiliki izin bypass RLS layaknya secret service role key (`eyJ...`).
3. **Prisma Fallback di Backend Mengarah ke `localhost:5432`**:
   - Setelah Supabase update menghasilkan 0 baris, backend mencoba fallback `prisma.profiles.update`.
   - Namun koneksi `DATABASE_URL` di backend `.env` mengarah ke database lokal yang mati (`postgresql://postgres:postgres@localhost:5432/postgres`), dan error tersebut ditelan oleh blok `catch {}`.
   - Akibatnya, `PATCH /patients/me` mengembalikan status HTTP 200 OK, tetapi **data di database tidak pernah berubah**. Saat halaman di-reload, `GET /patients/me` mengambil data lama yang masih kosong.

---

## 2. Matriks Audit Skema Backend vs Frontend

| Field | Status di Database (`public.profiles`) | Status di `prisma/schema.prisma` | Status di `patient.validator.ts` | Status di Frontend Form | Butuh Ubah Schema BE? |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **`full_name`** | `text not null default ''` | `String @default("")` | `z.string().min(1).max(150)` | Input Text | **TIDAK** |
| **`phone_number`** | `text` | `String?` | `z.string().min(1).max(20)` | Input Tel | **TIDAK** |
| **`date_of_birth`** | `date` | `DateTime? @db.Date` | `z.iso.date().nullable()` | Input Date (`YYYY-MM-DD`) | **TIDAK** |
| **`gender`** | `enum ('male','female','other')` | `enum gender?` | `z.enum(['male','female','other'])` | Select Dropdown | **TIDAK** |
| **`address`** | `text` | `String?` | `z.string().trim().nullable()` | Textarea | **TIDAK** |
| **`email`** | Disimpan di `auth.users` | Disimpan di `user` (legacy) | `z.email().optional()` | Input Disabled (Read-only) | **TIDAK** *(Cukup return di GET)* |

---

## 3. Rencana Solusi & Perbaikan di Layer Backend API (`api-clinic-appointment`)

Karena frontend murni mengonsumsi REST API dan tidak mengakses database Supabase secara langsung, perbaikan dilakukan pada **Backend API Application Server**:

```mermaid
flowchart TD
    subgraph Frontend["Frontend Next.js 16 (Port 3000)"]
        UI["Halaman /profile (ProfileSection)"]
        Hook["useUpdateMyPatient() / useGetMyPatient()"]
        Client["Axios apiClient (Bearer Token)"]
        UI --> Hook --> Client
    end

    subgraph BackendAPI["Backend REST API Express (Port 8000)"]
        Route["Route: PATCH /patients/me & GET /patients/me"]
        Controller["PatientController.updateMe() & getMe()"]
        Service["PatientService: Eksekusi Update ke Database"]
        Route --> Controller --> Service
    end

    subgraph Database["Database Supabase PostgreSQL"]
        DB["Tabel public.profiles & auth.users"]
    end

    Client -->|HTTP REST JSON| Route
    Service -->|Server Credentials / Service Role / Direct Pool| DB
```

### Rekomendasi Solusi Teknis di Backend:

1. **Gunakan Koneksi Server-Level (Bypass RLS) pada `PatientService.updateMe`**:
   - Di sisi backend server, operasi update data profil pasien yang sudah terotentikasi oleh `verifyToken` (`res.locals.auth.id`) harus dieksekusi dengan kredensial server backend (`service_role` key atau koneksi PostgreSQL Prisma langsung ke Supabase pooler), bukan dengan token klien yang terbatas oleh RLS.
   - Dengan demikian, update terhadap `date_of_birth`, `gender`, `full_name`, `phone_number`, dan `address` dijamin 100% langsung tersimpan permanen ke tabel `public.profiles`.

2. **Kembalikan Email Pasien pada `PatientService.getMe`**:
   - Di `PatientService.getMe`, sertakan email dari token JWT (`res.locals.auth.email` atau lookup `auth.users`) ke dalam objek kembalian:
     ```typescript
     // Di PatientService.getMe
     const profile = await this.findPatientOrFail(userId);
     return {
       ...profile,
       email: authPayload?.email || profile.email || '',
     };
     ```
   - Ini memastikan frontend menerima email akun pasien secara utuh sesuai kontrak `API.md` Bagian 2.1.

3. **Frontend Tetap Bersih & Konsisten**:
   - Frontend tidak perlu memanggil SDK Supabase atau mengubah kredensial.
   - Formulir di `/profile` tetap memanggil `useUpdateMyPatient` dan `useGetMyPatient`.
   - Email tetap dikunci sebagai *read-only* demi keamanan identitas login.

---

## 4. Langkah Verifikasi Pengujian

1. Buka browser pada aplikasi web `http://localhost:3000/profile` (login sebagai `pasien@klinik.test`).
2. Klik tombol **"Edit data"** pada kartu Data Diri.
3. Ubah kolom:
   - **Tanggal lahir**: pilih `17 Agustus 1995` (`1995-08-17`).
   - **Jenis kelamin**: pilih `Laki-laki` (`male`).
   - **Alamat**: isi `Jl. Senopati No. 45, Kebayoran Baru, Jakarta Selatan`.
4. Klik tombol **"Simpan perubahan"**.
5. Lakukan **Reload / Refresh Halaman (F5)**:
   - Pastikan tanggal lahir tetap tampil sebagai `17 Agustus 1995`.
   - Pastikan jenis kelamin tetap tampil sebagai `Laki-laki`.
   - Pastikan alamat tetap tersimpan secara permanen.
   - Pastikan tidak ada panggilan langsung ke Supabase dari browser network tab (seluruh panggilan adalah `GET /api/v1/patients/me` dan `PATCH /api/v1/patients/me`).
