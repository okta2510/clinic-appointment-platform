'use client';

import { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Pencil,
  Search,
  XCircle,
} from 'lucide-react';
import {
  useApproveAppointment,
  useGetAdminAppointments,
  useRejectAppointment,
} from '@/hooks/api/use-admin-appointments';
import { useGetDoctors } from '@/hooks/api/use-doctors';
import { STATUS_META } from '@/constants/transaction-status';
import { formatDate, formatRupiah, formatTime } from '@/lib/format';
import Modal from '@/components/ui/modal';
import EditAppointmentModal from './edit-appointment-modal';
import { Pagination } from '@/components/ui/pagination';
import { inputBase, secondaryBtn } from '@/components/admin/styles';
import type { TAdminAppointment, TTransactionStatus } from '@/types/appointment';
import type { TDoctor } from '@/types/doctor';

const PAGE_SIZE = 10;

export default function AppointmentManagement() {
  const [page, setPage] = useState(1);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [previewAppt, setPreviewAppt] = useState<TAdminAppointment | null>(null);
  const [editTarget, setEditTarget] = useState<TAdminAppointment | null>(null);
  const [approveTarget, setApproveTarget] = useState<TAdminAppointment | null>(null);
  const [rejectTarget, setRejectTarget] = useState<TAdminAppointment | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  // Fetch doctors for filter dropdown
  const { data: doctorsData } = useGetDoctors();
  const doctorsList: TDoctor[] = doctorsData?.data ?? [];

  // Fetch appointments
  const {
    data: appointmentsData,
    isLoading,
    isError,
    refetch,
  } = useGetAdminAppointments({
    doctor_id: selectedDoctorId === 'all' ? undefined : selectedDoctorId,
    status: selectedStatus === 'all' ? undefined : (selectedStatus as TTransactionStatus),
    date: selectedDate || undefined,
    page,
    limit: PAGE_SIZE,
  });

  const appointments = appointmentsData?.data ?? [];
  const meta = appointmentsData?.meta;

  const { mutateAsync: approveAppt, isPending: isApproving } = useApproveAppointment({
    onSuccess: () => {
      setApproveTarget(null);
      setActionSuccessMsg('Janji temu berhasil disetujui.');
      setTimeout(() => setActionSuccessMsg(''), 4000);
      refetch();
    },
  });

  const { mutateAsync: rejectAppt, isPending: isRejecting } = useRejectAppointment({
    onSuccess: () => {
      setRejectTarget(null);
      setRejectReason('');
      setActionSuccessMsg('Janji temu berhasil ditolak.');
      setTimeout(() => setActionSuccessMsg(''), 4000);
      refetch();
    },
  });

  const filteredAppointments = appointments.filter((appt) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const patientName = appt.patient_profiles?.users?.full_name?.toLowerCase() || '';
    const code = appt.appointment_code?.toLowerCase() || '';
    const doctorName = appt.doctors?.full_name?.toLowerCase() || '';
    return patientName.includes(term) || code.includes(term) || doctorName.includes(term);
  });

  const handleApprove = async () => {
    if (!approveTarget) return;
    try {
      await approveAppt(approveTarget.id);
    } catch (err: any) {
      alert(err?.message || 'Gagal menyetujui janji temu');
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    try {
      await rejectAppt({ id: rejectTarget.id, reason: rejectReason });
    } catch (err: any) {
      alert(err?.message || 'Gagal menolak janji temu');
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1B1B7A] md:text-3xl">
            Manajemen Janji Temu
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Kelola seluruh jadwal reservasi pasien, sesi praktik dokter, dan status kehadiran.
          </p>
        </div>
      </div>

      {actionSuccessMsg && (
        <div
          role="status"
          className="rounded-xl border border-green-300 bg-green-50 p-4 text-sm font-medium text-green-900"
        >
          {actionSuccessMsg}
        </div>
      )}

      {/* FILTER CONTROLS */}
      <div className="grid gap-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm md:grid-cols-4">
        {/* Search */}
        <div>
          <label htmlFor="search" className="block text-xs font-semibold uppercase text-neutral-500 mb-1">
            Pencarian
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
            <input
              id="search"
              type="text"
              placeholder="Pasien, Kode, Dokter..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`${inputBase} pl-9`}
            />
          </div>
        </div>

        {/* Doctor Filter */}
        <div>
          <label htmlFor="filterDoctor" className="block text-xs font-semibold uppercase text-neutral-500 mb-1">
            Dokter
          </label>
          <select
            id="filterDoctor"
            value={selectedDoctorId}
            onChange={(e) => {
              setSelectedDoctorId(e.target.value);
              setPage(1);
            }}
            className={inputBase}
          >
            <option value="all">Semua Dokter</option>
            {doctorsList.map((doc: TDoctor) => (
              <option key={doc.id} value={doc.id}>
                {doc.full_name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label htmlFor="filterStatus" className="block text-xs font-semibold uppercase text-neutral-500 mb-1">
            Status
          </label>
          <select
            id="filterStatus"
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className={inputBase}
          >
            <option value="all">Semua Status</option>
            {Object.entries(STATUS_META).map(([key, metaInfo]) => (
              <option key={key} value={key}>
                {metaInfo.label}
              </option>
            ))}
          </select>
        </div>

        {/* Date Filter */}
        <div>
          <label htmlFor="filterDate" className="block text-xs font-semibold uppercase text-neutral-500 mb-1">
            Tanggal Sesi
          </label>
          <input
            id="filterDate"
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setPage(1);
            }}
            className={inputBase}
          />
        </div>
      </div>

      {/* APPOINTMENTS LIST / TABLE */}
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-neutral-500">
            <p className="animate-pulse">Memuat daftar janji temu...</p>
          </div>
        ) : isError ? (
          <div className="p-12 text-center text-red-600">
            <p>Terjadi kesalahan saat memuat data janji temu.</p>
            <button
              type="button"
              onClick={() => refetch()}
              className={`mt-4 ${secondaryBtn}`}
            >
              Coba Lagi
            </button>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="p-12 text-center text-neutral-500">
            <FileText className="mx-auto h-12 w-12 text-neutral-300" />
            <h3 className="mt-3 text-lg font-semibold text-neutral-700">
              Tidak ada data janji temu
            </h3>
            <p className="mt-1 text-sm text-neutral-500">
              Tidak ditemukan janji temu sesuai kriteria filter yang dipilih.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-neutral-700">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold uppercase text-neutral-600">
                <tr>
                  <th scope="col" className="px-5 py-3.5">Kode & Pasien</th>
                  <th scope="col" className="px-5 py-3.5">Dokter & Jadwal</th>
                  <th scope="col" className="px-5 py-3.5">Biaya</th>
                  <th scope="col" className="px-5 py-3.5">Status</th>
                  <th scope="col" className="px-5 py-3.5">Bukti Bayar</th>
                  <th scope="col" className="px-5 py-3.5">Antrean</th>
                  <th scope="col" className="px-5 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filteredAppointments.map((appt) => {
                  const statusInfo = STATUS_META[appt.status];

                  return (
                    <tr key={appt.id} className="hover:bg-neutral-50/70">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-[#1B1B7A]">
                          {appt.appointment_code}
                        </div>
                        <div className="mt-0.5 text-neutral-900 font-medium">
                          {appt.patient_profiles?.users?.full_name || 'Pasien Tanpa Nama'}
                        </div>
                        <div className="text-xs text-neutral-500">
                          {appt.patient_profiles?.users?.phone_number || appt.patient_profiles?.users?.email || '-'}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-medium text-neutral-900">
                          {appt.doctors?.full_name}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-neutral-500">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{formatDate(appt.practice_sessions?.session_date)}</span>
                          <span>•</span>
                          <Clock className="h-3.5 w-3.5" />
                          <span>
                            {formatTime(appt.practice_sessions?.start_time)} -{' '}
                            {formatTime(appt.practice_sessions?.end_time)}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-semibold text-neutral-900">
                          {formatRupiah(Number(appt.total_amount) || Number(appt.consultation_fee) || 0)}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusInfo?.className || 'bg-neutral-100 text-neutral-800'}`}
                        >
                          {statusInfo?.label || appt.status}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        {appt.payment_proofs && appt.payment_proofs[0]?.image_url ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setPreviewAppt(appt)}
                              className="group relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-neutral-300 bg-white hover:border-[#1B1B7A]"
                              title="Klik untuk melihat bukti transfer"
                            >
                              <img
                                src={appt.payment_proofs[0].image_url}
                                alt="Bukti Transfer"
                                className="h-full w-full object-cover transition group-hover:scale-110"
                              />
                            </button>
                            <span className="text-xs font-medium text-green-700">Tersedia</span>
                          </div>
                        ) : (
                          <span className="text-xs italic text-neutral-400">Belum ada</span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {appt.queue_number ? (
                          <span className="inline-flex items-center justify-center rounded-lg bg-[#1B1B7A]/10 px-2.5 py-1 text-sm font-bold text-[#1B1B7A]">
                            #{appt.queue_number}
                          </span>
                        ) : (
                          <span className="text-xs text-neutral-400">Belum check-in</span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setPreviewAppt(appt)}
                            aria-label={`Lihat rincian janji ${appt.appointment_code}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Detail
                          </button>

                          <button
                            type="button"
                            onClick={() => setEditTarget(appt)}
                            aria-label={`Ubah janji ${appt.appointment_code}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Ubah
                          </button>

                          {appt.status === 'waiting_confirmation' && (
                            <>
                              <button
                                type="button"
                                onClick={() => setApproveTarget(appt)}
                                className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Terima
                              </button>
                              <button
                                type="button"
                                onClick={() => setRejectTarget(appt)}
                                className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                Tolak
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION */}
        {meta && meta.total_pages > 1 && (
          <div className="border-t border-neutral-200 px-5 py-4">
            <Pagination
              label="Paginasi janji temu"
              page={page}
              totalPages={meta.total_pages}
              onPageChange={setPage}
              buttonClassName={secondaryBtn}
            />
          </div>
        )}
      </div>

      {/* DETAIL MODAL */}
      {previewAppt && (
        <Modal
          title={`Rincian Janji Temu: ${previewAppt.appointment_code}`}
          onClose={() => setPreviewAppt(null)}
        >
          <div className="space-y-4 text-sm text-neutral-700">
            <div className="grid grid-cols-2 gap-4 rounded-xl bg-neutral-50 p-4">
              <div>
                <p className="text-xs text-neutral-500">Nama Pasien</p>
                <p className="font-semibold text-neutral-900">
                  {previewAppt.patient_profiles?.users?.full_name || '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Kontak Pasien</p>
                <p className="font-medium text-neutral-900">
                  {previewAppt.patient_profiles?.users?.phone_number || previewAppt.patient_profiles?.users?.email || '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Dokter</p>
                <p className="font-semibold text-neutral-900">
                  {previewAppt.doctors?.full_name}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Sesi Praktik</p>
                <p className="font-medium text-neutral-900">
                  {formatDate(previewAppt.practice_sessions?.session_date)} (
                  {formatTime(previewAppt.practice_sessions?.start_time)} -{' '}
                  {formatTime(previewAppt.practice_sessions?.end_time)})
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Status Transaksi</p>
                <span
                  className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_META[previewAppt.status]?.className}`}
                >
                  {STATUS_META[previewAppt.status]?.label || previewAppt.status}
                </span>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Nomor Antrean</p>
                <p className="text-base font-bold text-[#1B1B7A]">
                  {previewAppt.queue_number ? `#${previewAppt.queue_number}` : 'Belum Check-In'}
                </p>
              </div>
            </div>

            {/* Bukti Bayar */}
            <div>
              <p className="font-semibold text-neutral-900">Bukti Transfer Pasien</p>
              {previewAppt.payment_proofs && previewAppt.payment_proofs.length > 0 ? (
                <div className="mt-2 overflow-hidden rounded-xl border border-neutral-200">
                  <img
                    src={previewAppt.payment_proofs[0].image_url}
                    alt="Bukti pembayaran"
                    className="max-h-80 w-full object-contain bg-neutral-100"
                  />
                  <div className="p-3 bg-white text-xs text-neutral-500">
                    Diunggah: {formatDate(previewAppt.payment_proofs[0].uploaded_at)}
                  </div>
                </div>
              ) : (
                <p className="mt-1 text-xs text-neutral-500 italic">
                  Belum ada bukti pembayaran yang diunggah.
                </p>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  const target = previewAppt;
                  setPreviewAppt(null);
                  setEditTarget(target);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
              >
                <Pencil className="h-4 w-4" />
                Ubah Janji Temu
              </button>
              <button
                type="button"
                onClick={() => setPreviewAppt(null)}
                className={secondaryBtn}
              >
                Tutup
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* EDIT / RESCHEDULE MODAL */}
      {editTarget && (
        <EditAppointmentModal
          appointment={editTarget}
          doctors={doctorsList}
          onClose={() => setEditTarget(null)}
          onSuccess={(msg) => {
            setActionSuccessMsg(msg);
            setTimeout(() => setActionSuccessMsg(''), 4000);
            refetch();
          }}
        />
      )}

      {/* APPROVE CONFIRMATION MODAL */}
      {approveTarget && (
        <Modal
          title="Konfirmasi Terima Janji Temu"
          onClose={() => setApproveTarget(null)}
        >
          <div className="space-y-4">
            <p className="text-sm text-neutral-600">
              Apakah Anda yakin ingin menyetujui janji temu{' '}
              <strong>{approveTarget.appointment_code}</strong> atas nama{' '}
              <strong>{approveTarget.patient_profiles?.users?.full_name}</strong>?
            </p>
            <p className="text-xs text-neutral-500">
              Setelah disetujui, status transaksi menjadi <strong>done</strong> dan QR Code
              kunjungan akan diterbitkan untuk pasien.
            </p>
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setApproveTarget(null)}
                className={secondaryBtn}
                disabled={isApproving}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={isApproving}
                className="rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                {isApproving ? 'Memproses...' : 'Ya, Setujui Janji'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* REJECT CONFIRMATION MODAL */}
      {rejectTarget && (
        <Modal
          title="Konfirmasi Tolak Janji Temu"
          onClose={() => setRejectTarget(null)}
        >
          <div className="space-y-4">
            <p className="text-sm text-neutral-600">
              Berikan alasan penolakan untuk janji temu{' '}
              <strong>{rejectTarget.appointment_code}</strong>:
            </p>
            <div>
              <label htmlFor="rejectReason" className="block text-xs font-medium text-neutral-700 mb-1">
                Alasan Penolakan
              </label>
              <textarea
                id="rejectReason"
                rows={3}
                placeholder="Contoh: Bukti transfer tidak jelas / nominal tidak sesuai"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className={inputBase}
                required
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className={secondaryBtn}
                disabled={isRejecting}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={isRejecting || !rejectReason.trim()}
                className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isRejecting ? 'Memproses...' : 'Ya, Tolak Janji'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
