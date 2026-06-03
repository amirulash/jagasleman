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
        <header className="jaga-top-navbar sticky top-0 z-50 border-b border-[#D8E4ED]/70 bg-white/90 shadow-[0_14px_40px_rgba(15,31,46,.10)] backdrop-blur-xl">
            <div className="mx-auto max-w-[96rem] px-3 py-2.5 sm:px-4">
                <div className="flex h-14 items-center justify-between gap-2 rounded-[1.45rem] border border-[#D8E4ED]/85 bg-white/95 px-2 shadow-[0_10px_30px_rgba(15,31,46,.08)]">
                    <Link
                        href="/"
                        className="group relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[1.05rem] border border-[#D8E4ED] bg-[#EFF4F8] shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:scale-105 hover:border-[#5BAE8A]/70 hover:bg-white"
                        aria-label="Kembali ke Beranda"
                        title="Kembali ke Beranda"
                    >
                        <span className="absolute inset-0 rounded-[1.05rem] bg-slate-300/0 blur-xl transition group-hover:bg-slate-300/20" />
                        <img
                            src="/images/logo_jagasleman.png"
                            alt="Logo JagaSleman"
                            className="relative z-10 h-9 w-9 object-contain drop-shadow-sm transition-transform duration-300 group-hover:rotate-[-4deg]"
                        />
                        <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-slate-300 shadow-sm" />
                    </Link>

                    <nav className="hidden min-w-0 items-center gap-1 rounded-full border border-[#D8E4ED]/80 bg-[#EFF4F8] p-1 xl:flex">
                        {menuItems.map((item) => {
                            const isActive = item.url === '/' ? pathname === '/' : pathname.startsWith(item.url);
                            const Icon = item.icon;

                            return (
                                <Link
                                    key={item.url}
                                    href={item.url}
                                    className={cn(
                                        'jaga-nav-link group inline-flex items-center gap-1.5 rounded-full px-2.5 py-2 text-[13px] font-black transition-all duration-200',
                                        isActive
                                            ? 'is-active bg-[#0F1F2E] text-white shadow-md shadow-[#0F1F2E]/20'
                                            : 'text-[#1A3348] hover:-translate-y-0.5 hover:bg-white hover:text-[#D95F5F] hover:shadow-sm'
                                    )}
                                    aria-current={isActive ? 'page' : undefined}
                                >
                                    <span className={cn(
                                        'jaga-nav-icon flex h-7 w-7 items-center justify-center rounded-full transition',
                                        isActive ? 'bg-white/15 text-white' : 'bg-white text-[#27527A] group-hover:bg-[#D95F5F] group-hover:text-white'
                                    )}>
                                        <Icon className="h-4 w-4" />
                                    </span>
                                    <span className="jaga-nav-text whitespace-nowrap">{item.title}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="hidden items-center gap-1.5 xl:flex">
                        {authUser ? (
                            <>
                                <Link href="/dashboard" className="jaga-auth-chip group flex min-w-0 max-w-[190px] items-center gap-2 rounded-2xl border border-[#D8E4ED] bg-[#EFF4F8] px-2.5 py-1.5 text-[#0F1F2E] transition hover:-translate-y-0.5 hover:border-[#5BAE8A]/70 hover:bg-white hover:shadow-sm">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt={authUser.name} className="h-9 w-9 rounded-xl border border-white shadow-sm" />
                                    ) : (
                                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#334155] text-white shadow-sm">
                                            <User className="h-4 w-4" />
                                        </div>
                                    )}
                                    <div className="jaga-auth-chip-text min-w-0 max-w-[104px] flex-1 text-left">
                                        <p className="jaga-auth-chip-name truncate text-sm font-black leading-none text-[#0F1F2E]" title={authUser.name}>{authUser.name}</p>
                                        <p className="jaga-auth-chip-role mt-1 truncate text-[11px] font-bold text-[#27527A]" title={authUser.role === 'admin' ? 'Admin' : 'Pengguna'}>{authUser.role === 'admin' ? 'Admin' : 'Pengguna'}</p>
                                    </div>
                                </Link>

                                <Button asChild size="sm" className="rounded-xl bg-[#334155] px-3 font-black text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#1F2937]">
                                    <Link href="/dashboard">
                                        <LayoutDashboard className="mr-1.5 h-4 w-4" />
                                        Dashboard
                                    </Link>
                                </Button>

                                <Button asChild size="sm" variant="outline" className="rounded-xl border-[#D8E4ED] bg-white px-3 font-black text-[#1A3348] transition hover:-translate-y-0.5 hover:border-[#D95F5F]/50 hover:bg-[#EFF4F8] hover:text-[#D95F5F]">
                                    <Link href={route('logout')} method="post" as="button">
                                        <LogOut className="mr-1.5 h-4 w-4" />
                                        Keluar
                                    </Link>
                                </Button>
                            </>
                        ) : (
                            <Button asChild variant="default" size="sm" className={cn('rounded-xl bg-[#334155] px-3 font-black text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#1F2937]', isLoginPage && 'ring-2 ring-slate-400/35')}>
                                <Link href="/safekey/login">
                                    <LogIn className="mr-1.5 h-4 w-4" />
                                    Masuk
                                </Link>
                            </Button>
                        )}
                    </div>

                    <div className="flex items-center gap-2 xl:hidden">
                        <button
                            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#D8E4ED] bg-[#EFF4F8] text-[#0F1F2E] shadow-sm transition hover:border-[#5BAE8A]/70 hover:bg-white"
                            onClick={() => setMobileOpen(!mobileOpen)}
                            type="button"
                            aria-label="Buka menu"
                        >
                            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </button>
                    </div>
                </div>
            </div>

            {mobileOpen && (
                <div className="border-t border-[#D8E4ED] bg-white/95 px-4 pb-4 shadow-xl backdrop-blur-xl xl:hidden">
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
                                        isActive
                                            ? 'is-active border-[#0F1F2E] bg-[#0F1F2E] text-white shadow-md'
                                            : 'border-[#D8E4ED] bg-[#EFF4F8] text-[#0F1F2E] hover:border-[#5BAE8A]/70 hover:bg-white'
                                    )}
                                    aria-current={isActive ? 'page' : undefined}
                                >
                                    <span className={cn(
                                        'jaga-mobile-nav-icon flex h-8 w-8 items-center justify-center rounded-xl',
                                        isActive ? 'bg-white/15 text-white' : 'bg-white text-[#27527A]'
                                    )}>
                                        <Icon className="h-4 w-4" />
                                    </span>
                                    <span>{item.title}</span>
                                    <span className={cn('ml-auto text-[10px] font-black uppercase tracking-[0.16em]', isActive ? 'text-white/65' : 'text-[#35506D]')}>{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="mt-3 flex gap-2 border-t border-[#D8E4ED] pt-3">
                        {authUser ? (
                            <>
                                <Button asChild size="sm" className="flex-1 rounded-xl bg-[#334155] font-black text-white hover:bg-[#1F2937]">
                                    <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
                                        <LayoutDashboard className="mr-1.5 h-4 w-4" />
                                        Dashboard
                                    </Link>
                                </Button>
                                <Button asChild size="sm" variant="outline" className="flex-1 rounded-xl border-[#D8E4ED] bg-white font-black text-[#1A3348] hover:bg-[#EFF4F8] hover:text-[#D95F5F]">
                                    <Link href={route('logout')} method="post" as="button" onClick={() => setMobileOpen(false)}>
                                        <LogOut className="mr-1.5 h-4 w-4" />
                                        Keluar
                                    </Link>
                                </Button>
                            </>
                        ) : (
                            <Button asChild size="sm" className="flex-1 rounded-xl bg-[#334155] font-black text-white hover:bg-[#1F2937]">
                                <Link href="/safekey/login" onClick={() => setMobileOpen(false)}>
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
