-- =============================================================================
-- Data contoh (seed) — Clinic Appointment Platform
-- =============================================================================

-- 1. Spesialisasi
insert into public.specialists (id, name, description) values
  ('11111111-0000-0000-0000-000000000001', 'Dokter Umum',              'Pemeriksaan kesehatan umum dan keluhan ringan'),
  ('11111111-0000-0000-0000-000000000002', 'Spesialis Anak',           'Kesehatan bayi, anak, dan remaja'),
  ('11111111-0000-0000-0000-000000000003', 'Spesialis Penyakit Dalam', 'Diabetes, hipertensi, dan penyakit organ dalam'),
  ('11111111-0000-0000-0000-000000000004', 'Spesialis Kulit & Kelamin','Jerawat, alergi kulit, dan penyakit kelamin'),
  ('11111111-0000-0000-0000-000000000005', 'Dokter Gigi',              'Perawatan dan pemeriksaan gigi'),
  ('11111111-0000-0000-0000-000000000006', 'Spesialis Kandungan',      'Kehamilan dan kesehatan reproduksi wanita')
on conflict (id) do nothing;

-- 2. Dokter (harga dalam Rupiah)
insert into public.doctors (id, specialist_id, full_name, bio, experience_years, consultation_fee) values
  ('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'dr. Andi Pratama',            'Dokter umum yang ramah untuk keluhan sehari-hari.', 6, 100000),
  ('22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'dr. Rina Kusuma',             'Berpengalaman di layanan klinik dan vaksinasi dewasa.', 9, 120000),
  ('22222222-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000002', 'dr. Siti Rahmawati, Sp.A',    'Fokus pada tumbuh kembang dan imunisasi anak.', 12, 250000),
  ('22222222-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000003', 'dr. Budi Santoso, Sp.PD',     'Menangani diabetes, hipertensi, dan kolesterol.', 15, 300000),
  ('22222222-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000004', 'dr. Maya Lestari, Sp.KK',     'Perawatan jerawat, eksim, dan alergi kulit.', 8, 275000),
  ('22222222-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000005', 'drg. Fajar Nugroho',          'Scaling, tambal gigi, dan konsultasi ortodonti.', 7, 150000),
  ('22222222-0000-0000-0000-000000000007', '11111111-0000-0000-0000-000000000006', 'dr. Dewi Anggraini, Sp.OG',   'Pemeriksaan kehamilan dan USG.', 11, 350000)
on conflict (id) do nothing;

-- 3. Jadwal mingguan (0 = Minggu ... 6 = Sabtu)
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
-- 4. Akun Demo Pengujian (Admin & Pasien) & Data Janji Temu Terkoneksi
-- -----------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- Hapus dulu jika sebelumnya pernah ada row yang gagal/parsial
delete from auth.users where email in (
  'admin@klinik.test',
  'pasien@klinik.test',
  'siti@klinik.test',
  'ahmad@klinik.test'
);

do $$
declare
  v_admin_id      uuid := 'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa';
  v_patient_id    uuid := 'bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb'; -- Budi Pasien Demo (akun login pasien)
  v_patient_id_2  uuid := 'bbbbbbbb-2222-2222-2222-cccccccccccc'; -- Siti Rahayu (pasien antrean #1)
  v_patient_id_3  uuid := 'bbbbbbbb-2222-2222-2222-dddddddddddd'; -- Ahmad Fauzi (pasien menunggu bukti bayar)
  v_session_today uuid := '44444444-0000-0000-0000-000000000001';
  v_session_past  uuid := '44444444-0000-0000-0000-000000000002';
  v_doctor_id     uuid := '22222222-0000-0000-0000-000000000001';
  v_today         date := (now() at time zone 'Asia/Jakarta')::date;
begin
  -- 1. Buat User Admin Demo (admin@klinik.test / Admin123!)
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

  -- 2. Buat User Pasien Demo Utama (pasien@klinik.test / Pasien123!)
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

  -- Buat Pasien 2 (Siti Rahayu) untuk antrean aktif #1
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_patient_id_2, 'authenticated', 'authenticated',
    'siti@klinik.test', crypt('Pasien123!', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Siti Rahayu","phone_number":"08129876543"}'::jsonb, now(), now(),
    '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_patient_id_2, v_patient_id_2::text,
    format('{"sub":"%s","email":"siti@klinik.test"}', v_patient_id_2)::jsonb,
    'email', now(), now(), now()
  );

  update public.profiles set role = 'patient', full_name = 'Siti Rahayu', phone_number = '08129876543' where id = v_patient_id_2;

  -- Buat Pasien 3 (Ahmad Fauzi) untuk janji menunggu konfirmasi
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_patient_id_3, 'authenticated', 'authenticated',
    'ahmad@klinik.test', crypt('Pasien123!', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Ahmad Fauzi","phone_number":"08137788990"}'::jsonb, now(), now(),
    '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_patient_id_3, v_patient_id_3::text,
    format('{"sub":"%s","email":"ahmad@klinik.test"}', v_patient_id_3)::jsonb,
    'email', now(), now(), now()
  );

  update public.profiles set role = 'patient', full_name = 'Ahmad Fauzi', phone_number = '08137788990' where id = v_patient_id_3;

  -- 3. Sesi Praktik Dokter Hari Ini (untuk live queue display & scanner)
  insert into public.practice_sessions (
    id, doctor_id, session_date, start_time, end_time, starts_at, ends_at, patient_quota, current_queue_number
  ) values (
    v_session_today,
    v_doctor_id,
    v_today,
    '08:00', '12:00',
    (v_today + time '08:00') at time zone 'Asia/Jakarta',
    (v_today + time '12:00') at time zone 'Asia/Jakarta',
    15,
    1 -- antrean saat ini yang sedang dilayani adalah nomor 1
  ) on conflict (doctor_id, session_date, start_time) do nothing;

  -- Sesi Praktik Bulan Lalu (untuk data grafik statistik)
  insert into public.practice_sessions (
    id, doctor_id, session_date, start_time, end_time, starts_at, ends_at, patient_quota, current_queue_number
  ) values (
    v_session_past,
    v_doctor_id,
    v_today - 15,
    '08:00', '12:00',
    (v_today - 15 + time '08:00') at time zone 'Asia/Jakarta',
    (v_today - 15 + time '12:00') at time zone 'Asia/Jakarta',
    15,
    2
  ) on conflict (doctor_id, session_date, start_time) do nothing;

  -- 4. Sample Janji Temu Terkoneksi (Setiap pasien hanya memiliki 1 booking aktif per sesi)
  -- Bersihkan sample appointment dan rating sebelumnya agar eksekusi seed 100% idempotent
  delete from public.ratings where appointment_id in (
    '55555555-0000-0000-0000-000000000001',
    '55555555-0000-0000-0000-000000000002',
    '55555555-0000-0000-0000-000000000003',
    '55555555-0000-0000-0000-000000000004'
  );

  delete from public.appointments where id in (
    '55555555-0000-0000-0000-000000000001',
    '55555555-0000-0000-0000-000000000002',
    '55555555-0000-0000-0000-000000000003',
    '55555555-0000-0000-0000-000000000004'
  );

  -- A. Janji Hari Ini 1 (Pasien: Siti Rahayu): Terkonfirmasi (done), sudah check-in, nomor antrean 1 (sedang dilayani)
  insert into public.appointments (
    id, code, patient_id, doctor_id, session_id, status, consultation_fee,
    payment_deadline, confirmed_at, booking_number, qr_token, checked_in_at, queue_number
  ) values (
    '55555555-0000-0000-0000-000000000001', 'APT-DEMO-001',
    v_patient_id_2, v_doctor_id, v_session_today, 'done', 100000,
    now() + interval '30 minutes', now() - interval '2 hours', 1,
    '99999999-0000-0000-0000-000000000001', now() - interval '30 minutes', 1
  );

  -- B. Janji Hari Ini 2 (Pasien: Ahmad Fauzi): Menunggu Konfirmasi Bukti Transfer (tampil di admin/payment & dashboard)
  insert into public.appointments (
    id, code, patient_id, doctor_id, session_id, status, consultation_fee,
    payment_deadline, payment_proof_path, payment_uploaded_at, booking_number
  ) values (
    '55555555-0000-0000-0000-000000000002', 'APT-DEMO-002',
    v_patient_id_3, v_doctor_id, v_session_today, 'waiting_confirmation', 100000,
    now() + interval '20 minutes', 'sample-proof.jpg', now() - interval '10 minutes', 2
  );

  -- C. Janji Hari Ini 3 (Pasien: Budi Pasien Demo): Terkonfirmasi (done), punya QR token, belum check-in
  -- Tampil di halaman /history akun pasien@klinik.test dan siap di-scan di /admin/queueManagement
  -- Token QR untuk dites: 99999999-0000-0000-0000-000000000003
  insert into public.appointments (
    id, code, patient_id, doctor_id, session_id, status, consultation_fee,
    payment_deadline, confirmed_at, booking_number, qr_token
  ) values (
    '55555555-0000-0000-0000-000000000003', 'APT-DEMO-003',
    v_patient_id, v_doctor_id, v_session_today, 'done', 100000,
    now() + interval '30 minutes', now() - interval '1 hour', 3,
    '99999999-0000-0000-0000-000000000003'
  );

  -- D. Janji Masa Lalu (Pasien: Budi Pasien Demo, sesi 15 hari lalu): Status done dengan rating bintang 5
  insert into public.appointments (
    id, code, patient_id, doctor_id, session_id, status, consultation_fee,
    payment_deadline, confirmed_at, booking_number, checked_in_at, queue_number
  ) values (
    '55555555-0000-0000-0000-000000000004', 'APT-DEMO-PAST',
    v_patient_id, v_doctor_id, v_session_past, 'done', 100000,
    now() - interval '15 days', now() - interval '15 days', 1,
    now() - interval '15 days', 1
  );

  -- Rating ulasan pasien untuk janji masa lalu
  insert into public.ratings (
    appointment_id, patient_id, doctor_id, rating, review, created_at
  ) values (
    '55555555-0000-0000-0000-000000000004', v_patient_id, v_doctor_id, 5,
    'Pelayanan dokter sangat memuaskan dan ramah.', now() - interval '15 days'
  );

end $$;
