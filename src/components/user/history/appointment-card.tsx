'use client';

import { useState } from 'react';
import Link from 'next/link';
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
  const proof = appointment.payment_proofs?.[0];
  const waiting = appointment.status === 'waiting_payment' && remaining > 0;
  // Hold yang baru habis di browser ditampilkan kedaluwarsa sebelum data dimuat ulang
  const status = STATUS_META[appointment.status === 'waiting_payment' && !waiting ? 'expired' : appointment.status];
  const session = appointment.practice_sessions;

  // Info di kiri tombol: sisa waktu bayar → rating yang sudah diberikan → kosong
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
  } else {
    statusInfo = (
      <span />
    );
  }

  // Teks tombol: masih bisa bayar → bisa diberi rating → lihat detail
  let actionLabel = 'Lihat detail';
  if (waiting) {
    actionLabel = 'Lanjutkan pembayaran';
  } else if (appointment.can_rate) {
    actionLabel = 'Beri rating';
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
        <span
          className={`rounded-full px-3 py-1 text-sm font-semibold ${status.className}`}
        >
          {status.label}
        </span>
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
          <dd className="font-semibold tabular-nums">{appointment.queue_number ?? '-'}</dd>
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

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {statusInfo}
        <Link
          href={appointment.can_rate ? `/payment/${appointment.id}#rating` : `/payment/${appointment.id}`}
          className={waiting || appointment.can_rate ? primaryBtn : secondaryBtn}
        >
          {actionLabel}
          <span className="sr-only"> reservasi {appointment.appointment_code}</span>
        </Link>
      </div>
    </article>
  );
}
