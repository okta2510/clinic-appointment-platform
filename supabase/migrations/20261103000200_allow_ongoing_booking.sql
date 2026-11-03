-- Migration: allow ongoing practice session booking & approve, and accept base64 payment proofs
-- 1. get_availability: cek end_time (sesi aktif tetap bisa dipesan)
-- 2. book_appointment: cek end_time
-- 3. submit_payment_proof: terima data:image/% Base64 atau Storage path
-- 4. approve_appointment: izinkan konfirmasi selama s.ends_at > now()

create or replace function public.get_availability(p_doctor_id uuid, p_date date)
returns table (
  schedule_id uuid,
  start_time  time,
  end_time    time,
  quota       integer,
  booked      integer,
  remaining   integer,
  available   boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    s.id,
    s.start_time,
    s.end_time,
    coalesce(ps.patient_quota, s.patient_quota) as quota,
    coalesce(b.booked, 0)                       as booked,
    greatest(coalesce(ps.patient_quota, s.patient_quota) - coalesce(b.booked, 0), 0) as remaining,
    (coalesce(ps.patient_quota, s.patient_quota) - coalesce(b.booked, 0)) > 0
      and ((p_date + s.end_time) at time zone 'Asia/Jakarta') > now() as available
  from public.doctor_schedules s
  join public.doctors d on d.id = s.doctor_id and d.is_active
  left join public.practice_sessions ps
    on ps.doctor_id = s.doctor_id
   and ps.session_date = p_date
   and ps.start_time = s.start_time
  left join lateral (
    select count(*)::integer as booked
    from public.appointments a
    where a.session_id = ps.id
      and a.status in ('waiting_payment', 'waiting_confirmation', 'done')
  ) b on true
  where s.doctor_id = p_doctor_id
    and s.is_active
    and s.day_of_week = extract(dow from p_date)
  order by s.start_time;
$$;

create or replace function public.book_appointment(p_schedule_id uuid, p_date date)
returns public.appointments
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid      uuid := auth.uid();
  v_schedule public.doctor_schedules;
  v_doctor   public.doctors;
  v_session  public.practice_sessions;
  v_booked   integer;
  v_result   public.appointments;
begin
  if v_uid is null then
    raise exception 'Silakan login terlebih dahulu';
  end if;

  select * into v_schedule from public.doctor_schedules where id = p_schedule_id and is_active;
  if not found then
    raise exception 'Jadwal praktik tidak ditemukan';
  end if;

  if extract(dow from p_date) <> v_schedule.day_of_week then
    raise exception 'Tanggal tidak sesuai dengan hari praktik dokter';
  end if;

  select * into v_doctor from public.doctors where id = v_schedule.doctor_id and is_active;
  if not found then
    raise exception 'Dokter tidak aktif';
  end if;

  -- Izinkan booking selama sesi belum selesai (end_time)
  if ((p_date + v_schedule.end_time) at time zone 'Asia/Jakarta') <= now() then
    raise exception 'Sesi praktik sudah selesai atau sudah lewat';
  end if;

  insert into public.practice_sessions (
    doctor_id, schedule_id, session_date, start_time, end_time, starts_at, ends_at, patient_quota
  ) values (
    v_doctor.id, v_schedule.id, p_date, v_schedule.start_time, v_schedule.end_time,
    (p_date + v_schedule.start_time) at time zone 'Asia/Jakarta',
    (p_date + v_schedule.end_time) at time zone 'Asia/Jakarta',
    v_schedule.patient_quota
  )
  on conflict (doctor_id, session_date, start_time) do nothing;

  select * into v_session
  from public.practice_sessions
  where doctor_id = v_doctor.id and session_date = p_date and start_time = v_schedule.start_time
  for update;

  select count(*) into v_booked
  from public.appointments
  where session_id = v_session.id
    and status in ('waiting_payment', 'waiting_confirmation', 'done');

  if v_booked >= v_session.patient_quota then
    raise exception 'Kuota sesi ini sudah penuh';
  end if;

  insert into public.appointments (
    patient_id, doctor_id, session_id, consultation_fee, payment_deadline, booking_number
  ) values (
    v_uid, v_doctor.id, v_session.id, v_doctor.consultation_fee,
    now() + interval '30 minutes', v_booked + 1
  )
  returning * into v_result;

  return v_result;
exception
  when unique_violation then
    raise exception 'Anda sudah punya janji aktif di sesi ini';
end;
$$;

create or replace function public.submit_payment_proof(p_appointment_id uuid, p_path text)
returns public.appointments
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_result public.appointments;
begin
  if not (p_path like 'data:image/%' or split_part(p_path, '/', 1) = auth.uid()::text) then
    raise exception 'Lokasi atau format file bukti bayar tidak valid';
  end if;

  update public.appointments
  set status = 'waiting_confirmation',
      payment_proof_path = p_path,
      payment_uploaded_at = now()
  where id = p_appointment_id
    and patient_id = auth.uid()
    and status = 'waiting_payment'
    and payment_deadline > now()
  returning * into v_result;

  if not found then
    raise exception 'Batas waktu pembayaran sudah habis atau janji tidak valid';
  end if;

  return v_result;
end;
$$;

-- 5. admin_update_appointment: koreksi status, jadwal, dokter, atau catatan janji temu oleh admin
create or replace function public.admin_update_appointment(
  p_appointment_id uuid,
  p_doctor_id      uuid default null,
  p_session_date   date default null,
  p_start_time     time default null,
  p_status         public.transaction_status default null,
  p_notes          text default null
)
returns public.appointments
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_appt public.appointments;
  v_target_doctor_id uuid;
  v_target_session_id uuid;
  v_schedule public.doctor_schedules;
  v_result public.appointments;
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang dapat mengubah janji temu';
  end if;

  select * into v_appt from public.appointments where id = p_appointment_id for update;
  if not found then
    raise exception 'Janji temu tidak ditemukan';
  end if;

  v_target_doctor_id := coalesce(p_doctor_id, v_appt.doctor_id);
  v_target_session_id := v_appt.session_id;

  -- Jika admin mengubah tanggal, dokter, atau jam praktik (reschedule):
  if p_session_date is not null and p_start_time is not null then
    select * into v_schedule
    from public.doctor_schedules
    where doctor_id = v_target_doctor_id
      and day_of_week = extract(dow from p_session_date)
      and start_time = p_start_time
      and is_active
    limit 1;

    if not found then
      select * into v_schedule
      from public.doctor_schedules
      where doctor_id = v_target_doctor_id
        and is_active
      limit 1;
    end if;

    if v_schedule.id is not null then
      insert into public.practice_sessions (
        doctor_id, schedule_id, session_date, start_time, end_time, starts_at, ends_at, patient_quota
      ) values (
        v_target_doctor_id, v_schedule.id, p_session_date, p_start_time,
        coalesce(v_schedule.end_time, (p_start_time + interval '1 hour')::time),
        (p_session_date + p_start_time) at time zone 'Asia/Jakarta',
        (p_session_date + coalesce(v_schedule.end_time, (p_start_time + interval '1 hour')::time)) at time zone 'Asia/Jakarta',
        coalesce(v_schedule.patient_quota, 10)
      )
      on conflict (doctor_id, session_date, start_time) do nothing;

      select id into v_target_session_id
      from public.practice_sessions
      where doctor_id = v_target_doctor_id
        and session_date = p_session_date
        and start_time = p_start_time;
    end if;
  end if;

  update public.appointments
  set doctor_id = v_target_doctor_id,
      session_id = coalesce(v_target_session_id, session_id),
      status = coalesce(p_status, status),
      rejection_reason = case
        when p_notes is not null then p_notes
        else rejection_reason
      end,
      qr_token = case
        when coalesce(p_status, status) = 'done' and qr_token is null then gen_random_uuid()
        when coalesce(p_status, status) <> 'done' then null
        else qr_token
      end,
      confirmed_at = case
        when coalesce(p_status, status) = 'done' and confirmed_at is null then now()
        else confirmed_at
      end,
      updated_at = now()
  where id = p_appointment_id
  returning * into v_result;

  if v_target_session_id is not null and v_target_session_id <> v_appt.session_id then
    perform public.renumber_bookings(v_appt.session_id);
    perform public.renumber_bookings(v_target_session_id);
  end if;

  return v_result;
end;
$$;

