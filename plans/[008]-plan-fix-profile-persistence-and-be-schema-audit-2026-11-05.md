# Plan [008] - Audit Skema Backend & Investigasi Persistensi Edit Profil Pasien (/profile)

**Tanggal Dibuat:** 2026-11-05  
**Domain:** Pasien Profile, Supabase RLS, Prisma Schema & Backend Persistence  
**Status:** DRAFT / WAITING APPROVAL  

---

## 1. Pertanyaan User & Ringkasan Jawaban Cepat

### Pertanyaan 1: Apakah butuh request update Backend Schema untuk email, date of birth, dan gender?
- **Date of Birth (`date_of_birth`)**: **TIDAK BUTUH**. Kolom `date_of_birth` (tipe `date`) sudah ada di skema database Supabase `public.profiles` dan sudah terdaftar di `prisma/schema.prisma` baris 57.
- **Gender (`gender`)**: **TIDAK BUTUH**. Kolom `gender` (enum `male`, `female`, `other`) sudah ada di tabel `public.profiles` dan sudah terdaftar di `prisma/schema.prisma` baris 58.
- **Email (`email`)**: **TIDAK PERLU UBAH SCHEMA TABEL PROFILES**.
  - Di arsitektur Supabase, email adalah kredensial identitas akun login yang disimpan di tabel `auth.users`, bukan di `public.profiles`.
  - Di frontend, input email sudah dikunci (**disabled / read-only**) karena email adalah identitas login utama akun.
  - Yang dibutuhkan dari sisi backend hanyalah **membaca email dari sesi/auth token** saat `GET /patients/me` (agar respon tidak mengembalikan `email: ""`).

---

### Pertanyaan 2: Mengapa perubahan tidak terjadi setelah reload?
User mengisi perubahan (nama, tanggal lahir, jenis kelamin), menekan tombol simpan, namun saat halaman di-reload (F5), data kembali seperti semula (misal tanggal lahir dan gender kembali strip `-`).

**Akar Masalah (Root Cause):**
Perubahan **tidak benar-benar tersimpan ke database PostgreSQL Supabase** saat `PATCH /patients/me` dieksekusi. Ini disebabkan oleh 3 faktor teknis di backend:

1. **Kebijakan Row Level Security (RLS) Supabase Membatalkan UPDATE Pasien**:
   - Di PostgreSQL Supabase, kebijakan RLS tabel `public.profiles` didefinisikan sebagai:
     ```sql
     CREATE POLICY "profiles: ubah milik sendiri"
       ON public.profiles FOR UPDATE TO authenticated
       USING (id = auth.uid())
       WITH CHECK (id = auth.uid());
     ```
   - Di backend (`PatientService.updateMe`), backend menggunakan client dari `getSupabaseUserClient(userId)`.
   - Jika cache memori backend kehilangan token pasien (misal karena backend nodemon reload atau token sesi habis), fungsi `getUserToken` beralih memanggil `getOrFetchAdminToken()` (Token Admin).
   - Ketika request UPDATE dikirim ke Supabase menggunakan Admin Token, Supabase mendeteksi `auth.uid()` adalah ID Admin, sedangkan `id` baris yang di-update adalah ID Pasien.
   - Karena policy UPDATE **tidak memiliki klausa `OR public.is_admin()`**, Supabase secara diam-diam membatalkan update tersebut (**0 baris ter-update**) tanpa melemparkan error (`{ data: [], count: 0 }`).
2. **Ketiadaan Real Service Role Key di Backend `.env`**:
   - Backend `.env` saat ini menggunakan publishable key untuk `SUPABASE_SERVICE_ROLE_KEY` (`sb_publishable_...`).
   - Kunci ini terikat aturan RLS pengguna biasa dan tidak dapat melakukan bypass RLS layaknya secret service role key (`eyJ...`).
3. **Prisma Fallback Selalu Gagal & Error Tertelan**:
   - Backend memiliki blok fallback `prisma.profiles.update`.
   - Namun di backend `.env`, `DATABASE_URL` disetel ke `postgresql://postgres:postgres@localhost:5432/postgres` (database lokal yang tidak aktif).
   - Blok `try/catch` di backend menelan error tersebut tanpa memberi tahu pemanggil API.
   - Hasilnya, `PATCH /patients/me` mengembalikan HTTP 200 OK dengan data lama yang belum ter-update!

---

## 2. Matriks Audit Skema Backend vs Frontend

| Field | Status di `public.profiles` (Supabase) | Status di `prisma/schema.prisma` | Status di `patient.validator.ts` | Status di Frontend Form | Butuh Ubah Schema BE? |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **`full_name`** | `text not null default ''` | `String @default("")` | `z.string().min(1).max(150)` | Input Text | **TIDAK** |
| **`phone_number`** | `text` | `String?` | `z.string().min(1).max(20)` | Input Tel | **TIDAK** |
| **`date_of_birth`** | `date` | `DateTime? @db.Date` | `z.iso.date().nullable()` | Input Date (`YYYY-MM-DD`) | **TIDAK** |
| **`gender`** | `enum ('male','female','other')` | `enum gender?` | `z.enum(['male','female','other'])` | Select Dropdown | **TIDAK** |
| **`address`** | `text` | `String?` | `z.string().trim().nullable()` | Textarea | **TIDAK** |
| **`email`** | *Tidak ada* (di `auth.users`) | *Tidak ada* (di `user` legacy) | `z.email().optional()` | Input Disabled (Read-only) | **TIDAK** *(Cukup return email di GET)* |

---

## 3. Rencana Solusi & Perbaikan (Action Plan)

### Opsi Solusi A: Perbaikan Kebijakan RLS di Supabase (Paling Cepat & Aman)
Tambahkan izin pada policy UPDATE tabel `public.profiles` agar admin atau service role dapat meng-update profil pasien, atau pastikan token pasien tersampaikan dengan benar.
Query SQL yang dibutuhkan di Supabase:
```sql
-- Izinkan admin mengupdate profil pasien (sehingga backend API yang bertindak sebagai admin/server bisa menyimpan perubahan profil pasien)
DROP POLICY IF EXISTS "profiles: ubah milik sendiri" ON public.profiles;
CREATE POLICY "profiles: ubah milik sendiri atau admin"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());
```
*Dampak:* Seketika query update dari backend (yang menggunakan token admin atau token user) akan sukses memperbarui kolom `date_of_birth`, `gender`, `full_name`, dan `address` di database Supabase!

### Opsi Solusi B: Pasang Supabase Secret Service Role Key di Backend `.env`
- Di project Supabase Dashboard -> Settings -> API -> Ambil **`service_role` secret key** (JWT yang diawali `eyJ...`).
- Masukkan ke `/Users/oktaviardi/Okta/api-clinic-appointment/.env` pada baris:
  `SUPABASE_SERVICE_ROLE_KEY=eyJ...`
- *Dampak:* `getSupabaseClient()` di backend otomatis menggunakan hak superuser yang melewati (*bypass*) RLS, sehingga pembaruan profil dijamin 100% tersimpan ke database.

### Opsi Solusi C: Perbaikan Kode Backend `PatientService` (Jika Backend Repo Boleh Diubah)
1. **Perbaiki `PatientService.getMe`**:
   Sertakan email dari `res.locals.auth.email` agar respon profil mengembalikan email pengguna yang valid.
2. **Tangani Error pada Supabase Update**:
   Periksa hasil `{ data, error }` dari Supabase update dan lempar `AppError(500, error.message)` jika update gagal, bukan menelannya secara diam-diam.

---

## 4. Langkah Verifikasi
1. Eksekusi query update policy RLS di Supabase (Opsi A) atau masukkan secret service role key (Opsi B).
2. Login ke antarmuka web sebagai `pasien@klinik.test`.
3. Buka halaman `/profile`.
4. Klik **Edit data**.
5. Ubah:
   - Tanggal lahir: misal `17 Agustus 1995` (`1995-08-17`)
   - Jenis kelamin: `Laki-laki` (`male`)
   - Alamat: `Jl. Senopati No. 45, Jakarta Selatan`
6. Klik **Simpan perubahan**.
7. Lakukan **Reload / Refresh Halaman (F5)**:
   - Pastikan tanggal lahir tetap `17 Agustus 1995`.
   - Pastikan jenis kelamin tetap `Laki-laki`.
   - Pastikan alamat tetap tersimpan.

