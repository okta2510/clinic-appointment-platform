'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Bell,
  Camera,
  CheckCircle2,
  Clock,
  QrCode,
  RefreshCw,
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

  // Live Camera Scanner states
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [supportsBarcodeDetector, setSupportsBarcodeDetector] = useState(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  // Periksa dukungan BarcodeDetector pada browser
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasBD = typeof (window as any).BarcodeDetector !== 'undefined';
      setSupportsBarcodeDetector(hasBD);
    }
  }, []);

  // Cleanup camera stream saat unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const playScanBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {}
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
    setIsCameraStarting(false);
  };

  const startCamera = async (mode: 'environment' | 'user' = 'environment') => {
    setCameraError(null);
    setIsCameraStarting(true);
    setIsCameraOpen(true);

    try {
      // Hentikan stream terdahulu jika sedang berganti kamera
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('Browser ini tidak mendukung akses kamera langsung (getUserMedia).');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsCameraStarting(false);
      startDetectionLoop();
    } catch (err: any) {
      setIsCameraStarting(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Izin akses kamera tidak diberikan. Harap izinkan kamera di setelan browser Anda.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('Kamera tidak ditemukan pada perangkat ini.');
      } else {
        setCameraError(err.message || 'Gagal menyalakan kamera.');
      }
    }
  };

  const startDetectionLoop = () => {
    if (typeof window === 'undefined') return;
    const BarcodeDetectorClass = (window as any).BarcodeDetector;

    if (!BarcodeDetectorClass) {
      // BarcodeDetector belum didukung secara native
      return;
    }

    let detector: any;
    try {
      detector = new BarcodeDetectorClass({
        formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'upc_a'],
      });
    } catch {
      detector = new BarcodeDetectorClass();
    }

    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);

    scanIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;
      try {
        const barcodes = await detector.detect(videoRef.current);
        if (barcodes && barcodes.length > 0) {
          const raw = barcodes[0].rawValue;
          if (raw && raw.trim().length > 0) {
            playScanBeep();
            stopCamera();

            let cleanToken = raw.trim();
            if (cleanToken.includes(':')) {
              const parts = cleanToken.split(':');
              cleanToken = (parts[1] || parts[0]).trim();
            }

            setQrInput(cleanToken);
            setCheckInError(null);
            setCheckInResult(null);

            await doCheckIn(cleanToken);
          }
        }
      } catch {
        // Frame processing drop, lanjutkan ke frame berikutnya
      }
    }, 300);
  };

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrInput.trim()) return;
    setCheckInError(null);
    setCheckInResult(null);
    try {
      let clean = qrInput.trim();
      if (clean.includes(':')) {
        const parts = clean.split(':');
        clean = (parts[1] || parts[0]).trim();
      }
      await doCheckIn(clean);
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
            Pindai QR code atau barcode tiket pasien saat tiba di klinik, kelola antrean langsung, dan panggil pasien.
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
              <p className="text-xs text-neutral-500">Scan dengan kamera atau masukkan kode reservasi</p>
            </div>
          </div>

          <form onSubmit={handleScanSubmit} className="mt-5 space-y-3">
            <div>
              <label htmlFor="qrInput" className="block text-xs font-semibold uppercase text-neutral-500 mb-1">
                Token QR Code / UUID / Kode Janji
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

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => startCamera(facingMode)}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 px-4 py-2.5 text-xs font-bold text-white shadow transition hover:from-emerald-700 hover:to-teal-800 active:scale-95"
              >
                <Camera className="h-4 w-4" />
                <span>Pindai Kamera Langsung</span>
              </button>

              <button
                type="submit"
                disabled={isCheckingIn || !qrInput.trim()}
                className={`flex-1 ${primaryBtn}`}
              >
                {isCheckingIn ? 'Memproses...' : 'Check-In'}
              </button>

              <button
                type="button"
                onClick={fillSampleToken}
                className="rounded-xl border border-neutral-300 bg-neutral-100 px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-200"
                title="Gunakan token QR sample demo untuk menguji"
              >
                Demo
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
                  <p className="mt-2 text-6xl font-black tracking-tight">
                    {currentSession.current_queue_number ? (
                      `#${currentSession.current_queue_number}`
                    ) : (
                      <span className="text-3xl font-bold opacity-60">Belum Ada</span>
                    )}
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-white/80">
                    <Clock className="h-3.5 w-3.5" />
                    <span>
                      Sesi: {formatTime(currentSession.start_time)}–{formatTime(currentSession.end_time)} WIB
                    </span>
                  </div>
                </div>

                {/* DOCTOR & STATS */}
                <div className="flex flex-col justify-between rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-[#1B1B7A]">
                      <Stethoscope className="h-4 w-4" />
                      <span>{currentSession.doctor_name}</span>
                    </div>
                    <p className="mt-1 text-xs text-neutral-500">
                      Spesialisasi Kulit & Estetika
                    </p>

                    <div className="mt-4 grid grid-cols-3 gap-2 border-t border-neutral-200 pt-3 text-center">
                      <div>
                        <p className="text-[10px] uppercase text-neutral-500 font-semibold">Total Sesi</p>
                        <p className="text-sm font-bold text-neutral-800">{currentSession.total_booked || 0}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-neutral-500 font-semibold">Check-In</p>
                        <p className="text-sm font-bold text-green-700">{currentSession.total_checked_in || 0}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-neutral-500 font-semibold">Sisa</p>
                        <p className="text-sm font-bold text-neutral-600">
                          {Math.max(0, (currentSession.total_checked_in || 0) - (currentSession.current_queue_number || 0))}
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCallNextModalOpen(true)}
                    disabled={isCallingNext}
                    className="mt-4 w-full rounded-xl bg-gradient-to-r from-[#1B1B7A] to-[#2E2E99] py-3 text-xs font-bold text-white shadow transition hover:opacity-95 disabled:opacity-50"
                  >
                    {isCallingNext ? 'Memanggil...' : 'Panggil Antrean Berikutnya'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-8 rounded-2xl border border-dashed border-neutral-300 p-8 text-center">
                <Users className="mx-auto h-8 w-8 text-neutral-400" />
                <p className="mt-2 text-sm font-semibold text-neutral-700">Tidak ada sesi praktik aktif saat ini</p>
                <p className="text-xs text-neutral-500">
                  Jadwal dokter hari ini belum dimulai atau belum ada janji temu yang terdaftar.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* SESSION APPOINTMENTS LIST */}
      <section
        aria-labelledby="appointments-list-heading"
        className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1B1B7A]/10 text-[#1B1B7A]">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 id="appointments-list-heading" className="text-base font-bold text-[#1B1B7A]">
                Daftar Pasien Sesi Ini
              </h2>
              <p className="text-xs text-neutral-500">
                Status check-in, nomor antrean, dan kehadiran pasien
              </p>
            </div>
          </div>
        </div>

        {sessionAppointments.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-neutral-200 p-8 text-center text-sm text-neutral-500">
            Belum ada data reservasi pada sesi ini.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm text-neutral-700">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs font-bold uppercase text-neutral-600">
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

      {/* CAMERA SCANNER MODAL */}
      {isCameraOpen && (
        <Modal
          onClose={stopCamera}
          title="Pemindai Kamera Barcode & QR Pasien"
          titleId="camera-scanner-modal"
        >
          <div className="space-y-4">
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-neutral-900 flex items-center justify-center">
              {/* Live Video Element */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
              />

              {/* Viewfinder Target Reticle */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative h-44 w-44 rounded-2xl border-2 border-emerald-400/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                  {/* Pojok-pojok bingkai */}
                  <div className="absolute -top-1 -left-1 h-5 w-5 border-t-4 border-l-4 border-emerald-400 rounded-tl" />
                  <div className="absolute -top-1 -right-1 h-5 w-5 border-t-4 border-r-4 border-emerald-400 rounded-tr" />
                  <div className="absolute -bottom-1 -left-1 h-5 w-5 border-b-4 border-l-4 border-emerald-400 rounded-bl" />
                  <div className="absolute -bottom-1 -right-1 h-5 w-5 border-b-4 border-r-4 border-emerald-400 rounded-br" />

                  {/* Garis laser animasi pemindai */}
                  <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-emerald-300 shadow-[0_0_12px_#34d399] animate-pulse" />
                </div>
              </div>

              {isCameraStarting && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white gap-2">
                  <RefreshCw className="h-6 w-6 animate-spin text-emerald-400" />
                  <span className="text-xs font-semibold">Menghubungkan ke kamera...</span>
                </div>
              )}
            </div>

            {cameraError && (
              <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-xs text-red-900">
                <p className="font-semibold">Kendala Akses Kamera:</p>
                <p className="mt-1">{cameraError}</p>
              </div>
            )}

            {!supportsBarcodeDetector && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                Browser ini belum mengaktifkan BarcodeDetector otomatis. Anda dapat memasukkan kode janji atau token QR langsung pada formulir.
              </div>
            )}

            <p className="text-center text-xs text-neutral-500">
              Arahkan kamera ke QR code pada layar smartphone pasien atau barcode tiket janji temu. Pemindai akan berbunyi dan memproses check-in seketika saat terdeteksi.
            </p>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  const nextMode = facingMode === 'environment' ? 'user' : 'environment';
                  setFacingMode(nextMode);
                  startCamera(nextMode);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Ganti Kamera ({facingMode === 'environment' ? 'Kamera Belakang' : 'Kamera Depan'})</span>
              </button>

              <button
                type="button"
                onClick={stopCamera}
                className={secondaryBtn}
              >
                Tutup Pemindai
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* CALL NEXT CONFIRMATION MODAL */}
      {callNextModalOpen && currentSession && (
        <Modal
          onClose={() => setCallNextModalOpen(false)}
          title="Panggil Pasien Selanjutnya"
          titleId="call-next-modal"
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
          titleId="no-show-modal"
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
