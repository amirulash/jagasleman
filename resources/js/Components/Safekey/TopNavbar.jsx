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
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
    const isLoginPage = ['/login', '/safekey/login'].includes(pathname);
    const isRegisterPage = ['/register', '/safekey/register'].includes(pathname);

    const getAuthButtonClass = (isActive) =>
        isActive
            ? 'bg-primary-foreground text-police hover:bg-primary-foreground/90'
            : 'bg-primary text-primary-foreground hover:bg-primary/85 border border-primary-foreground/30';

    const avatarUrl = authUser?.name
        ? `https://ui-avatars.com/api/?name=${encodeURIComponent(authUser.name)}&background=ffffff&color=7f1d1d&bold=true`
        : null;

    return (
        <header className="h-full z-50 bg-gradient-to-r from-primary via-primary to-police border-b border-primary-foreground/20 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-full">
                <Link href="/" className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                        <Shield className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                        <span className="text-base font-bold tracking-tight text-primary-foreground">JagaSleman</span>
                        <p className="text-[10px] text-primary-foreground/75 leading-none">Keamanan Kab. Sleman</p>
                    </div>
                </Link>

                <nav className="hidden lg:flex items-center gap-1">
                    {menuItems.map((item) => {
                        const isActive = item.url === '/' ? pathname === '/' : pathname.startsWith(item.url);
                        return (
                            <Link
                                key={item.url}
                                href={item.url}
                                className={cn(
                                    'flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                                    isActive
                                        ? 'bg-primary-foreground/15 text-primary-foreground'
                                        : 'text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10',
                                )}
                            >
                                <item.icon className="w-4 h-4" />
                                {item.title}
                            </Link>
                        );
                    })}
                </nav>

                <div className="hidden lg:flex items-center gap-2">
                    {authUser ? (
                        <>
                            <Link href="/dashboard" className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-primary-foreground/10 transition-colors">
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt={authUser.name} className="h-9 w-9 rounded-full border border-primary-foreground/30" />
                                ) : (
                                    <div className="h-9 w-9 rounded-full border border-primary-foreground/30 bg-primary-foreground/10 flex items-center justify-center">
                                        <User className="w-4 h-4 text-primary-foreground" />
                                    </div>
                                )}
                                <div className="text-left">
                                    <p className="text-sm font-semibold text-primary-foreground leading-none">{authUser.name}</p>
                                    <p className="text-[11px] text-primary-foreground/75 mt-1">{authUser.role === 'admin' ? 'Admin' : 'User'}</p>
                                </div>
                            </Link>
                            <Button asChild size="sm" className="bg-primary-foreground text-police hover:bg-primary-foreground/90">
                                <Link href="/dashboard">
                                    <LayoutDashboard className="w-4 h-4 mr-1.5" />
                                    Dashboard
                                </Link>
                            </Button>
                            <Button asChild size="sm" variant="outline" className="border-primary-foreground/30 text-primary-foreground bg-transparent hover:bg-primary-foreground/10">
                                <Link href={route('logout')} method="post" as="button">Keluar</Link>
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                asChild
                                variant="default"
                                size="sm"
                                className={getAuthButtonClass(isLoginPage)}
                            >
                                <Link href="/safekey/login">
                                    <LogIn className="w-4 h-4 mr-1.5" />
                                    Masuk
                                </Link>
                            </Button>
                            <Button asChild size="sm" className={getAuthButtonClass(isRegisterPage)}>
                                <Link href="/safekey/register">Daftar</Link>
                            </Button>
                        </>
                    )}
                </div>

                <button className="lg:hidden p-2 text-primary-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
                    {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
            </div>

            {mobileOpen && (
                <div className="lg:hidden border-t border-primary-foreground/20 bg-primary px-4 pb-4">
                    <nav className="flex flex-col gap-1 pt-2">
                        {menuItems.map((item) => {
                            const isActive = item.url === '/' ? pathname === '/' : pathname.startsWith(item.url);
                            return (
                                <Link
                                    key={item.url}
                                    href={item.url}
                                    onClick={() => setMobileOpen(false)}
                                    className={cn(
                                        'flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                                        isActive
                                            ? 'bg-primary-foreground/15 text-primary-foreground'
                                            : 'text-primary-foreground/75 hover:text-primary-foreground hover:bg-primary-foreground/10',
                                    )}
                                >
                                    <item.icon className="w-4 h-4" />
                                    {item.title}
                                </Link>
                            );
                        })}
                    </nav>
                    <div className="flex gap-2 mt-3 pt-3 border-t border-primary-foreground/20">
                        {authUser ? (
                            <>
                                <Button asChild size="sm" className="flex-1 bg-primary-foreground text-police hover:bg-primary-foreground/90">
                                    <Link href="/dashboard" onClick={() => setMobileOpen(false)}>Dashboard</Link>
                                </Button>
                                <Button asChild size="sm" variant="outline" className="flex-1 border-primary-foreground/30 text-primary-foreground bg-transparent hover:bg-primary-foreground/10">
                                    <Link href={route('logout')} method="post" as="button" onClick={() => setMobileOpen(false)}>
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
                                    className={`flex-1 ${getAuthButtonClass(isLoginPage)}`}
                                >
                                    <Link href="/safekey/login" onClick={() => setMobileOpen(false)}>
                                        Masuk
                                    </Link>
                                </Button>
                                <Button asChild size="sm" className={`flex-1 ${getAuthButtonClass(isRegisterPage)}`}>
                                    <Link href="/safekey/register" onClick={() => setMobileOpen(false)}>
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
