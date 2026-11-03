'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Clock,
  Maximize2,
  Minimize2,
  RefreshCw,
  Sparkles,
  Stethoscope,
  Volume2,
} from 'lucide-react';
import { useGetLiveQueue } from '@/hooks/api/use-admin-appointments';
import { formatTime } from '@/lib/format';

export default function PublicLiveQueuePage() {
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { data: liveSessions = [], isLoading, isFetching, refetch } = useGetLiveQueue();

  // Clock ticker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      );
      setCurrentDate(
        now.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-900 text-white flex flex-col justify-between selection:bg-[#F29A9A]">
      {/* HEADER BANNER */}
      <header className="border-b border-slate-800 bg-slate-950/80 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-3">
              <img src="/IH-logo-icon.png" alt="Logo" className="h-10 w-auto rounded-lg bg-white p-1" />
              <div>
                <span className="text-xl font-bold tracking-tight text-white block">
                  IH Beauty Clinic
                </span>
                <span className="text-xs uppercase tracking-widest text-[#F29A9A]">
                  Layar Antrean Pasien (Live Queue)
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-medium text-slate-400 capitalize">{currentDate}</p>
              <p className="font-mono text-2xl font-black tracking-wider text-white">
                {currentTime || '--:--:--'} WIB
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => refetch()}
                title="Muat ulang antrean"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
              >
                <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                onClick={toggleFullscreen}
                title="Layar Penuh (TV Monitor)"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* QUEUE CONTENT AREA */}
      <div className="flex-1 p-6 md:p-10 mx-auto w-full max-w-7xl">
        {isLoading ? (
          <div className="flex h-96 items-center justify-center text-center">
            <div>
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-[#F29A9A]" />
              <p className="mt-4 text-base font-medium text-slate-400">
                Memuat antrean aktif klinik...
              </p>
            </div>
          </div>
        ) : liveSessions.length === 0 ? (
          <div className="flex h-96 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-800 bg-slate-950/40 p-8 text-center">
            <Clock className="h-16 w-16 text-slate-600 mb-4" />
            <h2 className="text-2xl font-bold text-slate-200">
              Belum Ada Sesi Praktik yang Aktif
            </h2>
            <p className="mt-2 max-w-md text-sm text-slate-400">
              Antrean akan otomatis tampil di layar ini saat sesi praktik dokter dimulai dan pasien
              melakukan check-in di klinik.
            </p>
            <Link
              href="/"
              className="mt-6 rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Kembali ke Beranda
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {liveSessions.map((session: any) => {
              const isServing = session.current_queue_number > 0;

              return (
                <div
                  key={session.session_id}
                  className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-950 to-slate-900/90 p-6 shadow-2xl flex flex-col justify-between"
                >
                  {/* Doctor Info */}
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                          Sesi Berjalan
                        </span>
                        <h2 className="mt-3 text-xl font-bold text-white tracking-tight">
                          {session.doctor_name}
                        </h2>
                        <p className="text-xs text-[#F29A9A] font-medium">
                          {session.specialist_name}
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-800/80 p-2 text-slate-400">
                        <Stethoscope className="h-5 w-5" />
                      </div>
                    </div>

                    <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                      <Clock className="h-3.5 w-3.5" />
                      <span>
                        Jam Praktik: {formatTime(session.start_time)} - {formatTime(session.end_time)} WIB
                      </span>
                    </div>

                    {/* BIG QUEUE CALL NUMBER */}
                    <div className="my-8 rounded-2xl bg-slate-950/90 border border-slate-800/80 p-6 text-center shadow-inner">
                      <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold">
                        Nomor Sedang Dilayani
                      </p>
                      <div className="mt-2 text-7xl font-black tracking-tight text-white lg:text-8xl">
                        {isServing ? `#${session.current_queue_number}` : '-'}
                      </div>
                      <p className="mt-2 text-xs text-emerald-400 font-medium">
                        {isServing ? 'Silakan masuk ke ruang konsultasi' : 'Menunggu panggilan pertama'}
                      </p>
                    </div>
                  </div>

                  {/* NEXT UP NUMBERS */}
                  <div className="rounded-2xl bg-slate-950/50 border border-slate-800/60 p-4">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Nomor Berikutnya
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {session.next_numbers && session.next_numbers.length > 0 ? (
                        session.next_numbers.map((num: number) => (
                          <span
                            key={num}
                            className="inline-flex items-center justify-center rounded-xl bg-slate-800/80 border border-slate-700 px-3.5 py-1.5 text-base font-extrabold text-white"
                          >
                            #{num}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500 italic">
                          Belum ada antrean lanjutan yang siap
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FOOTER TICKER */}
      <footer className="border-t border-slate-800 bg-slate-950 px-6 py-4 text-center text-xs text-slate-500">
        <div className="mx-auto flex max-w-7xl items-center justify-between flex-wrap gap-2">
          <p>
            Harap memperhatikan panggilan nomor antrean Anda. Jika belum melakukan check-in, tunjukkan QR Code pada staf resepsionis klinik.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-slate-300 underline">
              Beranda
            </Link>
            <Link href="/login" className="hover:text-slate-300 underline">
              Masuk Pasien
            </Link>
            <Link href="/admin/login" className="hover:text-slate-300 underline">
              Admin Portal
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

