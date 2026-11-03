'use client';

import {
  CalendarCheck,
  ChartColumn,
  ExternalLink,
  LayoutGrid,
  ListOrdered,
  LogOut,
  type LucideIcon,
  Stethoscope,
  Tags,
  UserPlus,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLogout } from '@/hooks/api/use-auth';

type NavItem = { href: string; label: string; icon: LucideIcon };

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Dashboard',
    items: [
      { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutGrid },
      { href: '/admin/statistic', label: 'Statistik', icon: ChartColumn },
    ],
  },
  {
    title: 'Operasional',
    items: [
      { href: '/admin/appointmentManagement', label: 'Janji Temu', icon: CalendarCheck },
      { href: '/admin/queueManagement', label: 'Antrean', icon: ListOrdered },
      { href: '/admin/payment', label: 'Pembayaran', icon: Wallet },
      { href: '/queue', label: 'Layar TV Antrean', icon: ExternalLink },
    ],
  },
  {
    title: 'Master Data',
    items: [
      { href: '/admin/doctorManagement', label: 'Dokter', icon: Stethoscope },
      { href: '/admin/specialistManagement', label: 'Spesialis', icon: Tags },
      { href: '/admin/patientManagement', label: 'Pasien', icon: Users },
    ],
  },
  {
    title: 'Pengaturan',
    items: [{ href: '/admin/register', label: 'Tambah Admin', icon: UserPlus }],
  },
];

const FOCUS =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B1B7A]';

const itemBase = `flex min-h-11 items-center gap-3 rounded-xl px-3 text-neutral-800 transition-colors hover:bg-neutral-100 motion-reduce:transition-none ${FOCUS}`;

type Props = {
  /** Mode ikon saja (hanya berlaku di layar lg ke atas) */
  collapsed: boolean;
  /** Drawer terbuka (layar kecil) */
  mobileOpen: boolean;
  onCloseMobile: () => void;
};

export default function Sidebar({ collapsed, mobileOpen, onCloseMobile }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { mutate: logout, isPending: isLoggingOut } = useLogout({
    onSuccess: () => {
      router.push('/admin/login');
    },
  });
  // Label tetap terbaca screen reader saat sidebar diciutkan
  const labelClass = collapsed ? 'lg:sr-only' : '';

  return (
    <aside
      id="admin-sidebar"
      aria-label="Navigasi admin"
      className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-neutral-200 bg-white transition-[width,transform] motion-reduce:transition-none lg:visible lg:translate-x-0 ${
        collapsed ? 'lg:w-20' : 'lg:w-64'
      } ${mobileOpen ? 'visible translate-x-0' : 'invisible -translate-x-full'}`}
    >
      {/* BRAND */}
      <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-neutral-200 px-4">
        <Link
          href="/admin/dashboard"
          onClick={onCloseMobile}
          className={`flex min-w-0 items-center gap-3 rounded-lg ${FOCUS}`}
        >
          <img src="/IH-logo-icon.png" alt="" className="h-9 w-9 shrink-0 object-contain" />
          <span className={`truncate text-lg font-bold text-[#1B1B7A] ${labelClass}`}>
            IH Beauty Clinic
          </span>
        </Link>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Tutup menu"
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-neutral-700 hover:bg-neutral-100 lg:hidden ${FOCUS}`}
        >
          <X aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>

      {/* MENU */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group, index) => {
          const headingId = `admin-nav-${index}`;
          return (
            <div
              key={group.title}
              className={
                index > 0
                  ? `mt-5 ${collapsed ? 'lg:mt-3 lg:border-t lg:border-neutral-200 lg:pt-3' : ''}`
                  : ''
              }
            >
              <p
                id={headingId}
                className={`mb-1.5 px-3 text-sm text-neutral-600 ${labelClass}`}
              >
                {group.title}
              </p>
              <ul aria-labelledby={headingId} className="grid gap-1">
                {group.items.map(({ href, label, icon: Icon }) => {
                  const active = pathname.startsWith(href);
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        onClick={onCloseMobile}
                        title={collapsed ? label : undefined}
                        aria-current={active ? 'page' : undefined}
                        className={`${itemBase} ${collapsed ? 'lg:justify-center' : ''} ${
                          active ? 'bg-[#FDECEC] font-semibold text-[#1B1B7A] hover:bg-[#FBE0E0]' : ''
                        }`}
                      >
                        <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
                        <span className={labelClass}>{label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* BAWAH */}
      <div className="grid shrink-0 gap-1 border-t border-neutral-200 p-3">
        <Link
          href="/"
          title={collapsed ? 'Lihat situs' : undefined}
          className={`${itemBase} ${collapsed ? 'lg:justify-center' : ''}`}
        >
          <ExternalLink aria-hidden="true" className="h-5 w-5 shrink-0" />
          <span className={labelClass}>Lihat situs</span>
        </Link>
        <button
          type="button"
          onClick={() => logout()}
          disabled={isLoggingOut}
          title={collapsed ? 'Keluar' : undefined}
          className={`${itemBase} ${collapsed ? 'lg:justify-center' : ''}`}
        >
          <LogOut aria-hidden="true" className="h-5 w-5 shrink-0" />
          <span className={labelClass}>{isLoggingOut ? 'Keluar...' : 'Keluar'}</span>
        </button>
      </div>
    </aside>
  );
}
