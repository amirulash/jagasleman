import ApplicationLogo from '@/Components/ApplicationLogo';
import { Link } from '@inertiajs/react';

export default function GuestLayout({ children }) {
    return (
        <div className="min-h-screen overflow-hidden bg-slate-50 relative flex items-center justify-center px-4 py-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(6,182,212,.16),transparent_28rem),radial-gradient(circle_at_82%_16%,rgba(16,185,129,.14),transparent_26rem),linear-gradient(135deg,#f8fafc,#eef6fb)]" />
            <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(15,23,42,.045)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,.045)_1px,transparent_1px)] [background-size:32px_32px]" />

            <div className="relative z-10 w-full max-w-md">
                <div className="mb-6 flex justify-center">
                    <Link href="/" className="group flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/75 px-4 py-3 shadow-lg shadow-slate-900/5 backdrop-blur-xl transition hover:-translate-y-0.5 hover:shadow-[#D95F5F]/10">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xlr text-white shadow-lg shadow-[#D95F5F]/25">
                            <ApplicationLogo className="h-7 w-7 fill-current text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-extrabold tracking-tight text-foreground">JagaSleman</p>
                            <p className="text-[11px] font-medium text-slate-500">Sistem Keamanan WebGIS</p>
                        </div>
                    </Link>
                </div>

                <div className="overflow-hidden rounded-[1.6rem] border border-slate-200/80 bg-white/86 p-6 shadow-2xl shadow-slate-900/10 backdrop-blur-xl">
                    {children}
                </div>
            </div>
        </div>
    );
}
