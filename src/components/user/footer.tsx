'use client';

import Link from 'next/link';
import { Suspense } from 'react';

// Tahun dibaca saat runtime; dibungkus Suspense agar footer tetap bisa di-prerender
function CurrentYear() {
  return <>{new Date().getFullYear()}</>;
}

export default function Footer() {
  return (
    <footer className="bg-[#1B1B7A] text-white">
      <div className="h-1 bg-[#F29A9A]" />

      <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-12 sm:grid-cols-2 md:px-8 md:py-16 lg:grid-cols-[1.4fr_1fr_1.2fr_1fr]">
        <section aria-label="Tentang klinik">
          <Link
            href="/"
            aria-label="Ke beranda IH Beauty Clinic"
            className="inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C5A46D]"
          >
            <span
              aria-hidden="true"
              className="grid h-9 w-9 place-items-center rounded-full border-2 border-[#C5A46D] bg-[#FAF8F3] font-serif text-sm font-bold text-[#1B1B7A] outline-1 outline-offset-2 outline-[#C5A46D] lg:h-10 lg:w-10 lg:text-base"
            >
              IH
            </span>
            <span className="font-serif text-lg font-semibold text-white lg:text-xl">
              IH Beauty Clinic
            </span>
          </Link>
          <p className="mt-5 max-w-xs leading-relaxed text-white/80">
            Klinik kecantikan dengan dokter berpengalaman dan perawatan yang
            nyaman untuk kulitmu.
          </p>
          <p className="mt-4 max-w-xs leading-relaxed text-white/80">
            BSD GOP-09
          </p>
          <a
            href="https://www.google.com/maps/search/?api=1&query=Jl.+Contoh+Alamat+No.+1+Kota+Anda"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block font-semibold underline decoration-[#F29A9A] decoration-2 underline-offset-4 hover:text-[#F29A9A] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F29A9A]"
          >
            Lihat di peta
            <span className="sr-only"> (membuka tab baru)</span>
          </a>
        </section>
        <nav aria-label="Menu footer">
          <h2 className="text-lg font-bold">Jelajahi</h2>
          <ul className="mt-4 grid gap-1">
            <li>
              <Link
                href="/"
                className="inline-block py-1.5 text-white/80 transition-colors hover:text-[#F29A9A] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F29A9A]"
              >
                Beranda
              </Link>
            </li>
            <li>
              <Link
                href="/treatment"
                className="inline-block py-1.5 text-white/80 transition-colors hover:text-[#F29A9A] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F29A9A]"
              >
                Treatment
              </Link>
            </li>
            <li>
              <Link
                href="/login"
                className="inline-block py-1.5 text-white/80 transition-colors hover:text-[#F29A9A] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F29A9A]"
              >
                Login
              </Link>
            </li>
          </ul>
        </nav>
        <section aria-label="Hubungi kami">
          <h2 className="text-lg font-bold">Hubungi kami</h2>
          <ul className="mt-4 grid gap-3 text-white/80">
            <li>
              <a
                href="https://wa.me/62882019348463"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#F29A9A] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F29A9A]"
              >
                <span className="block text-sm">WhatsApp</span>
                <span className="block font-semibold text-white">0882-0193-48463 </span>
                <span className="sr-only"> (membuka tab baru)</span>
              </a>
            </li>
            <li>
              <a
                href="mailto:halo@klinikanda.com"
                className="hover:text-[#F29A9A] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F29A9A]"
              >
                <span className="block text-sm">Email</span>
                <span className="block font-semibold text-white">halo@klinikanda.com</span>
              </a>
            </li>
            <li>
              <span className="block text-sm">Jam operasional</span>
              <span className="block font-semibold text-white">Setiap hari, 09.00 – 20.00</span>
            </li>
          </ul>
        </section>

        {/* SOSIAL MEDIA */}
        <section aria-label="Media sosial">
          <h2 className="text-lg font-bold">Ikuti kami</h2>
          <ul className="mt-4 grid gap-2">
            <li>
              <a
                href="https://www.instagram.com/ianongkoyoyo"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 rounded-md py-1.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F29A9A]"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/30 transition-colors group-hover:border-[#F29A9A] group-hover:bg-[#F29A9A] group-hover:text-[#1B1B7A]">
                  <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
                    <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
                    <circle cx="17.2" cy="6.8" r="1.2" fill="currentColor" />
                  </svg>
                </span>
                <span>
                  <span className="block font-semibold">Instagram</span>
                  <span className="block text-sm text-white/80">@akunanda</span>
                </span>
                <span className="sr-only">(membuka tab baru)</span>
              </a>
            </li>
            <li>
              <a
                href="https://www.facebook.com/IanOngkoyoyo"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 rounded-md py-1.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F29A9A]"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/30 transition-colors group-hover:border-[#F29A9A] group-hover:bg-[#F29A9A] group-hover:text-[#1B1B7A]">
                  <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" fill="currentColor" />
                  </svg>
                </span>
                <span>
                  <span className="block font-semibold">Facebook</span>
                  <span className="block text-sm text-white/80">Nama Klinik Anda</span>
                </span>
                <span className="sr-only">(membuka tab baru)</span>
              </a>
            </li>
            <li>
              <a
                href="https://wa.me/628xxxxxxxxxx"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 rounded-md py-1.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F29A9A]"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/30 transition-colors group-hover:border-[#F29A9A] group-hover:bg-[#F29A9A] group-hover:text-[#1B1B7A]">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
                    <path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.2-1.8-1-.8.7a3.6 3.6 0 0 1-1.6-1.6l.7-.8-1-1.8L9 9.5z" />
                  </svg>
                </span>
                <span>
                  <span className="block font-semibold">WhatsApp</span>
                  <span className="block text-sm text-white/80">Chat langsung</span>
                </span>
                <span className="sr-only">(membuka tab baru)</span>
              </a>
            </li>
          </ul>
        </section>
      </div>

      {/* BAR BAWAH */}
      <div className="border-t border-white/15">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-5 py-5 text-sm text-white/80 sm:flex-row md:px-8">
          <p>
            ©{' '}
            <Suspense>
              <CurrentYear />
            </Suspense>{' '}
            IH Beauty Clinic
          </p>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="rounded-full border border-white/30 px-5 py-2 font-semibold text-white transition-colors hover:border-[#F29A9A] hover:bg-[#F29A9A] hover:text-[#1B1B7A] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F29A9A]"
          >
            Kembali ke atas
          </button>
        </div>
      </div>
    </footer>
  );
}