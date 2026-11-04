'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  CheckCheck,
  ExternalLink,
  Info,
  QrCode,
  RefreshCw,
  X,
} from 'lucide-react';
import Modal from '@/components/ui/modal';
import { useCheckIn } from '@/hooks/api/use-admin-appointments';
import { useMe } from '@/hooks/api/use-auth';
import { inputBase, primaryBtn, secondaryBtn } from '@/components/admin/styles';

export default function AdminFloatingScanner() {
  const { data: me, isPending: isLoadingMe } = useMe();
  const isAdmin = me?.role === 'ADMIN';

  const [isOpen, setIsOpen] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [checkInResult, setCheckInResult] = useState<any | null>(null);
  const [checkInError, setCheckInError] = useState<string | null>(null);

  // Live Camera states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [supportsBarcodeDetector, setSupportsBarcodeDetector] = useState(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { mutateAsync: doCheckIn, isPending: isCheckingIn } = useCheckIn({
    onSuccess: (data) => {
      setCheckInResult(data);
      setCheckInError(null);
      setManualToken('');
    },
    onError: (err: any) => {
      setCheckInError(
        err?.message || 'Gagal memproses check-in. Pastikan QR valid dan tanggal sesuai sesi hari ini.',
      );
      setCheckInResult(null);
    },
  });

  // Cek dukungan BarcodeDetector
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasBD = typeof (window as any).BarcodeDetector !== 'undefined';
      setSupportsBarcodeDetector(hasBD);
    }
  }, []);

  // Cleanup saat unmount atau modal tertutup
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
    }
  }, [isOpen]);

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
    setIsCameraActive(false);
    setIsCameraStarting(false);
  };

  const startCamera = async (mode: 'environment' | 'user' = 'environment') => {
    setCameraError(null);
    setIsCameraStarting(true);
    setIsCameraActive(true);

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('Browser tidak mendukung akses kamera langsung.');
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
        setCameraError('Izin akses kamera ditolak. Harap izinkan penggunaan kamera pada peramban Anda.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('Perangkat kamera tidak ditemukan.');
      } else {
        setCameraError(err.message || 'Gagal menyalakan kamera.');
      }
    }
  };

  const startDetectionLoop = () => {
    if (typeof window === 'undefined') return;
    const BarcodeDetectorClass = (window as any).BarcodeDetector;
    if (!BarcodeDetectorClass) return;

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

            setManualToken(cleanToken);
            setCheckInError(null);
            setCheckInResult(null);

            await doCheckIn(cleanToken);
          }
        }
      } catch {
        // frame drop, continue loop
      }
    }, 300);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    setCheckInError(null);
    setCheckInResult(null);
    try {
      let clean = manualToken.trim();
      if (clean.includes(':')) {
        const parts = clean.split(':');
        clean = (parts[1] || parts[0]).trim();
      }
      await doCheckIn(clean);
    } catch {
      // handled in onError
    }
  };

  const handleOpenModal = () => {
    setIsOpen(true);
    setCheckInResult(null);
    setCheckInError(null);
    // Buka kamera otomatis saat modal dibuka untuk efisiensi waktu resepsionis
    setTimeout(() => {
      startCamera(facingMode);
    }, 150);
  };

  const handleCloseModal = () => {
    stopCamera();
    setIsOpen(false);
  };

  // Jangan render tombol jika belum login atau bukan admin
  if (isLoadingMe || !isAdmin) {
    return null;
  }

  return (
    <>
      {/* FLOATING ACTION BUTTON DI POJOK KANAN BAWAH */}
      <aside aria-label="Akses Cepat Admin" className="fixed bottom-6 right-6 z-50">
        <button
          type="button"
          onClick={handleOpenModal}
          className="group relative flex items-center gap-3 rounded-full bg-gradient-to-r from-[#1B1B7A] via-[#2A2A9A] to-[#1B1B7A] p-3.5 sm:px-5 sm:py-3.5 text-white shadow-2xl ring-4 ring-white/80 transition-all duration-300 hover:scale-105 hover:shadow-indigo-900/40 active:scale-95"
          title="Scan QR Antrean Pasien (Admin Quick Access)"
        >
          {/* Badge Indikator Admin */}
          <span className="absolute -top-2 -left-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow">
            Admin
          </span>

          <div className="relative flex h-6 w-6 items-center justify-center">
            <QrCode className="h-6 w-6 transition-transform group-hover:rotate-12" />
            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
          </div>

          <div className="hidden text-left sm:block">
            <p className="text-xs font-bold leading-tight tracking-wide">
              Scan Antrean
            </p>
            <p className="text-[10px] font-medium text-emerald-300 leading-none">
              Check-In Pasien
            </p>
          </div>
        </button>
      </aside>

      {/* MODAL SCANNER ADMIN */}
      {isOpen && (
        <Modal
          onClose={handleCloseModal}
          title="Scan Check-In Antrean Pasien"
          titleId="admin-floating-scanner-title"
        >
          <div className="space-y-4">
            {/* Live Camera Viewport */}
            {isCameraActive ? (
              <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-neutral-900 flex items-center justify-center shadow-inner">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                />

                {/* Reticle Viewfinder Target */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="relative h-44 w-44 rounded-2xl border-2 border-emerald-400/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
                    <div className="absolute -top-1 -left-1 h-5 w-5 border-t-4 border-l-4 border-emerald-400 rounded-tl" />
                    <div className="absolute -top-1 -right-1 h-5 w-5 border-t-4 border-r-4 border-emerald-400 rounded-tr" />
                    <div className="absolute -bottom-1 -left-1 h-5 w-5 border-b-4 border-l-4 border-emerald-400 rounded-bl" />
                    <div className="absolute -bottom-1 -right-1 h-5 w-5 border-b-4 border-r-4 border-emerald-400 rounded-br" />
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
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50 p-6 text-center">
                <Camera className="h-10 w-10 text-neutral-400" />
                <p className="mt-2 text-sm font-semibold text-neutral-800">
                  Kamera Sedang Nonaktif
                </p>
                <p className="mt-1 text-xs text-neutral-500 max-w-xs">
                  Nyalakan kamera untuk memindai kode QR dari layar ponsel pasien secara otomatis.
                </p>
                <button
                  type="button"
                  onClick={() => startCamera(facingMode)}
                  className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#1B1B7A] px-4 py-2 text-xs font-bold text-white shadow hover:bg-[#2E2E99]"
                >
                  <Camera className="h-4 w-4" />
                  <span>Aktifkan Kamera Pemindai</span>
                </button>
              </div>
            )}

            {/* Error Kamera */}
            {cameraError && (
              <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-xs text-red-900">
                <p className="font-semibold">Kendala Akses Kamera:</p>
                <p className="mt-1">{cameraError}</p>
              </div>
            )}

            {/* Kontrol Kamera */}
            {isCameraActive && (
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    const next = facingMode === 'environment' ? 'user' : 'environment';
                    setFacingMode(next);
                    startCamera(next);
                  }}
                  className="inline-flex items-center gap-1.5 font-semibold text-[#1B1B7A] hover:underline"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Ganti Kamera ({facingMode === 'environment' ? 'Kamera Belakang' : 'Kamera Depan'})
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="font-medium text-neutral-500 hover:text-neutral-700"
                >
                  Matikan Kamera
                </button>
              </div>
            )}

            {/* HASIL CHECK-IN BERHASIL / MULTI-STATUS */}
            {checkInResult && (
              <div
                className={`rounded-2xl border p-4 shadow-sm ${
                  checkInResult.data?.is_completed || checkInResult.is_completed
                    ? 'border-purple-300 bg-purple-50 text-purple-950'
                    : checkInResult.data?.already_checked_in || checkInResult.already_checked_in
                    ? 'border-amber-300 bg-amber-50 text-amber-950'
                    : 'border-green-300 bg-green-50 text-green-900'
                }`}
              >
                <div className="flex items-start gap-3">
                  {checkInResult.data?.is_completed || checkInResult.is_completed ? (
                    <CheckCheck className="mt-0.5 h-6 w-6 text-purple-700 shrink-0" />
                  ) : checkInResult.data?.already_checked_in || checkInResult.already_checked_in ? (
                    <Info className="mt-0.5 h-6 w-6 text-amber-700 shrink-0" />
                  ) : (
                    <CheckCircle2 className="mt-0.5 h-6 w-6 text-green-600 shrink-0" />
                  )}
                  <div className="flex-1">
                    <h3 className="font-bold text-base">
                      {checkInResult.data?.is_completed || checkInResult.is_completed
                        ? 'Pemeriksaan Pasien Sudah Selesai'
                        : checkInResult.data?.already_checked_in || checkInResult.already_checked_in
                        ? 'Pasien Sudah Terdaftar Antrean Sebelumnya'
                        : 'Check-In Pasien Berhasil!'}
                    </h3>
                    <p className="mt-0.5 text-xs">
                      {checkInResult.data?.message ||
                        checkInResult.message ||
                        'Pasien telah diverifikasi hadir dan resmi terdaftar dalam antrean aktif.'}
                    </p>
                    {(checkInResult.data?.patient_name || checkInResult.patient_name) && (
                      <p className="mt-1 text-xs font-semibold">
                        Pasien: {checkInResult.data?.patient_name || checkInResult.patient_name} (
                        {checkInResult.data?.appointment_code || checkInResult.appointment_code})
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-3">
                      <span className="text-xs font-medium">Nomor Antrean:</span>
                      <span
                        className={`rounded-xl px-4 py-1.5 text-xl font-black text-white shadow ${
                          checkInResult.data?.is_completed || checkInResult.is_completed
                            ? 'bg-purple-800'
                            : checkInResult.data?.already_checked_in || checkInResult.already_checked_in
                            ? 'bg-amber-700'
                            : 'bg-green-700'
                        }`}
                      >
                        #{checkInResult.data?.queue_number || checkInResult.queue_number}
                      </span>
                      {(checkInResult.data?.already_checked_in || checkInResult.already_checked_in) && (
                        <span className="rounded-md bg-amber-200/80 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                          Tidak Diduplikasi
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ERROR CHECK-IN */}
            {checkInError && (
              <div className="rounded-xl border border-red-300 bg-red-50 p-3.5 text-red-900">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="mt-0.5 h-5 w-5 text-red-600 shrink-0" />
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-red-950">
                      Check-In Gagal
                    </h4>
                    <p className="mt-0.5 text-xs">{checkInError}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Form Input Manual Alternatif */}
            <form onSubmit={handleManualSubmit} className="border-t border-neutral-200 pt-3">
              <label htmlFor="adminFloatingManualInput" className="block text-xs font-semibold text-neutral-700 mb-1">
                Atau Masukkan Token QR / Kode Reservasi Manual
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="adminFloatingManualInput"
                  type="text"
                  placeholder="Contoh: 99999999-0000-0000-0000-000000000003"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  className={`flex-1 ${inputBase}`}
                />
                <button
                  type="submit"
                  disabled={isCheckingIn || !manualToken.trim()}
                  className={primaryBtn}
                >
                  {isCheckingIn ? 'Memproses...' : 'Proses'}
                </button>
              </div>
            </form>

            {/* Footer Aksi */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-3">
              <Link
                href="/admin/queueManagement"
                onClick={handleCloseModal}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1B1B7A] hover:underline"
              >
                <span>Buka Manajemen Antrean Penuh</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>

              <button
                type="button"
                onClick={handleCloseModal}
                className={secondaryBtn}
              >
                Tutup
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

