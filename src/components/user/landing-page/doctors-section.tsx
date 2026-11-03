import Link from 'next/link';
import { DoctorList } from '@/components/user/landing-page/doctor';

export function DoctorsSection() {
  return (
    <section
      aria-labelledby="doctors-heading"
      className="mx-auto w-full max-w-6xl px-5 py-10 md:px-8 md:py-16 bg-white"
    >
      <h2
        id="doctors-heading"
        className="text-2xl font-bold tracking-tight text-[#1B1B7A] sm:text-3xl md:text-4xl"
      >
        Dokter Senior Kami
      </h2>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-neutral-600 md:text-lg">
        Perawatan ditangani langsung oleh dokter berpengalaman yang siap
        membantu mengenali kebutuhan kulitmu.
      </p>
      <DoctorList />
      <Link
        href="/doctor"
        className="mt-8 inline-flex min-h-11 items-center font-semibold text-[#1B1B7A] underline decoration-[#F29A9A] decoration-2 underline-offset-4 hover:text-[#d96a6a] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1B1B7A]"
      >
        Lihat semua dokter
      </Link>
    </section>
  );
}
