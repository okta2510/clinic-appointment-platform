# INT.md — Panduan Integrasi Supabase Lengkap

Panduan langkah demi langkah untuk menghubungkan **Clinic Appointment Platform** ke **Supabase** (Database PostgreSQL, Autentikasi, Storage, Realtime, dan pg_cron).

> [!IMPORTANT]
> **Arsitektur Fase Ini**: Frontend Next.js **100% berkomunikasi melalui Backend REST API Gateway** (`NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1`) dan **TIDAK MEMANGGIL SUPABASE SECARA LANGSUNG**. Seluruh akses database, validasi autentikasi JWT, kuota, dan mutasi data dikelola oleh Backend Application Server (Express.js / Prisma). Dokumen ini berfungsi sebagai panduan provisioning dan pemeliharaan infrastruktur Supabase Cloud yang menjadi fondasi data backend service.

Dokumen ini ditulis secara praktis agar pengembang baru dapat melakukan setup proyek dari nol hingga berjalan dalam waktu kurang dari 15 menit.

---

## 1. Prasyarat

1. Akun di [supabase.com](https://supabase.com) (tersedia paket gratis).
2. Node.js versi 20+ terpasang di komputer lokal.
3. Repositori `clinic-appointment-platform` sudah di-clone.

---

## 2. Langkah 1: Buat Project Baru di Supabase

1. Buka [Dashboard Supabase](https://supabase.com/dashboard) dan klik **"New project"**.
2. Masukkan nama project (contoh: `clinic-appointment-platform`).
3. Tentukan **Database Password** yang kuat dan simpan di catatan Anda.
4. Pilih region terdekat (misal: **Singapore / Southeast Asia** untuk latensi terbaik dari Indonesia).
5. Klik **"Create new project"** dan tunggu sekitar 1–2 menit hingga database selesai disiapkan.

---

## 3. Langkah 2: Ambil API Keys & Project URL

1. Di Dashboard project Supabase, buka menu **Settings (ikon gerigi) -> API**.
2. Salin nilai berikut:
   - **Project URL** (contoh: `https://xyzcompany.supabase.co`)
   - **anon / public key** (kunci aman untuk sisi frontend)
3. Di root proyek lokal Anda, buat file `.env.local` dari template:
   ```bash
   cp example.env .env.local
   ```
4. Isi konfigurasi dengan nilai yang telah Anda salin serta URL gateway backend Express:
   ```env
   # .env.local
   # 1. Kredensial Supabase Project
   NEXT_PUBLIC_SUPABASE_URL=https://xyzcompany.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...

   # 2. Backend REST API Gateway (Express.js service pada port 8000)
   NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
   ```

---

## 4. Langkah 3: Eksekusi Skema Database (Migrations & Seed)

Seluruh skema tabel, fungsi transaksi (RPC), Row Level Security (RLS), dan Storage policies sudah siap di folder `supabase/`.

### Opsi A: Lewat Supabase Dashboard (Paling Mudah)
1. Buka menu **SQL Editor** di Dashboard Supabase.
2. Jalankan berkas SQL berikut secara berurutan:
   - **Langkah 1**: [supabase/migrations/20261103000000_init_schema.sql](./supabase/migrations/20261103000000_init_schema.sql) (Tabel, Enum, Trigger, RLS, Storage, RPC transaksi awal).
   - **Langkah 2**: [supabase/migrations/20261103000100_cron_jobs.sql](./supabase/migrations/20261103000100_cron_jobs.sql) (pg_cron pemulihan kuota & kedaluwarsa 30m).
   - **Langkah 3**: [supabase/migrations/20261103000200_allow_ongoing_booking.sql](./supabase/migrations/20261103000200_allow_ongoing_booking.sql) (Peningkatan RPC booking jadwal hari ini, Base64 payment, & check-in fleksibel).
   - **Langkah 4**: [supabase/wipe_and_seed_beauty_clinic.sql](./supabase/wipe_and_seed_beauty_clinic.sql) (Wipe & seed data klinik kecantikan, dokter estetika, jadwal hari ini, dan akun demo pengujian).
   - Output sukses: Semua tabel, RPC transaksi, dokter kecantikan, dan akun demo siap digunakan.

### Opsi B: Lewat Supabase CLI (Opsional bagi yang memakai CLI)
```bash
npx supabase login
npx supabase link --project-ref <project-id-anda>
npx supabase db push
```

### 🔒 Fitur Keamanan Bawaan: Automatic RLS Event Trigger
Di file migrasi `20261103000000_init_schema.sql`, telah disertakan **Event Trigger Otomatis**:
```sql
CREATE EVENT TRIGGER ensure_rls
ON ddl_command_end
WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
EXECUTE FUNCTION public.rls_auto_enable();
```
**Mengapa ini penting?**
- Secara default di PostgreSQL, tabel baru yang dibuat tidak otomatis memiliki RLS aktif.
- Jika di kemudian hari ada programmer baru membuat tabel baru (`CREATE TABLE ...`) dan lupa menulis `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`, tabel tersebut bisa terekspos ke publik melalui API Supabase!
- Dengan event trigger ini, **setiap kali ada tabel baru yang dibuat di skema `public`, Postgres otomatis mengaktifkan RLS**. Ini menjadi jaring pengaman (*safety net*) anti-bocor data yang direkomendasikan oleh Supabase Security Advisor.

---

## 5. Langkah 4: Aktifkan Ekstensi pg_cron (Otomasi 30 Menit)

Agar janji temu otomatis kedaluwarsa jika bukti bayar tidak diunggah dalam 30 menit:

1. Di Dashboard Supabase, buka **Database -> Extensions**.
2. Cari `pg_cron`. Jika belum aktif, klik **Enable**.
3. Buka menu **SQL Editor**, buka file [supabase/migrations/20261103000100_cron_jobs.sql](./supabase/migrations/20261103000100_cron_jobs.sql), salin isinya, lalu klik **"Run"**.
4. Verifikasi jadwal cron aktif dengan menjalankan query:
   ```sql
   select * from cron.job;
   ```
   *Anda akan melihat job `process-expired-appointments` aktif berjalan setiap menit (`* * * * *`).*

---

## 6. Langkah 5: Instalasi Client Library di Frontend

Jalankan perintah ini di terminal proyek:

```bash
npm install @supabase/supabase-js @supabase/ssr
```

---

## 7. Langkah 6: Struktur Helper Supabase di Next.js 16

Buat 3 file helper di proyek Next.js untuk menangani Client Components, Server Components, dan Network Proxy:

### 7.1 Browser Client: `src/lib/supabase/client.ts`
Digunakan oleh Client Components (`'use client'`) dan custom hooks:

```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### 7.2 Server Client: `src/lib/supabase/server.ts`
Digunakan oleh Server Components dan Route Handlers:

```typescript
// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Dipanggil dari Server Component, diabaikan karena ditangani proxy
          }
        },
      },
    }
  );
}
```

### 7.3 Network Proxy: `src/proxy.ts` (Next.js 16)
Next.js 16 merekomendasikan `proxy.ts` untuk merefresh session token Supabase secara otomatis pada setiap request:

```typescript
// src/proxy.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh token sesi jika sudah expired
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

---

## 8. Langkah 7: Panduan Penggunaan Fitur di Kode Frontend

### 8.1 Autentikasi Pengguna (Login & Register)

```typescript
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

// Registrasi Pasien Baru
export async function registerPatient(email: string, password: string, fullName: string, phone: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone_number: phone,
      },
    },
  });
  if (error) throw error;
  return data;
}

// Login
export async function loginUser(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

// Logout
export async function logoutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
```

### 8.2 Memanggil Stored Procedure / Transaksi (RPC)

Gunakan metode `.rpc()` untuk transaksi aman kuota dan antrean:

```typescript
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

// 1. Cek Ketersediaan Kuota Slot
export async function fetchAvailability(doctorId: string, dateStr: string) {
  const { data, error } = await supabase.rpc('get_availability', {
    p_doctor_id: doctorId,
    p_date: dateStr,
  });
  if (error) throw error;
  return data;
}

// 2. Booking Janji Temu (Atomik dengan Row Lock)
export async function bookAppointment(scheduleId: string, dateStr: string) {
  const { data, error } = await supabase.rpc('book_appointment', {
    p_schedule_id: scheduleId,
    p_date: dateStr,
  });
  if (error) throw error;
  return data;
}

// 3. Scan QR Check-in di Klinik
export async function checkInPatient(qrToken: string) {
  const { data, error } = await supabase.rpc('check_in', {
    p_qr_token: qrToken,
  });
  if (error) throw error;
  return data;
}

// 4. Panggil Pasien Berikutnya (Call Next)
export async function callNextPatient(sessionId: string) {
  const { data, error } = await supabase.rpc('call_next', {
    p_session_id: sessionId,
  });
  if (error) throw error;
  return data;
}
```

### 8.3 Upload Bukti Pembayaran ke Storage Privat

```typescript
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export async function uploadPaymentProof(appointmentId: string, file: File) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Harap login');

  const fileExt = file.name.split('.').pop();
  const filePath = `${user.id}/${appointmentId}-${Date.now()}.${fileExt}`;

  // 1. Upload ke Storage Bucket privat 'payment-proofs'
  const { error: uploadError } = await supabase.storage
    .from('payment-proofs')
    .upload(filePath, file, { upsert: true });

  if (uploadError) throw uploadError;

  // 2. Panggil RPC untuk memperbarui status transaksi menjadi 'waiting_confirmation'
  const { data, error: rpcError } = await supabase.rpc('submit_payment_proof', {
    p_appointment_id: appointmentId,
    p_path: filePath,
  });

  if (rpcError) throw rpcError;
  return data;
}
```

### 8.4 Berlangganan Live Queue Realtime (Display TV Ruang Tunggu)

```typescript
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useLiveQueue() {
  const supabase = createClient();
  const [queue, setQueue] = useState([]);

  async function loadQueue() {
    const { data } = await supabase.rpc('get_live_queue');
    if (data) setQueue(data);
  }

  useEffect(() => {
    loadQueue();

    // Dengarkan perubahan pada sesi praktik hari ini
    const channel = supabase
      .channel('live-queue-tv')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'practice_sessions' },
        () => {
          loadQueue(); // Refresh nomor antrean yang dipanggil secara instan
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return queue;
}
```

---

## 9. Langkah 8: Menyiapkan Akun Demo (Admin & Pasien)

Untuk memudahkan pengujian alur, tersedia 2 akun demo pengujian yang dicantumkan di `README.md`:

| Peran (Role) | Email | Password | Halaman Masuk |
|---|---|---|---|
| **Admin Utama** | `admin@klinik.test` | `Admin123!` | `/admin/login` |
| **Pasien Demo** | `pasien@klinik.test` | `Pasien123!` | `/login` |

### Opsi A (Lewat Dashboard UI - 1 Menit)
1. Buka Supabase Dashboard -> **Authentication -> Users**.
2. Klik tombol **"Add user" -> "Create user"**:
   - Buat user 1: `admin@klinik.test` (password: `Admin123!`), centang **Auto Confirm User**.
   - Buat user 2: `pasien@klinik.test` (password: `Pasien123!`), centang **Auto Confirm User**.
3. Buka **SQL Editor** dan jalankan perintah ini:
   ```sql
   update public.profiles set role = 'admin', full_name = 'Admin Utama Klinik Estetika' where id = (select id from auth.users where email = 'admin@klinik.test');
   update public.profiles set role = 'patient', full_name = 'Budi Pasien Demo', phone_number = '08123456789' where id = (select id from auth.users where email = 'pasien@klinik.test');
   ```

### Opsi B (Otomatis via SQL Script)
Anda dapat menyalin script SQL dari file [`supabase/wipe_and_seed_beauty_clinic.sql`](./supabase/wipe_and_seed_beauty_clinic.sql) atau menjalankan blok kode berikut di SQL Editor:

```sql
create extension if not exists "pgcrypto";

delete from auth.users where email in ('admin@klinik.test', 'pasien@klinik.test');

do $$
declare
  v_admin_id uuid := 'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa';
  v_patient_id uuid := 'bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb';
begin
  -- Buat User Admin Demo
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_admin_id, 'authenticated', 'authenticated',
    'admin@klinik.test', crypt('Admin123!', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Admin Utama Klinik Estetika"}'::jsonb, now(), now(),
    '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_admin_id, v_admin_id::text,
    format('{"sub":"%s","email":"admin@klinik.test"}', v_admin_id)::jsonb,
    'email', now(), now(), now()
  );

  update public.profiles set role = 'admin', full_name = 'Admin Utama Klinik Estetika' where id = v_admin_id;

  -- Buat User Pasien Demo
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_patient_id, 'authenticated', 'authenticated',
    'pasien@klinik.test', crypt('Pasien123!', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Budi Pasien Demo","phone_number":"08123456789"}'::jsonb, now(), now(),
    '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_patient_id, v_patient_id::text,
    format('{"sub":"%s","email":"pasien@klinik.test"}', v_patient_id)::jsonb,
    'email', now(), now(), now()
  );

  update public.profiles set role = 'patient', full_name = 'Budi Pasien Demo', phone_number = '08123456789' where id = v_patient_id;
end $$;
```

---

## 10. Troubleshooting & FAQ

### T: Muncul error `permission denied for table ...` (403 Forbidden)
**Jawab**: Anda mencoba melakukan query `INSERT` atau `UPDATE` langsung pada tabel `appointments` dari sisi client. Seluruh modifikasi status janji temu wajib melewati Stored Procedure / RPC (`book_appointment`, `submit_payment_proof`, `approve_appointment`, dll) untuk menjaga integritas transaksi.

### T: Bukti bayar tidak bisa di-upload (error path tidak valid)
**Jawab**: Storage policy mewajibkan path file diawali dengan User ID pengunggah (`<auth.uid()>/nama-file.jpg`). Pastikan pengunggah telah login dan path file diformat dengan benar.

### T: Realtime tidak memicu pembaruan di layar `/queue`
**Jawab**: Pastikan tabel `practice_sessions` sudah didaftarkan ke publikasi `supabase_realtime` dengan query:
```sql
alter publication supabase_realtime add table public.practice_sessions;
```

### T: Transaksi tidak otomatis expired setelah 30 menit
**Jawab**: Periksa apakah ekstensi `pg_cron` sudah aktif di dashboard. Anda dapat memverifikasi log eksekusi cron dengan query:
```sql
select * from cron.job_run_details order by start_time desc limit 5;
```

---

## 11. Koordinasi Multi-Service (Backend Port 8000 & Frontend Port 3000)

Ekosistem aplikasi ini terdiri atas dua service lokal yang berbagi satu database Supabase yang sama:

| Service | Direktori | Port Lokal | Peran Utama |
|---|---|---|---|
| **Backend REST API** | `../api-clinic-appointment` | `http://localhost:8000` | Gateway endpoint `/api/v1/*`, otentikasi JWT, validasi bisnis, query database via Prisma ORM 7. |
| **Frontend Web App** | `./clinic-appointment-platform` | `http://localhost:3000` | UI Next.js 16, client-side caching (TanStack Query), komunikasi via `apiClient`, tampilan display antrean TV. |
| **Shared Database** | Supabase Cloud | Port 5432 / Pooler 6543 | PostgreSQL tunggal tempat tabel, trigger, dan RPC transaksi berada. |

### Urutan Menjalankan Multi-Service Secara Bersamaan:
1. **Jalankan Backend Terlebih Dahulu**:
   ```bash
   cd ../api-clinic-appointment
   npm run dev
   ```
   Pastikan backend siap melayani request di `http://localhost:8000/api/v1`.
2. **Jalankan Frontend di Terminal Berbeda**:
   ```bash
   cd clinic-appointment-platform
   npm run dev
   ```
   Frontend akan otomatis meneruskan panggilan data ke backend melalui `src/lib/api-client.ts`.
3. **Database Sinkron Otomatis**:
   Karena kedua service mengarah ke instance Supabase yang sama, perubahan data yang dibuat dari frontend (misalnya membuat janji baru atau menyetujui pembayaran) akan langsung tersimpan di PostgreSQL Supabase dan terbaca oleh kedua service tanpa replikasi manual.


