import { Suspense } from 'react';
import { DoctorBrowser } from '@/components/user/doctor/doctor-browser';

export const metadata = { title: 'Dokter Kami' };

export default function DoctorPage() {
  return (
    <section
      aria-labelledby="doctors-heading"
      className="mx-auto w-full max-w-6xl px-5 py-12 md:px-8 md:py-16 bg-white"
    >
      <h1
        id="doctors-heading"
        className="text-3xl font-bold tracking-tight text-[#1B1B7A] md:text-4xl"
      >
        Dokter Kami
      </h1>
      <p className="mt-3 max-w-2xl text-lg leading-relaxed text-neutral-600">
        Perawatan ditangani langsung oleh dokter berpengalaman yang siap
        membantu mengenali kebutuhan kulitmu.
      </p>

      {/* DoctorBrowser membaca useSearchParams, wajib di dalam Suspense */}
      <Suspense
        fallback={
          <p role="status" className="mt-10 text-neutral-600">
            Memuat dokter...
          </p>
        }
      >
        <DoctorBrowser />
      </Suspense>
    </section>
  );
}
