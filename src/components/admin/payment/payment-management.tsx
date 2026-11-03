'use client';

import { useState } from 'react';
import { getTotalPages, Pagination } from '@/components/ui/pagination';
import { useAutoDismiss } from '@/hooks/use-auto-dismiss';
import { getApiErrorMessage } from '@/lib/api-error';
import { actionLinkNavy, inputBase, secondaryBtn } from '@/components/admin/styles';
import { STATUS_META } from '@/constants/transaction-status';
import { formatDate, formatRupiah, formatTime } from '@/lib/format';
import { useGetAdminAppointments } from '@/hooks/api/use-admin-appointments';
import type { TAdminAppointment, TTransactionStatus } from '@/types/appointment';
import PaymentReviewModal from './payment-review-modal';

const PAGE_SIZE = 10;

type StatusFilter = TTransactionStatus | 'all';

const STATUS_OPTIONS = Object.entries(STATUS_META) as [
  TTransactionStatus,
  (typeof STATUS_META)[TTransactionStatus],
][];

// Halaman admin: daftar transaksi per status + modal verifikasi bukti bayar
export default function PaymentManagement() {
  // Default: transaksi yang perlu diproses admin
  const [status, setStatus] = useState<StatusFilter>('waiting_confirmation');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<TAdminAppointment | null>(null);
  const [notice, setNotice] = useAutoDismiss();

  const { data, isPending, isError, error, refetch, isFetching } = useGetAdminAppointments({
    status: status === 'all' ? undefined : status,
    page,
    limit: PAGE_SIZE,
  });

  const appointments = data?.data ?? [];
  const meta = data?.meta;

  function handleSuccess(message: string) {
    setNotice(message);
    // Baris yang diproses keluar dari filter; mundur bila halaman ini jadi kosong
    if (status === 'waiting_confirmation' && appointments.length === 1 && page > 1) {
      setPage((previousPage) => previousPage - 1);
    }
  }

  // Isi tabel: loading → error → kosong → data
  let tableContent;
  if (isPending) {
    tableContent = (
      <p role="status" className="p-8 text-center text-neutral-600">
        Memuat data transaksi...
      </p>
    );
  } else if (isError) {
    tableContent = (
      <div role="alert" className="p-8 text-center">
        <p className="text-red-900">
          {getApiErrorMessage(error, 'Gagal memuat data transaksi.')}
        </p>
        <button type="button" onClick={() => refetch()} className={`mt-4 ${secondaryBtn}`}>
          Coba lagi
        </button>
      </div>
    );
  } else if (appointments.length === 0) {
    tableContent = (
      <p className="p-8 text-center text-neutral-600">
        {status === 'waiting_confirmation'
          ? 'Tidak ada pembayaran yang menunggu konfirmasi.'
          : 'Tidak ada transaksi dengan status ini.'}
      </p>
    );
  } else {
    tableContent = (
      <div className="overflow-x-auto">
        <table
          aria-busy={isFetching}
          className={`w-full min-w-220 text-left ${isFetching ? 'opacity-60' : ''}`}
        >
          <caption className="sr-only">Daftar transaksi reservasi</caption>
          <thead className="border-b border-neutral-200 bg-neutral-50 text-sm text-neutral-700">
            <tr>
              <th scope="col" className="px-5 py-3 font-semibold">Pasien</th>
              <th scope="col" className="px-5 py-3 font-semibold">Dokter</th>
              <th scope="col" className="px-5 py-3 font-semibold">Jadwal</th>
              <th scope="col" className="px-5 py-3 font-semibold">Total</th>
              <th scope="col" className="px-5 py-3 font-semibold">Status</th>
              <th scope="col" className="px-5 py-3 font-semibold">Bukti Bayar</th>
              <th scope="col" className="px-5 py-3 font-semibold">Antrean</th>
              <th scope="col" className="px-5 py-3 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {appointments.map((appointment) => {
              const meta = STATUS_META[appointment.status];
              const session = appointment.practice_sessions;
              const proof = appointment.payment_proofs?.[0];
              return (
                <tr key={appointment.id}>
                  <th scope="row" className="px-5 py-4 font-normal">
                    <p className="font-semibold text-neutral-900">
                      {appointment.patient_profiles.users.full_name}
                    </p>
                    <p className="text-sm text-neutral-600">{appointment.appointment_code}</p>
                  </th>
                  <td className="px-5 py-4">{appointment.doctors.full_name}</td>
                  <td className="px-5 py-4">
                    {formatDate(session.session_date)}
                    <br />
                    <span className="text-sm text-neutral-700">
                      {formatTime(session.start_time)}–{formatTime(session.end_time)} WIB
                    </span>
                  </td>
                  <td className="px-5 py-4">{formatRupiah(appointment.total_amount)}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${meta.className}`}
                    >
                      {meta.label}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {proof?.image_url ? (
                      <button
                        type="button"
                        onClick={() => setSelected(appointment)}
                        className="group relative flex h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-neutral-300 bg-white hover:border-[#1B1B7A]"
                        title="Klik untuk periksa bukti transfer"
                      >
                        <img
                          src={proof.image_url}
                          alt="Bukti"
                          className="h-full w-full object-cover transition group-hover:scale-110"
                        />
                      </button>
                    ) : (
                      <span className="text-xs italic text-neutral-400">Belum ada</span>
                    )}
                  </td>
                  <td className="px-5 py-4 tabular-nums">{appointment.queue_number ?? '-'}</td>
                  <td className="px-5 py-4 text-right">
                    <button type="button" onClick={() => setSelected(appointment)} className={actionLinkNavy}>
                      {appointment.status === 'waiting_confirmation' ? 'Periksa' : 'Lihat'}
                      <span className="sr-only"> pembayaran {appointment.appointment_code}</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <section>
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#1B1B7A]">Verifikasi Pembayaran</h1>
        <p className="mt-1 text-neutral-600">
          Periksa bukti transfer pasien, lalu terima atau tolak reservasinya.
        </p>
      </div>

      <div role="status" aria-live="polite">
        {notice && (
          <p className="mt-5 rounded-xl border border-green-300 bg-green-50 px-4 py-3 font-medium text-green-900">
            {notice}
          </p>
        )}
      </div>

      {/* FILTER */}
      <div className="mt-6 rounded-3xl border border-neutral-200 bg-white p-5 md:max-w-sm">
        <label htmlFor="payment-status" className="font-semibold">
          Status
        </label>
        <select
          id="payment-status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as StatusFilter);
            setPage(1);
          }}
          className={`mt-2 ${inputBase} border-neutral-300`}
        >
          <option value="all">Semua</option>
          {STATUS_OPTIONS.map(([value, meta]) => (
            <option key={value} value={value}>
              {meta.label}
            </option>
          ))}
        </select>
      </div>

      {/* TABEL */}
      <div className="mt-6 overflow-hidden rounded-3xl border border-neutral-200 bg-white">
        {tableContent}
      </div>

      {/* PAGINASI */}
      {meta && meta.total > 0 && (
        <Pagination
          label="Paginasi daftar transaksi"
          className="mt-5"
          page={meta.page}
          totalPages={getTotalPages(meta)}
          summary={`${meta.total} transaksi`}
          disabled={isFetching}
          onPageChange={setPage}
          buttonClassName={secondaryBtn}
        />
      )}

      {selected && (
        <PaymentReviewModal
          appointment={selected}
          onClose={() => setSelected(null)}
          onSuccess={handleSuccess}
        />
      )}
    </section>
  );
}
