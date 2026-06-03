import { Link, router, usePage } from '@inertiajs/react';
import {
    BarChart3,
    FileText,
    Home,
    LogOut,
    Map,
    MapPin,
    ShieldCheck,
    User,
} from 'lucide-react';
import { ReactNode, useState } from 'react';

type AdminLayoutProps = {
    children: ReactNode;
    title?: string;
};

export default function AdminLayout({ children, title = 'Dashboard Admin' }: AdminLayoutProps) {
    const { auth } = usePage().props as any;
    const user = auth?.user;
    const [openUserMenu, setOpenUserMenu] = useState(false);
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

    const menuItems = [
        { label: 'Beranda Admin', href: '/admin/dashboard', icon: BarChart3 },
        { label: 'Laporan Masuk', href: '/admin/laporan', icon: FileText },
        { label: 'Peta Admin', href: '/admin/peta', icon: Map },
        { label: 'Titik Tervalidasi', href: '/admin/points', icon: MapPin },
        { label: 'Kelola Admin', href: '/admin/kelola-admin', icon: User },
    ];

    const handleLogout = () => router.post('/logout');

    return (
        <div className="min-h-screen theme-shell text-foreground">
            <style>{`
                .admin-sidebar-scroll::-webkit-scrollbar { width: 7px; }
                .admin-sidebar-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,.06); border-radius: 999px; }
                .admin-sidebar-scroll::-webkit-scrollbar-thumb { background: rgba(91,174,138,.72); border-radius: 999px; }
                .admin-sidebar-scroll::-webkit-scrollbar-thumb:hover { background: rgba(91,174,138,.95); }
                .admin-content-scroll::-webkit-scrollbar { width: 10px; height: 10px; }
                .admin-content-scroll::-webkit-scrollbar-track { background: #eef3f7; }
                .admin-content-scroll::-webkit-scrollbar-thumb { background: linear-gradient(180deg, #F47B52, #F47B52); border-radius: 999px; border: 2px solid #eef3f7; }
                .admin-content-scroll::-webkit-scrollbar-thumb:hover { background: linear-gradient(180deg, #07324A, #F47B52); }
                @media print {
                    .admin-no-print { display: none !important; }
                    .admin-print-card { box-shadow: none !important; border-color: #BDE7E1 !important; }
                    body { background: #ffffff !important; }
                }
            `}</style>

            <div className="flex h-screen overflow-hidden">
                <aside className="admin-no-print hidden h-screen w-72 shrink-0 border-r border-white/10 bg-[#07324A] text-[#F2FAF6] lg:flex lg:flex-col">
                    <div className="border-b border-white/10 px-6 py-6">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F47B52] text-white shadow-lg">
                                <ShieldCheck className="h-6 w-6" />
                            </div>
                            <div>
                                <h1 className="text-lg font-black leading-tight text-white">JagaSleman</h1>
                                <p className="text-xs font-semibold text-[#F2FAF6]/65">Admin Panel</p>
                            </div>
                        </div>
                    </div>

                    <div className="px-4 pt-4">
                        <Link
                            href="/"
                            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm font-black text-white transition hover:bg-[#F47B52] hover:text-white"
                        >
                            <Home className="h-5 w-5" />
                            <span>Ke Beranda Publik</span>
                        </Link>
                    </div>

                    <nav className="admin-sidebar-scroll flex-1 space-y-2 overflow-y-auto px-4 py-5">
                        <p className="px-3 pb-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/40">Navigasi Admin</p>
                        {menuItems.map((item) => {
                            const Icon = item.icon;
                            const active = currentPath === item.href;

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={[
                                        'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black transition',
                                        active
                                            ? 'bg-[#F47B52] text-white shadow-md'
                                            : 'text-white/75 hover:bg-white/10 hover:text-white',
                                    ].join(' ')}
                                >
                                    <Icon className="h-5 w-5" />
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="border-t border-white/10 p-4">
                        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35">Keamanan</p>
                            <p className="mt-2 text-xs leading-relaxed text-white/60">
                                Aksi validasi, edit, dan hapus hanya tersedia untuk akun admin yang sudah login.
                            </p>
                        </div>
                    </div>
                </aside>

                <div className="admin-content-scroll flex h-screen min-w-0 flex-1 flex-col overflow-y-auto">
                    <header className="admin-no-print sticky top-0 z-40 border-b theme-border theme-elevated px-4 py-4 backdrop-blur-md lg:px-8">
                        <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0">
                                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#F47B52] dark:text-[#F47B52]">
                                    Sistem Administrasi
                                </p>
                                <h2 className="truncate text-xl font-black text-[#07324A] dark:text-[#F2FAF6] lg:text-2xl">
                                    {title}
                                </h2>
                            </div>

                            <div className="flex items-center gap-2">
                                <Link
                                    href="/"
                                    className="hidden rounded-2xl border border-[#BDE7E1] bg-white px-4 py-2 text-sm font-black text-[#07324A] transition hover:bg-[#F2FAF6] dark:border-white/10 dark:bg-white/5 dark:text-[#F2FAF6] sm:inline-flex"
                                >
                                    <Home className="mr-2 h-4 w-4" />
                                    Beranda
                                </Link>

                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setOpenUserMenu((value) => !value)}
                                        className="flex items-center gap-3 rounded-2xl border border-[#BDE7E1] bg-white px-3 py-2 shadow-sm transition hover:border-[#F47B52] hover:shadow-md dark:border-white/10 dark:bg-white/5"
                                    >
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F47B52] text-white dark:bg-[#F47B52] dark:text-white">
                                            <User className="h-5 w-5" />
                                        </div>
                                        <div className="hidden text-left sm:block">
                                            <p className="max-w-[160px] truncate text-sm font-black text-[#07324A] dark:text-[#F2FAF6]">
                                                {user?.name ?? 'Admin'}
                                            </p>
                                            <p className="max-w-[180px] truncate text-xs font-semibold text-[#F47B52] dark:text-[#F2FAF6]/65">
                                                {user?.email ?? 'admin@jagasleman.id'}
                                            </p>
                                        </div>
                                    </button>

                                    {openUserMenu && (
                                        <div className="absolute right-0 mt-3 w-64 overflow-hidden rounded-3xl border border-[#BDE7E1] bg-white shadow-2xl dark:border-white/10 dark:bg-[#07324A]">
                                            <div className="border-b border-[#BDE7E1] px-4 py-4 dark:border-white/10">
                                                <p className="text-sm font-black text-[#07324A] dark:text-[#F2FAF6]">{user?.name ?? 'Admin'}</p>
                                                <p className="truncate text-xs text-[#F47B52] dark:text-[#F2FAF6]/60">{user?.email ?? 'admin@jagasleman.id'}</p>
                                            </div>
                                            <div className="p-2">
                                                <Link href="/profile" className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black text-[#07324A] transition hover:bg-[#F2FAF6] dark:text-[#F2FAF6] dark:hover:bg-white/10">
                                                    <User className="h-4 w-4" />
                                                    <span>Lihat Profil</span>
                                                </Link>
                                                <button type="button" onClick={handleLogout} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-black text-[#F47B52] transition hover:bg-[#F47B52]/10">
                                                    <LogOut className="h-4 w-4" />
                                                    <span>Logout</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </header>

                    <div className="admin-no-print border-b theme-border theme-surface px-4 py-3 lg:hidden">
                        <div className="flex gap-2 overflow-x-auto">
                            <Link href="/" className="flex shrink-0 items-center gap-2 rounded-xl bg-[#07324A] px-3 py-2 text-xs font-black text-white">
                                <Home className="h-4 w-4" />Beranda
                            </Link>
                            {menuItems.map((item) => {
                                const Icon = item.icon;
                                const active = currentPath === item.href;
                                return (
                                    <Link key={item.href} href={item.href} className={[
                                        'flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-black',
                                        active ? 'bg-[#F47B52] text-white' : 'bg-[#F2FAF6] text-[#07324A] dark:bg-white/10 dark:text-[#F2FAF6]',
                                    ].join(' ')}>
                                        <Icon className="h-4 w-4" />{item.label}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    <main className="flex-1 p-4 lg:p-8">{children}</main>
                </div>
            </div>
        </div>
    );
}
