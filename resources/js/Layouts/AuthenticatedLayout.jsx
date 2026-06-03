import Dropdown from '@/Components/Dropdown';
import ResponsiveNavLink from '@/Components/ResponsiveNavLink';
import { Link, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { BarChart3, ChevronRight, FileCheck2, LayoutDashboard, LogOut, Menu, Shield, UserCheck, UserCircle, X } from 'lucide-react';

export default function AuthenticatedLayout({ header, children }) {
    const user = usePage().props.auth.user;
    const [showingNavigationDropdown, setShowingNavigationDropdown] = useState(false);

    const navItems = [
        { label: 'Dashboard', href: route('dashboard'), active: route().current('dashboard'), icon: LayoutDashboard, show: true },
        { label: 'Moderasi Laporan', href: route('admin.reports.index'), active: route().current('admin.reports.index'), icon: FileCheck2, show: user.role === 'admin' },
        { label: 'Approval User', href: route('admin.users.index'), active: route().current('admin.users.index'), icon: UserCheck, show: user.role === 'admin' },
        { label: 'Lihat WebGIS', href: '/webgis', active: false, icon: BarChart3, show: true },
    ].filter((item) => item.show);

    return (
        <div className="theme-shell min-h-screen transition-colors">
            <div className="flex min-h-screen">
                <aside className="hidden lg:flex w-72 flex-col bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))] shadow-2xl">
                    <div className="p-6 border-b border-sidebar-border">
                        <Link href="/" className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xlr flex items-center justify-center shadow-lg shadow-[#F47B52]/20">
                                <Shield className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <p className="text-xl font-black leading-tight">JagaSleman</p>
                                <p className="text-xs text-[hsl(var(--sidebar-muted))]">Admin Control Center</p>
                            </div>
                        </Link>
                    </div>

                    <div className="p-4 space-y-2 flex-1">
                        <p className="px-3 text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--sidebar-muted))] font-black mb-3">Navigasi Admin</p>
                        {navItems.map(({ label, href, active, icon: Icon }) => (
                            <Link
                                key={label}
                                href={href}
                                className={`group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold transition-all ${
                                    active ? 'bg-white text-foreground shadow-lg dark:bg-[hsl(var(--sidebar-primary))] dark:text-[hsl(var(--sidebar-primary-foreground))]' : 'text-white/68 hover:bg-white/10 hover:text-white'
                                }`}
                            >
                                <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${active ? 'bg-[#F2FAF6] text-[#F47B52] dark:bg-white/20 dark:text-white' : 'bg-white/10 text-[#BDE7E1]'}`}>
                                    <Icon className="w-5 h-5" />
                                </span>
                                <span className="flex-1">{label}</span>
                                <ChevronRight className={`w-4 h-4 ${active ? 'text-slate-400 dark:text-white/75' : 'text-white/30 group-hover:text-white/70'}`} />
                            </Link>
                        ))}
                    </div>

                    <div className="p-4 border-t border-sidebar-border">
                        <div className="rounded-3xl bg-white/10 border border-sidebar-border p-4 mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-2xl bg-[#0B6E78] flex items-center justify-center"><UserCircle className="w-6 h-6" /></div>
                                <div className="min-w-0">
                                    <p className="font-black text-sm truncate">{user.name}</p>
                                    <p className="text-xs text-white/45 truncate">{user.email}</p>
                                </div>
                            </div>
                        </div>
                        <Link href={route('profile.edit')} className="block rounded-2xl px-3 py-2 text-sm font-semibold text-white/70 hover:bg-white/10 hover:text-white">Profile</Link>
                        <Link href={route('logout')} method="post" as="button" className="w-full text-left rounded-2xl px-3 py-2 text-sm font-semibold text-rose-200 hover:bg-rose-500/15 hover:text-rose-100 flex items-center gap-2"><LogOut className="w-4 h-4" /> Log Out</Link>
                    </div>
                </aside>

                <div className="flex-1 min-w-0 flex flex-col">
                    <nav className="lg:hidden theme-elevated border-b theme-border sticky top-0 z-50">
                        <div className="px-4 h-16 flex items-center justify-between gap-3">
                            <Link href="/" className="font-black text-foreground">JagaSleman Admin</Link>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setShowingNavigationDropdown((v) => !v)} className="w-10 h-10 rounded-2xl theme-surface border theme-border flex items-center justify-center">
                                    {showingNavigationDropdown ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                        {showingNavigationDropdown && (
                            <div className="border-t theme-border p-3 space-y-1">
                                {navItems.map(({ label, href, active }) => (
                                    <ResponsiveNavLink key={label} href={href} active={active}>{label}</ResponsiveNavLink>
                                ))}
                                <ResponsiveNavLink href={route('profile.edit')}>Profile</ResponsiveNavLink>
                                <ResponsiveNavLink method="post" href={route('logout')} as="button">Log Out</ResponsiveNavLink>
                            </div>
                        )}
                    </nav>

                    <header className="theme-elevated border-b theme-border sticky top-0 z-40 hidden lg:block">
                        <div className="px-6 py-4 flex items-center justify-between gap-4">
                            <div>{header || <h2 className="text-xl font-black text-foreground">Dashboard Admin</h2>}</div>
                            <div className="flex items-center gap-3">
                                <Dropdown>
                                    <Dropdown.Trigger>
                                        <button type="button" className="inline-flex items-center gap-2 rounded-2xl border theme-border theme-surface px-4 py-2 text-sm font-bold text-foreground shadow-sm hover:bg-secondary">
                                            {user.name}<ChevronRight className="w-4 h-4 rotate-90" />
                                        </button>
                                    </Dropdown.Trigger>
                                    <Dropdown.Content>
                                        <Dropdown.Link href={route('profile.edit')}>Profile</Dropdown.Link>
                                        <Dropdown.Link href={route('logout')} method="post" as="button">Log Out</Dropdown.Link>
                                    </Dropdown.Content>
                                </Dropdown>
                            </div>
                        </div>
                    </header>

                    <main className="flex-1 min-w-0">{children}</main>
                </div>
            </div>
        </div>
    );
}
