'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Check, CheckCircle2, Clock, Copy, MonitorPlay, QrCode, Sparkles } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { TAppointment } from '@/types/appointment';
import { formatDate, formatTime } from '@/lib/format';

type Props = { appointment: TAppointment };

// QR dan status antrean pasien (Sebelum check-in vs Sesudah check-in)
export default function AppointmentQr({ appointment }: Props) {
  const [copiedTarget, setCopiedTarget] = useState<'id' | 'code' | null>(null);

  if (!appointment.qr_token) return null;

  const isCheckedIn = Boolean(appointment.checked_in_at);

  const handleCopy = async (text: string, target: 'id' | 'code') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTarget(target);
      setTimeout(() => setCopiedTarget(null), 2000);
    } catch {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopiedTarget(target);
      setTimeout(() => setCopiedTarget(null), 2000);
    }
  };

  return (
    <section
      aria-labelledby="qr-heading"
      className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm"
    >
      {/* HEADER SECTION DENGAN STATUS JELAS */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b ${
          isCheckedIn
            ? 'border-emerald-200 bg-emerald-50/80 text-emerald-950'
            : 'border-indigo-100 bg-gradient-to-r from-[#1B1B7A]/5 via-[#C5A46D]/10 to-transparent text-[#1B1B7A]'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {isCheckedIn ? (
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
              <CheckCircle2 className="h-5 w-5" />
            </span>
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1B1B7A] text-white shadow-sm">
              <QrCode className="h-4 w-4" />
            </span>
          )}
          <div>
            <h2 id="qr-heading" className="text-base font-bold sm:text-lg">
              {isCheckedIn ? 'Status Antrean: Terverifikasi Hadir' : 'Tiket Check-In Klinik'}
            </h2>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-neutral-600">
              <span>
                Kode:{' '}
                <span className="font-mono font-bold text-[#1B1B7A]">
                  {appointment.appointment_code}
                </span>
              </span>
              <button
                type="button"
                onClick={() => handleCopy(appointment.appointment_code, 'code')}
                className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-neutral-600 hover:border-[#1B1B7A] hover:text-[#1B1B7A] transition active:scale-95"
                title="Salin Kode Reservasi"
              >
                {copiedTarget === 'code' ? (
                  <>
                    <Check className="size-3 text-emerald-600" />
                    <span className="text-emerald-700 font-semibold">Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3 text-neutral-500" />
                    <span>Salin Kode</span>
                  </>
                )}
              </button>
              <span className="text-neutral-300">|</span>
              <button
                type="button"
                onClick={() => handleCopy(appointment.id, 'id')}
                className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-neutral-600 hover:border-[#1B1B7A] hover:text-[#1B1B7A] transition active:scale-95"
                title={`Salin ID Reservasi: ${appointment.id}`}
              >
                {copiedTarget === 'id' ? (
                  <>
                    <Check className="size-3 text-emerald-600" />
                    <span className="text-emerald-700 font-semibold">ID Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3 text-neutral-500" />
                    <span>Salin ID</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
            isCheckedIn
              ? 'border border-emerald-300 bg-emerald-100 text-emerald-800'
              : 'border border-amber-300 bg-amber-50 text-amber-900'
          }`}
        >
          {isCheckedIn ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>Sudah Check-In</span>
            </>
          ) : (
            <>
              <Clock className="h-3.5 w-3.5 text-amber-600" />
              <span>Menunggu Scan di Resepsionis</span>
            </>
          )}
        </span>
      </div>

      {/* CONTENT BODY */}
      <div className="p-6 md:p-8">
        {isCheckedIn ? (
          /* TAMPILAN SESUDAH CHECK-IN: NOMOR ANTREAN AKTIF */
          <div className="flex flex-col md:flex-row items-center gap-6 justify-between">
            <div className="flex-1 text-center md:text-left space-y-3">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-900">
                <Sparkles className="h-3.5 w-3.5 text-emerald-700" />
                Nomor Antrean Pemeriksaan Anda Telah Terbit
              </span>

              <div className="pt-1">
                <p className="text-xs uppercase tracking-wider text-neutral-500 font-bold">
                  Nomor Antrean Fisik Anda
                </p>
                <div className="mt-1 flex items-baseline justify-center md:justify-start gap-2">
                  <span className="text-5xl md:text-6xl font-black tabular-nums tracking-tight text-[#1B1B7A]">
                    #{appointment.queue_number ?? '-'}
                  </span>
                </div>
              </div>

              {appointment.checked_in_at && (
                <p className="text-xs text-neutral-500">
                  Tercatat tiba di resepsionis pada:{' '}
                  <span className="font-semibold text-neutral-800">
                    {formatDate(appointment.checked_in_at)}, pk.{' '}
                    {formatTime(appointment.checked_in_at)} WIB
                  </span>
                </p>
              )}

              <p className="max-w-md text-xs sm:text-sm text-neutral-600 leading-relaxed">
                Silakan duduk dengan nyaman di ruang tunggu aesthetic clinic. Petugas akan
                memanggil nomor antrean Anda saat dokter siap melayani sesi konsultasi / perawatan.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3 justify-center md:justify-start">
                <Link
                  href="/queue"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#1B1B7A] px-4 py-2.5 text-xs font-bold text-white shadow transition hover:bg-[#2A2A9A]"
                >
                  <MonitorPlay className="h-4 w-4" />
                  <span>Pantau Layar Antrean Langsung</span>
                </Link>
              </div>
            </div>

            {/* QR Code Kompak untuk verifikasi ulang */}
            <div className="shrink-0 flex flex-col items-center rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-center">
              <div className="rounded-xl bg-white p-2.5 shadow-sm">
                <QRCodeSVG
                  value={`${appointment.appointment_code}:${appointment.qr_token}`}
                  size={130}
                  level="M"
                  title={`QR reservasi ${appointment.appointment_code}`}
                />
              </div>
              <p className="mt-2 text-[10px] text-neutral-500 font-mono">
                {appointment.appointment_code}
              </p>
              <button
                type="button"
                onClick={() => handleCopy(appointment.id, 'id')}
                className="mt-2 inline-flex items-center justify-center gap-1 rounded-lg border border-neutral-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-neutral-700 shadow-xs hover:border-[#1B1B7A] hover:bg-neutral-50 active:scale-95 transition"
                title={`Salin ID: ${appointment.id}`}
              >
                {copiedTarget === 'id' ? (
                  <>
                    <Check className="size-3 text-emerald-600" />
                    <span className="text-emerald-700 font-bold">ID Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3 text-neutral-500" />
                    <span>Salin ID</span>
                  </>
                )}
              </button>
              <p className="mt-1 text-[10px] text-neutral-400">Barcode Verifikasi</p>
            </div>
          </div>
        ) : (
          /* TAMPILAN SEBELUM CHECK-IN: QR CODE BESAR UNTUK DI-SCAN RESEPSIONIS */
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center justify-between">
            <div className="shrink-0 rounded-2xl border-2 border-dashed border-[#1B1B7A]/20 bg-neutral-50 p-4 shadow-inner text-center">
              <div className="rounded-xl bg-white p-3 shadow">
                <QRCodeSVG
                  value={`${appointment.appointment_code}:${appointment.qr_token}`}
                  size={192}
                  level="M"
                  title={`QR reservasi ${appointment.appointment_code}`}
                />
              </div>
              <div className="mt-3 flex flex-col items-center gap-2">
                <div className="flex items-center justify-center gap-1.5">
                  <span className="text-xs font-mono font-bold text-[#1B1B7A]">
                    {appointment.appointment_code}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(appointment.appointment_code, 'code')}
                    className="inline-flex items-center rounded-md border border-neutral-200 bg-white p-1 text-neutral-500 hover:border-[#1B1B7A] hover:text-[#1B1B7A] active:scale-95 transition"
                    title="Salin Kode Reservasi"
                    aria-label="Salin Kode Reservasi"
                  >
                    {copiedTarget === 'code' ? (
                      <Check className="size-3 text-emerald-600" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(appointment.id, 'id')}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 shadow-xs hover:border-[#1B1B7A] hover:bg-neutral-50 active:scale-95 transition"
                  title={`Salin ID Reservasi: ${appointment.id}`}
                >
                  {copiedTarget === 'id' ? (
                    <>
                      <Check className="size-3.5 text-emerald-600" />
                      <span className="font-bold text-emerald-700">ID Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5 text-neutral-500" />
                      <span>Salin ID Reservasi</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-3 text-center sm:text-left">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-[#1B1B7A]">
                  Langkah Kedatangan di Klinik
                </span>
                <h3 className="mt-1.5 text-lg font-bold text-neutral-900">
                  Tunjukkan Barcode ke Resepsionis
                </h3>
              </div>

              <ol className="space-y-2 text-xs text-neutral-600 sm:text-sm">
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1B1B7A] text-[10px] font-bold text-white">
                    1
                  </span>
                  <span>Tiba di klinik 10–15 menit sebelum waktu jadwal sesi konsultasi.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1B1B7A] text-[10px] font-bold text-white">
                    2
                  </span>
                  <span>
                    Buka layar ini dan tunjukkan Barcode QR kepada staf resepsionis meja depan.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1B1B7A] text-[10px] font-bold text-white">
                    3
                  </span>
                  <span>
                    Petugas akan memindai QR untuk menerbitkan <strong>Nomor Antrean Resmi</strong> Anda.
                  </span>
                </li>
              </ol>

              {appointment.queue_number && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-2.5 text-xs text-amber-900">
                  <p className="font-semibold">Perkiraan Urutan Reservasi: #{appointment.queue_number}</p>
                  <p className="text-[11px] text-amber-800">
                    Nomor antrean fisik resmi akan dikonfirmasi oleh sistem begitu barcode di-scan.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
