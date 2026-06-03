import { useEffect, useMemo, useState } from 'react';
import {
    CircleMarker,
    MapContainer,
    Popup,
    TileLayer,
    Tooltip,
    useMap,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import AdminLayout from '@/Layouts/AdminLayout';
import {
    AlertTriangle,
    CheckCircle2,
    Clock3,
    Eye,
    Filter,
    MapPin,
    Printer,
    RefreshCw,
    ShieldCheck,
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

const statusConfig: Record<ReportStatus, { label: string; color: string; bg: string; ring: string; icon: any; className: string }> = {
    pending: {
        label: 'Pending',
        color: '#D95F5F',
        bg: 'bg-[#EFF4F8]',
        ring: 'border-[#D8E4ED]',
        icon: Clock3,
        className: 'border-[#D8E4ED] bg-[#EFF4F8] text-[#D95F5F]',
    },
    approved: {
        label: 'Disetujui',
        color: '#D95F5F',
        bg: 'bg-[#EFF4F8]',
        ring: 'border-[#D8E4ED]',
        icon: CheckCircle2,
        className: 'border-[#D8E4ED] bg-[#EFF4F8] text-[#D95F5F]',
    },
    rejected: {
        label: 'Ditolak',
        color: '#D95F5F',
        bg: 'bg-red-50',
        ring: 'border-red-200',
        icon: XCircle,
        className: 'border-red-200 bg-red-50 text-red-700',
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

function normalize(value?: string | number | null) {
    return String(value ?? '').toLowerCase();
}

function ReportMapBounds({ reports }: { reports: IncidentReport[] }) {
    const map = useMap();

    useEffect(() => {
        const coords = reports
            .map((report) => [Number(report.latitude), Number(report.longitude)] as [number, number])
            .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));

        if (coords.length >= 2) {
            map.fitBounds(coords, { padding: [48, 48], maxZoom: 14 });
        } else if (coords.length === 1) {
            map.setView(coords[0], 14);
        }
    }, [map, reports]);

    return null;
}

function PhotoStrip({ report }: { report: IncidentReport }) {
    const photos = Array.isArray(report.photo_urls) && report.photo_urls.length
        ? report.photo_urls
        : report.photo_url
          ? [report.photo_url]
          : [];

    if (!photos.length) {
        return (
            <div className="mt-3 flex h-24 items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#17324A] text-xs font-bold text-slate-500 dark:text-slate-300">
                Tidak ada foto
            </div>
        );
    }

    return (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {photos.map((url, index) => (
                <a key={`${url}-${index}`} href={url} target="_blank" rel="noreferrer" className="shrink-0">
                    <img src={url} alt={`Foto laporan ${index + 1}`} className="h-24 w-32 rounded-2xl object-cover shadow-sm" />
                </a>
            ))}
        </div>
    );
}

function openMapPdf(reports: IncidentReport[]) {
    const rows = reports.map((item, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${getReportCode(item)}</td>
            <td>${item.incident_type || '-'}</td>
            <td>${item.location || '-'}</td>
            <td>${item.latitude || '-'}, ${item.longitude || '-'}</td>
            <td>${statusConfig[item.status]?.label || item.status}</td>
        </tr>
    `).join('');

    const html = `<!doctype html><html><head><title>Export Peta Admin</title><style>
        body{font-family:Arial,sans-serif;margin:28px;color:#0F1F2E} h1{margin:0;font-size:24px}.muted{color:#64748b;font-size:12px}.header{border-bottom:3px solid #D95F5F;padding-bottom:14px;margin-bottom:18px}table{width:100%;border-collapse:collapse}th{background:#0F1F2E;color:#fff;text-align:left;font-size:11px;padding:10px}td{border-bottom:1px solid #e2e8f0;font-size:11px;padding:9px;vertical-align:top}button{padding:10px 16px;border:0;border-radius:12px;background:#D95F5F;font-weight:700;cursor:pointer;float:right}@media print{button{display:none}}
    </style></head><body>
        <button onclick="window.print()">Cetak / Simpan PDF</button>
        <div class="header"><h1>Data Peta Admin JagaSleman</h1><div class="muted">Berisi titik hasil pelaporan masyarakat berdasarkan status validasi.</div></div>
        <table><thead><tr><th>No</th><th>Kode</th><th>Jenis</th><th>Lokasi</th><th>Koordinat</th><th>Status</th></tr></thead><tbody>${rows || '<tr><td colspan="6">Belum ada data.</td></tr>'}</tbody></table>
        <script>setTimeout(()=>window.print(),500)</script>
    </body></html>`;

    const win = window.open('', '_blank', 'width=1024,height=720');
    if (!win) return;
    win.document.write(html);
    win.document.close();
}

export default function AdminMap() {
    const [reports, setReports] = useState<IncidentReport[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [keyword, setKeyword] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | ReportStatus>('all');
    const [selectedReport, setSelectedReport] = useState<IncidentReport | null>(null);
    const [actionLoading, setActionLoading] = useState<number | null>(null);

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

            if (!response.ok) throw new Error('Gagal memuat data peta admin.');

            const json = await response.json();
            setReports(Array.isArray(json.data) ? json.data : []);
        } catch (err) {
            console.error(err);
            setError('Peta admin belum berhasil memuat data laporan masyarakat.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReports();
    }, []);

    const reportsWithCoordinate = useMemo(() => {
        const key = keyword.trim().toLowerCase();

        return reports.filter((item) => {
            const lat = Number(item.latitude);
            const lng = Number(item.longitude);
            const hasCoordinate = Number.isFinite(lat) && Number.isFinite(lng);
            const matchStatus = statusFilter === 'all' || item.status === statusFilter;
            const matchKeyword = !key ||
                normalize(item.report_code).includes(key) ||
                normalize(item.incident_type).includes(key) ||
                normalize(item.location).includes(key) ||
                normalize(item.district).includes(key) ||
                normalize(item.village).includes(key) ||
                normalize(item.reporter_name).includes(key);

            return hasCoordinate && matchStatus && matchKeyword;
        });
    }, [reports, keyword, statusFilter]);

    const summary = useMemo(() => ({
        all: reportsWithCoordinate.length,
        pending: reportsWithCoordinate.filter((item) => item.status === 'pending').length,
        approved: reportsWithCoordinate.filter((item) => item.status === 'approved').length,
        rejected: reportsWithCoordinate.filter((item) => item.status === 'rejected').length,
    }), [reportsWithCoordinate]);

    const updateStatus = async (report: IncidentReport, status: ReportStatus) => {
        const reason = status === 'rejected'
            ? window.prompt('Masukkan alasan penolakan laporan ini:')
            : null;

        if (status === 'rejected' && !reason) return;

        setActionLoading(report.id);

        try {
            const response = await fetch(`/api/admin/incident-reports/${report.id}/status`, {
                method: 'PATCH',
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': getCsrfToken(),
                },
                body: JSON.stringify({ status, rejection_reason: reason }),
            });

            const json = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(json.message || 'Gagal memperbarui status laporan.');

            setReports((current) => current.map((item) => item.id === report.id ? json.data : item));
            setSelectedReport(json.data);
        } catch (err: any) {
            alert(err.message || 'Gagal memperbarui status laporan.');
        } finally {
            setActionLoading(null);
        }
    };

    const deleteReport = async (report: IncidentReport) => {
        const ok = window.confirm(`Apakah yakin ingin menghapus titik laporan ${getReportCode(report)}? Data akan hilang dari peta dan tidak dapat dikembalikan.`);
        if (!ok) return;

        setActionLoading(report.id);

        try {
            const response = await fetch(`/api/admin/incident-reports/${report.id}`, {
                method: 'DELETE',
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': getCsrfToken(),
                },
            });

            const json = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(json.message || 'Gagal menghapus laporan.');

            setReports((current) => current.filter((item) => item.id !== report.id));
            setSelectedReport(null);
            alert(json.message || 'Data laporan berhasil dihapus.');
        } catch (err: any) {
            alert(err.message || 'Gagal menghapus laporan.');
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <AdminLayout title="Peta Admin">
            <div className="space-y-6">
                <section className="overflow-hidden rounded-[2rem] border border-[#D8E4ED] bg-white dark:bg-[#102538] shadow-xl shadow-slate-200/70 dark:border-white/10 dark:bg-white dark:bg-[#102538]/5">
                    <div className="grid gap-5r p-6 text-white lg:grid-cols-[1.2fr_.8fr] lg:p-8">
                        <div>
                            <div className="inline-flex items-center rounded-full border border-white/20 bg-white dark:bg-[#102538]/10 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-[#D8E4ED]">
                                <MapPin className="mr-2 h-3.5 w-3.5" /> Peta Khusus Admin
                            </div>
                            <h1 className="mt-4 text-3xl font-black tracking-tight md:text-4xl">
                                Kelola titik pelaporan masyarakat berdasarkan status validasi.
                            </h1>
                            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/70">
                                Peta ini hanya menampilkan titik dari laporan masyarakat. Warna titik dibedakan berdasarkan pending, disetujui, dan ditolak agar admin mudah membaca kondisi data.
                            </p>
                        </div>

                        <div className="grid grid-cols-3 gap-3 rounded-[2rem] border border-white/20 bg-white dark:bg-[#102538]/10 p-4 backdrop-blur">
                            {(['pending', 'approved', 'rejected'] as ReportStatus[]).map((status) => {
                                const Icon = statusConfig[status].icon;
                                return (
                                    <div key={status} className="rounded-2xl bg-white dark:bg-[#102538]/10 p-3 text-center">
                                        <Icon className="mx-auto h-5 w-5" />
                                        <p className="mt-2 text-2xl font-black">{summary[status]}</p>
                                        <p className="text-[11px] text-white/60">{statusConfig[status].label}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                <section className="rounded-[2rem] border border-[#D8E4ED] bg-white dark:bg-[#102538] p-4 shadow-xl shadow-slate-200/60 dark:border-white/10 dark:bg-white dark:bg-[#102538]/5 lg:p-5">
                    <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_220px_auto_auto]">
                        <div>
                            <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">Cari laporan</label>
                            <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Cari kode, lokasi, kecamatan, jenis, atau nama pelapor..." className="h-12 w-full rounded-2xl border border-[#D8E4ED] bg-[#F8FAFC] px-4 text-sm font-semibold outline-none transition focus:border-[#D95F5F] focus:bg-white dark:bg-[#102538] focus:ring-4 focus:ring-[#D8E4ED]/35 dark:border-white/10 dark:bg-white dark:bg-[#102538]/5" />
                        </div>

                        <div>
                            <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">Status</label>
                            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as any)} className="h-12 w-full rounded-2xl border border-[#D8E4ED] bg-[#F8FAFC] px-4 text-sm font-black outline-none transition focus:border-[#D95F5F] focus:bg-white dark:bg-[#102538] focus:ring-4 focus:ring-[#D8E4ED]/35 dark:border-white/10 dark:bg-white dark:bg-[#102538]/5">
                                <option value="all">Semua Status</option>
                                <option value="pending">Pending</option>
                                <option value="approved">Disetujui</option>
                                <option value="rejected">Ditolak</option>
                            </select>
                        </div>

                        <div className="flex items-end">
                            <button type="button" onClick={loadReports} className="h-12 rounded-2xl border border-[#D8E4ED] bg-white dark:bg-[#102538] px-4 text-sm font-black text-[#1A3348] transition hover:bg-[#EFF4F8] dark:border-white/10 dark:bg-white dark:bg-[#102538]/5 dark:text-white">
                                <RefreshCw className="mr-2 inline h-4 w-4" />Muat Ulang
                            </button>
                        </div>

                        <div className="flex items-end">
                            <button type="button" onClick={() => openMapPdf(reportsWithCoordinate)} className="h-12 rounded-2xl bg-[#0F1F2E] px-4 text-sm font-black text-white transition hover:bg-[#D95F5F] hover:text-[#0F1F2E]">
                                <Printer className="mr-2 inline h-4 w-4" />Export PDF
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                            {error}
                        </div>
                    )}

                    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
                        <div className="relative overflow-hidden rounded-[1.6rem] border border-[#D8E4ED] bg-slate-100 dark:bg-[#17324A] dark:border-white/10">
                            <div className="h-[560px] w-full">
                                <MapContainer center={[-7.716, 110.355]} zoom={11} className="h-full w-full" scrollWheelZoom>
                                    <TileLayer
                                        attribution='&copy; OpenStreetMap contributors'
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    />
                                    <ReportMapBounds reports={reportsWithCoordinate} />

                                    {reportsWithCoordinate.map((report) => {
                                        const lat = Number(report.latitude);
                                        const lng = Number(report.longitude);
                                        const status = statusConfig[report.status] || statusConfig.pending;

                                        return (
                                            <CircleMarker key={report.id} center={[lat, lng]} radius={10} pathOptions={{ color: '#ffffff', weight: 3, fillColor: status.color, fillOpacity: 0.9 }} eventHandlers={{ click: () => setSelectedReport(report) }}>
                                                <Tooltip direction="top" offset={[0, -6]} opacity={1}>
                                                    <div className="text-xs font-black">{getReportCode(report)} · {status.label}</div>
                                                </Tooltip>
                                                <Popup maxWidth={310} minWidth={260}>
                                                    <div className="w-[260px] font-sans">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div>
                                                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">{getReportCode(report)}</p>
                                                                <h3 className="mt-1 text-sm font-black text-slate-900">{report.incident_type || 'Laporan Kejadian'}</h3>
                                                            </div>
                                                            <span className={`rounded-full border px-2 py-1 text-[10px] font-black ${status.className}`}>{status.label}</span>
                                                        </div>
                                                        <PhotoStrip report={report} />
                                                        <div className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-200">
                                                            <p><b>Lokasi:</b> {report.location || '-'}</p>
                                                            <p><b>Wilayah:</b> {report.village || '-'}, {report.district || '-'}</p>
                                                            <p><b>Waktu:</b> {formatDateTime(report.incident_at)}</p>
                                                        </div>
                                                        <div className="mt-3 flex gap-2">
                                                            <button type="button" onClick={() => setSelectedReport(report)} className="flex-1 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#102538] px-3 py-2 text-[11px] font-black text-slate-700 dark:text-slate-100"></button>
                                                            <button type="button" onClick={() => deleteReport(report)} className="flex-1 rounded-xl bg-red-600 px-3 py-2 text-[11px] font-black text-white">Hapus</button>
                                                        </div>
                                                    </div>
                                                </Popup>
                                            </CircleMarker>
                                        );
                                    })}
                                </MapContainer>
                            </div>

                            {loading && (
                                <div className="absolute inset-0 z-[500] flex items-center justify-center bg-white dark:bg-[#102538]/70 backdrop-blur-sm">
                                    <div className="rounded-3xl bg-white dark:bg-[#102538] px-5 py-4 text-sm font-black text-slate-700 dark:text-slate-100 shadow-xl">Memuat peta admin...</div>
                                </div>
                            )}
                        </div>

                        <aside className="space-y-4">
                            <div className="rounded-[1.5rem] border border-[#D8E4ED] bg-[#F8FAFC] p-5 dark:border-white/10 dark:bg-white dark:bg-[#102538]/5">
                                <div className="mb-4 flex items-center gap-2">
                                    <Filter className="h-5 w-5 text-[#D95F5F]" />
                                    <h2 className="font-black text-[#0F1F2E] dark:text-white">Legenda Status</h2>
                                </div>
                                <div className="space-y-3">
                                    {(['pending', 'approved', 'rejected'] as ReportStatus[]).map((status) => {
                                        const Icon = statusConfig[status].icon;
                                        return (
                                            <button key={status} type="button" onClick={() => setStatusFilter(status)} className={`flex w-full items-center justify-between rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 ${statusConfig[status].className}`}>
                                                <span className="flex items-center gap-3">
                                                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white dark:bg-[#102538]"><Icon className="h-5 w-5" /></span>
                                                    <span className="font-black">{statusConfig[status].label}</span>
                                                </span>
                                                <span className="font-black">{summary[status]}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="rounded-[1.5rem] border border-[#D8E4ED] bg-white dark:bg-[#102538] p-5 dark:border-white/10 dark:bg-white dark:bg-[#102538]/5">
                                <h2 className="font-black text-[#0F1F2E] dark:text-white">Ringkasan Peta</h2>
                                <div className="mt-4 grid grid-cols-2 gap-3">
                                    <div className="rounded-2xl bg-slate-50 dark:bg-[#17324A] p-4 dark:bg-white dark:bg-[#102538]/5">
                                        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">Tampil</p>
                                        <p className="mt-2 text-3xl font-black text-[#D95F5F] dark:text-[#D95F5F]">{summary.all}</p>
                                    </div>
                                    <div className="rounded-2xl bg-slate-50 dark:bg-[#17324A] p-4 dark:bg-white dark:bg-[#102538]/5">
                                        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">Total DB</p>
                                        <p className="mt-2 text-3xl font-black text-[#D95F5F] dark:text-[#D95F5F]">{reports.length}</p>
                                    </div>
                                </div>
                                <p className="mt-4 rounded-2xl border border-[#D8E4ED] bg-[#EFF4F8] p-3 text-xs font-bold leading-relaxed text-[#D95F5F]">
                                    Titik yang dihapus dari halaman ini akan ikut hilang dari peta publik jika sebelumnya sudah disetujui.
                                </p>
                            </div>
                        </aside>
                    </div>
                </section>

                {selectedReport && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                        <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-white dark:bg-[#102538] p-6 shadow-2xl dark:bg-[#122334]">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.22em] text-[#D95F5F]">Detail Titik Peta Admin</p>
                                    <h2 className="mt-2 text-2xl font-black text-[#0F1F2E] dark:text-white">{getReportCode(selectedReport)}</h2>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusConfig[selectedReport.status].className}`}>{statusConfig[selectedReport.status].label}</span>
                                        <span className="rounded-full border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#17324A] px-3 py-1 text-xs font-black text-slate-700 dark:text-slate-100">{selectedReport.incident_type || '-'}</span>
                                    </div>
                                </div>
                                <button type="button" onClick={() => setSelectedReport(null)} className="rounded-full border border-slate-200 dark:border-white/10 px-3 py-1 text-sm font-black text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:bg-[#17324A]">Tutup</button>
                            </div>

                            <PhotoStrip report={selectedReport} />

                            <div className="mt-5 grid gap-4 md:grid-cols-2">
                                <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#17324A] p-4 dark:border-white/10 dark:bg-white dark:bg-[#102538]/5">
                                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">Lokasi</p>
                                    <p className="mt-2 text-sm font-bold text-slate-800 dark:text-white dark:text-white">{selectedReport.location || '-'}</p>
                                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{selectedReport.village || '-'}, {selectedReport.district || '-'}</p>
                                </div>
                                <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#17324A] p-4 dark:border-white/10 dark:bg-white dark:bg-[#102538]/5">
                                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">Koordinat</p>
                                    <p className="mt-2 text-sm font-bold text-slate-800 dark:text-white dark:text-white">{selectedReport.latitude}, {selectedReport.longitude}</p>
                                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Waktu: {formatDateTime(selectedReport.incident_at)}</p>
                                </div>
                            </div>

                            <div className="mt-4 rounded-3xl border border-slate-200 dark:border-white/10 p-4 dark:border-white/10">
                                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">Deskripsi</p>
                                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-100 dark:text-white/70">{selectedReport.description || '-'}</p>
                            </div>

                            <div className="mt-5 flex flex-wrap justify-end gap-2">
                                {selectedReport.status !== 'approved' && (
                                    <button type="button" disabled={actionLoading === selectedReport.id} onClick={() => updateStatus(selectedReport, 'approved')} className="rounded-2xl bg-[#D95F5F] px-4 py-2 text-sm font-black text-white disabled:opacity-60">
                                        <CheckCircle2 className="mr-2 inline h-4 w-4" />Setujui
                                    </button>
                                )}
                                {selectedReport.status !== 'rejected' && (
                                    <button type="button" disabled={actionLoading === selectedReport.id} onClick={() => updateStatus(selectedReport, 'rejected')} className="rounded-2xl bg-[#EFF4F8]0 px-4 py-2 text-sm font-black text-white disabled:opacity-60">
                                        <XCircle className="mr-2 inline h-4 w-4" />Tolak
                                    </button>
                                )}
                                <button type="button" disabled={actionLoading === selectedReport.id} onClick={() => deleteReport(selectedReport)} className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-black text-white disabled:opacity-60">
                                    <Trash2 className="mr-2 inline h-4 w-4" />Hapus Data
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
