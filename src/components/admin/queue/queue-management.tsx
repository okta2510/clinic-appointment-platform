'use client';

import { useState } from 'react';
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Clock,
  QrCode,
  Search,
  Stethoscope,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';
import {
  useCallNext,
  useCheckIn,
  useGetAdminAppointments,
  useGetLiveQueue,
  useMarkNoShow,
} from '@/hooks/api/use-admin-appointments';
import Modal from '@/components/ui/modal';
import { formatTime } from '@/lib/format';
import { inputBase, primaryBtn, secondaryBtn } from '@/components/admin/styles';

export default function QueueManagement() {
  const [qrInput, setQrInput] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [checkInResult, setCheckInResult] = useState<any | null>(null);
  const [checkInError, setCheckInError] = useState<string | null>(null);

  // Modal confirmations
  const [callNextModalOpen, setCallNextModalOpen] = useState(false);
  const [noShowTarget, setNoShowTarget] = useState<any | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Live queues query
  const { data: liveSessions = [], isLoading: isSessionsLoading, refetch: refetchQueue } =
    useGetLiveQueue();

  // Set default selected session once loaded
  const activeSessionId = selectedSessionId || (liveSessions[0]?.session_id ?? null);
  const currentSession = liveSessions.find((s: any) => s.session_id === activeSessionId) || liveSessions[0];

  // Fetch session appointments for detailed list
  const { data: sessionApptsData, refetch: refetchAppts } = useGetAdminAppointments({
    session_id: activeSessionId || undefined,
    limit: 50,
  });
  const sessionAppointments = sessionApptsData?.data ?? [];

  // Mutations
  const { mutateAsync: doCheckIn, isPending: isCheckingIn } = useCheckIn({
    onSuccess: (data) => {
      setCheckInResult(data);
      setCheckInError(null);
      setQrInput('');
      refetchQueue();
      refetchAppts();
    },
    onError: (err: any) => {
      setCheckInError(err?.message || 'Gagal memproses check-in. Pastikan QR valid dan tanggal sesuai.');
      setCheckInResult(null);
    },
  });

  const { mutateAsync: doCallNext, isPending: isCallingNext } = useCallNext({
    onSuccess: (response) => {
      setCallNextModalOpen(false);
      setActionNotice(`Berhasil memanggil antrean nomor #${response?.data?.current_queue_number ?? ''}`);
      setTimeout(() => setActionNotice(null), 4000);
      refetchQueue();
      refetchAppts();
    },
    onError: (err: any) => {
      alert(err?.message || 'Gagal memanggil pasien berikutnya');
    },
  });

  const { mutateAsync: doMarkNoShow, isPending: isMarkingNoShow } = useMarkNoShow({
    onSuccess: () => {
      setNoShowTarget(null);
      setActionNotice('Pasien berhasil ditandai Tidak Hadir (No-Show).');
      setTimeout(() => setActionNotice(null), 4000);
      refetchQueue();
      refetchAppts();
    },
    onError: (err: any) => {
      alert(err?.message || 'Gagal menandai no-show');
    },
  });

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrInput.trim()) return;
    setCheckInError(null);
    setCheckInResult(null);
    try {
      await doCheckIn(qrInput.trim());
    } catch {
      // handled in onError
    }
  };

  const fillSampleToken = () => {
    setQrInput('99999999-0000-0000-0000-000000000003');
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1B1B7A] md:text-3xl">
            Manajemen Antrean & QR Check-In
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Pindai QR code pasien saat tiba di klinik, kelola antrean langsung, dan panggil pasien.
          </p>
        </div>
      </div>

      {actionNotice && (
        <div
          role="status"
          className="rounded-xl border border-green-300 bg-green-50 p-4 text-sm font-semibold text-green-900"
        >
          {actionNotice}
        </div>
      )}

      {/* TOP SECTION: SCANNER & ACTIVE SESSIONS */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* CHECK-IN SCANNER BOX */}
        <section
          aria-labelledby="scanner-heading"
          className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm lg:col-span-5"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1B1B7A]/10 text-[#1B1B7A]">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h2 id="scanner-heading" className="text-base font-bold text-[#1B1B7A]">
                Check-In Pasien di Tempat
              </h2>
              <p className="text-xs text-neutral-500">Scan QR atau masukkan token reservasi</p>
            </div>
          </div>

          <form onSubmit={handleScanSubmit} className="mt-5 space-y-3">
            <div>
              <label htmlFor="qrInput" className="block text-xs font-semibold uppercase text-neutral-500 mb-1">
                Token QR Code / UUID
              </label>
              <input
                id="qrInput"
                type="text"
                placeholder="Contoh: 99999999-0000-0000-0000-000000000003"
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                className={inputBase}
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={isCheckingIn || !qrInput.trim()}
                className={`flex-1 ${primaryBtn}`}
              >
                {isCheckingIn ? 'Memproses...' : 'Check-In Sekarang'}
              </button>
              <button
                type="button"
                onClick={fillSampleToken}
                className="rounded-xl border border-neutral-300 bg-neutral-100 px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-200"
                title="Gunakan token QR sample demo untuk menguji"
              >
                Demo Token
              </button>
            </div>
          </form>

          {/* CHECK-IN RESULT OR ERROR */}
          {checkInResult && (
            <div className="mt-4 rounded-xl border border-green-300 bg-green-50 p-4 text-green-900">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600 shrink-0" />
                <div>
                  <h3 className="font-bold text-sm">Check-In Berhasil!</h3>
                  <p className="mt-1 text-xs">
                    Pasien telah terverifikasi hadir di klinik untuk sesi hari ini.
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <span className="text-xs text-green-800">Nomor Antrean Diterbitkan:</span>
                    <span className="rounded-lg bg-green-700 px-3 py-1 text-lg font-extrabold text-white">
                      #{checkInResult.queue_number}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {checkInError && (
            <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-4 text-red-900">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="mt-0.5 h-5 w-5 text-red-600 shrink-0" />
                <div>
                  <h3 className="font-bold text-sm">Check-In Gagal</h3>
                  <p className="mt-1 text-xs">{checkInError}</p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ACTIVE DOCTOR QUEUE CONTROLLER */}
        <section
          aria-labelledby="queue-control-heading"
          className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm lg:col-span-7 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F29A9A]/20 text-[#1B1B7A]">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <h2 id="queue-control-heading" className="text-base font-bold text-[#1B1B7A]">
                    Pengendali Antrean Sesi
                  </h2>
                  <p className="text-xs text-neutral-500">Panggil giliran pasien dan pantau nomor aktif</p>
                </div>
              </div>

              {/* Session Selector */}
              {liveSessions.length > 1 && (
                <select
                  value={activeSessionId || ''}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  className="rounded-xl border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-800"
                >
                  {liveSessions.map((s: any) => (
                    <option key={s.session_id} value={s.session_id}>
                      {s.doctor_name} ({formatTime(s.start_time)})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {currentSession ? (
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* BIG CALL DISPLAY */}
                <div className="rounded-2xl bg-gradient-to-br from-[#1B1B7A] to-[#2E2E99] p-6 text-white text-center shadow-inner">
                  <p className="text-xs uppercase tracking-wider text-white/80 font-semibold">
                    Sedang Dilayani
                  </p>
                  <div className="mt-2 text-6xl font-black tracking-tight text-white">
                    {currentSession.current_queue_number > 0
                      ? `#${currentSession.current_queue_number}`
                      : '-'}
                  </div>
                  <p className="mt-2 text-xs text-white/80">
                    {currentSession.doctor_name}
                  </p>
                  <p className="text-[11px] text-[#F29A9A]">
                    {currentSession.specialist_name}
                  </p>
                </div>

                {/* NEXT PATIENTS & CALL BUTTON */}
                <div className="flex flex-col justify-between rounded-2xl bg-neutral-50 border border-neutral-200 p-5">
                  <div>
                    <p className="text-xs font-semibold text-neutral-500 uppercase">
                      Nomor Berikutnya
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {currentSession.next_numbers && currentSession.next_numbers.length > 0 ? (
                        currentSession.next_numbers.map((num: number) => (
                          <span
                            key={num}
                            className="inline-flex items-center justify-center rounded-xl bg-white border border-neutral-300 px-3 py-1.5 text-sm font-bold text-neutral-800 shadow-sm"
                          >
                            #{num}
                          </span>
                        ))
                      ) : (
                        <p className="text-xs text-neutral-400 italic">
                          Tidak ada antrean berikutnya yang sudah check-in.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => setCallNextModalOpen(true)}
                      className={`w-full ${primaryBtn} flex items-center justify-center gap-2`}
                    >
                      <Bell className="h-4 w-4" />
                      Panggil Pasien Selanjutnya
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-8 text-center text-neutral-500">
                <Clock className="mx-auto h-10 w-10 text-neutral-300" />
                <p className="mt-2 text-sm">Tidak ada sesi praktik yang sedang berlangsung hari ini.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* APPOINTMENTS FOR CURRENT SESSION TABLE */}
      <section
        aria-labelledby="session-list-heading"
        className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden"
      >
        <div className="border-b border-neutral-200 px-5 py-4 flex items-center justify-between">
          <div>
            <h2 id="session-list-heading" className="text-base font-bold text-[#1B1B7A]">
              Daftar Pasien Sesi Ini
            </h2>
            <p className="text-xs text-neutral-500">
              Pantau status check-in dan kelola kehadiran pasien di sesi dokter yang aktif.
            </p>
          </div>
          <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
            Total {sessionAppointments.length} Pasien Terdaftar
          </span>
        </div>

        {sessionAppointments.length === 0 ? (
          <div className="p-10 text-center text-neutral-500">
            <Users className="mx-auto h-10 w-10 text-neutral-300" />
            <p className="mt-2 text-sm">Belum ada pasien terdaftar untuk sesi ini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-neutral-700">
              <thead className="bg-neutral-50 text-xs font-semibold uppercase text-neutral-600 border-b border-neutral-200">
                <tr>
                  <th scope="col" className="px-5 py-3">No. Booking</th>
                  <th scope="col" className="px-5 py-3">Nama Pasien</th>
                  <th scope="col" className="px-5 py-3">Status Reservasi</th>
                  <th scope="col" className="px-5 py-3">Check-In</th>
                  <th scope="col" className="px-5 py-3">No. Antrean</th>
                  <th scope="col" className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {sessionAppointments.map((appt: any) => {
                  const isCheckedIn = Boolean(appt.checked_in_at || appt.queue_number);
                  const isNoShow = Boolean(appt.is_no_show);

                  return (
                    <tr key={appt.id} className="hover:bg-neutral-50/70">
                      <td className="px-5 py-3.5 font-semibold text-[#1B1B7A]">
                        {appt.appointment_code}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-neutral-900">
                        {appt.patient_profiles?.users?.full_name || 'Pasien'}
                        <div className="text-xs text-neutral-500 font-normal">
                          {appt.patient_profiles?.users?.phone_number || '-'}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-800 capitalize">
                          {appt.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {isCheckedIn ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                            <UserCheck className="h-3.5 w-3.5" /> Sudah Datang
                          </span>
                        ) : isNoShow ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                            <UserX className="h-3.5 w-3.5" /> No-Show
                          </span>
                        ) : (
                          <span className="text-xs text-neutral-400">Belum Datang</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {appt.queue_number ? (
                          <span className="inline-flex items-center justify-center rounded-lg bg-[#1B1B7A]/10 px-2.5 py-1 text-sm font-extrabold text-[#1B1B7A]">
                            #{appt.queue_number}
                          </span>
                        ) : (
                          <span className="text-xs text-neutral-400">-</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {!isCheckedIn && !isNoShow && (
                          <button
                            type="button"
                            onClick={() => setNoShowTarget(appt)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                          >
                            <UserX className="h-3.5 w-3.5" />
                            Tandai No-Show
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* CALL NEXT CONFIRMATION MODAL */}
      {callNextModalOpen && currentSession && (
        <Modal
          onClose={() => setCallNextModalOpen(false)}
          title="Panggil Pasien Selanjutnya"
        >
          <div className="space-y-4">
            <p className="text-sm text-neutral-600">
              Apakah Anda ingin memanggil pasien dengan nomor antrean berikutnya untuk dokter{' '}
              <strong>{currentSession.doctor_name}</strong>?
            </p>
            <p className="text-xs text-neutral-500">
              Nomor antrean yang sedang dilayani akan bertambah dan display publik live queue akan
              otomatis terbarui.
            </p>
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setCallNextModalOpen(false)}
                className={secondaryBtn}
                disabled={isCallingNext}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => doCallNext(currentSession.session_id)}
                disabled={isCallingNext}
                className="rounded-xl bg-[#1B1B7A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2E2E99] disabled:opacity-50"
              >
                {isCallingNext ? 'Memanggil...' : 'Ya, Panggil Pasien'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* NO SHOW CONFIRMATION MODAL */}
      {noShowTarget && (
        <Modal
          onClose={() => setNoShowTarget(null)}
          title="Tandai Pasien Tidak Hadir (No-Show)"
        >
          <div className="space-y-4">
            <p className="text-sm text-neutral-600">
              Apakah Anda yakin pasien{' '}
              <strong>{noShowTarget.patient_profiles?.users?.full_name}</strong> (
              {noShowTarget.appointment_code}) tidak hadir pada sesi ini?
            </p>
            <p className="text-xs text-neutral-500">
              Pasien yang ditandai No-Show tidak akan dipanggil dalam antrean dan kuota dapat
              disesuaikan.
            </p>
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setNoShowTarget(null)}
                className={secondaryBtn}
                disabled={isMarkingNoShow}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => doMarkNoShow(noShowTarget.id)}
                disabled={isMarkingNoShow}
                className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isMarkingNoShow ? 'Memproses...' : 'Ya, Tandai No-Show'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
