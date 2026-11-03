'use client';

import { useState } from 'react';
import { formatRupiah } from '@/lib/format';
import { getApiErrorMessage, getApiStatus } from '@/lib/api-error';
import Modal from '@/components/ui/modal';
import { dangerBtn, errorText, inputBase, primaryBtn, secondaryBtn } from '@/components/admin/styles';
import { STATUS_META } from '@/constants/transaction-status';
import { formatDate, formatTime } from '@/lib/format';
import { useApproveAppointment, useRejectAppointment } from '@/hooks/api/use-admin-appointments';
import type { TAdminAppointment } from '@/types/appointment';

const MAX_REASON = 500; // sama dengan backend

type Props = {
  appointment: TAdminAppointment;
  onClose: () => void;
  onSuccess: (message: string) => void;
};

export default function PaymentReviewModal({ appointment, onClose, onSuccess }: Props) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [serverError, setServerError] = useState('');

  const code = appointment.appointment_code;
  const proof = appointment.payment_proofs[0];
  const session = appointment.practice_sessions;
  const status = STATUS_META[appointment.status];
  const canReview = appointment.status === 'waiting_confirmation';

  // 409: status sudah berubah (mis. dibatalkan otomatis karena sesi dimulai)
  const handleError = (fallback: string) => (error: unknown) =>
    setServerError(
      getApiStatus(error) === 409
        ? `${getApiErrorMessage(error, fallback)}. Muat ulang daftar untuk melihat status terbaru.`
        : getApiErrorMessage(error, fallback),
    );

  const approve = useApproveAppointment({
    onSuccess: ({ data }) => {
      onSuccess(`Pembayaran ${code} diterima. Nomor antrean #${data.queue_number}.`);
      onClose();
    },
    onError: handleError('Gagal menerima pembayaran'),
  });

  const reject = useRejectAppointment({
    onSuccess: () => {
      onSuccess(`Pembayaran ${code} ditolak.`);
      onClose();
    },
    onError: handleError('Gagal menolak pembayaran'),
  });

  const isPending = approve.isPending || reject.isPending;

  function handleReject(event: React.FormEvent) {
    event.preventDefault();
    setServerError('');
    if (!reason.trim()) {
      setReasonError('Alasan penolakan wajib diisi.');
      return;
    }
    reject.mutate({ id: appointment.id, reason: reason.trim() });
  }

  return (
    <Modal
      title={`Periksa pembayaran ${code}`}
      titleId="payment-review-title"
      onClose={onClose}
      locked={isPending}
    >
      <span
        className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${status.className}`}
      >
        {status.label}
      </span>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-neutral-600">Pasien</dt>
          <dd className="font-semibold">{appointment.patient_profiles.users.full_name}</dd>
          <dd className="text-sm text-neutral-700">
            {appointment.patient_profiles.users.phone_number ?? appointment.patient_profiles.users.email}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-neutral-600">Dokter</dt>
          <dd className="font-semibold">{appointment.doctors.full_name}</dd>
        </div>
        <div>
          <dt className="text-sm text-neutral-600">Jadwal</dt>
          <dd className="font-semibold">
            {formatDate(session.session_date)}, {formatTime(session.start_time)}–
            {formatTime(session.end_time)} WIB
          </dd>
        </div>
        <div>
          <dt className="text-sm text-neutral-600">Treatment</dt>
          <dd className="font-semibold">{appointment.treatments.name}</dd>
        </div>
        <div className="border-t border-neutral-200 pt-3 sm:col-span-2">
          <dt className="text-sm text-neutral-600">Total</dt>
          <dd className="text-xl font-bold text-[#1B1B7A]">
            {formatRupiah(appointment.total_amount)}
          </dd>
          <dd className="text-sm text-neutral-700">
            Konsultasi {formatRupiah(appointment.consultation_fee)} + treatment{' '}
            {formatRupiah(appointment.treatment_fee)}
          </dd>
        </div>
      </dl>

      <h3 className="mt-6 font-semibold">Bukti pembayaran</h3>
      {proof ? (
        <>
          <img
            src={proof.image_url}
            alt={`Bukti pembayaran ${code}`}
            className="mt-2 max-h-96 w-full rounded-2xl border border-neutral-200 object-contain"
          />
          <button
            type="button"
            onClick={() => {
              if (proof.image_url.startsWith('data:image')) {
                const w = window.open('');
                if (w) {
                  w.document.write(
                    `<!DOCTYPE html><html><head><title>Bukti Pembayaran ${code}</title></head><body style="margin:0;background:#111;display:flex;justify-content:center;align-items:center;min-height:100vh;"><img src="${proof.image_url}" style="max-width:100%;max-height:100vh;object-fit:contain;" /></body></html>`,
                  );
                }
              } else {
                window.open(proof.image_url, '_blank', 'noopener,noreferrer');
              }
            }}
            className="mt-2 inline-flex min-h-11 items-center font-semibold text-[#1B1B7A] underline underline-offset-4 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B1B7A]"
          >
            Buka ukuran penuh<span className="sr-only"> (tab baru)</span>
          </button>
          {proof.rejection_reason && (
            <p className="mt-2 text-neutral-800">
              <strong>Alasan penolakan:</strong> {proof.rejection_reason}
            </p>
          )}
        </>
      ) : (
        <p className="mt-2 text-neutral-700">Pasien belum mengunggah bukti pembayaran.</p>
      )}

      {serverError && (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-red-900"
        >
          {serverError}
        </div>
      )}

      {canReview && rejecting && (
        <form onSubmit={handleReject} noValidate className="mt-6">
          <label htmlFor="reject-reason" className="font-semibold">
            Alasan penolakan
          </label>
          <textarea
            id="reject-reason"
            rows={3}
            maxLength={MAX_REASON}
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              setReasonError('');
            }}
            disabled={isPending}
            aria-invalid={Boolean(reasonError)}
            aria-describedby={reasonError ? 'reject-reason-error' : undefined}
            placeholder="Contoh: nominal transfer kurang"
            className={`mt-2 ${inputBase} ${reasonError ? 'border-red-700' : 'border-neutral-300'}`}
          />
          {reasonError && (
            <p id="reject-reason-error" role="alert" className={errorText}>
              {reasonError}
            </p>
          )}
          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setRejecting(false)}
              disabled={isPending}
              className={secondaryBtn}
            >
              Kembali
            </button>
            <button type="submit" disabled={isPending} className={dangerBtn}>
              {reject.isPending ? 'Menolak...' : 'Konfirmasi tolak'}
            </button>
          </div>
        </form>
      )}

      {canReview && !rejecting && (
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => {
              setServerError('');
              setRejecting(true);
            }}
            disabled={isPending}
            className={dangerBtn}
          >
            Tolak
          </button>
          <button
            type="button"
            onClick={() => {
              setServerError('');
              approve.mutate(appointment.id);
            }}
            disabled={isPending}
            className={primaryBtn}
          >
            {approve.isPending ? 'Memproses...' : 'Terima'}
          </button>
        </div>
      )}
    </Modal>
  );
}
