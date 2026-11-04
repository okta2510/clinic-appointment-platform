'use client';

import { useState } from 'react';
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  QrCode,
  RotateCw,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import {
  useGetAdminAppointments,
  useGetAdminDashboardMetrics,
  useGetLiveQueue,
} from '@/hooks/api/use-admin-appointments';
import { formatRupiah } from '@/lib/format';
import { STATUS_META } from '@/constants/transaction-status';

export default function AdminDashboard() {
  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = useGetAdminDashboardMetrics();
  const { data: liveQueue, isLoading: queueLoading, refetch: refetchQueue } = useGetLiveQueue();
  const { data: pendingPayments, refetch: refetchPayments } = useGetAdminAppointments({
    status: 'waiting_confirmation',
    limit: 5,
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleReload = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchMetrics(), refetchQueue(), refetchPayments()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#1B1B7A]">
            Dashboard Operasional
          </h1>
          <p className="mt-1 text-neutral-600">
            Ringkasan aktivitas janji temu, antrean klinik, dan pembayaran hari ini.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleReload}
            disabled={isRefreshing}
            title="Segarkan data dashboard"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-neutral-300 bg-white px-4 py-2.5 font-semibold text-neutral-700 shadow-xs transition hover:bg-neutral-50 active:scale-95 disabled:opacity-60"
          >
            <RotateCw className={`h-4 w-4 text-[#1B1B7A] ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Menyinkronkan...' : 'Segarkan Data'}
          </button>

          <Link
            href="/queue"
            target="_blank"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#1B1B7A] px-5 py-2.5 font-bold text-white shadow-sm transition hover:bg-[#12125c]"
          >
            <ExternalLink className="h-4 w-4" />
            Buka Display TV Antrean
          </Link>
        </div>
      </div>

      {/* 4 Kartu Metrik KPI (Sesuai API.md Bagian 8.1: /admin/dashboard/metrics) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metrik 1: Janji Hari Ini (today_appointments) */}
        <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-neutral-500">Janji Hari Ini</span>
            <div className="rounded-2xl bg-blue-50 p-3 text-blue-800">
              <CalendarCheck className="h-6 w-6" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-extrabold text-neutral-900">
            {metricsLoading ? '...' : metrics?.todayCount || 0}
          </p>
          <p className="mt-1 text-xs text-neutral-500">Reservasi terdaftar</p>
        </div>

        {/* Metrik 2: Menunggu Antrean (waiting_queue) */}
        <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-neutral-500">Menunggu Antrean</span>
            <div className="rounded-2xl bg-indigo-50 p-3 text-[#1B1B7A]">
              <Users className="h-6 w-6" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-extrabold text-[#1B1B7A]">
            {metricsLoading ? '...' : metrics?.waitingQueue || 0}
          </p>
          <Link
            href="/admin/queueManagement"
            className="mt-1 inline-block text-xs font-semibold text-[#1B1B7A] underline decoration-[#F29A9A]"
          >
            Lihat ruang tunggu &rarr;
          </Link>
        </div>

        {/* Metrik 3: Verifikasi Pembayaran (pending_verification) */}
        <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-neutral-500">Verifikasi Pembayaran</span>
            <div className="rounded-2xl bg-amber-50 p-3 text-amber-800">
              <Clock className="h-6 w-6" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-extrabold text-amber-900">
            {metricsLoading ? '...' : metrics?.pendingCount || 0}
          </p>
          <Link
            href="/admin/payment"
            className="mt-1 inline-block text-xs font-semibold text-[#1B1B7A] underline decoration-[#F29A9A]"
          >
            Lihat antrean bukti bayar &rarr;
          </Link>
        </div>

        {/* Metrik 4: Pendapatan Hari Ini (today_revenue) */}
        <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-neutral-500">Pendapatan Hari Ini</span>
            <div className="rounded-2xl bg-green-50 p-3 text-green-800">
              <Wallet className="h-6 w-6" />
            </div>
          </div>
          <p className="mt-4 text-2xl font-extrabold text-green-900">
            {metricsLoading ? '...' : formatRupiah(metrics?.todayRevenue || 0)}
          </p>
          <Link
            href="/admin/statistic"
            className="mt-1 inline-block text-xs font-semibold text-[#1B1B7A] underline decoration-[#F29A9A]"
          >
            Grafik laporan lengkap &rarr;
          </Link>
        </div>
      </div>

      {/* Grid: Antrean Live Hari Ini & Verifikasi Pembayaran Terbaru */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Antrean Sesi Hari Ini (Sesuai API.md Bagian 7.1: /queue/live) */}
        <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-[#1B1B7A]" />
              <h2 className="font-bold text-neutral-900">Sesi Praktik & Antrean Hari Ini</h2>
            </div>
            <Link
              href="/admin/queueManagement"
              className="text-sm font-bold text-[#1B1B7A] hover:underline"
            >
              Scan & Panggil &rarr;
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {queueLoading ? (
              <p className="py-6 text-center text-sm text-neutral-500">Memuat data sesi...</p>
            ) : !liveQueue || liveQueue.length === 0 ? (
              <p className="py-6 text-center text-sm text-neutral-500">
                Belum ada sesi dokter yang aktif untuk hari ini.
              </p>
            ) : (
              liveQueue.map((item: any) => (
                <div
                  key={item.session_id}
                  className="flex flex-col gap-3 rounded-2xl border border-neutral-100 bg-neutral-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-bold text-neutral-900">{item.doctor_name}</p>
                    <p className="text-xs text-neutral-500">
                      {item.specialist_name} &bull; {item.start_time?.slice(0, 5)} -{' '}
                      {item.end_time?.slice(0, 5)} WIB
                    </p>
                    {item.next_numbers && item.next_numbers.length > 0 ? (
                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-semibold text-neutral-500">
                          Berikutnya:
                        </span>
                        {item.next_numbers.map((num: number) => (
                          <span
                            key={num}
                            className="inline-flex items-center rounded-lg bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800"
                          >
                            #{num}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-1 text-[11px] text-neutral-400">
                        Belum ada antrean berikutnya
                      </p>
                    )}
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="text-xs font-medium text-neutral-500">Sedang Melayani:</span>
                    <p className="text-2xl font-black text-[#1B1B7A]">
                      #{item.current_queue_number || '-'}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Verifikasi Pembayaran Menunggu Konfirmasi */}
        <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-amber-700" />
              <h2 className="font-bold text-neutral-900">Menunggu Verifikasi Pembayaran</h2>
            </div>
            <Link
              href="/admin/payment"
              className="text-sm font-bold text-[#1B1B7A] hover:underline"
            >
              Kelola Semua &rarr;
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {!pendingPayments?.data || pendingPayments.data.length === 0 ? (
              <p className="py-6 text-center text-sm text-neutral-500">
                Semua pembayaran telah diverifikasi. Tidak ada antrean baru.
              </p>
            ) : (
              pendingPayments.data.map((appt) => (
                <div
                  key={appt.id}
                  className="flex items-center justify-between rounded-2xl border border-amber-100 bg-amber-50/50 p-4"
                >
                  <div>
                    <p className="font-bold text-neutral-900">
                      {appt.patient_profiles.users.full_name}
                    </p>
                    <p className="text-xs text-neutral-600">
                      Dokter: {appt.doctors.full_name} &bull; {formatRupiah(appt.total_amount)}
                    </p>
                  </div>
                  <Link
                    href="/admin/payment"
                    className="rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-amber-700"
                  >
                    Periksa
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Pintasan Aksi Cepat */}
      <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-xs">
        <h2 className="font-bold text-neutral-900">Aksi Cepat Operasional</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Link
            href="/admin/queueManagement"
            className="flex flex-col items-center justify-center rounded-2xl border border-neutral-200 p-4 text-center transition hover:border-[#1B1B7A] hover:bg-blue-50/40"
          >
            <QrCode className="h-7 w-7 text-[#1B1B7A]" />
            <span className="mt-2 text-sm font-bold text-neutral-900">Scan QR Check-In</span>
            <span className="text-xs text-neutral-500">Konfirmasi kedatangan</span>
          </Link>

          <Link
            href="/admin/payment"
            className="flex flex-col items-center justify-center rounded-2xl border border-neutral-200 p-4 text-center transition hover:border-[#1B1B7A] hover:bg-blue-50/40"
          >
            <Wallet className="h-7 w-7 text-amber-700" />
            <span className="mt-2 text-sm font-bold text-neutral-900">Review Transfer</span>
            <span className="text-xs text-neutral-500">Terima / Tolak bukti</span>
          </Link>

          <Link
            href="/admin/appointmentManagement"
            className="flex flex-col items-center justify-center rounded-2xl border border-neutral-200 p-4 text-center transition hover:border-[#1B1B7A] hover:bg-blue-50/40"
          >
            <CalendarCheck className="h-7 w-7 text-green-700" />
            <span className="mt-2 text-sm font-bold text-neutral-900">Daftar Janji Sesi</span>
            <span className="text-xs text-neutral-500">Jadwal & nomor antrean</span>
          </Link>

          <Link
            href="/admin/statistic"
            className="flex flex-col items-center justify-center rounded-2xl border border-neutral-200 p-4 text-center transition hover:border-[#1B1B7A] hover:bg-blue-50/40"
          >
            <TrendingUp className="h-7 w-7 text-indigo-700" />
            <span className="mt-2 text-sm font-bold text-neutral-900">Statistik Klinik</span>
            <span className="text-xs text-neutral-500">Laporan omzet & grafik</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

