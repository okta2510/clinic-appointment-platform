-- =============================================================================
-- Data contoh (seed) — dijalankan otomatis oleh `supabase db reset`
-- atau paste manual ke SQL Editor.
-- =============================================================================

-- Spesialisasi
insert into public.specialists (id, name, description) values
  ('11111111-0000-0000-0000-000000000001', 'Dokter Umum',              'Pemeriksaan kesehatan umum dan keluhan ringan'),
  ('11111111-0000-0000-0000-000000000002', 'Spesialis Anak',           'Kesehatan bayi, anak, dan remaja'),
  ('11111111-0000-0000-0000-000000000003', 'Spesialis Penyakit Dalam', 'Diabetes, hipertensi, dan penyakit organ dalam'),
  ('11111111-0000-0000-0000-000000000004', 'Spesialis Kulit & Kelamin','Jerawat, alergi kulit, dan penyakit kelamin'),
  ('11111111-0000-0000-0000-000000000005', 'Dokter Gigi',              'Perawatan dan pemeriksaan gigi'),
  ('11111111-0000-0000-0000-000000000006', 'Spesialis Kandungan',      'Kehamilan dan kesehatan reproduksi wanita')
on conflict (id) do nothing;

-- Dokter (harga dalam Rupiah)
insert into public.doctors (id, specialist_id, full_name, bio, experience_years, consultation_fee) values
  ('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'dr. Andi Pratama',            'Dokter umum yang ramah untuk keluhan sehari-hari.', 6, 100000),
  ('22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'dr. Rina Kusuma',             'Berpengalaman di layanan klinik dan vaksinasi dewasa.', 9, 120000),
  ('22222222-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000002', 'dr. Siti Rahmawati, Sp.A',    'Fokus pada tumbuh kembang dan imunisasi anak.', 12, 250000),
  ('22222222-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000003', 'dr. Budi Santoso, Sp.PD',     'Menangani diabetes, hipertensi, dan kolesterol.', 15, 300000),
  ('22222222-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000004', 'dr. Maya Lestari, Sp.KK',     'Perawatan jerawat, eksim, dan alergi kulit.', 8, 275000),
  ('22222222-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000005', 'drg. Fajar Nugroho',          'Scaling, tambal gigi, dan konsultasi ortodonti.', 7, 150000),
  ('22222222-0000-0000-0000-000000000007', '11111111-0000-0000-0000-000000000006', 'dr. Dewi Anggraini, Sp.OG',   'Pemeriksaan kehamilan dan USG.', 11, 350000)
on conflict (id) do nothing;

-- Jadwal mingguan (0 = Minggu ... 6 = Sabtu)
insert into public.doctor_schedules (doctor_id, day_of_week, start_time, end_time, patient_quota) values
  ('22222222-0000-0000-0000-000000000001', 1, '08:00', '12:00', 15),
  ('22222222-0000-0000-0000-000000000001', 3, '08:00', '12:00', 15),
  ('22222222-0000-0000-0000-000000000001', 5, '13:00', '17:00', 15),
  ('22222222-0000-0000-0000-000000000002', 2, '08:00', '12:00', 15),
  ('22222222-0000-0000-0000-000000000002', 4, '13:00', '17:00', 15),
  ('22222222-0000-0000-0000-000000000002', 6, '09:00', '12:00', 10),
  ('22222222-0000-0000-0000-000000000003', 1, '10:00', '12:00', 10),
  ('22222222-0000-0000-0000-000000000003', 4, '10:00', '12:00', 10),
  ('22222222-0000-0000-0000-000000000004', 2, '16:00', '19:00', 8),
  ('22222222-0000-0000-0000-000000000004', 5, '16:00', '19:00', 8),
  ('22222222-0000-0000-0000-000000000005', 3, '13:00', '16:00', 10),
  ('22222222-0000-0000-0000-000000000005', 6, '10:00', '13:00', 10),
  ('22222222-0000-0000-0000-000000000006', 1, '13:00', '17:00', 8),
  ('22222222-0000-0000-0000-000000000006', 4, '08:00', '12:00', 8),
  ('22222222-0000-0000-0000-000000000007', 2, '09:00', '12:00', 6),
  ('22222222-0000-0000-0000-000000000007', 5, '09:00', '12:00', 6)
on conflict (doctor_id, day_of_week, start_time) do nothing;

-- -----------------------------------------------------------------------------
-- Akun Demo Pengujian (Admin & Pasien)
-- -----------------------------------------------------------------------------
-- Admin : admin@klinik.test  | Password: Admin123!
-- Pasien: pasien@klinik.test | Password: Pasien123!
-- -----------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- Hapus dulu jika sebelumnya pernah ada row yang gagal/parsial
delete from auth.users where email in ('admin@klinik.test', 'pasien@klinik.test');

do $$
declare
  v_admin_id uuid := 'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa';
  v_patient_id uuid := 'bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb';
begin
  -- 1. Buat User Admin Demo
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_admin_id, 'authenticated', 'authenticated',
    'admin@klinik.test', crypt('Admin123!', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Admin Utama Klinik"}'::jsonb, now(), now(),
    '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_admin_id, v_admin_id::text,
    format('{"sub":"%s","email":"admin@klinik.test"}', v_admin_id)::jsonb,
    'email', now(), now(), now()
  );

  update public.profiles set role = 'admin', full_name = 'Admin Utama Klinik' where id = v_admin_id;

  -- 2. Buat User Pasien Demo
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
