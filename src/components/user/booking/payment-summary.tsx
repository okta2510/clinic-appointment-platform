import { formatDate, formatRupiah, formatTime } from '@/lib/format';
import { card } from '@/lib/styles';
import type { TAppointment } from '@/types/appointment';

type Props = {
  appointment: TAppointment;
  status: { label: string; className: string };
};

// Ringkasan reservasi (kode, treatment, dokter, jadwal, total) di halaman pembayaran
export function PaymentSummary({ appointment, status }: Props) {
  const session = appointment.practice_sessions;

  return (
    <section className={card} aria-label="Ringkasan reservasi">
      <span
        className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${status.className}`}
      >
        {status.label}
      </span>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-neutral-600">Kode reservasi</dt>
          <dd className="font-semibold">{appointment.appointment_code}</dd>
        </div>
        <div>
          <dt className="text-sm text-neutral-600">Treatment</dt>
          <dd className="font-semibold">{appointment.treatments.name}</dd>
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
        {appointment.queue_number !== null && (
          <div>
            <dt className="text-sm text-neutral-600">Nomor antrean</dt>
            <dd className="font-semibold tabular-nums">{appointment.queue_number}</dd>
          </div>
        )}
        <div className="border-t border-neutral-200 pt-3 sm:col-span-2">
          <dt className="text-sm text-neutral-600">Total pembayaran</dt>
          <dd className="text-2xl font-bold text-[#1B1B7A]">
            {formatRupiah(appointment.total_amount)}
          </dd>
          <dd className="text-sm text-neutral-600">
            Konsultasi {formatRupiah(appointment.consultation_fee)} + treatment{' '}
            {formatRupiah(appointment.treatment_fee)}
          </dd>
        </div>
        {appointment.payment_proofs && appointment.payment_proofs[0]?.image_url && (
          <div className="border-t border-neutral-200 pt-3 sm:col-span-2">
            <dt className="text-sm font-semibold text-neutral-800 mb-1.5">Bukti transfer terunggah</dt>
            <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100 max-w-sm">
              <img
                src={appointment.payment_proofs[0].image_url}
                alt="Bukti pembayaran"
                className="max-h-64 w-full object-contain"
              />
            </div>
            {appointment.payment_proofs[0].rejection_reason && (
              <p className="mt-2 text-xs text-red-700">
                <strong>Alasan penolakan:</strong> {appointment.payment_proofs[0].rejection_reason}
              </p>
            )}
          </div>
        )}
      </dl>
    </section>
  );
}
