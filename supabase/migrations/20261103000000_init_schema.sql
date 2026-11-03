-- =============================================================================
-- Clinic Appointment Platform — skema awal (Supabase / PostgreSQL)
-- =============================================================================
-- Isi file ini (urut dari atas):
--   1. Enum
--   2. Tabel
--   3. Trigger umum (updated_at, profil otomatis, proteksi role)
--   4. Helper (is_admin, renumber_bookings)
--   5. RPC pasien  : get_availability, book_appointment, submit_payment_proof,
--                    cancel_appointment, rate_appointment
--   6. RPC admin   : approve/reject_appointment, check_in, call_next,
--                    mark_no_show, get_appointment_stats
--   7. RPC publik  : get_live_queue
--   8. Job otomatis: process_expired_appointments (dipanggil pg_cron)
--   9. Row Level Security (RLS)
--  10. Storage bucket + policy
--  11. Realtime
--
-- Aturan penting:
--   - Semua aksi yang mengubah > 1 baris / > 1 tabel dibuat sebagai FUNCTION.
--     Satu pemanggilan function = satu transaksi SQL (otomatis rollback bila error).
--   - Tabel appointments TIDAK punya policy insert/update untuk client.
--     Perubahan hanya lewat RPC di bawah, jadi aturan bisnis tidak bisa dilewati.
--   - Zona waktu klinik: Asia/Jakarta (WIB).
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. ENUM
-- -----------------------------------------------------------------------------
create type public.user_role as enum ('patient', 'admin');

create type public.gender as enum ('male', 'female', 'other');

-- 6 status transaksi sesuai BRIEF.md
create type public.transaction_status as enum (
  'waiting_payment',       -- menunggu bukti bayar (maks 30 menit)
  'waiting_confirmation',  -- bukti sudah diunggah, menunggu admin
  'done',                  -- diterima admin, QR terbit
  'rejected',              -- ditolak admin
  'expired',               -- tidak upload bukti dalam 30 menit
  'canceled'               -- dibatalkan pasien / otomatis saat sesi mulai
);


-- -----------------------------------------------------------------------------
-- 2. TABEL
-- -----------------------------------------------------------------------------

-- Profil 1:1 dengan auth.users (akun login dikelola Supabase Auth)
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  role          public.user_role not null default 'patient',
  full_name     text not null default '',
  phone_number  text,
  avatar_url    text,
  date_of_birth date,
  gender        public.gender,
  address       text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.specialists (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  description text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Dokter TIDAK punya akun login (MVP: role hanya patient & admin)
create table public.doctors (
  id               uuid primary key default gen_random_uuid(),
  specialist_id    uuid references public.specialists (id) on delete set null,
  full_name        text not null,
  bio              text,
  experience_years integer not null default 0 check (experience_years between 0 and 80),
  consultation_fee numeric(12, 0) not null check (consultation_fee >= 0), -- IDR, tanpa desimal
  photo_url        text,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Jadwal praktik mingguan (template). Contoh: Senin 10:00–12:00, kuota 10
create table public.doctor_schedules (
  id            uuid primary key default gen_random_uuid(),
  doctor_id     uuid not null references public.doctors (id) on delete cascade,
  day_of_week   smallint not null check (day_of_week between 0 and 6), -- 0 = Minggu
  start_time    time not null,
  end_time      time not null,
  patient_quota integer not null check (patient_quota > 0),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (end_time > start_time),
  unique (doctor_id, day_of_week, start_time)
);

-- Sesi praktik nyata di satu tanggal. Dibuat otomatis saat booking pertama.
-- Kuota disalin dari jadwal agar perubahan jadwal tidak mengubah sesi yang sudah ada.
create table public.practice_sessions (
  id                   uuid primary key default gen_random_uuid(),
  doctor_id            uuid not null references public.doctors (id) on delete cascade,
  schedule_id          uuid references public.doctor_schedules (id) on delete set null,
  session_date         date not null,
  start_time           time not null,
  end_time             time not null,
  starts_at            timestamptz not null, -- session_date + start_time (WIB)
  ends_at              timestamptz not null,
  patient_quota        integer not null check (patient_quota > 0),
  current_queue_number integer not null default 0, -- nomor antrean yang sedang dilayani
  created_at           timestamptz not null default now(),
  unique (doctor_id, session_date, start_time)
);

create table public.appointments (
  id                  uuid primary key default gen_random_uuid(),
  code                text not null unique default (
    'APT-' || to_char(now() at time zone 'Asia/Jakarta', 'YYMMDD') || '-' ||
    upper(substr(md5(gen_random_uuid()::text), 1, 6))
  ),
  patient_id          uuid not null references public.profiles (id) on delete cascade,
  doctor_id           uuid not null references public.doctors (id),
  session_id          uuid not null references public.practice_sessions (id),
  status              public.transaction_status not null default 'waiting_payment',
  consultation_fee    numeric(12, 0) not null, -- salinan harga saat booking
  payment_deadline    timestamptz not null,    -- created_at + 30 menit
  payment_proof_path  text,                    -- path di bucket payment-proofs
  payment_uploaded_at timestamptz,
  rejection_reason    text,
  confirmed_at        timestamptz,
  -- Nomor urut booking di sesi. Dihitung ulang saat ada booking yang batal/ditolak/expired.
  booking_number      integer,
  -- Token isi QR, terbit saat status 'done'
  qr_token            uuid unique,
  checked_in_at       timestamptz,
  -- Nomor antrean, terbit saat check-in (urut kedatangan)
  queue_number        integer,
  is_no_show          boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (session_id, queue_number)
);

-- Satu pasien hanya boleh punya 1 booking aktif per sesi
create unique index appointments_one_active_per_session
  on public.appointments (patient_id, session_id)
  where status in ('waiting_payment', 'waiting_confirmation', 'done');

create index appointments_session_idx on public.appointments (session_id);
create index appointments_patient_idx on public.appointments (patient_id, created_at desc);
create index appointments_status_idx  on public.appointments (status);

create table public.ratings (
  id             uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique references public.appointments (id) on delete cascade,
  patient_id     uuid not null references public.profiles (id) on delete cascade,
  doctor_id      uuid not null references public.doctors (id) on delete cascade,
  rating         smallint not null check (rating between 1 and 5),
  review         text,
  created_at     timestamptz not null default now()
);

create index ratings_doctor_idx on public.ratings (doctor_id);

-- Rata-rata rating per dokter (dipakai di kartu & detail dokter)
create view public.doctor_rating_summary
with (security_invoker = true) as
select
  doctor_id,
  round(avg(rating)::numeric, 1) as rating_avg,
  count(*)::integer              as rating_count
from public.ratings
group by doctor_id;


-- -----------------------------------------------------------------------------
-- 3. TRIGGER UMUM
-- -----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_updated_at         before update on public.profiles         for each row execute function public.set_updated_at();
create trigger specialists_updated_at      before update on public.specialists      for each row execute function public.set_updated_at();
create trigger doctors_updated_at          before update on public.doctors          for each row execute function public.set_updated_at();
create trigger doctor_schedules_updated_at before update on public.doctor_schedules for each row execute function public.set_updated_at();
create trigger appointments_updated_at     before update on public.appointments     for each row execute function public.set_updated_at();

-- Saat user daftar (auth.users), buat baris profiles otomatis.
-- full_name & phone_number dikirim dari form register lewat options.data.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, full_name, phone_number)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'phone_number'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- -----------------------------------------------------------------------------
-- 4. HELPER
-- -----------------------------------------------------------------------------

-- true bila user yang sedang login adalah admin
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- Pasien tidak boleh mengubah role-nya sendiri.
-- auth.uid() null = dijalankan dari SQL Editor / service role → diizinkan.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Tidak boleh mengubah role';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- Hitung ulang booking_number di satu sesi (dipanggil setelah ada booking yang lepas)
create or replace function public.renumber_bookings(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.appointments a
  set booking_number = r.rn
  from (
    select id, row_number() over (order by created_at) as rn
    from public.appointments
    where session_id = p_session_id
      and status in ('waiting_payment', 'waiting_confirmation', 'done')
  ) r
  where a.id = r.id
    and a.booking_number is distinct from r.rn;

  update public.appointments
  set booking_number = null
  where session_id = p_session_id
    and status not in ('waiting_payment', 'waiting_confirmation', 'done')
    and booking_number is not null;
end;
$$;


-- -----------------------------------------------------------------------------
-- 5. RPC PASIEN
-- -----------------------------------------------------------------------------

-- Slot sesi seorang dokter di satu tanggal + sisa kuota
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
      and ((p_date + s.start_time) at time zone 'Asia/Jakarta') > now() as available
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

-- Buat booking. Mengunci baris sesi agar kuota aman saat banyak pasien booking bersamaan.
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

  if ((p_date + v_schedule.start_time) at time zone 'Asia/Jakarta') <= now() then
    raise exception 'Sesi sudah dimulai atau sudah lewat';
  end if;

  -- Buat sesi bila belum ada (aman bila 2 request datang bersamaan)
  insert into public.practice_sessions (
    doctor_id, schedule_id, session_date, start_time, end_time, starts_at, ends_at, patient_quota
  ) values (
    v_doctor.id, v_schedule.id, p_date, v_schedule.start_time, v_schedule.end_time,
    (p_date + v_schedule.start_time) at time zone 'Asia/Jakarta',
    (p_date + v_schedule.end_time) at time zone 'Asia/Jakarta',
    v_schedule.patient_quota
  )
  on conflict (doctor_id, session_date, start_time) do nothing;

  -- Kunci sesi: request lain menunggu sampai transaksi ini selesai
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

-- Simpan bukti bayar (file sudah diunggah ke Storage oleh client)
create or replace function public.submit_payment_proof(p_appointment_id uuid, p_path text)
returns public.appointments
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_result public.appointments;
begin
  -- File wajib ada di folder milik user sendiri: <user_id>/<nama-file>
  if split_part(p_path, '/', 1) <> auth.uid()::text then
    raise exception 'Lokasi file bukti bayar tidak valid';
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

-- Pasien membatalkan janji sebelum dikonfirmasi admin
create or replace function public.cancel_appointment(p_appointment_id uuid)
returns public.appointments
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_result public.appointments;
begin
  update public.appointments
  set status = 'canceled'
  where id = p_appointment_id
    and patient_id = auth.uid()
    and status in ('waiting_payment', 'waiting_confirmation')
  returning * into v_result;

  if not found then
    raise exception 'Janji ini tidak bisa dibatalkan';
  end if;

  perform public.renumber_bookings(v_result.session_id);
  return v_result;
end;
$$;

-- Rating hanya setelah janji selesai: status done, sudah check-in,
-- dan sudah dipanggil (atau sesi sudah berakhir)
create or replace function public.rate_appointment(
  p_appointment_id uuid,
  p_rating smallint,
  p_review text default null
)
returns public.ratings
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_appt    public.appointments;
  v_session public.practice_sessions;
  v_result  public.ratings;
begin
  select * into v_appt
  from public.appointments
  where id = p_appointment_id and patient_id = auth.uid();

  if not found then
    raise exception 'Janji tidak ditemukan';
  end if;

  select * into v_session from public.practice_sessions where id = v_appt.session_id;

  if v_appt.status <> 'done'
     or v_appt.checked_in_at is null
     or (v_appt.queue_number > v_session.current_queue_number and now() < v_session.ends_at) then
    raise exception 'Rating hanya bisa diberikan setelah janji selesai';
  end if;

  insert into public.ratings (appointment_id, patient_id, doctor_id, rating, review)
  values (v_appt.id, v_appt.patient_id, v_appt.doctor_id, p_rating, nullif(trim(p_review), ''))
  returning * into v_result;

  return v_result;
exception
  when unique_violation then
    raise exception 'Anda sudah memberi rating untuk janji ini';
end;
$$;


-- -----------------------------------------------------------------------------
-- 6. RPC ADMIN
-- -----------------------------------------------------------------------------

create or replace function public.approve_appointment(p_appointment_id uuid)
returns public.appointments
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_result public.appointments;
begin
  if not public.is_admin() then
    raise exception 'Hanya admin';
  end if;

  update public.appointments a
  set status = 'done',
      qr_token = gen_random_uuid(),
      confirmed_at = now()
  from public.practice_sessions s
  where a.id = p_appointment_id
    and s.id = a.session_id
    and a.status = 'waiting_confirmation'
    and s.starts_at > now()
  returning a.* into v_result;

  if not found then
    raise exception 'Janji tidak bisa dikonfirmasi (status salah atau sesi sudah mulai)';
  end if;

  return v_result;
end;
$$;

create or replace function public.reject_appointment(p_appointment_id uuid, p_reason text)
returns public.appointments
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_result public.appointments;
begin
  if not public.is_admin() then
    raise exception 'Hanya admin';
  end if;

  update public.appointments
  set status = 'rejected',
      rejection_reason = nullif(trim(p_reason), '')
  where id = p_appointment_id
    and status = 'waiting_confirmation'
  returning * into v_result;

  if not found then
    raise exception 'Janji tidak bisa ditolak';
  end if;

  perform public.renumber_bookings(v_result.session_id);
  return v_result;
end;
$$;

-- Scan QR → check-in → dapat nomor antrean (urut kedatangan)
create or replace function public.check_in(p_qr_token uuid)
returns public.appointments
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_appt    public.appointments;
  v_session public.practice_sessions;
  v_next    integer;
  v_result  public.appointments;
begin
  if not public.is_admin() then
    raise exception 'Hanya admin';
  end if;

  select * into v_appt from public.appointments where qr_token = p_qr_token;
  if not found then
    raise exception 'QR tidak dikenali';
  end if;

  -- Kunci sesi agar 2 check-in bersamaan tidak dapat nomor yang sama
  select * into v_session from public.practice_sessions where id = v_appt.session_id for update;

  if v_session.session_date <> (now() at time zone 'Asia/Jakarta')::date then
    raise exception 'Check-in hanya berlaku pada tanggal sesi (%)', v_session.session_date;
  end if;

  if v_appt.status <> 'done' then
    raise exception 'Janji belum dikonfirmasi';
  end if;

  if v_appt.is_no_show then
    raise exception 'Janji sudah ditandai tidak hadir';
  end if;

  if v_appt.checked_in_at is not null then
    raise exception 'Pasien sudah check-in dengan nomor antrean %', v_appt.queue_number;
  end if;

  select coalesce(max(queue_number), 0) + 1 into v_next
  from public.appointments
  where session_id = v_session.id;

  update public.appointments
  set checked_in_at = now(),
      queue_number = v_next
  where id = v_appt.id
  returning * into v_result;

  return v_result;
end;
$$;

-- Panggil pasien berikutnya (hanya pasien yang sudah check-in)
create or replace function public.call_next(p_session_id uuid)
returns public.practice_sessions
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_session public.practice_sessions;
  v_next    integer;
begin
  if not public.is_admin() then
    raise exception 'Hanya admin';
  end if;

  select * into v_session from public.practice_sessions where id = p_session_id for update;
  if not found then
    raise exception 'Sesi tidak ditemukan';
  end if;

  select min(queue_number) into v_next
  from public.appointments
  where session_id = p_session_id
    and checked_in_at is not null
    and not is_no_show
    and queue_number > v_session.current_queue_number;

  if v_next is null then
    raise exception 'Belum ada pasien check-in yang menunggu';
  end if;

  update public.practice_sessions
  set current_queue_number = v_next
  where id = p_session_id
  returning * into v_session;

  return v_session;
end;
$$;

-- Tandai tidak hadir: sudah dikonfirmasi tapi belum check-in, dan sesi sudah mulai
create or replace function public.mark_no_show(p_appointment_id uuid)
returns public.appointments
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_result public.appointments;
begin
  if not public.is_admin() then
    raise exception 'Hanya admin';
  end if;

  update public.appointments a
  set is_no_show = true
  from public.practice_sessions s
  where a.id = p_appointment_id
    and s.id = a.session_id
    and a.status = 'done'
    and a.checked_in_at is null
    and not a.is_no_show
    and s.starts_at <= now()
  returning a.* into v_result;

  if not found then
    raise exception 'Janji tidak bisa ditandai tidak hadir';
  end if;

  return v_result;
end;
$$;

-- Statistik untuk grafik: per hari / bulan / tahun, opsional per dokter
create or replace function public.get_appointment_stats(
  p_period    text,                 -- 'day' | 'month' | 'year'
  p_from      date,
  p_to        date,
  p_doctor_id uuid default null
)
returns table (
  period_start date,
  doctor_id    uuid,
  doctor_name  text,
  total        integer,
  done         integer,
  rejected     integer,
  canceled     integer,
  expired      integer,
  revenue      numeric
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'Hanya admin';
  end if;

  if p_period not in ('day', 'month', 'year') then
    raise exception 'Periode harus day, month, atau year';
  end if;

  return query
  select
    date_trunc(p_period, s.session_date)::date,
    d.id,
    d.full_name,
    count(*)::integer,
    count(*) filter (where a.status = 'done')::integer,
    count(*) filter (where a.status = 'rejected')::integer,
    count(*) filter (where a.status = 'canceled')::integer,
    count(*) filter (where a.status = 'expired')::integer,
    coalesce(sum(a.consultation_fee) filter (where a.status = 'done'), 0)
  from public.appointments a
  join public.practice_sessions s on s.id = a.session_id
  join public.doctors d on d.id = a.doctor_id
  where s.session_date between p_from and p_to
    and (p_doctor_id is null or a.doctor_id = p_doctor_id)
  group by 1, 2, 3
  order by 1, 3;
end;
$$;


-- -----------------------------------------------------------------------------
-- 7. RPC PUBLIK
-- -----------------------------------------------------------------------------

-- Layar antrean: sesi hari ini, nomor yang dilayani, dan 3 nomor berikutnya.
-- Tidak mengembalikan data pribadi pasien.
create or replace function public.get_live_queue()
returns table (
  session_id           uuid,
  doctor_id            uuid,
  doctor_name          text,
  specialist_name      text,
  start_time           time,
  end_time             time,
  current_queue_number integer,
  next_numbers         integer[]
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    s.id,
    d.id,
    d.full_name,
    sp.name,
    s.start_time,
    s.end_time,
    s.current_queue_number,
    coalesce((
      select array_agg(q.queue_number order by q.queue_number)
      from (
        select a.queue_number
        from public.appointments a
        where a.session_id = s.id
          and a.checked_in_at is not null
          and not a.is_no_show
          and a.queue_number > s.current_queue_number
        order by a.queue_number
        limit 3
      ) q
    ), '{}')
  from public.practice_sessions s
  join public.doctors d on d.id = s.doctor_id
  left join public.specialists sp on sp.id = d.specialist_id
  where s.session_date = (now() at time zone 'Asia/Jakarta')::date
  order by s.start_time, d.full_name;
$$;


-- -----------------------------------------------------------------------------
-- 8. JOB OTOMATIS (dijadwalkan pg_cron tiap menit, lihat migration cron)
-- -----------------------------------------------------------------------------
-- - waiting_payment lewat 30 menit           → expired
-- - waiting_confirmation saat sesi sudah mulai → canceled
-- Kuota otomatis kembali karena hanya status aktif yang dihitung.
create or replace function public.process_expired_appointments()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_expired  uuid[];
  v_canceled uuid[];
  v_id       uuid;
begin
  with e as (
    update public.appointments
    set status = 'expired'
    where status = 'waiting_payment'
      and payment_deadline <= now()
    returning session_id
  )
  select array_agg(distinct session_id) into v_expired from e;

  with c as (
    update public.appointments a
    set status = 'canceled'
    from public.practice_sessions s
    where s.id = a.session_id
      and a.status = 'waiting_confirmation'
      and s.starts_at <= now()
    returning a.session_id
  )
  select array_agg(distinct session_id) into v_canceled from c;

  foreach v_id in array coalesce(v_expired, '{}') || coalesce(v_canceled, '{}') loop
    perform public.renumber_bookings(v_id);
  end loop;
end;
$$;

-- Function internal: jangan bisa dipanggil dari client
revoke execute on function public.renumber_bookings(uuid)         from public, anon, authenticated;
revoke execute on function public.process_expired_appointments() from public, anon, authenticated;
revoke execute on function public.handle_new_user()              from public, anon, authenticated;


-- -----------------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------
alter table public.profiles          enable row level security;
alter table public.specialists       enable row level security;
alter table public.doctors           enable row level security;
alter table public.doctor_schedules  enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.appointments      enable row level security;
alter table public.ratings           enable row level security;

-- profiles: lihat & ubah milik sendiri; admin lihat semua
create policy "profiles: baca milik sendiri atau admin"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "profiles: ubah milik sendiri"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- specialists, doctors, doctor_schedules: publik baca, admin kelola
create policy "specialists: publik baca"  on public.specialists      for select to anon, authenticated using (true);
create policy "specialists: admin kelola" on public.specialists      for all    to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "doctors: publik baca"      on public.doctors          for select to anon, authenticated using (true);
create policy "doctors: admin kelola"     on public.doctors          for all    to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "schedules: publik baca"    on public.doctor_schedules for select to anon, authenticated using (true);
create policy "schedules: admin kelola"   on public.doctor_schedules for all    to authenticated using (public.is_admin()) with check (public.is_admin());

-- practice_sessions: publik baca (tanpa data pribadi). Ditulis hanya lewat RPC.
create policy "sessions: publik baca"     on public.practice_sessions for select to anon, authenticated using (true);

-- appointments: pasien baca miliknya, admin baca semua. Ditulis hanya lewat RPC.
create policy "appointments: baca milik sendiri atau admin"
  on public.appointments for select to authenticated
  using (patient_id = auth.uid() or public.is_admin());

-- ratings: publik baca (ulasan dokter). Ditulis hanya lewat RPC.
create policy "ratings: publik baca"      on public.ratings          for select to anon, authenticated using (true);


-- -----------------------------------------------------------------------------
-- 10. STORAGE
-- -----------------------------------------------------------------------------
-- Struktur path: <bucket>/<user_id>/<nama-file>
insert into storage.buckets (id, name, public) values
  ('avatars',        'avatars',        true),
  ('doctor-photos',  'doctor-photos',  true),
  ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;

-- avatars: user unggah/ubah file di foldernya sendiri. Bucket publik → baca bebas.
create policy "avatars: upload milik sendiri"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars: ubah milik sendiri"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- doctor-photos: hanya admin
create policy "doctor-photos: admin kelola"
  on storage.objects for all to authenticated
  using (bucket_id = 'doctor-photos' and public.is_admin())
  with check (bucket_id = 'doctor-photos' and public.is_admin());

-- payment-proofs (privat): pasien unggah & lihat miliknya, admin lihat semua
create policy "payment-proofs: upload milik sendiri"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'payment-proofs' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "payment-proofs: baca milik sendiri atau admin"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'payment-proofs'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );


-- -----------------------------------------------------------------------------
-- 11. REALTIME
-- -----------------------------------------------------------------------------
-- Layar antrean publik mendengarkan perubahan current_queue_number
alter publication supabase_realtime add table public.practice_sessions;

