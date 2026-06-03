import { Link } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import {
    AlertTriangle,
    ArrowRight,
    BarChart3,
    CheckCircle2,
    Clock3,
    FileText,
    Map,
    MapPin,
    Printer,
    RefreshCw,
    ShieldCheck,
    Sparkles,
    Trash2,
    XCircle,
} from 'lucide-react';

type ReportStatus = 'pending' | 'approved' | 'rejected';

type IncidentReport = {
    id: number;
    report_code?: string | null;
    reporter_name?: string | null;
    reporter_email?: string | null;
    reporter_phone?: string | null;
    title?: string | null;
    incident_type?: string | null;
    description?: string | null;
    location?: string | null;
    district?: string | null;
    village?: string | null;
    latitude?: string | number | null;
    longitude?: string | number | null;
    incident_at?: string | null;
    status: ReportStatus;
    rejection_reason?: string | null;
    photo_url?: string | null;
    photo_urls?: string[];
    created_at?: string | null;
    reviewed_at?: string | null;
};

const statusConfig: Record<ReportStatus, { label: string; icon: any; className: string; dot: string }> = {
    pending: {
        label: 'Menunggu Review',
        icon: Clock3,
        className: 'border-[#D8E4ED] bg-[#EFF4F8] text-[#D95F5F]',
        dot: 'bg-[#27527A]',
    },
    approved: {
        label: 'Disetujui',
        icon: CheckCircle2,
        className: 'border-[#D8E4ED] bg-[#EFF4F8] text-[#D95F5F]',
        dot: 'bg-[#27527A]',
    },
    rejected: {
        label: 'Ditolak',
        icon: XCircle,
        className: 'border-red-200 bg-red-50 text-red-700',
        dot: 'bg-red-500',
    },
};

function getCsrfToken() {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
}

function getReportCode(report: IncidentReport) {
    return report.report_code || `LAP-${String(report.id).padStart(4, '0')}`;
}

function formatDateTime(value?: string | null) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

function safeText(value?: string | number | null) {
    return String(value ?? '-');
}

function openDashboardPdf(reports: IncidentReport[]) {
    const total = reports.length;
    const pending = reports.filter((item) => item.status === 'pending').length;
    const approved = reports.filter((item) => item.status === 'approved').length;
    const rejected = reports.filter((item) => item.status === 'rejected').length;
    const latestRows = reports.slice(0, 25).map((item, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${getReportCode(item)}</td>
            <td>${safeText(item.incident_type)}</td>
            <td>${safeText(item.location)}</td>
            <td>${statusConfig[item.status]?.label || item.status}</td>
            <td>${formatDateTime(item.created_at)}</td>
        </tr>
    `).join('');

    const html = `<!doctype html>
    <html>
    <head>
        <title>Laporan Dashboard Admin JagaSleman</title>
        <style>
            body { font-family: Arial, sans-serif; color: #0F1F2E; margin: 28px; }
            .header { display: flex; justify-content: space-between; gap: 20px; border-bottom: 3px solid #D95F5F; padding-bottom: 16px; margin-bottom: 18px; }
            h1 { margin: 0; font-size: 24px; }
            .muted { color: #64748b; font-size: 12px; }
            .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 18px 0; }
            .card { border: 1px solid #D8E4ED; border-radius: 16px; padding: 14px; background: #f8fafc; }
            .card b { display: block; font-size: 24px; margin-top: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 18px; }
            th { background: #0F1F2E; color: white; text-align: left; font-size: 11px; padding: 10px; }
            td { border-bottom: 1px solid #e2e8f0; font-size: 11px; padding: 9px; vertical-align: top; }
            @media print { button { display: none; } }
        </style>
    </head>
    <body>
        <button onclick="window.print()" style="float:right;padding:10px 16px;border:0;border-radius:12px;background:#D95F5F;font-weight:700;cursor:pointer">Cetak / Simpan PDF</button>
        <div class="header">
            <div>
                <h1>Ringkasan Dashboard Admin JagaSleman</h1>
                <div class="muted">Laporan dibuat: ${formatDateTime(new Date().toISOString())}</div>
            </div>
            <div class="muted">WebGIS Pemetaan dan Pelaporan Kejahatan Jalanan</div>
        </div>
        <div class="cards">
            <div class="card">Total laporan <b>${total}</b></div>
            <div class="card">Pending <b>${pending}</b></div>
            <div class="card">Disetujui <b>${approved}</b></div>
            <div class="card">Ditolak <b>${rejected}</b></div>
        </div>
        <h2 style="font-size:16px">Data laporan terbaru</h2>
        <table>
            <thead><tr><th>No</th><th>Kode</th><th>Jenis</th><th>Lokasi</th><th>Status</th><th>Dibuat</th></tr></thead>
            <tbody>${latestRows || '<tr><td colspan="6">Belum ada data.</td></tr>'}</tbody>
        </table>
        <script>setTimeout(() => window.print(), 500);</script>
    </body>
    </html>`;

    const win = window.open('', '_blank', 'width=1024,height=720');
    if (!win) return;
    win.document.write(html);
    win.document.close();
}

export default function AdminDashboard() {
    const [reports, setReports] = useState<IncidentReport[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadReports = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/admin/incident-reports?status=all&per_page=500', {
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': getCsrfToken(),
                },
            });

            if (!response.ok) throw new Error('Gagal memuat data dashboard admin.');

            const json = await response.json();
            setReports(Array.isArray(json.data) ? json.data : []);
        } catch (err) {
            console.error(err);
            setError('Dashboard belum berhasil memuat data. Pastikan sudah login sebagai admin dan API aktif.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReports();
    }, []);

    const summary = useMemo(() => {
        const byStatus = {
            pending: reports.filter((item) => item.status === 'pending').length,
            approved: reports.filter((item) => item.status === 'approved').length,
            rejected: reports.filter((item) => item.status === 'rejected').length,
        };

        const approvedWithCoordinate = reports.filter(
            (item) => item.status === 'approved' && item.latitude && item.longitude,
        ).length;

        const topTypes = Object.entries(
            reports.reduce<Record<string, number>>((acc, item) => {
                const key = item.incident_type || 'Tidak diketahui';
                acc[key] = (acc[key] || 0) + 1;
                return acc;
            }, {}),
        )
            .map(([name, total]) => ({ name, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 4);

        const topDistricts = Object.entries(
            reports.reduce<Record<string, number>>((acc, item) => {
                const key = item.district || 'Tidak diketahui';
                acc[key] = (acc[key] || 0) + 1;
                return acc;
            }, {}),
        )
            .map(([name, total]) => ({ name, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 4);

        return {
            total: reports.length,
            ...byStatus,
            approvedWithCoordinate,
            topTypes,
            topDistricts,
            latest: reports.slice(0, 6),
        };
    }, [reports]);

    const cards = [
        { label: 'Total Laporan', value: summary.total, desc: 'Semua laporan masyarakat', icon: FileText, className: 'border-[#D8E4ED] bg-[#EFF4F8] text-[#D95F5F]' },
        { label: 'Menunggu Review', value: summary.pending, desc: 'Perlu divalidasi admin', icon: Clock3, className: 'border-[#D8E4ED] bg-[#EFF4F8] text-[#D95F5F]' },
        { label: 'Terverifikasi', value: summary.approved, desc: 'Siap tampil di WebGIS', icon: CheckCircle2, className: 'border-[#D8E4ED] bg-[#EFF4F8] text-[#D95F5F]' },
        { label: 'Ditolak', value: summary.rejected, desc: 'Tidak tampil di peta', icon: XCircle, className: 'border-red-200 bg-red-50 text-red-700' },
    ];

    return (
        <AdminLayout title="Beranda Admin">
            <div className="space-y-6">
                <section className="admin-print-card overflow-hidden rounded-[2rem] border border-[#D8E4ED] bg-white dark:bg-[#102538] shadow-xl shadow-slate-200/70 dark:border-white/10 dark:bg-white dark:bg-[#102538]/5">
                    <div className="grid gap-6r p-6 text-white lg:grid-cols-[1.3fr_.7fr] lg:p-8">
                        <div>
                            <div className="inline-flex items-center rounded-full border border-white/20 bg-white dark:bg-[#102538]/10 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-[#D8E4ED]">
                                <Sparkles className="mr-2 h-3.5 w-3.5" /> Pusat Kendali Admin
                            </div>
                            <h1 className="mt-5 max-w-3xl text-3xl font-black leading-tight tracking-tight md:text-5xl">
                                Pantau, validasi, dan kelola laporan masyarakat dari satu dashboard.
                            </h1>
                            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/75 md:text-base">
                                Halaman ini menjadi ringkasan awal untuk admin: laporan baru, titik terverifikasi, status validasi, peta laporan, dan ekspor PDF untuk kebutuhan dokumentasi.
                            </p>

                            <div className="admin-no-print mt-6 flex flex-wrap gap-3">
                                <Link href="/admin/laporan" className="inline-flex items-center rounded-2xl bg-white dark:bg-[#102538] px-5 py-3 text-sm font-black text-[#0F1F2E] shadow-lg transition hover:-translate-y-0.5 hover:bg-[#EFF4F8]">
                                    Kelola Laporan <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                                <Link href="/admin/peta" className="inline-flex items-center rounded-2xl border border-white/25 bg-white dark:bg-[#102538]/10 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white dark:bg-[#102538]/15">
                                    Buka Peta Admin <Map className="ml-2 h-4 w-4" />
                                </Link>
                                <button type="button" onClick={() => openDashboardPdf(reports)} className="inline-flex items-center rounded-2xl border border-white/25 bg-white dark:bg-[#102538]/10 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white dark:bg-[#102538]/15">
                                    Export PDF <Printer className="ml-2 h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        <div className="rounded-[2rem] border border-white/20 bg-white dark:bg-[#102538]/10 p-5 backdrop-blur">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.2em] text-white/55">Titik aktif</p>
                                    <p className="mt-2 text-5xl font-black">{summary.approvedWithCoordinate}</p>
                                    <p className="mt-2 text-sm text-white/65">Laporan terverifikasi dengan koordinat valid.</p>
                                </div>
                                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white dark:bg-[#102538] text-[#0F1F2E]">
                                    <MapPin className="h-8 w-8" />
                                </div>
                            </div>

                            <div className="mt-5 grid grid-cols-3 gap-2">
                                {(['pending', 'approved', 'rejected'] as ReportStatus[]).map((status) => {
                                    const Icon = statusConfig[status].icon;
                                    return (
                                        <div key={status} className="rounded-2xl bg-white dark:bg-[#102538]/10 p-3 text-center">
                                            <Icon className="mx-auto h-4 w-4" />
                                            <p className="mt-1 text-lg font-black">{summary[status]}</p>
                                            <p className="text-[10px] text-white/55">{statusConfig[status].label}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </section>

                {error && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                        {error}
                    </div>
                )}

                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {cards.map((card) => {
                        const Icon = card.icon;
                        return (
                            <div key={card.label} className={`admin-print-card rounded-[1.5rem] border p-5 shadow-sm ${card.className}`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-[0.18em] opacity-80">{card.label}</p>
                                        <p className="mt-3 text-4xl font-black">{loading ? '...' : card.value}</p>
                                    </div>
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white dark:bg-[#102538]/70">
                                        <Icon className="h-6 w-6" />
                                    </div>
                                </div>
                                <p className="mt-3 text-sm font-semibold opacity-75">{card.desc}</p>
                            </div>
                        );
                    })}
                </section>

                <section className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
                    <div className="admin-print-card rounded-[2rem] border border-[#D8E4ED] bg-white dark:bg-[#102538] p-6 shadow-xl shadow-slate-200/60 dark:border-white/10 dark:bg-white dark:bg-[#102538]/5">
                        <div className="mb-5 flex items-center justify-between gap-3">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#D95F5F]">Prioritas Admin</p>
                                <h2 className="mt-2 text-2xl font-black text-[#0F1F2E] dark:text-[#EFF4F8]">Aksi cepat</h2>
                            </div>
                            <button type="button" onClick={loadReports} className="admin-no-print rounded-2xl border border-[#D8E4ED] bg-white dark:bg-[#102538] px-4 py-2 text-sm font-black text-[#1A3348] transition hover:bg-[#EFF4F8] dark:border-white/10 dark:bg-white dark:bg-[#102538]/5 dark:text-white">
                                <RefreshCw className="mr-2 inline h-4 w-4" />Refresh
                            </button>
                        </div>

                        <div className="grid gap-3">
                            {[
                                { href: '/admin/laporan', title: 'Review laporan masuk', desc: `${summary.pending} laporan menunggu keputusan admin.`, icon: AlertTriangle, tone: 'bg-[#EFF4F8] text-[#D95F5F] border-[#D8E4ED]' },
                                { href: '/admin/points', title: 'Edit titik terverifikasi', desc: 'Perbaiki jenis, lokasi, koordinat, dan deskripsi titik approved.', icon: ShieldCheck, tone: 'bg-[#EFF4F8] text-[#D95F5F] border-[#D8E4ED]' },
                                { href: '/admin/peta', title: 'Kelola titik dari peta', desc: 'Lihat status laporan berdasarkan warna legenda dan hapus titik langsung dari peta admin.', icon: Map, tone: 'bg-[#EFF4F8] text-[#D95F5F] border-[#D8E4ED]' },
                                { href: '#', title: 'Export laporan PDF', desc: 'Buat ringkasan dashboard siap cetak untuk lampiran.', icon: Printer, tone: 'bg-violet-50 text-violet-700 border-violet-200', onClick: () => openDashboardPdf(reports) },
                            ].map((item) => {
                                const Icon = item.icon;
                                const content = (
                                    <div className={`group rounded-3xl border p-4 transition hover:-translate-y-0.5 hover:shadow-md ${item.tone}`}>
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white dark:bg-[#102538]">
                                                <Icon className="h-6 w-6" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h3 className="font-black">{item.title}</h3>
                                                <p className="mt-1 text-sm font-semibold opacity-75">{item.desc}</p>
                                            </div>
                                            <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
                                        </div>
                                    </div>
                                );

                                if (item.onClick) {
                                    return <button key={item.title} type="button" onClick={item.onClick} className="admin-no-print text-left">{content}</button>;
                                }

                                return <Link key={item.title} href={item.href}>{content}</Link>;
                            })}
                        </div>
                    </div>

                    <div className="admin-print-card rounded-[2rem] border border-[#D8E4ED] bg-white dark:bg-[#102538] p-6 shadow-xl shadow-slate-200/60 dark:border-white/10 dark:bg-white dark:bg-[#102538]/5">
                        <div className="mb-5 flex items-center justify-between gap-3">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#D95F5F]">Monitoring</p>
                                <h2 className="mt-2 text-2xl font-black text-[#0F1F2E] dark:text-[#EFF4F8]">Laporan terbaru</h2>
                            </div>
                            <Link href="/admin/laporan" className="admin-no-print rounded-2xl bg-[#0F1F2E] px-4 py-2 text-sm font-black text-white transition hover:bg-[#D95F5F] hover:text-white">
                                Lihat Semua
                            </Link>
                        </div>

                        <div className="space-y-3">
                            {summary.latest.length === 0 ? (
                                <div className="rounded-3xl border border-dashed border-[#D8E4ED] p-8 text-center text-sm font-semibold text-slate-500 dark:text-slate-300">
                                    Belum ada laporan masyarakat.
                                </div>
                            ) : (
                                summary.latest.map((item) => {
                                    const status = statusConfig[item.status];
                                    return (
                                        <div key={item.id} className="rounded-3xl border border-[#D8E4ED] bg-[#F8FAFC] p-4 dark:border-white/10 dark:bg-white dark:bg-[#102538]/5">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="text-xs font-black text-[#D95F5F] dark:text-[#D95F5F]">{getReportCode(item)}</span>
                                                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black ${status.className}`}>
                                                            {status.label}
                                                        </span>
                                                    </div>
                                                    <h3 className="mt-2 line-clamp-1 text-sm font-black text-[#0F1F2E] dark:text-[#EFF4F8]">{item.incident_type || 'Laporan Kejadian'}</h3>
                                                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-300 dark:text-white/55">{item.location || item.description || '-'}</p>
                                                </div>
                                                {item.photo_url ? <img src={item.photo_url} alt="Foto laporan" className="h-14 w-14 rounded-2xl object-cover" /> : <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white dark:bg-[#102538] text-slate-500 dark:text-slate-300"><FileText className="h-5 w-5" /></div>}
                                            </div>
                                            <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-300">
                                                <span>{item.reporter_name || 'Pelapor'}</span>
                                                <span>{formatDateTime(item.created_at)}</span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </section>

                <section className="grid gap-6 xl:grid-cols-2">
                    <div className="admin-print-card rounded-[2rem] border border-[#D8E4ED] bg-white dark:bg-[#102538] p-6 shadow-xl shadow-slate-200/60 dark:border-white/10 dark:bg-white dark:bg-[#102538]/5">
                        <div className="mb-5 flex items-center gap-3">
                            <BarChart3 className="h-6 w-6 text-[#D95F5F]" />
                            <h2 className="text-xl font-black text-[#0F1F2E] dark:text-[#EFF4F8]">Jenis kejadian dominan</h2>
                        </div>
                        <div className="space-y-4">
                            {summary.topTypes.length === 0 ? <p className="text-sm text-slate-500 dark:text-slate-300">Belum ada data.</p> : summary.topTypes.map((item) => {
                                const max = Math.max(...summary.topTypes.map((type) => type.total), 1);
                                return (
                                    <div key={item.name}>
                                        <div className="mb-1 flex items-center justify-between text-sm">
                                            <span className="font-black text-[#0F1F2E] dark:text-white">{item.name}</span>
                                            <span className="font-black text-[#D95F5F]">{item.total}</span>
                                        </div>
                                        <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-[#17324A] dark:bg-white dark:bg-[#102538]/10">
                                            <div className="h-full rounded-full bg-[#D95F5F]" style={{ width: `${Math.max(8, (item.total / max) * 100)}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="admin-print-card rounded-[2rem] border border-[#D8E4ED] bg-white dark:bg-[#102538] p-6 shadow-xl shadow-slate-200/60 dark:border-white/10 dark:bg-white dark:bg-[#102538]/5">
                        <div className="mb-5 flex items-center gap-3">
                            <MapPin className="h-6 w-6 text-[#D95F5F]" />
                            <h2 className="text-xl font-black text-[#0F1F2E] dark:text-[#EFF4F8]">Wilayah laporan terbanyak</h2>
                        </div>
                        <div className="space-y-4">
                            {summary.topDistricts.length === 0 ? <p className="text-sm text-slate-500 dark:text-slate-300">Belum ada data.</p> : summary.topDistricts.map((item) => {
                                const max = Math.max(...summary.topDistricts.map((district) => district.total), 1);
                                return (
                                    <div key={item.name}>
                                        <div className="mb-1 flex items-center justify-between text-sm">
                                            <span className="font-black text-[#0F1F2E] dark:text-white">{item.name}</span>
                                            <span className="font-black text-[#D95F5F] dark:text-[#D95F5F]">{item.total}</span>
                                        </div>
                                        <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-[#17324A] dark:bg-white dark:bg-[#102538]/10">
                                            <div className="h-full rounded-full bg-[#D95F5F] dark:bg-[#D95F5F]" style={{ width: `${Math.max(8, (item.total / max) * 100)}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                <section className="admin-print-card rounded-[2rem] border border-red-200 bg-red-50 p-5 text-red-800">
                    <div className="flex items-start gap-3">
                        <Trash2 className="mt-0.5 h-5 w-5 shrink-0" />
                        <div>
                            <h3 className="font-black">Catatan keamanan penghapusan data</h3>
                            <p className="mt-1 text-sm leading-relaxed font-semibold text-red-700/80">
                                Hapus data hanya dilakukan melalui akun admin. Setiap tombol hapus di halaman peta dan titik terverifikasi menggunakan dialog konfirmasi agar data tidak hilang karena salah klik.
                            </p>
                        </div>
                    </div>
                </section>
            </div>
        </AdminLayout>
    );
}
