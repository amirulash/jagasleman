import { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import {
    Home,
    Map,
    FileWarning,
    BarChart3,
    Newspaper,
    Phone,
    Shield,
    Menu,
    X,
    LogIn,
    User,
    LayoutDashboard,
} from 'lucide-react';
import { Button } from '@/Components/Safekey/ui/button';
import { cn } from '@/lib/utils';

const menuItems = [
    { title: 'Beranda', url: '/', icon: Home },
    { title: 'Peta Kejadian', url: '/webgis', icon: Map },
    { title: 'Laporkan', url: '/report', icon: FileWarning },
    { title: 'Statistik', url: '/statistics', icon: BarChart3 },
    { title: 'Berita', url: '/news', icon: Newspaper },
    { title: 'Kontak Darurat', url: '/emergency', icon: Phone },
];

export default function TopNavbar() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const { auth } = usePage().props;
    const authUser = auth?.user;

    const pathname =
        typeof window !== 'undefined' ? window.location.pathname : '/';

    const isLoginPage = ['/login', '/safekey/login'].includes(pathname);
    const isRegisterPage = ['/register', '/safekey/register'].includes(pathname);

    const getAuthButtonClass = (isActive) =>
        isActive
            ? 'bg-emerald-800 text-white hover:bg-emerald-900 shadow-lg shadow-emerald-900/20'
            : 'bg-white text-stone-800 border border-stone-200 hover:bg-amber-50 hover:text-emerald-900 shadow-sm';

    const avatarUrl = authUser?.name
        ? `https://ui-avatars.com/api/?name=${encodeURIComponent(
              authUser.name,
          )}&background=059669&color=ffffff&bold=true`
        : null;

    return (
        <header className="relative z-50 h-full border-b border-stone-200/80 bg-gradient-to-r from-stone-50 via-amber-50/95 to-emerald-50/90 shadow-[0_10px_30px_rgba(28,25,23,0.08)] backdrop-blur-xl">
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-emerald-700 via-amber-500 to-emerald-700" />

            <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4">
                {/* LOGO */}
                <Link href="/" className="group flex items-center gap-3">
                    <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/80 bg-gradient-to-br from-emerald-700 to-stone-900 shadow-lg shadow-emerald-900/20 transition-transform group-hover:scale-105">
                        <Shield className="h-5 w-5 text-white" />
                        <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-stone-50 bg-emerald-400" />
                    </div>

                    <div className="leading-tight">
                        <span className="block text-base font-black tracking-tight text-stone-950">
                            JagaSleman
                        </span>
                        <p className="mt-0.5 text-[10px] font-semibold text-emerald-700">
                            Public Safety WebGIS
                        </p>
                    </div>
                </Link>

                {/* DESKTOP MENU */}
                <nav className="hidden items-center gap-1 rounded-2xl border border-stone-200/80 bg-white/75 p-1 shadow-sm backdrop-blur-xl lg:flex">
                    {menuItems.map((item) => {
                        const isActive =
                            item.url === '/'
                                ? pathname === '/'
                                : pathname.startsWith(item.url);

                        return (
                            <Link
                                key={item.url}
                                href={item.url}
                                className={cn(
                                    'flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold transition-all duration-200',
                                    isActive
                                        ? 'bg-white text-stone-950 shadow-md shadow-stone-900/10 ring-1 ring-emerald-700/10'
                                        : 'text-stone-700 hover:bg-amber-50 hover:text-emerald-900',
                                )}
                            >
                                <item.icon className="h-4 w-4" />
                                {item.title}
                            </Link>
                        );
                    })}
                </nav>

                {/* DESKTOP AUTH */}
                <div className="hidden items-center gap-2 lg:flex">
                    {authUser ? (
                        <>
                            <Link
                                href="/dashboard"
                                className="flex items-center gap-2 rounded-2xl px-2.5 py-1.5 transition hover:bg-white/80"
                            >
                                {avatarUrl ? (
                                    <img
                                        src={avatarUrl}
                                        alt={authUser.name}
                                        className="h-9 w-9 rounded-xl border border-white shadow-sm"
                                    />
                                ) : (
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-sm">
                                        <User className="h-4 w-4" />
                                    </div>
                                )}

                                <div className="max-w-[130px] text-left">
                                    <p className="truncate text-sm font-black leading-none text-stone-950">
                                        {authUser.name}
                                    </p>
                                    <p className="mt-1 text-[11px] font-bold text-emerald-700">
                                        {authUser.role === 'admin'
                                            ? 'Admin'
                                            : 'User'}
                                    </p>
                                </div>
                            </Link>

                            <Button
                                asChild
                                size="sm"
                                className="rounded-xl bg-stone-950 text-white shadow-lg shadow-stone-900/15 hover:bg-emerald-900"
                            >
                                <Link href="/dashboard">
                                    <LayoutDashboard className="mr-1.5 h-4 w-4" />
                                    Dashboard
                                </Link>
                            </Button>

                            <Button
                                asChild
                                size="sm"
                                variant="outline"
                                className="rounded-xl border-stone-200 bg-white/85 text-stone-700 hover:bg-amber-50 hover:text-stone-950"
                            >
                                <Link
                                    href={route('logout')}
                                    method="post"
                                    as="button"
                                >
                                    Keluar
                                </Link>
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                asChild
                                variant="default"
                                size="sm"
                                className={`rounded-xl ${getAuthButtonClass(
                                    isLoginPage,
                                )}`}
                            >
                                <Link href="/safekey/login">
                                    <LogIn className="mr-1.5 h-4 w-4" />
                                    Masuk
                                </Link>
                            </Button>

                            <Button
                                asChild
                                size="sm"
                                className={`rounded-xl ${getAuthButtonClass(
                                    isRegisterPage,
                                )}`}
                            >
                                <Link href="/safekey/register">Daftar</Link>
                            </Button>
                        </>
                    )}
                </div>

                {/* MOBILE BUTTON */}
                <button
                    className="rounded-xl border border-stone-200 bg-white/85 p-2 text-stone-800 shadow-sm lg:hidden"
                    onClick={() => setMobileOpen(!mobileOpen)}
                    type="button"
                    aria-label="Buka menu"
                >
                    {mobileOpen ? (
                        <X className="h-5 w-5" />
                    ) : (
                        <Menu className="h-5 w-5" />
                    )}
                </button>
            </div>

            {/* MOBILE MENU */}
            {mobileOpen && (
                <div className="border-t border-stone-200 bg-white/95 px-4 pb-4 shadow-xl backdrop-blur-xl lg:hidden">
                    <nav className="flex flex-col gap-1 pt-3">
                        {menuItems.map((item) => {
                            const isActive =
                                item.url === '/'
                                    ? pathname === '/'
                                    : pathname.startsWith(item.url);

                            return (
                                <Link
                                    key={item.url}
                                    href={item.url}
                                    onClick={() => setMobileOpen(false)}
                                    className={cn(
                                        'flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors',
                                        isActive
                                            ? 'bg-emerald-700 text-white shadow-md'
                                            : 'text-stone-700 hover:bg-amber-50 hover:text-emerald-900',
                                    )}
                                >
                                    <item.icon className="h-4 w-4" />
                                    {item.title}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="mt-3 flex gap-2 border-t border-stone-200 pt-3">
                        {authUser ? (
                            <>
                                <Button
                                    asChild
                                    size="sm"
                                    className="flex-1 rounded-xl bg-stone-950 text-white hover:bg-emerald-900"
                                >
                                    <Link
                                        href="/dashboard"
                                        onClick={() => setMobileOpen(false)}
                                    >
                                        Dashboard
                                    </Link>
                                </Button>

                                <Button
                                    asChild
                                    size="sm"
                                    variant="outline"
                                    className="flex-1 rounded-xl border-stone-200 bg-white text-stone-700 hover:bg-amber-50"
                                >
                                    <Link
                                        href={route('logout')}
                                        method="post"
                                        as="button"
                                        onClick={() => setMobileOpen(false)}
                                    >
                                        Keluar
                                    </Link>
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    asChild
                                    size="sm"
                                    className="flex-1 rounded-xl bg-emerald-800 text-white hover:bg-emerald-900"
                                >
                                    <Link
                                        href="/safekey/login"
                                        onClick={() => setMobileOpen(false)}
                                    >
                                        Masuk
                                    </Link>
                                </Button>

                                <Button
                                    asChild
                                    size="sm"
                                    className="flex-1 rounded-xl border border-stone-200 bg-white text-stone-800 hover:bg-amber-50"
                                >
                                    <Link
                                        href="/safekey/register"
                                        onClick={() => setMobileOpen(false)}
                                    >
                                        Daftar
                                    </Link>
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
}
