'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useLogout, useMe } from '@/hooks/api/use-auth';
import { useEscapeKey } from '@/hooks/use-escape-key';
import { useLockBodyScroll } from '@/hooks/use-lock-body-scroll';
import { AccountMenu, Avatar } from './account-menu';

const links = [
  { href: '/', label: 'Beranda' },
  { href: '/treatment', label: 'Treatment' },
  { href: '/doctor', label: 'Our Doctor' },
  { href: '/queue', label: 'Live Antrean' },
];

// Belum login → tombol "Masuk" ke /login
// Sudah login → foto profil dengan menu akun
export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  const { data: me, isPending: isLoadingMe } = useMe();
  const user = me
    ? { name: me.full_name, email: me.email, avatarUrl: me.profile_picture }
    : null;

  const { mutate: logout, isPending: isLoggingOut } = useLogout({
    onSuccess: () => {
      setOpen(false);
      router.push('/');
    },
  });

  // Link aktif: "/" harus sama persis, sisanya juga cocok untuk sub-halaman
  // (mis. /treatment/acne-facial tetap menandai "Treatment").
  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  // Bayangan muncul setelah halaman di-scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Saat menu terbuka: kunci scroll halaman, tutup dengan Escape,
  // dan tutup otomatis kalau layar melebar sampai lg.
  useLockBodyScroll(open);
  useEscapeKey(open, () => {
    setOpen(false);
    buttonRef.current?.focus();
  });

  useEffect(() => {
    if (!open) return;
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) setOpen(false);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [open]);

  const close = () => setOpen(false);

  // Area akun: loading → sudah login (menu akun) → belum login (tombol Masuk)
  let accountContent;
  if (isLoadingMe) {
    accountContent = (
      <span
        aria-hidden="true"
        className="h-9 w-9 animate-pulse rounded-full bg-neutral-200 lg:order-last"
      />
    );
  } else if (user) {
    accountContent = (
      <AccountMenu
        user={user}
        onLogout={() => logout()}
        isLoggingOut={isLoggingOut}
      />
    );
  } else {
    accountContent = (
      <Link
        href="/login"
        className="inline-flex h-11 items-center rounded-full border-2 border-[#1B1B7A] px-4 text-sm font-bold text-[#1B1B7A] transition-colors hover:bg-[#1B1B7A] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B1B7A] lg:order-last"
      >
        Masuk
      </Link>
    );
  }

  return (
    <>
      <header
        className={`sticky top-0 z-50 bg-[#FAF8F3]/95 backdrop-blur transition-shadow ${
          scrolled || open ? 'shadow-sm' : ''
        }`}
      >
        {/* Link lompat untuk pengguna keyboard */}
        <a
          href="#main"
          className="sr-only rounded-lg bg-[#1B1B7A] px-4 py-2 font-semibold text-white focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50"
        >
          Lewati ke konten
        </a>

        <nav
          aria-label="Navigasi utama"
          className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-5 md:px-8 lg:h-20"
        >
          {/* LOGO */}
          <Link
            href="/"
            onClick={close}
            className="flex items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1B1B7A]"
          >
            {/* Monogram sementara. Ganti dengan <Image src="/logo.svg" .../> bila logo final sudah ada. */}
            <span
              aria-hidden="true"
              className="grid h-9 w-9 place-items-center rounded-full border-2 border-[#C5A46D] font-serif text-sm font-bold text-[#1B1B7A] outline-1 outline-offset-2 outline-[#C5A46D] lg:h-10 lg:w-10 lg:text-base"
            >
              IH
            </span>
            <span className="font-serif text-lg font-semibold text-[#1B1B7A] lg:text-xl">
              IH Beauty Clinic
            </span>
          </Link>

          {/* LINK DESKTOP (lg+) */}
          <ul className="hidden items-center gap-8 lg:flex">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={isActive(link.href) ? 'page' : undefined}
                  className={`relative rounded py-2 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1B1B7A] after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-[#C5A46D] after:transition-opacity ${
                    isActive(link.href)
                      ? 'text-[#1B1B7A] after:opacity-100'
                      : 'text-neutral-700 after:opacity-0 hover:text-[#1B1B7A]'
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            {/* AKUN: foto profil + menu, atau tombol Masuk → /login */}
            {accountContent}

            {/* HAMBURGER (< lg), target sentuh 44px */}
            <button
              ref={buttonRef}
              type="button"
              onClick={() => setOpen((previous) => !previous)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? 'Tutup menu' : 'Buka menu'}
              className="-mr-2 grid h-11 w-11 place-items-center rounded-lg text-[#1B1B7A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B1B7A] lg:hidden"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                {open ? (
                  <path d="M6 6l12 12M18 6L6 18" />
                ) : (
                  <path d="M4 7h16M4 12h16M4 17h16" />
                )}
              </svg>
            </button>
          </div>
        </nav>

        <div
          id="mobile-menu"
          hidden={!open}
          className="max-h-[calc(100svh-4rem)] overflow-y-auto border-t border-neutral-200 bg-[#FAF8F3] lg:hidden"
        >
          {user && (
            <Link
              href="/profile"
              onClick={close}
              className="mx-auto flex w-full max-w-6xl items-center gap-3 border-b border-neutral-200 px-5 py-4 focus-visible:outline-2 focus-visible:outline-offset-2px focus-visible:outline-[#1B1B7A] md:px-8"
            >
              <Avatar
                user={user}
                size="h-11 w-11"
              />
              <span>
                <span className="block font-semibold text-[#1B1B7A]">
                  {user.name}
                </span>
                <span className="block text-sm text-neutral-600">
                  Edit profil
                </span>
              </span>
            </Link>
          )}

          <ul className="mx-auto w-full max-w-6xl px-5 py-2 md:px-8">
            {links.map((link) => (
              <li
                key={link.href}
                className="border-b border-neutral-200 last:border-0"
              >
                <Link
                  href={link.href}
                  onClick={close}
                  aria-current={isActive(link.href) ? 'page' : undefined}
                  className={`flex items-center justify-between py-4 text-lg text-[#1B1B7A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B1B7A] ${
                    isActive(link.href) ? 'font-bold' : 'font-medium'
                  }`}
                >
                  {link.label}
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className="text-neutral-400"
                  >
                    <path d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </li>
            ))}
          </ul>

          {user && (
            <ul className="mx-auto w-full max-w-6xl border-t border-neutral-200 px-5 py-2 md:px-8">
              <li className="border-b border-neutral-200">
                <Link
                  href="/history"
                  onClick={close}
                  className="flex items-center py-4 text-lg font-medium text-[#1B1B7A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B1B7A]"
                >
                  Riwayat treatment
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => logout()}
                  disabled={isLoggingOut}
                  className="flex w-full items-center py-4 text-left text-lg font-medium text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B1B7A] disabled:opacity-60"
                >
                  {isLoggingOut ? 'Keluar...' : 'Keluar'}
                </button>
              </li>
            </ul>
          )}
        </div>
      </header>

      {/* Latar gelap di belakang menu; ketuk untuk menutup */}
      {open && (
        <div
          aria-hidden="true"
          onClick={close}
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
        />
      )}
    </>
  );
}
