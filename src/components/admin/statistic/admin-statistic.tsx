'use client';

import { useMemo, useState } from 'react';
import type { TDoctor } from '@/types/doctor';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  DollarSign,
  Download,
  Filter,
  Stethoscope,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react';
import { useGetAppointmentStats } from '@/hooks/api/use-admin-appointments';
import { useGetDoctors } from '@/hooks/api/use-doctors';
import { formatDate, formatRupiah } from '@/lib/format';
import { inputBase, secondaryBtn } from '@/components/admin/styles';

type PeriodMode = 'day' | 'month' | 'year';

export default function AdminStatistic() {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
  const todayStr = today.toISOString().split('T')[0];

  const [period, setPeriod] = useState<PeriodMode>('month');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('all');

  // Default date ranges based on period
  const defaultFrom = useMemo(() => {
    if (period === 'day') return todayStr;
    if (period === 'month') return `${currentYear}-01-01`;
    return `${currentYear - 2}-01-01`;
  }, [period, todayStr, currentYear]);

  const defaultTo = useMemo(() => {
    if (period === 'day') return todayStr;
    if (period === 'month') return `${currentYear}-12-31`;
    return `${currentYear + 1}-12-31`;
  }, [period, todayStr, currentYear]);

  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);

  // Doctors for filter
  const { data: doctorsData } = useGetDoctors();
  const doctorsList: TDoctor[] = doctorsData?.data ?? [];

  // Fetch stats from RPC
  const {
    data: rawStats = [],
    isLoading,
    isError,
    refetch,
  } = useGetAppointmentStats(
    period,
    fromDate,
    toDate,
    selectedDoctorId === 'all' ? undefined : selectedDoctorId,
  );

  // Aggregate metrics
  const totals = useMemo(() => {
    let totalAppointments = 0;
    let done = 0;
    let rejected = 0;
    let canceled = 0;
    let expired = 0;
    let revenue = 0;

    for (const item of rawStats) {
      totalAppointments += Number(item.total) || 0;
      done += Number(item.done) || 0;
      rejected += Number(item.rejected) || 0;
      canceled += Number(item.canceled) || 0;
      expired += Number(item.expired) || 0;
      revenue += Number(item.revenue) || 0;
    }

    const completionRate =
      totalAppointments > 0 ? Math.round((done / totalAppointments) * 100) : 0;

    return {
      totalAppointments,
      done,
      rejected,
      canceled,
      expired,
      revenue,
      completionRate,
    };
  }, [rawStats]);

  // Group by doctor for doctor performance table
  const doctorStats = useMemo(() => {
    const map = new Map<string, any>();
    for (const item of rawStats) {
      const docName = item.doctor_name || 'Dokter';
      const existing = map.get(docName) || {
        doctor_name: docName,
        total: 0,
        done: 0,
        rejected: 0,
        canceled: 0,
        expired: 0,
        revenue: 0,
      };
      existing.total += Number(item.total) || 0;
      existing.done += Number(item.done) || 0;
      existing.rejected += Number(item.rejected) || 0;
      existing.canceled += Number(item.canceled) || 0;
      existing.expired += Number(item.expired) || 0;
      existing.revenue += Number(item.revenue) || 0;
      map.set(docName, existing);
    }
    return Array.from(map.values());
  }, [rawStats]);

  // Group by period for chart
  const chartData = useMemo(() => {
    const map = new Map<string, any>();
    for (const item of rawStats) {
      const key = item.period_start || 'N/A';
      const existing = map.get(key) || {
        label: key,
        total: 0,
        done: 0,
        revenue: 0,
      };
      existing.total += Number(item.total) || 0;
      existing.done += Number(item.done) || 0;
      existing.revenue += Number(item.revenue) || 0;
      map.set(key, existing);
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [rawStats]);

  const maxTotalInChart = useMemo(() => {
    const max = Math.max(...chartData.map((d) => d.total), 1);
    return max;
  }, [chartData]);

  const maxRevenueInChart = useMemo(() => {
    const max = Math.max(...chartData.map((d) => d.revenue), 100000);
    return max;
  }, [chartData]);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1B1B7A] md:text-3xl">
            Laporan & Statistik Janji Temu
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Analisis tren reservasi, pendapatan klinik, dan performa praktik dokter secara visual.
          </p>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="grid gap-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm md:grid-cols-4">
        {/* Period Mode */}
        <div>
          <label htmlFor="periodMode" className="block text-xs font-semibold uppercase text-neutral-500 mb-1">
            Periode
          </label>
          <select
            id="periodMode"
            value={period}
            onChange={(e) => {
              const nextPeriod = e.target.value as PeriodMode;
              setPeriod(nextPeriod);
              if (nextPeriod === 'day') {
                setFromDate(todayStr);
                setToDate(todayStr);
              } else if (nextPeriod === 'month') {
                setFromDate(`${currentYear}-01-01`);
                setToDate(`${currentYear}-12-31`);
              } else {
                setFromDate(`${currentYear - 2}-01-01`);
                setToDate(`${currentYear + 1}-12-31`);
              }
            }}
            className={inputBase}
          >
            <option value="day">Harian (Day)</option>
            <option value="month">Bulanan (Month)</option>
            <option value="year">Tahunan (Year)</option>
          </select>
        </div>

        {/* Doctor Filter */}
        <div>
          <label htmlFor="filterDoctor" className="block text-xs font-semibold uppercase text-neutral-500 mb-1">
            Filter Dokter
          </label>
          <select
            id="filterDoctor"
            value={selectedDoctorId}
            onChange={(e) => setSelectedDoctorId(e.target.value)}
            className={inputBase}
          >
            <option value="all">Semua Dokter</option>
            {doctorsList.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.full_name}
              </option>
            ))}
          </select>
        </div>

        {/* From Date */}
        <div>
          <label htmlFor="fromDate" className="block text-xs font-semibold uppercase text-neutral-500 mb-1">
            Dari Tanggal
          </label>
          <input
            id="fromDate"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className={inputBase}
          />
        </div>

        {/* To Date */}
        <div>
          <label htmlFor="toDate" className="block text-xs font-semibold uppercase text-neutral-500 mb-1">
            Sampai Tanggal
          </label>
          <input
            id="toDate"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className={inputBase}
          />
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Appointments */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Total Reservasi
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1B1B7A]/10 text-[#1B1B7A]">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold tracking-tight text-neutral-900">
            {totals.totalAppointments}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            {totals.completionRate}% berhasil diselesaikan
          </p>
        </div>

        {/* Done / Finished */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Selesai (Done)
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-100 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold tracking-tight text-green-700">
            {totals.done}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            Kunjungan terkonfirmasi & selesai
          </p>
        </div>

        {/* Total Revenue */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Total Pendapatan
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F29A9A]/25 text-[#1B1B7A]">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-[#1B1B7A]">
            {formatRupiah(totals.revenue)}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            Dari janji yang telah berstatus done
          </p>
        </div>

        {/* Canceled & Rejected */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Batal / Ditolak / Expired
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 text-red-700">
              <XCircle className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold tracking-tight text-neutral-800">
            {totals.canceled + totals.rejected + totals.expired}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            Ditolak: {totals.rejected} • Batal: {totals.canceled} • Expired: {totals.expired}
          </p>
        </div>
      </div>

      {/* GRAPHICAL VISUALIZATIONS */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* NATIVE SVG BAR CHART: APPOINTMENTS TREND */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm lg:col-span-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-[#1B1B7A]">
                Grafik Tren Reservasi ({period.toUpperCase()})
              </h2>
              <p className="text-xs text-neutral-500">
                Perbandingan total reservasi dan yang berhasil selesai
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-[#1B1B7A]" /> Total
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-green-500" /> Selesai
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="flex h-64 items-center justify-center text-sm text-neutral-400">
              Memuat grafik statistik...
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-neutral-400">
              Tidak ada data reservasi pada rentang waktu ini.
            </div>
          ) : (
            <div className="h-64 w-full pt-4">
              <div className="flex h-48 items-end gap-3 border-b border-neutral-200 pb-2">
                {chartData.map((d, index) => {
                  const totalHeightPct = Math.max(10, Math.round((d.total / maxTotalInChart) * 100));
                  const doneHeightPct = Math.max(8, Math.round((d.done / maxTotalInChart) * 100));

                  return (
                    <div
                      key={index}
                      className="group relative flex flex-1 flex-col items-center justify-end h-full gap-1"
                    >
                      {/* Tooltip on hover */}
                      <div className="absolute -top-12 z-10 hidden rounded-lg bg-neutral-900 px-2.5 py-1 text-[11px] text-white shadow-lg group-hover:block whitespace-nowrap">
                        <p className="font-bold">{d.label}</p>
                        <p>Total: {d.total} | Selesai: {d.done}</p>
                        <p>Rp {d.revenue.toLocaleString('id-ID')}</p>
                      </div>

                      <div className="flex w-full max-w-[40px] items-end justify-center gap-1 h-full">
                        {/* Bar Total */}
                        <div
                          style={{ height: `${totalHeightPct}%` }}
                          className="w-1/2 rounded-t-md bg-[#1B1B7A] transition-all hover:bg-[#2E2E99]"
                        />
                        {/* Bar Done */}
                        <div
                          style={{ height: `${doneHeightPct}%` }}
                          className="w-1/2 rounded-t-md bg-green-500 transition-all hover:bg-green-600"
                        />
                      </div>

                      <span className="mt-1 text-[11px] font-medium text-neutral-600 truncate max-w-[50px]">
                        {d.label.length > 7 ? d.label.slice(5) : d.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* STATUS DISTRIBUTION DONUT / BAR BREAKDOWN */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm lg:col-span-4 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-[#1B1B7A]">
              Distribusi Status Reservasi
            </h2>
            <p className="text-xs text-neutral-500 mb-4">
              Persentase keberhasilan dan pembatalan
            </p>

            <div className="space-y-3">
              {/* Selesai */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-green-700">Selesai (Done)</span>
                  <span className="text-neutral-700">{totals.done} ({totals.completionRate}%)</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-neutral-100 overflow-hidden">
                  <div
                    style={{ width: `${totals.completionRate}%` }}
                    className="h-full bg-green-500 rounded-full"
                  />
                </div>
              </div>

              {/* Ditolak */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-red-700">Ditolak Admin (Rejected)</span>
                  <span className="text-neutral-700">
                    {totals.rejected} (
                    {totals.totalAppointments > 0
                      ? Math.round((totals.rejected / totals.totalAppointments) * 100)
                      : 0}
                    %)
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-neutral-100 overflow-hidden">
                  <div
                    style={{
                      width: `${
                        totals.totalAppointments > 0
                          ? (totals.rejected / totals.totalAppointments) * 100
                          : 0
                      }%`,
                    }}
                    className="h-full bg-red-500 rounded-full"
                  />
                </div>
              </div>

              {/* Dibatalkan */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-amber-700">Dibatalkan (Canceled)</span>
                  <span className="text-neutral-700">
                    {totals.canceled} (
                    {totals.totalAppointments > 0
                      ? Math.round((totals.canceled / totals.totalAppointments) * 100)
                      : 0}
                    %)
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-neutral-100 overflow-hidden">
                  <div
                    style={{
                      width: `${
                        totals.totalAppointments > 0
                          ? (totals.canceled / totals.totalAppointments) * 100
                          : 0
                      }%`,
                    }}
                    className="h-full bg-amber-500 rounded-full"
                  />
                </div>
              </div>

              {/* Expired */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-neutral-600">Kedaluwarsa (Expired)</span>
                  <span className="text-neutral-700">
                    {totals.expired} (
                    {totals.totalAppointments > 0
                      ? Math.round((totals.expired / totals.totalAppointments) * 100)
                      : 0}
                    %)
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-neutral-100 overflow-hidden">
                  <div
                    style={{
                      width: `${
                        totals.totalAppointments > 0
                          ? (totals.expired / totals.totalAppointments) * 100
                          : 0
                      }%`,
                    }}
                    className="h-full bg-neutral-400 rounded-full"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-neutral-50 p-3.5 border border-neutral-200 text-xs text-neutral-600">
            <span className="font-semibold text-neutral-800">Catatan Kebijakan:</span>
            <p className="mt-0.5">
              Janji temu expired dan dibatalkan secara otomatis memulihkan kuota dokter untuk pasien lain.
            </p>
          </div>
        </div>
      </div>

      {/* PER-DOCTOR PERFORMANCE TABLE */}
      <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-neutral-200 px-5 py-4">
          <h2 className="text-base font-bold text-[#1B1B7A]">
            Statistik & Performa Praktik Per Dokter
          </h2>
          <p className="text-xs text-neutral-500">
            Rincian jumlah pasien yang ditangani dan kontribusi pendapatan masing-masing dokter.
          </p>
        </div>

        {doctorStats.length === 0 ? (
          <div className="p-8 text-center text-sm text-neutral-500">
            Tidak ada riwayat dokter pada periode yang dipilih.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-neutral-700">
              <thead className="bg-neutral-50 text-xs font-semibold uppercase text-neutral-600 border-b border-neutral-200">
                <tr>
                  <th scope="col" className="px-5 py-3">Nama Dokter</th>
                  <th scope="col" className="px-5 py-3 text-center">Total Reservasi</th>
                  <th scope="col" className="px-5 py-3 text-center">Selesai (Done)</th>
                  <th scope="col" className="px-5 py-3 text-center">Batal / Tolak</th>
                  <th scope="col" className="px-5 py-3 text-right">Pendapatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {doctorStats.map((doc, idx) => (
                  <tr key={idx} className="hover:bg-neutral-50/70">
                    <td className="px-5 py-3.5 font-medium text-neutral-900 flex items-center gap-2">
                      <Stethoscope className="h-4 w-4 text-[#1B1B7A]" />
                      {doc.doctor_name}
                    </td>
                    <td className="px-5 py-3.5 text-center font-semibold text-neutral-800">
                      {doc.total}
                    </td>
                    <td className="px-5 py-3.5 text-center font-bold text-green-700">
                      {doc.done}
                    </td>
                    <td className="px-5 py-3.5 text-center text-neutral-500">
                      {doc.rejected + doc.canceled + doc.expired}
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-[#1B1B7A]">
                      {formatRupiah(doc.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
