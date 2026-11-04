-- =============================================================================
-- WIPE & RE-SEED: KLINIK KECANTIKAN & ESTETIKA (AESTHETIC CLINIC PLATFORM)
-- Menghapus seluruh data lama dan menginjeksi spesialisasi, dokter estetika,
-- jadwal praktik, sesi hari ini, akun demo, serta janji temu terverifikasi.
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. BERSIHKAN (WIPE) SELURUH DATA TRANSAKSI & MASTER DENGAN AMAN
-- -----------------------------------------------------------------------------
truncate table 
  public.ratings,
  public.appointments,
  public.practice_sessions,
  public.doctor_schedules,
  public.doctors,
  public.specialists
cascade;

-- -----------------------------------------------------------------------------
-- 2. MASTER SPESIALISASI KECANTIKAN & ESTETIKA
-- -----------------------------------------------------------------------------
insert into public.specialists (id, name, description) values
  (
    '11111111-0000-0000-0000-000000000001',
    'Dermatologi, Venereologi & Estetika (Sp.D.V.E)',
    'Diagnosis dan terapi medis jerawat aktif, hiperpigmentasi/melasma, dermatitis, serta perbaikan skin barrier rusak.'
  ),
  (
    '11111111-0000-0000-0000-000000000002',
    'Dokter Estetika Medik & Anti-Aging (Dipl. AAAM)',
    'Peremajaan wajah non-bedah: injeksi botox, dermal filler hyaluronic acid, thread lift (tarik benang), dan skin booster.'
  ),
  (
    '11111111-0000-0000-0000-000000000003',
    'Bedah Plastik Rekonstruksi & Estetik (Sp.B.P.R.E)',
    'Prosedur kontur estetika wajah, blefaroplasti (kelopak mata), revisi bopeng scar mendalam, dan rekonstruksi estetik.'
  ),
  (
    '11111111-0000-0000-0000-000000000004',
    'Laser & Kosmetika Kulit (Advanced Laser Energy)',
    'Teknologi canggih Pico Laser rejuvenasi, Fractional CO2 bopeng/pori, Yellow Laser vascular kemerahan, dan HIFU lifting.'
  ),
  (
    '11111111-0000-0000-0000-000000000005',
    'Trikologi & Perawatan Kulit Kepala (Hair & Scalp)',
    'Terapi kebotakan, penanganan kerontokan rambut kronis, Platelet-Rich Plasma (PRP) scalp therapy, dan stimulasi folikel.'
  )
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description;

-- -----------------------------------------------------------------------------
-- 3. DOKTER ESTETIKA & KECANTIKAN
-- -----------------------------------------------------------------------------
insert into public.doctors (id, specialist_id, full_name, bio, experience_years, consultation_fee, photo_url, is_active) values
  (
    '22222222-0000-0000-0000-000000000001',
    '11111111-0000-0000-0000-000000000001',
    'dr. Maya Lestari, Sp.D.V.E, FINSDV',
    'Dokter spesialis dermatologi lulusan Universitas Indonesia dengan fellowship laser di Seoul. Ahli dalam menangani acne vulgaris derajat berat, melasma hormonal, dan peremajaan kulit sensitif.',
    11,
    250000,
    'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=400',
    true
  ),
  (
    '22222222-0000-0000-0000-000000000002',
    '11111111-0000-0000-0000-000000000002',
    'dr. Gisella Valerie, Dipl. AAAM',
    'Dokter estetika bersertifikasi American Academy of Aesthetic Medicine. Memiliki pengalaman internasional dalam facial harmonization, baby botox natural look, dan lip filler hidrasi.',
    8,
    180000,
    'https://images.unsplash.com/photo-1594824813589-39f5c2eb7162?auto=format&fit=crop&q=80&w=400',
    true
  ),
  (
    '22222222-0000-0000-0000-000000000003',
    '11111111-0000-0000-0000-000000000003',
    'dr. Kevin Prasetya, Sp.B.P.R.E',
    'Spesialis bedah plastik estetik dengan fokus pada upper & lower blepharoplasty, revisi scar bopeng membandel, dan peremajaan kontur wajah proporsional dengan pemulihan minimal.',
    14,
    350000,
    'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=400',
    true
  ),
  (
    '22222222-0000-0000-0000-000000000004',
    '11111111-0000-0000-0000-000000000004',
    'dr. Natasha Wijaya, M.Biomed (AAM)',
    'Magister Anti-Aging Medicine lulusan Universitas Udayana. Ahli dalam protokol kombinasi Pico Laser, Radiofrequency Microneedling, dan chemical peeling pencerah untuk tekstur glass skin.',
    9,
    200000,
    'https://images.unsplash.com/photo-1527613426441-4da17471b66d?auto=format&fit=crop&q=80&w=400',
    true
  ),
  (
    '22222222-0000-0000-0000-000000000005',
    '11111111-0000-0000-0000-000000000001',
    'dr. Amanda Clarissa, Sp.D.V.E',
    'Fokus pada penanganan skin barrier rusak akibat over-exfoliation, alergi kosmetik, rosacea, serta terapi injeksi Polynucleotide Salmon DNA untuk elastisitas kulit mendalam.',
    7,
    220000,
    'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?auto=format&fit=crop&q=80&w=400',
    true
  ),
  (
    '22222222-0000-0000-0000-000000000006',
    '11111111-0000-0000-0000-000000000005',
    'dr. Reza Mahendra, Dipl. CIBTAC, AAAM',
    'Pakar trikologi klinis yang berfokus pada terapi kerontokan rambut pria dan wanita, PRP Hair Restoration, serta teknologi body slimming dan pengencangan kulit non-invasif.',
    6,
    175000,
    'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=400',
    true
  )
on conflict (id) do update set
  specialist_id = excluded.specialist_id,
  full_name = excluded.full_name,
  bio = excluded.bio,
  experience_years = excluded.experience_years,
  consultation_fee = excluded.consultation_fee,
  photo_url = excluded.photo_url,
  is_active = excluded.is_active;

-- -----------------------------------------------------------------------------
-- 4. JADWAL MINGGUAN DOKTER KECANTIKAN (0=Minggu ... 6=Sabtu)
-- Dibuat merata agar selalu ada dokter yang praktik setiap hari
-- -----------------------------------------------------------------------------
insert into public.doctor_schedules (doctor_id, day_of_week, start_time, end_time, patient_quota) values
  -- dr. Maya (Senin, Rabu, Jumat, Minggu)
  ('22222222-0000-0000-0000-000000000001', 1, '09:00', '13:00', 12),
  ('22222222-0000-0000-0000-000000000001', 3, '13:00', '17:00', 12),
  ('22222222-0000-0000-0000-000000000001', 5, '09:00', '13:00', 12),
  ('22222222-0000-0000-0000-000000000001', 0, '10:00', '15:00', 10),

  -- dr. Gisella (Selasa, Kamis, Sabtu, Minggu)
  ('22222222-0000-0000-0000-000000000002', 2, '10:00', '14:00', 10),
  ('22222222-0000-0000-0000-000000000002', 4, '14:00', '18:00', 10),
  ('22222222-0000-0000-0000-000000000002', 6, '10:00', '15:00', 12),
  ('22222222-0000-0000-0000-000000000002', 0, '13:00', '17:00', 8),

  -- dr. Kevin (Senin, Kamis, Sabtu)
  ('22222222-0000-0000-0000-000000000003', 1, '14:00', '18:00', 8),
  ('22222222-0000-0000-0000-000000000003', 4, '09:00', '13:00', 8),
  ('22222222-0000-0000-0000-000000000003', 6, '13:00', '17:00', 8),

  -- dr. Natasha (Selasa, Rabu, Jumat)
  ('22222222-0000-0000-0000-000000000004', 2, '14:00', '19:00', 12),
  ('22222222-0000-0000-0000-000000000004', 3, '09:00', '13:00', 10),
  ('22222222-0000-0000-0000-000000000004', 5, '14:00', '19:00', 12),

  -- dr. Amanda (Senin, Selasa, Jumat)
  ('22222222-0000-0000-0000-000000000005', 1, '10:00', '14:00', 10),
  ('22222222-0000-0000-0000-000000000005', 2, '09:00', '13:00', 10),
  ('22222222-0000-0000-0000-000000000005', 5, '10:00', '14:00', 10),

  -- dr. Reza (Rabu, Kamis, Sabtu)
  ('22222222-0000-0000-0000-000000000006', 3, '14:00', '18:00', 10),
  ('22222222-0000-0000-0000-000000000006', 4, '10:00', '14:00', 10),
  ('22222222-0000-0000-0000-000000000006', 6, '09:00', '13:00', 10)
on conflict (doctor_id, day_of_week, start_time) do update set
  end_time = excluded.end_time,
  patient_quota = excluded.patient_quota;

-- -----------------------------------------------------------------------------
-- 5. AKUN DEMO PENGUJIAN (Admin & Pasien)
-- -----------------------------------------------------------------------------
delete from auth.users where email in (
  'admin@klinik.test',
  'pasien@klinik.test',
  'siti@klinik.test',
  'ahmad@klinik.test'
);

do $$
declare
  v_admin_id      uuid := 'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa';
  v_patient_id    uuid := 'bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb'; -- Budi Pasien Demo (pasien@klinik.test)
  v_patient_id_2  uuid := 'bbbbbbbb-2222-2222-2222-cccccccccccc'; -- Siti Rahayu (pasien antrean #1)
  v_patient_id_3  uuid := 'bbbbbbbb-2222-2222-2222-dddddddddddd'; -- Ahmad Fauzi (menunggu konfirmasi bayar)
  
  v_doc_maya      uuid := '22222222-0000-0000-0000-000000000001';
  v_doc_gisella   uuid := '22222222-0000-0000-0000-000000000002';
  
  v_session_today uuid := '44444444-0000-0000-0000-000000000001';
  v_session_today2 uuid:= '44444444-0000-0000-0000-000000000003';
  v_session_past  uuid := '44444444-0000-0000-0000-000000000002';
  
  v_today         date := (now() at time zone 'Asia/Jakarta')::date;
  i               integer;
  v_day_offset    date;
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

  -- 3. Buat Pasien 2 (Siti Rahayu) untuk antrean aktif #1
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

  -- 4. Buat Pasien 3 (Ahmad Fauzi) untuk janji menunggu verifikasi bukti bayar
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

  -- ---------------------------------------------------------------------------
  -- 6. GENERATE SESI PRAKTIK AKTIF HARI INI & 7 HARI KE DEPAN
  -- ---------------------------------------------------------------------------
  -- Sesi Hari Ini 1 (dr. Maya Lestari)
  insert into public.practice_sessions (
    id, doctor_id, session_date, start_time, end_time, starts_at, ends_at, patient_quota, current_queue_number
  ) values (
    v_session_today,
    v_doc_maya,
    v_today,
    '08:00', '23:00',
    (v_today + time '08:00') at time zone 'Asia/Jakarta',
    (v_today + time '23:00') at time zone 'Asia/Jakarta',
    15,
    1 -- sedang melayani antrean #1
  ) on conflict (doctor_id, session_date, start_time) do update set
    ends_at = (v_today + time '23:00') at time zone 'Asia/Jakarta',
    patient_quota = 15;

  -- Sesi Hari Ini 2 (dr. Gisella Valerie)
  insert into public.practice_sessions (
    id, doctor_id, session_date, start_time, end_time, starts_at, ends_at, patient_quota, current_queue_number
  ) values (
    v_session_today2,
    v_doc_gisella,
    v_today,
    '09:00', '23:00',
    (v_today + time '09:00') at time zone 'Asia/Jakarta',
    (v_today + time '23:00') at time zone 'Asia/Jakarta',
    12,
    0
  ) on conflict (doctor_id, session_date, start_time) do update set
    ends_at = (v_today + time '23:00') at time zone 'Asia/Jakarta',
    patient_quota = 12;

  -- Generate sesi untuk 7 hari ke depan berdasarkan jadwal dokter
  for i in 1..7 loop
    v_day_offset := v_today + i;
    insert into public.practice_sessions (
      doctor_id, session_date, start_time, end_time, starts_at, ends_at, patient_quota
    )
    select 
      ds.doctor_id,
      v_day_offset,
      ds.start_time,
      ds.end_time,
      (v_day_offset + ds.start_time) at time zone 'Asia/Jakarta',
      (v_day_offset + ds.end_time) at time zone 'Asia/Jakarta',
      ds.patient_quota
    from public.doctor_schedules ds
    where ds.day_of_week = extract(dow from v_day_offset)::integer
    on conflict (doctor_id, session_date, start_time) do nothing;
  end loop;

  -- Sesi Praktik Masa Lalu (untuk data analitik grafik & rating)
  insert into public.practice_sessions (
    id, doctor_id, session_date, start_time, end_time, starts_at, ends_at, patient_quota, current_queue_number
  ) values (
    v_session_past,
    v_doc_maya,
    v_today - 14,
    '09:00', '13:00',
    (v_today - 14 + time '09:00') at time zone 'Asia/Jakarta',
    (v_today - 14 + time '13:00') at time zone 'Asia/Jakarta',
    12,
    2
  ) on conflict (doctor_id, session_date, start_time) do nothing;

  -- ---------------------------------------------------------------------------
  -- 7. DATA JANJI TEMU SAMPEL TERKONEKSI (SIAP UJI COBA LANGSUNG)
  -- ---------------------------------------------------------------------------
  -- A. Janji Hari Ini #1 (Pasien Siti Rahayu):
  -- Status: done, sudah check-in, nomor antrean #1 (sedang dilayani)
  insert into public.appointments (
    id, code, patient_id, doctor_id, session_id, status, consultation_fee,
    payment_deadline, confirmed_at, booking_number, qr_token, checked_in_at, queue_number
  ) values (
    '55555555-0000-0000-0000-000000000001', 'APT-BEAUTY-001',
    v_patient_id_2, v_doc_maya, v_session_today, 'done', 250000,
    now() + interval '30 minutes', now() - interval '2 hours', 1,
    '99999999-0000-0000-0000-000000000001', now() - interval '30 minutes', 1
  );

  -- B. Janji Hari Ini #2 (Pasien Ahmad Fauzi):
  -- Status: waiting_confirmation (Menunggu verifikasi bukti transfer oleh admin)
  insert into public.appointments (
    id, code, patient_id, doctor_id, session_id, status, consultation_fee,
    payment_deadline, payment_proof_path, payment_uploaded_at, booking_number
  ) values (
    '55555555-0000-0000-0000-000000000002', 'APT-BEAUTY-002',
    v_patient_id_3, v_doc_maya, v_session_today, 'waiting_confirmation', 250000,
    now() + interval '20 minutes',
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="150"><rect width="300" height="150" fill="%23e0e7ff"/><text x="20" y="50" font-family="sans-serif" font-size="14" fill="%231e1b4b" font-weight="bold">Bukti Transfer Bank BCA</text><text x="20" y="80" font-family="sans-serif" font-size="12" fill="%234338ca">Nominal: Rp 250.000</text><text x="20" y="110" font-family="sans-serif" font-size="11" fill="%236366f1">Klinik Kecantikan Arhe</text></svg>',
    now() - interval '10 minutes', 2
  );

  -- C. Janji Hari Ini #3 (Pasien Budi Demo - pasien@klinik.test):
  -- Status: done, memiliki QR Token aktif, BELUM check-in
  -- Siap di-scan di /admin/queueManagement atau via Floating Scanner
  -- QR Token Uji Coba: 99999999-0000-0000-0000-000000000003
  insert into public.appointments (
    id, code, patient_id, doctor_id, session_id, status, consultation_fee,
    payment_deadline, confirmed_at, booking_number, qr_token
  ) values (
    '55555555-0000-0000-0000-000000000003', 'APT-BEAUTY-003',
    v_patient_id, v_doc_maya, v_session_today, 'done', 250000,
    now() + interval '30 minutes', now() - interval '1 hour', 3,
    '99999999-0000-0000-0000-000000000003'
  );

  -- D. Janji Masa Lalu (Pasien Budi Demo):
  -- Status: done, selesai check-in dan telah dilayani, memiliki ulasan bintang 5
  insert into public.appointments (
    id, code, patient_id, doctor_id, session_id, status, consultation_fee,
    payment_deadline, confirmed_at, booking_number, checked_in_at, queue_number
  ) values (
    '55555555-0000-0000-0000-000000000004', 'APT-BEAUTY-PAST',
    v_patient_id, v_doc_maya, v_session_past, 'done', 250000,
    now() - interval '14 days', now() - interval '14 days', 1,
    now() - interval '14 days', 1
  );

  -- Rating Ulasan untuk Janji Masa Lalu
  insert into public.ratings (
    appointment_id, patient_id, doctor_id, rating, review, created_at
  ) values (
    '55555555-0000-0000-0000-000000000004', v_patient_id, v_doc_maya, 5,
    'Konsultasi masalah jerawat dan rekomendasi acne peeling dari dr. Maya sangat tepat sasaran. Wajah jauh lebih bersih dan skin barrier kembali sehat!',
    now() - interval '14 days'
  );

end $$;

