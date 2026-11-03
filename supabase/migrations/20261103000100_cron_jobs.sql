-- =============================================================================
-- Job terjadwal (pg_cron) — Idempotent (aman dijalankan berulang kali)
-- =============================================================================
-- Tiap menit: ubah booking yang lewat batas bayar 30m → expired,
-- dan yang belum dikonfirmasi saat sesi mulai → canceled.
-- =============================================================================

create extension if not exists pg_cron with schema pg_catalog;

-- Hapus job lama bila sudah ada agar tidak error duplikasi saat re-run
do $$
begin
  perform cron.unschedule('process-expired-appointments');
exception when others then null;
end $$;

select cron.schedule(
  'process-expired-appointments',
  '* * * * *',
  $$ select public.process_expired_appointments(); $$
);

-- Cek job : select * from cron.job;
-- Cek log : select * from cron.job_run_details order by start_time desc limit 10;
