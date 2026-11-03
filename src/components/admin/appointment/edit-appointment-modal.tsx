'use client';

import { useMemo, useState } from 'react';
import Modal from '@/components/ui/modal';
import { inputBase, primaryBtn, secondaryBtn } from '@/components/admin/styles';
import { STATUS_META } from '@/constants/transaction-status';
import { DAYS, formatPracticeDays } from '@/lib/schedule';
import { useAdminUpdateAppointment } from '@/hooks/api/use-admin-appointments';
import type { TAdminAppointment, TTransactionStatus } from '@/types/appointment';
import type { TDoctor } from '@/types/doctor';

type Props = {
  appointment: TAdminAppointment;
  doctors: TDoctor[];
  onClose: () => void;
  onSuccess: (message: string) => void;
};

export default function EditAppointmentModal({
  appointment,
  doctors,
  onClose,
  onSuccess,
}: Props) {
  const [status, setStatus] = useState<TTransactionStatus>(appointment.status);
  const [doctorId, setDoctorId] = useState(appointment.doctors?.id || '');
  const [sessionDate, setSessionDate] = useState(() => {
    const raw = appointment.practice_sessions?.session_date;
    return raw ? raw.slice(0, 10) : new Date().toISOString().slice(0, 10);
  });
  const [startTime, setStartTime] = useState(() => {
    return (appointment.practice_sessions?.start_time || '08:00').slice(0, 5);
  });
  const [notes, setNotes] = useState(appointment.payment_proofs?.[0]?.rejection_reason || '');
  const [errorMsg, setErrorMsg] = useState('');

  const selectedDoctor = useMemo(
    () => doctors.find((d) => d.id === doctorId),
    [doctors, doctorId],
  );

  // Jadwal dokter terpilih
  const doctorSchedules = selectedDoctor?.doctor_schedules ?? [];
  const practiceDaysText = formatPracticeDays(doctorSchedules);

  // Cari hari dari tanggal terpilih (0-6)
  const currentDow = useMemo(() => {
    if (!sessionDate) return -1;
    const [y, m, d] = sessionDate.split('-').map(Number);
    return new Date(y, m - 1, d).getDay();
  }, [sessionDate]);

  // Slot dokter di hari tersebut
  const availableSlotsOnDate = useMemo(() => {
    if (currentDow < 0) return [];
    return doctorSchedules.filter((s) => s.day_of_week === currentDow);
  }, [doctorSchedules, currentDow]);

  const { mutateAsync: updateAppt, isPending } = useAdminUpdateAppointment({
    onSuccess: () => {
      onSuccess(`Janji temu ${appointment.appointment_code} berhasil diperbarui.`);
      onClose();
    },
    onError: (err: any) => {
      setErrorMsg(err?.message || 'Gagal mengubah janji temu');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!doctorId) {
      setErrorMsg('Pilih dokter terlebih dahulu.');
      return;
    }
    if (!sessionDate) {
      setErrorMsg('Tentukan tanggal janji temu.');
      return;
    }

    try {
      await updateAppt({
        id: appointment.id,
        doctor_id: doctorId,
        session_date: sessionDate,
        start_time: startTime,
        status,
        notes: notes.trim() || undefined,
      });
    } catch {
      // handled by onError
    }
  };

  return (
    <Modal
      title={`Koreksi Janji Temu ${appointment.appointment_code}`}
      titleId="edit-appointment-title"
      onClose={onClose}
      locked={isPending}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        {errorMsg && (
          <div
            role="alert"
            className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-900"
          >
            {errorMsg}
          </div>
        )}

        {/* Info Pasien */}
        <div className="rounded-xl bg-neutral-50 p-3 text-xs text-neutral-600">
          <p className="font-semibold text-neutral-800">
            Pasien: {appointment.patient_profiles?.users?.full_name || 'Pasien'}
          </p>
          <p>{appointment.patient_profiles?.users?.phone_number || appointment.patient_profiles?.users?.email}</p>
        </div>

        {/* Koreksi Status */}
        <div>
          <label htmlFor="edit-status" className="block text-sm font-semibold text-neutral-800">
            Status Janji Temu
          </label>
          <select
            id="edit-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as TTransactionStatus)}
            className={`mt-1.5 ${inputBase}`}
          >
            {Object.entries(STATUS_META).map(([key, meta]) => (
              <option key={key} value={key}>
                {meta.label} ({key})
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-neutral-500">
            Ubah status jika ada kesalahan klik atau konfirmasi manual.
          </p>
        </div>

        {/* Pindah Dokter */}
        <div>
          <label htmlFor="edit-doctor" className="block text-sm font-semibold text-neutral-800">
            Dokter yang Bertugas
          </label>
          <select
            id="edit-doctor"
            value={doctorId}
            onChange={(e) => {
              setDoctorId(e.target.value);
            }}
            className={`mt-1.5 ${inputBase}`}
          >
            {doctors.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.full_name} {doc.specialists ? `(${doc.specialists.name})` : ''}
              </option>
            ))}
          </select>
          {practiceDaysText && (
            <p className="mt-1 text-xs text-neutral-500">
              Hari praktik: <span className="font-medium text-[#1B1B7A]">{practiceDaysText}</span>
            </p>
          )}
        </div>

        {/* Tanggal Janji */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="edit-date" className="block text-sm font-semibold text-neutral-800">
              Tanggal Praktik
            </label>
            <input
              id="edit-date"
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              className={`mt-1.5 ${inputBase}`}
            />
            {currentDow >= 0 && (
              <p className="mt-1 text-xs text-neutral-500">
                Hari: <span className="font-semibold">{DAYS[currentDow]}</span>
              </p>
            )}
          </div>

          {/* Jam Sesi */}
          <div>
            <label htmlFor="edit-time" className="block text-sm font-semibold text-neutral-800">
              Jam Praktik
            </label>
            {availableSlotsOnDate.length > 0 ? (
              <select
                id="edit-time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className={`mt-1.5 ${inputBase}`}
              >
                {availableSlotsOnDate.map((s) => (
                  <option key={s.id} value={s.start_time.slice(0, 5)}>
                    {s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)} WIB (Kuota {s.patient_quota})
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="edit-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className={`mt-1.5 ${inputBase}`}
              />
            )}
            {availableSlotsOnDate.length === 0 && selectedDoctor && (
              <p className="mt-1 text-xs text-amber-700">
                Dokter tidak ada jadwal rutin di hari {currentDow >= 0 ? DAYS[currentDow] : ''}, namun jam dapat ditentukan manual.
              </p>
            )}
          </div>
        </div>

        {/* Catatan / Keterangan Perubahan */}
        <div>
          <label htmlFor="edit-notes" className="block text-sm font-semibold text-neutral-800">
            Catatan Perubahan / Alasan Koreksi
          </label>
          <textarea
            id="edit-notes"
            rows={2}
            placeholder="Contoh: Koreksi status salah klik / Pasien meminta reschedule jadwal ke esok hari"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={`mt-1.5 ${inputBase}`}
          />
        </div>

        <div className="mt-6 flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className={secondaryBtn}
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isPending}
            className={primaryBtn}
          >
            {isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
