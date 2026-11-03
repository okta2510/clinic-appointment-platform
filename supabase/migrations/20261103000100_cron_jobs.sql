-- =============================================================================
-- Job terjadwal (pg_cron)
-- =============================================================================
-- Tiap menit: ubah booking yang lewat batas bayar → expired,
-- dan yang belum dikonfirmasi saat sesi mulai → canceled.
--
-- Bila migration ini gagal karena pg_cron belum aktif:
-- Dashboard → Database → Extensions → aktifkan "pg_cron", lalu jalankan ulang.
-- =============================================================================

create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'process-expired-appointments',
  '* * * * *',
  $$ select public.process_expired_appointments(); $$
);

-- Cek job : select * from cron.job;
-- Cek log : select * from cron.job_run_details order by start_time desc limit 10;
-- Hapus   : select cron.unschedule('process-expired-appointments');

