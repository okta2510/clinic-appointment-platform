'use client';

import { CircleUserRound, Menu, PanelLeftClose, PanelLeftOpen, RotateCw } from 'lucide-react';
import { useState } from 'react';
import { useEscapeKey } from '@/hooks/use-escape-key';
import { useLockBodyScroll } from '@/hooks/use-lock-body-scroll';
import Sidebar from './sidebar';

const FOCUS =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B1B7A]';

const iconBtn = `flex h-11 w-11 items-center justify-center rounded-xl text-neutral-700 hover:bg-neutral-100 ${FOCUS}`;

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Drawer mobile: tutup dengan Escape dan kunci scroll halaman
  useEscapeKey(mobileOpen, () => setMobileOpen(false));
  useLockBodyScroll(mobileOpen);

  return (
    <div
      className={`min-h-screen bg-neutral-100 text-neutral-900 transition-[padding] motion-reduce:transition-none ${
        collapsed ? 'lg:pl-20' : 'lg:pl-64'
      }`}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-60 focus:rounded-xl focus:bg-white focus:px-4 focus:py-3 focus:font-semibold focus:text-[#1B1B7A]"
      >
        Lewati ke konten utama
      </a>

      {mobileOpen && (
        <div
          aria-hidden="true"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-neutral-900/50 lg:hidden"
        />
      )}

      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* TOP BAR */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-neutral-200 bg-white px-4 md:px-6">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Buka menu"
          aria-expanded={mobileOpen}
          aria-controls="admin-sidebar"
          className={`${iconBtn} lg:hidden`}
        >
          <Menu aria-hidden="true" className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => setCollapsed((previous) => !previous)}
          aria-label={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
          aria-expanded={!collapsed}
          aria-controls="admin-sidebar"
          className={`${iconBtn} hidden lg:flex`}
        >
          {collapsed ? (
            <PanelLeftOpen aria-hidden="true" className="h-5 w-5" />
          ) : (
            <PanelLeftClose aria-hidden="true" className="h-5 w-5" />
          )}
        </button>

        <div className="flex items-center gap-2 text-neutral-800">
          <button
            type="button"
            onClick={() => window.location.reload()}
            title="Muat ulang halaman (Reload Page)"
            aria-label="Muat ulang halaman"
            className={`${iconBtn} text-neutral-600 hover:text-[#1B1B7A]`}
          >
            <RotateCw aria-hidden="true" className="h-4 w-4" />
          </button>
          <div className="hidden h-5 w-px bg-neutral-200 sm:block" />
          <div className="flex items-center gap-2">
            <CircleUserRound aria-hidden="true" className="h-6 w-6 text-[#1B1B7A]" />
            <span className="font-medium">Admin</span>
          </div>
        </div>
      </header>

      <main id="main-content" className="px-4 py-6 md:px-8 md:py-8">
        {children}
      </main>
    </div>
  );
}
