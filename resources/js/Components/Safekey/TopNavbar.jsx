import { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import {
    Home,
    Map,
    FileWarning,
    BarChart3,
    Newspaper,
    Phone,
    Menu,
    X,
    LogIn,
    User,
    LayoutDashboard,
    LogOut,
} from 'lucide-react';
import { Button } from '@/Components/Safekey/ui/button';
import { cn } from '@/lib/utils';

const menuItems = [
    { title: 'Beranda', url: '/', icon: Home, label: 'Home' },
    { title: 'Peta Kejadian', url: '/webgis', icon: Map, label: 'Map' },
    { title: 'Laporkan', url: '/report', icon: FileWarning, label: 'Report' },
    { title: 'Statistik', url: '/statistics', icon: BarChart3, label: 'Stats' },
    { title: 'Berita', url: '/news', icon: Newspaper, label: 'News' },
    { title: 'Kontak Bantuan', url: '/emergency', icon: Phone, label: 'Help' },
];

const navItemStyle = (isActive) => ({
    backgroundColor: isActive ? '#0B6E78' : '#FFFFFF',
    borderColor: isActive ? '#0B6E78' : '#BDE7E1',
    color: isActive ? '#FFFFFF' : '#07324A',
    opacity: 1,
    WebkitTextFillColor: isActive ? '#FFFFFF' : '#07324A',
    boxShadow: isActive
        ? '0 12px 26px rgba(11, 74, 99, 0.22)'
        : '0 8px 18px rgba(6, 35, 51, 0.06)',
});

const navIconStyle = (isActive) => ({
    backgroundColor: isActive ? '#FFFFFF' : '#E9F8F3',
    borderColor: isActive ? 'rgba(255,255,255,.92)' : '#BDE7E1',
    color: '#0B6E78',
    opacity: 1,
    WebkitTextFillColor: '#0B6E78',
});

const navTextStyle = (isActive) => ({
    color: isActive ? '#FFFFFF' : '#07324A',
    opacity: 1,
    WebkitTextFillColor: isActive ? '#FFFFFF' : '#07324A',
});

export default function TopNavbar() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const { auth } = usePage().props;
    const authUser = auth?.user;
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
    const isLoginPage = ['/login', '/safekey/login'].includes(pathname);

    const avatarUrl = authUser?.name
        ? `https://ui-avatars.com/api/?name=${encodeURIComponent(authUser.name)}&background=27527A&color=ffffff&bold=true`
        : null;

    return (
        <header className="jaga-top-navbar sticky top-0 z-50 border-b border-[#BDE7E1] bg-white shadow-[0_14px_40px_rgba(15,31,46,.12)]">
            <div className="mx-auto max-w-[118rem] px-2 py-2 sm:px-3">
                <div className="jaga-navbar-shell flex min-h-16 items-center justify-between gap-2 rounded-[1.5rem] border border-[#BDE7E1] bg-white px-2.5 shadow-[0_10px_30px_rgba(15,31,46,.10)]">
                    <Link
                        href="/"
                        className="jaga-brand-link group flex shrink-0 items-center rounded-2xl px-2 py-1 transition hover:-translate-y-0.5"
                        aria-label="Kembali ke Beranda"
                        title="Kembali ke Beranda"
                        style={{ backgroundColor: 'transparent', color: '#07324A', opacity: 1 }}
                    >
                        <img
                            src="/images/logo_jagasleman.png"
                            alt="Logo JagaSleman"
                            className="jaga-brand-logo h-[52px] w-[148px] shrink-0 object-contain object-left drop-shadow-sm transition-transform duration-300 group-hover:scale-[1.02] sm:h-[58px] sm:w-[166px]"
                        />
                    </Link>

                    <nav className="jaga-navbar-menu hidden min-w-0 flex-1 items-center justify-center gap-1 overflow-x-auto rounded-full border border-[#BDE7E1] bg-[#E9F8F3] p-1.5 xl:flex">
                        {menuItems.map((item) => {
                            const isActive = item.url === '/' ? pathname === '/' : pathname.startsWith(item.url);
                            const Icon = item.icon;

                            return (
                                <Link
                                    key={item.url}
                                    href={item.url}
                                    className={cn(
                                        'jaga-nav-link group inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-2 text-[12px] font-black transition-all duration-200 hover:-translate-y-0.5',
                                        isActive ? 'is-active' : 'is-inactive'
                                    )}
                                    style={navItemStyle(isActive)}
                                    aria-current={isActive ? 'page' : undefined}
                                >
                                    <span
                                        className="jaga-nav-icon flex h-7 w-7 items-center justify-center rounded-full border transition"
                                        style={navIconStyle(isActive)}
                                    >
                                        <Icon className="h-4 w-4" style={{ color: '#0B6E78', stroke: '#0B6E78', opacity: 1 }} strokeWidth={2.6} />
                                    </span>
                                    <span className="jaga-nav-text whitespace-nowrap" style={navTextStyle(isActive)}>{item.title}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="hidden shrink-0 items-center gap-1.5 xl:flex">
                        {authUser ? (
                            <>
                                <Link
                                    href="/dashboard"
                                    className="jaga-auth-chip group hidden min-w-0 max-w-[168px] items-center gap-2 rounded-2xl border border-[#BDE7E1] bg-white px-2.5 py-1.5 transition hover:-translate-y-0.5 hover:border-[#0FA3A0] hover:bg-[#F6FBF8] hover:shadow-sm 2xl:flex"
                                    style={{ color: '#07324A', opacity: 1, WebkitTextFillColor: '#07324A' }}
                                >
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt={authUser.name} className="h-9 w-9 rounded-xl border border-white shadow-sm" />
                                    ) : (
                                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#334155] text-white shadow-sm">
                                            <User className="h-4 w-4" />
                                        </div>
                                    )}
                                    <div className="jaga-auth-chip-text min-w-0 max-w-[104px] flex-1 text-left">
                                        <p className="jaga-auth-chip-name truncate text-sm font-black leading-none" style={{ color: '#07324A', WebkitTextFillColor: '#07324A' }} title={authUser.name}>{authUser.name}</p>
                                        <p className="jaga-auth-chip-role mt-1 truncate text-[11px] font-bold" style={{ color: '#0B6E78', WebkitTextFillColor: '#0B6E78' }} title={authUser.role === 'admin' ? 'Admin' : 'Pengguna'}>{authUser.role === 'admin' ? 'Admin' : 'Pengguna'}</p>
                                    </div>
                                </Link>

                                <Button asChild size="sm" className="rounded-xl bg-[#0B6E78] px-3 font-black text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#07324A]">
                                    <Link href="/dashboard" className="jaga-auth-dashboard-link" style={{ color: '#FFFFFF', WebkitTextFillColor: '#FFFFFF' }}>
                                        <LayoutDashboard className="mr-1.5 h-4 w-4" />
                                        Dashboard
                                    </Link>
                                </Button>

                                <Button asChild size="sm" variant="outline" className="rounded-xl border-[#BDE7E1] bg-white px-3 font-black text-[#07324A] transition hover:-translate-y-0.5 hover:border-[#F47B52]/50 hover:bg-[#FFF4F4] hover:text-[#F47B52]">
                                    <Link href={route('logout')} method="post" as="button" className="jaga-auth-logout-link" style={{ color: '#07324A', WebkitTextFillColor: '#07324A' }}>
                                        <LogOut className="mr-1.5 h-4 w-4" />
                                        Keluar
                                    </Link>
                                </Button>
                            </>
                        ) : (
                            <Button asChild variant="default" size="sm" className={cn('rounded-xl bg-[#0B6E78] px-3 font-black text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#07324A]', isLoginPage && 'ring-2 ring-slate-400/35')}>
                                <Link href="/safekey/login" className="jaga-auth-login-link" style={{ color: '#FFFFFF', WebkitTextFillColor: '#FFFFFF' }}>
                                    <LogIn className="mr-1.5 h-4 w-4" />
                                    Masuk
                                </Link>
                            </Button>
                        )}
                    </div>

                    <div className="flex items-center gap-2 xl:hidden">
                        <button
                            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#BDE7E1] bg-white text-[#0B6E78] shadow-sm transition hover:border-[#0FA3A0] hover:bg-[#F6FBF8]"
                            onClick={() => setMobileOpen(!mobileOpen)}
                            type="button"
                            aria-label="Buka menu"
                            style={{ color: '#0B6E78', WebkitTextFillColor: '#0B6E78' }}
                        >
                            {mobileOpen ? <X className="h-5 w-5" style={{ color: '#0B6E78', stroke: '#0B6E78' }} /> : <Menu className="h-5 w-5" style={{ color: '#0B6E78', stroke: '#0B6E78' }} />}
                        </button>
                    </div>
                </div>
            </div>

            {mobileOpen && (
                <div className="border-t border-[#BDE7E1] bg-white px-4 pb-4 shadow-xl xl:hidden">
                    <nav className="grid gap-2 pt-3">
                        {menuItems.map((item) => {
                            const isActive = item.url === '/' ? pathname === '/' : pathname.startsWith(item.url);
                            const Icon = item.icon;

                            return (
                                <Link
                                    key={item.url}
                                    href={item.url}
                                    onClick={() => setMobileOpen(false)}
                                    className={cn(
                                        'jaga-mobile-nav-link group flex items-center gap-3 rounded-2xl border px-3 py-3 text-sm font-black transition-all',
                                        isActive ? 'is-active' : 'is-inactive'
                                    )}
                                    style={navItemStyle(isActive)}
                                    aria-current={isActive ? 'page' : undefined}
                                >
                                    <span
                                        className="jaga-mobile-nav-icon flex h-8 w-8 items-center justify-center rounded-xl border"
                                        style={navIconStyle(isActive)}
                                    >
                                        <Icon className="h-4 w-4" style={{ color: '#0B6E78', stroke: '#0B6E78', opacity: 1 }} strokeWidth={2.6} />
                                    </span>
                                    <span style={navTextStyle(isActive)}>{item.title}</span>
                                    <span className="ml-auto text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: isActive ? 'rgba(255,255,255,.75)' : '#35506D', WebkitTextFillColor: isActive ? 'rgba(255,255,255,.75)' : '#35506D' }}>{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="mt-3 flex gap-2 border-t border-[#BDE7E1] pt-3">
                        {authUser ? (
                            <>
                                <Button asChild size="sm" className="flex-1 rounded-xl bg-[#0B6E78] font-black text-white hover:bg-[#07324A]">
                                    <Link href="/dashboard" className="jaga-auth-dashboard-link" onClick={() => setMobileOpen(false)} style={{ color: '#FFFFFF', WebkitTextFillColor: '#FFFFFF' }}>
                                        <LayoutDashboard className="mr-1.5 h-4 w-4" />
                                        Dashboard
                                    </Link>
                                </Button>
                                <Button asChild size="sm" variant="outline" className="flex-1 rounded-xl border-[#BDE7E1] bg-white font-black text-[#07324A] hover:bg-[#FFF4F4] hover:text-[#F47B52]">
                                    <Link href={route('logout')} method="post" as="button" className="jaga-auth-logout-link" onClick={() => setMobileOpen(false)} style={{ color: '#07324A', WebkitTextFillColor: '#07324A' }}>
                                        <LogOut className="mr-1.5 h-4 w-4" />
                                        Keluar
                                    </Link>
                                </Button>
                            </>
                        ) : (
                            <Button asChild size="sm" className="flex-1 rounded-xl bg-[#0B6E78] font-black text-white hover:bg-[#07324A]">
                                <Link href="/safekey/login" className="jaga-auth-login-link" onClick={() => setMobileOpen(false)} style={{ color: '#FFFFFF', WebkitTextFillColor: '#FFFFFF' }}>
                                    <LogIn className="mr-1.5 h-4 w-4" />
                                    Masuk
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
}
