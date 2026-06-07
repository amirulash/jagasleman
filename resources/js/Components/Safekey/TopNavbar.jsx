import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, usePage } from '@inertiajs/react';
import {
    BarChart3,
    FileWarning,
    Home,
    LayoutDashboard,
    LogIn,
    LogOut,
    Map,
    Menu,
    Newspaper,
    Phone,
    User,
    X,
} from 'lucide-react';
import { Button } from '@/Components/Safekey/ui/button';
import { cn } from '@/lib/utils';

const menuItems = [
    { title: 'Beranda', url: '/', icon: Home },
    { title: 'Peta Kejadian', url: '/webgis', icon: Map },
    { title: 'Laporkan', url: '/report', icon: FileWarning },
    { title: 'Statistik', url: '/statistics', icon: BarChart3 },
    { title: 'Berita', url: '/news', icon: Newspaper },
    { title: 'Kontak Bantuan', url: '/emergency', icon: Phone },
];

function isCurrentPath(pathname, url) {
    return url === '/' ? pathname === '/' : pathname.startsWith(url);
}

export default function TopNavbar() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const { auth } = usePage().props;
    const authUser = auth?.user;
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
    const isLoginPage = ['/login', '/safekey/login'].includes(pathname);
    const appName = import.meta.env.VITE_APP_NAME || 'JagaSleman';

    const avatarUrl = authUser?.name
        ? `https://ui-avatars.com/api/?name=${encodeURIComponent(authUser.name)}&background=27527A&color=ffffff&bold=true`
        : null;

    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    useEffect(() => {
        const onKeyDown = (event) => {
            if (event.key === 'Escape') setMobileOpen(false);
        };

        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, []);

    useEffect(() => {
        if (!mobileOpen) return undefined;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [mobileOpen]);

    const mobileNavigation = mobileOpen && typeof document !== 'undefined'
        ? createPortal(
            <div
                id="jaga-mobile-navigation"
                className="jaga-mobile-navigation fixed inset-0 z-[9999] xl:hidden"
                role="dialog"
                aria-modal="true"
                aria-label="Navigasi utama JagaSleman"
            >
                <button
                    type="button"
                    className="jaga-mobile-navigation-backdrop absolute inset-0"
                    onClick={() => setMobileOpen(false)}
                    aria-label="Tutup menu navigasi"
                />

                <section className="jaga-mobile-navigation-panel absolute bottom-0 right-0 top-0 flex w-[min(420px,calc(100vw-18px))] flex-col overflow-hidden border-l border-[#BDE7E1] bg-white shadow-[-24px_0_70px_rgba(4,20,33,.30)]">
                    <div className="jaga-mobile-navigation-header flex shrink-0 items-center justify-between gap-3 border-b border-[#DDECE8] px-4 py-4">
                        <Link href="/" onClick={() => setMobileOpen(false)} className="jaga-mobile-drawer-brand flex min-w-0 items-center gap-3" aria-label={`Buka Beranda ${appName}`}>
                            <span className="jaga-brand-mark" aria-hidden="true"><Map /></span>
                            <span className="jaga-brand-copy min-w-0">
                                <span className="jaga-brand-name block truncate">{appName}</span>
                                <span className="jaga-brand-tagline block">WebGIS Kabupaten Sleman</span>
                            </span>
                        </Link>

                        <button
                            type="button"
                            onClick={() => setMobileOpen(false)}
                            className="jaga-mobile-drawer-close flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#BDE7E1] bg-[#F6FBF8] text-[#07324A]"
                            aria-label="Tutup menu"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="jaga-mobile-navigation-body min-h-0 flex-1 overflow-y-auto px-4 py-4">
                        <div className="mb-3 px-1">
                            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0B6E78]">Navigasi Utama</p>
                            <p className="mt-1 text-xs font-semibold leading-relaxed text-[#5C7186]">Semua menu ditampilkan lengkap agar mudah dipilih pada perangkat mobile.</p>
                        </div>

                        <nav className="grid gap-2.5" aria-label="Navigasi mobile">
                            {menuItems.map((item) => {
                                const active = isCurrentPath(pathname, item.url);
                                const Icon = item.icon;

                                return (
                                    <Link
                                        key={item.url}
                                        href={item.url}
                                        onClick={() => setMobileOpen(false)}
                                        aria-current={active ? 'page' : undefined}
                                        className={cn(
                                            'jaga-mobile-nav-link group flex min-h-[58px] w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-sm font-black transition-all',
                                            active ? 'is-active' : 'is-inactive',
                                        )}
                                    >
                                        <span className="jaga-mobile-nav-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border">
                                            <Icon className="h-[19px] w-[19px]" strokeWidth={2.6} />
                                        </span>
                                        <span className="jaga-mobile-nav-label min-w-0 flex-1 text-left leading-tight">{item.title}</span>
                                        <span className="jaga-mobile-nav-arrow" aria-hidden="true">›</span>
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>

                    <div className="jaga-mobile-navigation-footer shrink-0 border-t border-[#DDECE8] bg-white px-4 py-4">
                        <div className="grid gap-2 sm:grid-cols-2">
                            {authUser ? (
                                <>
                                    <Button asChild size="sm" className="jaga-mobile-login-button h-12 w-full rounded-xl bg-[#0B6E78] font-black text-white hover:bg-[#07324A]">
                                        <Link href="/dashboard" className="jaga-auth-dashboard-link" onClick={() => setMobileOpen(false)}>
                                            <LayoutDashboard className="mr-2 h-4 w-4" />
                                            Dashboard
                                        </Link>
                                    </Button>
                                    <Button asChild size="sm" variant="outline" className="h-12 w-full rounded-xl border-[#BDE7E1] bg-white font-black text-[#07324A] hover:bg-[#FFF4F4] hover:text-[#F47B52]">
                                        <Link href={route('logout')} method="post" as="button" className="jaga-auth-logout-link">
                                            <LogOut className="mr-2 h-4 w-4" />
                                            Keluar
                                        </Link>
                                    </Button>
                                </>
                            ) : (
                                <Button asChild size="sm" className="jaga-mobile-login-button h-12 w-full rounded-xl bg-[#0B6E78] font-black text-white hover:bg-[#07324A] sm:col-span-2">
                                    <Link href="/safekey/login" className="jaga-auth-login-link" onClick={() => setMobileOpen(false)}>
                                        <LogIn className="mr-2 h-4 w-4" />
                                        Masuk ke Akun
                                    </Link>
                                </Button>
                            )}
                        </div>
                    </div>
                </section>
            </div>,
            document.body,
        )
        : null;

    return (
        <>
            <header className="jaga-top-navbar relative z-[1000] shrink-0 border-b border-[#BDE7E1] bg-white">
                <div className="jaga-navbar-container mx-auto w-full max-w-[118rem] px-3 py-2 sm:px-4">
                    <div className="jaga-navbar-shell flex min-h-[64px] items-center justify-between gap-3 rounded-[1.35rem] border border-[#BDE7E1] bg-white px-3 shadow-[0_10px_30px_rgba(15,31,46,.10)] sm:min-h-[68px] sm:px-4">
                        <Link
                            href="/"
                            className="jaga-brand-link flex min-w-0 shrink items-center gap-3 rounded-xl py-1 outline-none transition focus-visible:ring-4 focus-visible:ring-[#BDE7E1]/70"
                            aria-label={`Buka halaman Beranda ${appName}`}
                        >
                            <span className="jaga-brand-mark" aria-hidden="true"><Map /></span>
                            <span className="jaga-brand-copy min-w-0">
                                <span className="jaga-brand-name block truncate">{appName}</span>
                                <span className="jaga-brand-tagline block">WebGIS Kabupaten Sleman</span>
                            </span>
                        </Link>

                        <nav className="jaga-navbar-menu hidden min-w-0 flex-1 items-center justify-center gap-1 overflow-x-auto rounded-full border border-[#BDE7E1] bg-[#E9F8F3] p-1.5 xl:flex" aria-label="Navigasi utama">
                            {menuItems.map((item) => {
                                const active = isCurrentPath(pathname, item.url);
                                const Icon = item.icon;

                                return (
                                    <Link
                                        key={item.url}
                                        href={item.url}
                                        aria-current={active ? 'page' : undefined}
                                        className={cn(
                                            'jaga-nav-link group inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-2 text-[12px] font-black transition-all duration-200 hover:-translate-y-0.5',
                                            active ? 'is-active' : 'is-inactive',
                                        )}
                                    >
                                        <span className="jaga-nav-icon flex h-7 w-7 items-center justify-center rounded-full border transition">
                                            <Icon className="h-4 w-4" strokeWidth={2.7} />
                                        </span>
                                        <span className="jaga-nav-text whitespace-nowrap">{item.title}</span>
                                    </Link>
                                );
                            })}
                        </nav>

                        <div className="hidden shrink-0 items-center gap-1.5 xl:flex">
                            {authUser ? (
                                <>
                                    <Link href="/dashboard" className="jaga-auth-chip hidden min-w-0 max-w-[168px] items-center gap-2 rounded-2xl border border-[#BDE7E1] bg-white px-2.5 py-1.5 transition hover:border-[#0FA3A0] hover:bg-[#F6FBF8] 2xl:flex">
                                        {avatarUrl ? (
                                            <img src={avatarUrl} alt={authUser.name} className="h-9 w-9 rounded-xl border border-white shadow-sm" />
                                        ) : (
                                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#334155] text-white shadow-sm">
                                                <User className="h-4 w-4" />
                                            </span>
                                        )}
                                        <span className="jaga-auth-chip-text min-w-0 max-w-[104px] flex-1 text-left">
                                            <span className="jaga-auth-chip-name block truncate text-sm font-black leading-none" title={authUser.name}>{authUser.name}</span>
                                            <span className="jaga-auth-chip-role mt-1 block truncate text-[11px] font-bold" title={authUser.role === 'admin' ? 'Admin' : 'Pengguna'}>{authUser.role === 'admin' ? 'Admin' : 'Pengguna'}</span>
                                        </span>
                                    </Link>

                                    <Button asChild size="sm" className="rounded-xl bg-[#0B6E78] px-3 font-black text-white shadow-md hover:bg-[#07324A]">
                                        <Link href="/dashboard" className="jaga-auth-dashboard-link">
                                            <LayoutDashboard className="mr-1.5 h-4 w-4" />
                                            Dashboard
                                        </Link>
                                    </Button>

                                    <Button asChild size="sm" variant="outline" className="rounded-xl border-[#BDE7E1] bg-white px-3 font-black text-[#07324A] hover:bg-[#FFF4F4] hover:text-[#F47B52]">
                                        <Link href={route('logout')} method="post" as="button" className="jaga-auth-logout-link">
                                            <LogOut className="mr-1.5 h-4 w-4" />
                                            Keluar
                                        </Link>
                                    </Button>
                                </>
                            ) : (
                                <Button asChild size="sm" className={cn('rounded-xl bg-[#0B6E78] px-4 font-black text-white shadow-md hover:bg-[#07324A]', isLoginPage && 'ring-2 ring-[#BDE7E1]')}>
                                    <Link href="/safekey/login" className="jaga-auth-login-link">
                                        <LogIn className="mr-1.5 h-4 w-4" />
                                        Masuk
                                    </Link>
                                </Button>
                            )}
                        </div>

                        <button
                            className="jaga-mobile-menu-button inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#BDE7E1] bg-[#F6FBF8] px-3 text-sm font-black text-[#07324A] shadow-sm transition hover:border-[#0FA3A0] hover:bg-[#E9F8F3] xl:hidden"
                            onClick={() => setMobileOpen((value) => !value)}
                            type="button"
                            aria-label={mobileOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
                            aria-expanded={mobileOpen}
                            aria-controls="jaga-mobile-navigation"
                        >
                            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                            <span className="jaga-mobile-menu-label">Menu</span>
                        </button>
                    </div>
                </div>
            </header>
            {mobileNavigation}
        </>
    );
}
