-- =============================================================================
-- FIX RLS POLICIES & SEED DASHBOARD METRICS DATA (2026-11-05)
-- =============================================================================
-- 1. Jalankan di Supabase Dashboard -> SQL Editor
-- 2. Memperbaiki kebijakan RLS agar profil pasien dapat disimpan oleh server/admin
-- 3. Menyuntikkan 3 transaksi janji temu hari ini agar kartu dashboard terisi lengkap
-- =============================================================================

-- -----------------------------------------------------------------------------
-- BAGIAN 1: PERBAIKAN RLS POLICIES
-- -----------------------------------------------------------------------------

-- 1.1 Izinkan Admin / Server mengupdate data profil pasien (/profile)
drop policy if exists "profiles: ubah milik sendiri" on public.profiles;
drop policy if exists "profiles: ubah milik sendiri atau admin" on public.profiles;

create policy "profiles: ubah milik sendiri atau admin"
  on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- 1.2 Izinkan Admin mengelola penuh tabel appointments
drop policy if exists "appointments: admin insert" on public.appointments;
create policy "appointments: admin insert"
  on public.appointments for insert to authenticated
  with check (patient_id = auth.uid() or public.is_admin());

drop policy if exists "appointments: admin update" on public.appointments;
create policy "appointments: admin update"
  on public.appointments for update to authenticated
  using (patient_id = auth.uid() or public.is_admin())
  with check (patient_id = auth.uid() or public.is_admin());


-- -----------------------------------------------------------------------------
-- BAGIAN 2: SEED DATA JANJI TEMU HARI INI (WIB)
-- -----------------------------------------------------------------------------

do $$
declare
  v_today         date := (now() at time zone 'Asia/Jakarta')::date;
  v_doc_gisella   uuid := '22222222-0000-0000-0000-000000000002'; -- dr. Gisella Valerie
  v_patient_budi  uuid := 'bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb'; -- Budi Demo
  v_patient_siti  uuid := 'bbbbbbbb-2222-2222-2222-cccccccccccc'; -- Siti Rahayu
  v_patient_ahmad uuid := 'bbbbbbbb-2222-2222-2222-dddddddddddd'; -- Ahmad Fauzi
  v_session_id    uuid;
begin

  -- 2.1 Pastikan Sesi Praktik dr. Gisella Hari Ini Tersedia
  select id into v_session_id
  from public.practice_sessions
  where doctor_id = v_doc_gisella and session_date = v_today
  limit 1;

  if v_session_id is null then
    v_session_id := gen_random_uuid();
    insert into public.practice_sessions (
      id, doctor_id, session_date, start_time, end_time, starts_at, ends_at, patient_quota, current_queue_number
    ) values (
      v_session_id,
      v_doc_gisella,
      v_today,
      '10:00:00', '23:00:00',
      (v_today + time '10:00:00') at time zone 'Asia/Jakarta',
      (v_today + time '23:00:00') at time zone 'Asia/Jakarta',
      15,
      1 -- Sedang melayani antrean #1
    );
  else
    -- Update agar dokter sedang memanggil antrean #1
    update public.practice_sessions
    set current_queue_number = 1,
        start_time = '10:00:00',
        end_time = '23:00:00'
    where id = v_session_id;
  end if;

  -- 2.2 Hapus janji temu uji coba sebelumnya di sesi ini agar bersih
  delete from public.appointments where session_id = v_session_id;

  -- 2.3 Janji Temu 1: Siti Rahayu (Status DONE, Check-in #1, Sedang di Ruang Dokter)
  -- -> Menambah "Janji Hari Ini" (+1) dan "Pendapatan Hari Ini" (+Rp 180.000)
  insert into public.appointments (
    id, code, patient_id, doctor_id, session_id, status, consultation_fee,
    payment_deadline, confirmed_at, booking_number, qr_token, checked_in_at, queue_number
  ) values (
    gen_random_uuid(), 'APT-261105-001',
    v_patient_siti, v_doc_gisella, v_session_id, 'done', 180000,
    now() + interval '30 minutes', now() - interval '1 hour', 1,
    gen_random_uuid(), now() - interval '20 minutes', 1
  );

  -- 2.4 Janji Temu 2: Budi Demo (Status DONE, Check-in #2, Menunggu di Ruang Antrean)
  -- -> Karena queue_number (2) > current_queue_number (1), pasien ini berstatus MENUNGGU ANTREAN!
  -- -> Menambah "Janji Hari Ini" (+1), "Menunggu Antrean" (+1), "Pendapatan Hari Ini" (+Rp 180.000)
  insert into public.appointments (
    id, code, patient_id, doctor_id, session_id, status, consultation_fee,
    payment_deadline, confirmed_at, booking_number, qr_token, checked_in_at, queue_number
  ) values (
    gen_random_uuid(), 'APT-261105-002',
    v_patient_budi, v_doc_gisella, v_session_id, 'done', 180000,
    now() + interval '30 minutes', now() - interval '45 minutes', 2,
    gen_random_uuid(), now() - interval '10 minutes', 2
  );

  -- 2.5 Janji Temu 3: Ahmad Fauzi (Status WAITING_CONFIRMATION, Bukti Bayar Terunggah)
  -- -> Menambah "Janji Hari Ini" (+1) dan "Verifikasi Pembayaran" (+1)
  insert into public.appointments (
    id, code, patient_id, doctor_id, session_id, status, consultation_fee,
    payment_deadline, payment_proof_path, payment_uploaded_at, booking_number
  ) values (
    gen_random_uuid(), 'APT-261105-003',
    v_patient_ahmad, v_doc_gisella, v_session_id, 'waiting_confirmation', 180000,
    now() + interval '20 minutes',
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="150"><rect width="300" height="150" fill="%23e0e7ff"/><text x="20" y="50" font-family="sans-serif" font-size="14" fill="%231e1b4b" font-weight="bold">Bukti Transfer BCA</text><text x="20" y="80" font-family="sans-serif" font-size="12" fill="%234338ca">Nominal: Rp 180.000</text></svg>',
    now() - interval '5 minutes', 3
  );

  -- 2.6 Perbarui data profil awal pasien jika belum terisi tanggal lahir / gender
  update public.profiles
  set date_of_birth = '1995-08-17',
      gender = 'male',
      address = 'Jl. Senopati No. 45, Kebayoran Baru, Jakarta Selatan'
  where id = v_patient_budi and (date_of_birth is null or gender is null);

end $$;

