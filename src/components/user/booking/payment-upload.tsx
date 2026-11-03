'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { STATUS_META } from '@/constants/transaction-status';
import { useGetAppointment } from '@/hooks/api/use-appointments';
import { useNow } from '@/hooks/use-now';
import { getApiErrorMessage, getApiStatus } from '@/lib/api-error';
import { getRemainingSeconds } from '@/lib/appointment';
import { card, primaryBtn, secondaryBtn } from '@/lib/styles';
import AppointmentQr from './appointment-qr';
import CancelAppointmentModal from './cancel-appointment-modal';
import { PaymentCountdown } from './payment-countdown';
import { PaymentProofForm } from './payment-proof-form';
import { PaymentSummary } from './payment-summary';
import RatingForm from './rating-form';
import RatingStars from './rating-stars';

// TODO: ganti dengan rekening asli klinik
const BANK_ACCOUNT = { bank: 'BCA', number: 'xxxxxxxxxx', holder: 'IH Beauty Clinic' };

// Halaman /payment/[appointmentId]: tampilan menyesuaikan status reservasi
export default function PaymentUpload() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const { data, dataUpdatedAt, isPending, isError, error, refetch } =
    useGetAppointment(appointmentId);
  const appointment = data?.data;

  // Hitung mundur dari sisa detik yang dikirim server (tidak bergantung jam perangkat)
  const isWaitingPayment = appointment?.status === 'waiting_payment';
  const now = useNow(isWaitingPayment);
  const remaining =
    appointment && isWaitingPayment && dataUpdatedAt
      ? getRemainingSeconds(appointment.remaining_seconds, dataUpdatedAt, now)
      : 0;

  const [expiredByServer, setExpiredByServer] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  if (isPending) {
    return (
      <p role="status" className={`${card} text-center text-neutral-600`}>
        Memuat data reservasi...
      </p>
    );
  }

  if (isError || !appointment) {
    return (
      <div role="alert" className={`${card} text-center`}>
        <p className="text-red-900">
          {getApiStatus(error) === 404
            ? 'Reservasi tidak ditemukan.'
            : getApiErrorMessage(error, 'Gagal memuat data reservasi.')}
        </p>
        <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
          {getApiStatus(error) !== 404 && (
            <button type="button" onClick={() => refetch()} className={primaryBtn}>
              Coba lagi
            </button>
          )}
          <Link href="/" className={secondaryBtn}>
            Kembali ke beranda
          </Link>
        </div>
      </div>
    );
  }

  const treatmentSlug = appointment.treatments?.slug || 'acne-dermapeel';
  const bookingHref = `/treatment/${treatmentSlug}/booking`;
  const isExpired =
    expiredByServer ||
    appointment.status === 'expired' ||
    (appointment.status === 'waiting_payment' && remaining === 0);
  const status = STATUS_META[isExpired ? 'expired' : appointment.status];
  const rejectionReason = appointment.payment_proofs[0]?.rejection_reason;

  const summary = <PaymentSummary appointment={appointment} status={status} />;

  const cancelButton = appointment.can_cancel && (
    <button type="button" onClick={() => setCancelOpen(true)} className={secondaryBtn}>
      Batalkan booking
    </button>
  );

  const cancelModal = cancelOpen && (
    <CancelAppointmentModal
      appointment={appointment}
      onClose={() => setCancelOpen(false)}
      onStale={() => refetch()}
    />
  );

  if (isExpired || appointment.status === 'rejected') {
    return (
      <div className="grid gap-6">
        <div role="alert" className={`${card} border-amber-300 bg-amber-50 text-amber-950`}>
          <h2 className="text-2xl font-bold tracking-tight">
            {appointment.status === 'rejected' ? 'Pembayaran ditolak' : 'Waktu pembayaran habis'}
          </h2>
          <p className="mt-2">
            {appointment.status === 'rejected'
              ? 'Bukti pembayaran Anda ditolak oleh klinik dan kuota sudah dilepas. Silakan buat reservasi baru.'
              : 'Bukti pembayaran tidak diunggah dalam 30 menit, sehingga kuota dokter telah dilepas. Silakan isi ulang form reservasi.'}
          </p>
          {appointment.status === 'rejected' && rejectionReason && (
            <p className="mt-2">
              <strong>Alasan:</strong> {rejectionReason}
            </p>
          )}
          <Link href={`${bookingHref}?expired=1`} className={`mt-5 ${primaryBtn}`}>
            Isi ulang form reservasi
          </Link>
        </div>
        {summary}
      </div>
    );
  }

  if (appointment.status === 'canceled') {
    return (
      <div className="grid gap-6">
        <div role="status" className={`${card} bg-neutral-50`}>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900">
            Reservasi dibatalkan
          </h2>
          <p className="mt-2 text-neutral-700">
            Kuota sudah dilepas untuk pasien lain. Reservasi juga otomatis dibatalkan bila admin
            belum memproses pembayaran sampai jadwal dimulai.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link href={bookingHref} className={primaryBtn}>
              Buat reservasi baru
            </Link>
            <Link href="/history" className={secondaryBtn}>
              Lihat riwayat reservasi
            </Link>
          </div>
        </div>
        {summary}
      </div>
    );
  }

  if (appointment.status === 'waiting_confirmation') {
    return (
      <div className="grid gap-6">
        <div role="status" className={`${card} border-blue-300 bg-blue-50 text-blue-950`}>
          <h2 className="text-2xl font-bold tracking-tight">Menunggu konfirmasi admin</h2>
          <p className="mt-2">
            Kuota Anda sudah aman. Klinik akan memverifikasi pembayaran Anda secepatnya. Bila admin
            belum memproses sampai jadwal dimulai, reservasi otomatis dibatalkan.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link href="/history" className={primaryBtn}>
              Lihat riwayat reservasi
            </Link>
            {cancelButton}
          </div>
        </div>
        {summary}
        {cancelModal}
      </div>
    );
  }

  if (appointment.status === 'done') {
    return (
      <div className="grid gap-6">
        <AppointmentQr appointment={appointment} />
        {appointment.can_rate && <RatingForm appointment={appointment} />}
        {appointment.ratings && (
          <section aria-labelledby="my-review-heading" className={card}>
            <h2 id="my-review-heading" className="text-xl font-bold text-[#1B1B7A]">
              Ulasan Anda
            </h2>
            <div className="mt-3">
              <RatingStars value={appointment.ratings.rating} size="md" />
            </div>
            {appointment.ratings.review && (
              <p className="mt-2 whitespace-pre-line text-neutral-700">
                {appointment.ratings.review}
              </p>
            )}
          </section>
        )}
        {summary}
        {cancelButton && <div>{cancelButton}</div>}
        {cancelModal}
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <p className="text-sm font-bold uppercase tracking-wide text-[#1B1B7A]">
        Langkah 2 dari 2 · Unggah bukti pembayaran
      </p>
      <PaymentCountdown remaining={remaining} />

      {summary}

      <section className={card} aria-label="Rekening tujuan">
        <div className="rounded-2xl bg-[#FAF8F3] px-4 py-3">
          <p className="text-sm text-neutral-600">Transfer ke rekening</p>
          <p className="font-semibold">
            {BANK_ACCOUNT.bank} {BANK_ACCOUNT.number} a.n. {BANK_ACCOUNT.holder}
          </p>
        </div>
      </section>

      <PaymentProofForm
        appointmentId={appointment.id}
        cancelButton={cancelButton}
        onExpired={() => {
          setExpiredByServer(true);
          refetch();
        }}
      />
      {cancelModal}
    </div>
  );
}
