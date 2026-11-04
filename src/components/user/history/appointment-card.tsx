'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, CheckCircle2, Clock, Copy, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import RatingStars from '@/components/user/booking/rating-stars';
import Modal from '@/components/ui/modal';
import { STATUS_META } from '@/constants/transaction-status';
import { formatCountdown, formatDate, formatRupiah, formatTime } from '@/lib/format';
import { primaryBtn, secondaryBtn } from '@/lib/styles';
import type { TAppointment } from '@/types/appointment';

type Props = {
  appointment: TAppointment;
  /** Sisa detik upload bukti bayar (0 bila tidak menunggu pembayaran) */
  remaining: number;
};

// Satu kartu reservasi di halaman riwayat
export function AppointmentCard({ appointment, remaining }: Props) {
  const [showProofModal, setShowProofModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const proof = appointment.payment_proofs?.[0];
  const waiting = appointment.status === 'waiting_payment' && remaining > 0;
  // Hold yang baru habis di browser ditampilkan kedaluwarsa sebelum data dimuat ulang
  const status = STATUS_META[appointment.status === 'waiting_payment' && !waiting ? 'expired' : appointment.status];
  const session = appointment.practice_sessions;

  const isCheckedIn = Boolean(appointment.checked_in_at);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(appointment.appointment_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback manual jika navigator.clipboard terblokir
      const el = document.createElement('textarea');
      el.value = appointment.appointment_code;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Info di kiri tombol: sisa waktu bayar → rating yang sudah diberikan → status check in
  let statusInfo;
  if (waiting) {
    statusInfo = (
      <p className="font-semibold text-amber-950">
        Sisa waktu unggah bukti:{' '}
        <span className="tabular-nums">{formatCountdown(remaining)}</span>
      </p>
    );
  } else if (appointment.ratings) {
    statusInfo = (
      <p className="flex items-center gap-2 text-sm text-neutral-700">
        Rating Anda <RatingStars value={appointment.ratings.rating} />
      </p>
    );
  } else if (appointment.status === 'done') {
    if (isCheckedIn) {
      statusInfo = (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700">
          <CheckCircle2 className="h-4 w-4" /> Pasien sudah check-in di klinik
        </span>
      );
    } else {
      statusInfo = (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700">
          <Clock className="h-4 w-4" /> Tunjukkan QR saat tiba di resepsionis
        </span>
      );
    }
  } else {
    statusInfo = <span />;
  }

  // Teks dan aksi tombol
  let actionLabel = 'Lihat detail';
  let actionHref = `/payment/${appointment.id}`;
  let isPrimaryAction = false;

  if (waiting) {
    actionLabel = 'Lanjutkan pembayaran';
    isPrimaryAction = true;
  } else if (appointment.can_rate) {
    actionLabel = 'Beri rating';
    actionHref = `/payment/${appointment.id}#rating`;
    isPrimaryAction = true;
  } else if (appointment.status === 'done' && !isCheckedIn) {
    actionLabel = 'Lihat Barcode Antrean';
    isPrimaryAction = true;
  }

  return (
    <article
      aria-labelledby={`appointment-${appointment.id}`}
      className={`rounded-3xl border bg-white p-5 md:p-6 ${
        waiting ? 'border-amber-400' : 'border-neutral-200'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={`appointment-${appointment.id}`} className="text-lg font-bold text-[#1B1B7A]">
            {appointment.treatments.name}
          </h2>
          <p className="text-sm text-neutral-600">{appointment.appointment_code}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {appointment.status === 'done' && (
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                isCheckedIn
                  ? 'border border-green-300 bg-green-100 text-green-800'
                  : 'border border-blue-300 bg-blue-100 text-blue-800'
              }`}
            >
              {isCheckedIn ? 'Hadir & Check-In' : 'Menunggu Check-In'}
            </span>
          )}
          <span
            className={`rounded-full px-3 py-1 text-sm font-semibold ${status.className}`}
          >
            {status.label}
          </span>
        </div>
      </div>

      {/* KOTAK KODE RESERVASI & COPY BUTTON */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-3.5">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Nomor Kode Pendaftaran Antrean
          </p>
          <p className="mt-0.5 font-mono text-base font-extrabold tracking-wider text-[#1B1B7A]">
            {appointment.appointment_code}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {appointment.qr_token && (
            <button
              type="button"
              onClick={() => setShowQrModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-300 bg-white px-3 py-1.5 text-xs font-bold text-[#1B1B7A] shadow-sm transition hover:bg-neutral-50"
              title="Tampilkan Barcode / QR Antrean"
            >
              <QrCode className="h-4 w-4" />
              <span>Lihat QR</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleCopyCode}
            className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-300 bg-white px-3 py-1.5 text-xs font-bold text-[#1B1B7A] shadow-sm transition hover:bg-neutral-50 active:scale-95"
            title="Salin nomor kode reservasi"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-green-700">Tersalin!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 text-neutral-600" />
                <span>Salin Kode</span>
              </>
            )}
          </button>
        </div>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 sm:text-base lg:grid-cols-4">
        <div>
          <dt className="text-neutral-600">Dokter</dt>
          <dd className="font-semibold">{appointment.doctors.full_name}</dd>
        </div>
        <div>
          <dt className="text-neutral-600">Jadwal</dt>
          <dd className="font-semibold">
            {formatDate(session.session_date)}, {formatTime(session.start_time)}–
            {formatTime(session.end_time)} WIB
          </dd>
        </div>
        <div>
          <dt className="text-neutral-600">No. antrean</dt>
          <dd className="flex items-center gap-1.5 font-semibold tabular-nums text-lg text-[#1B1B7A]">
            <span>{appointment.queue_number ? `#${appointment.queue_number}` : '-'}</span>
            {isCheckedIn ? (
              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                Aktif
              </span>
            ) : (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                Belum Scan
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-neutral-600">Biaya konsultasi</dt>
          <dd className="font-semibold">{formatRupiah(appointment.consultation_fee)}</dd>
          <dd className="text-sm text-neutral-600">
            Total {formatRupiah(appointment.total_amount)}
          </dd>
        </div>
      </dl>

      {/* Pratinjau Bukti Pembayaran */}
      {proof?.image_url && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-neutral-50/80 p-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowProofModal(true)}
              className="group relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-neutral-300 bg-white"
              title="Perbesar bukti transfer"
            >
              <img
                src={proof.image_url}
                alt="Bukti Transfer"
                className="h-full w-full object-cover transition group-hover:scale-110"
              />
            </button>
            <div>
              <p className="text-xs font-semibold text-neutral-800">Bukti Pembayaran</p>
              <p className="text-xs text-neutral-500">
                {proof.uploaded_at ? `Diunggah ${formatDate(proof.uploaded_at)}` : 'Telah diunggah'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowProofModal(true)}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-[#1B1B7A] hover:bg-neutral-100"
          >
            Lihat Bukti
          </button>
        </div>
      )}

      {/* Modal Popup Bukti Pembayaran Penuh */}
      {showProofModal && proof?.image_url && (
        <Modal
          title={`Bukti Pembayaran #${appointment.appointment_code}`}
          titleId={`proof-modal-${appointment.id}`}
          onClose={() => setShowProofModal(false)}
        >
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100">
              <img
                src={proof.image_url}
                alt={`Bukti Transfer ${appointment.appointment_code}`}
                className="max-h-96 w-full object-contain"
              />
            </div>
            {proof.rejection_reason && (
              <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                <strong>Catatan Klinik:</strong> {proof.rejection_reason}
              </p>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowProofModal(false)}
                className={secondaryBtn}
              >
                Tutup
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Popup Barcode / QR Antrean */}
      {showQrModal && appointment.qr_token && (
        <Modal
          title={
            isCheckedIn
              ? `Nomor Antrean #${appointment.appointment_code}`
              : `Barcode Check-In #${appointment.appointment_code}`
          }
          titleId={`qr-modal-${appointment.id}`}
          onClose={() => setShowQrModal(false)}
        >
          <div className="flex flex-col items-center space-y-4 text-center">
            {/* Status Badge */}
            <div className="flex justify-center">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                  isCheckedIn
                    ? 'border border-emerald-300 bg-emerald-100 text-emerald-800'
                    : 'border border-amber-300 bg-amber-100 text-amber-900'
                }`}
              >
                {isCheckedIn ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Sudah Check-In di Klinik</span>
                  </>
                ) : (
                  <>
                    <Clock className="h-3.5 w-3.5 text-amber-600" />
                    <span>Menunggu Scan di Resepsionis</span>
                  </>
                )}
              </span>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
              <QRCodeSVG
                value={`${appointment.appointment_code}:${appointment.qr_token}`}
                size={210}
                level="M"
                title={`QR reservasi ${appointment.appointment_code}`}
              />
            </div>

            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wider text-neutral-500 font-bold">
                {isCheckedIn ? 'Nomor Antrean Resmi Anda' : 'Kode Reservasi'}
              </p>
              <p className="text-4xl font-black text-[#1B1B7A]">
                {isCheckedIn && appointment.queue_number
                  ? `#${appointment.queue_number}`
                  : appointment.appointment_code}
              </p>
              <p className="text-xs text-neutral-600 max-w-xs mt-2">
                {isCheckedIn
                  ? 'Nomor antrean Anda telah aktif. Anda dapat memantau giliran panggilan di ruang tunggu atau layar antrean.'
                  : 'Tunjukkan barcode QR ini kepada petugas resepsionis klinik saat Anda tiba untuk mengaktifkan nomor antrean.'}
              </p>
            </div>

            <div className="flex flex-wrap w-full justify-between items-center gap-2 pt-3 border-t border-neutral-100">
              {isCheckedIn ? (
                <Link
                  href="/queue"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1B1B7A] hover:underline"
                >
                  Lihat Layar Antrean
                </Link>
              ) : (
                <span className="text-[11px] text-neutral-500">
                  Klinik Estetika & Kecantikan
                </span>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowQrModal(false)}
                  className={secondaryBtn}
                >
                  Tutup
                </button>
                <Link href={`/payment/${appointment.id}`} className={primaryBtn}>
                  Detail
                </Link>
              </div>
            </div>
          </div>
        </Modal>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {statusInfo}
        <div className="flex items-center gap-2">
          {appointment.status === 'done' && !isCheckedIn ? (
            <button
              type="button"
              onClick={() => setShowQrModal(true)}
              className={primaryBtn}
            >
              {actionLabel}
            </button>
          ) : (
            <Link
              href={actionHref}
              className={isPrimaryAction ? primaryBtn : secondaryBtn}
            >
              {actionLabel}
              <span className="sr-only"> reservasi {appointment.appointment_code}</span>
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
