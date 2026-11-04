-- =============================================================================
-- Migrasi: Safe Check-In Anti-Duplication & Flexible Token
-- Mencegah duplikasi nomor antrean saat di-scan ulang, memberikan status pasien selesai,
-- dan mendukung token QR UUID murni, format CODE:UUID, maupun kode janji temu.
-- =============================================================================

drop function if exists public.check_in(uuid);
drop function if exists public.check_in(text);

create or replace function public.check_in(p_qr_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_appt    public.appointments;
  v_session public.practice_sessions;
  v_next    integer;
  v_clean   text;
  v_patient_name text;
  v_doctor_name  text;
begin
  -- 1. Verifikasi role admin
  if not public.is_admin() then
    raise exception 'Hanya admin yang dapat memproses check-in pasien';
  end if;

  -- 2. Bersihkan dan ekstrak token jika berformat KODE:TOKEN
  v_clean := trim(p_qr_token);
  if position(':' in v_clean) > 0 then
    v_clean := trim(split_part(v_clean, ':', 2));
  end if;

  -- 3. Cari janji temu berdasarkan UUID QR token atau kode janji temu
  select a.* into v_appt
  from public.appointments a
  where (case when v_clean ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
              then a.qr_token = v_clean::uuid
              else false end)
     or a.code = v_clean
     or a.code = trim(p_qr_token);

  if not found then
    raise exception 'QR atau Kode Janji Temu tidak dikenali (%)', p_qr_token;
  end if;

  -- 4. Kunci sesi praktik untuk update transaksional
  select * into v_session from public.practice_sessions where id = v_appt.session_id for update;

  if not found then
    raise exception 'Sesi praktik tidak ditemukan untuk janji temu ini';
  end if;

  -- 5. Validasi tanggal sesi (harus hari ini WIB)
  if v_session.session_date <> (now() at time zone 'Asia/Jakarta')::date then
    raise exception 'Check-in hanya berlaku pada tanggal sesi (% WIB)', v_session.session_date;
  end if;

  -- 6. Validasi status pembayaran (harus done)
  if v_appt.status <> 'done' then
    raise exception 'Janji belum dikonfirmasi oleh klinik (status masih: %)', v_appt.status;
  end if;

  -- 7. Validasi status no-show
  if v_appt.is_no_show then
    raise exception 'Janji sudah ditandai Tidak Hadir (No-Show)';
  end if;

  -- Ambil nama pasien dan nama dokter untuk display informatif
  select coalesce(p.full_name, u.email, 'Pasien') into v_patient_name
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = v_appt.patient_id;

  select coalesce(d.full_name, 'Dokter') into v_doctor_name
  from public.doctors d
  where d.id = v_appt.doctor_id;

  -- 8. PENCEGAHAN DUPLIKASI: JIKA PASIEN SUDAH CHECK-IN SEBELUMNYA
  if v_appt.checked_in_at is not null then
    return jsonb_build_object(
      'success', true,
      'is_first_checkin', false,
      'already_checked_in', true,
      'is_completed', (v_session.current_queue_number >= v_appt.queue_number),
      'appointment_id', v_appt.id,
      'appointment_code', v_appt.code,
      'queue_number', v_appt.queue_number,
      'checked_in_at', v_appt.checked_in_at,
      'current_serving_number', v_session.current_queue_number,
      'patient_name', v_patient_name,
      'doctor_name', v_doctor_name,
      'session_date', v_session.session_date,
      'message', case 
        when v_session.current_queue_number >= v_appt.queue_number 
        then 'Pemeriksaan pasien ini sudah selesai dilayani (Nomor antrean telah terlewati).'
        else 'Pasien sudah terdaftar dalam antrean sebelumnya (Nomor Antrean #' || v_appt.queue_number || ').'
      end
    );
  end if;

  -- 9. CHECK-IN PERTAMA KALI: TERBITKAN NOMOR ANTREAN BARU
  select coalesce(max(queue_number), 0) + 1 into v_next
  from public.appointments
  where session_id = v_session.id;

  update public.appointments
  set checked_in_at = now(),
      queue_number = v_next
  where id = v_appt.id
  returning * into v_appt;

  return jsonb_build_object(
    'success', true,
    'is_first_checkin', true,
    'already_checked_in', false,
    'is_completed', false,
    'appointment_id', v_appt.id,
    'appointment_code', v_appt.code,
    'queue_number', v_next,
    'checked_in_at', v_appt.checked_in_at,
    'current_serving_number', v_session.current_queue_number,
    'patient_name', v_patient_name,
    'doctor_name', v_doctor_name,
    'session_date', v_session.session_date,
    'message', 'Check-in berhasil! Nomor antrean baru diterbitkan.'
  );
end;
$$;

