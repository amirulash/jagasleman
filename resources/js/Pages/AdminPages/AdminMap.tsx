import { useEffect, useMemo, useState } from 'react';
import {
    MapContainer,
    Marker,
    Popup,
    TileLayer,
    Tooltip,
    useMap,
} from 'react-leaflet';
import * as L from 'leaflet';
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
    data_source?: string | null;
    source_type?: string | null;
};

type StatusConfig = {
    label: string;
    shortLabel: string;
    color: string;
    soft: string;
    border: string;
    icon: any;
    markerRadius: number;
    className: string;
    note: string;
};

const statusConfig: Record<ReportStatus, StatusConfig> = {
    pending: {
        label: 'Menunggu Review',
        shortLabel: 'Pending',
        color: '#F2A20B',
        soft: 'bg-amber-50',
        border: 'border-amber-200',
        icon: Clock3,
        markerRadius: 10,
        className: 'border-amber-200 bg-amber-50 text-amber-700',
        note: 'Laporan baru dan perlu dicek admin.',
    },
    approved: {
        label: 'Disetujui',
        shortLabel: 'Disetujui',
        color: '#16A34A',
        soft: 'bg-emerald-50',
        border: 'border-emerald-200',
        icon: CheckCircle2,
        markerRadius: 11,
        className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        note: 'Titik valid dan dapat tampil pada peta publik.',
    },
    rejected: {
        label: 'Ditolak',
        shortLabel: 'Ditolak',
        color: '#DC2626',
        soft: 'bg-red-50',
        border: 'border-red-200',
        icon: XCircle,
        markerRadius: 10,
        className: 'border-red-200 bg-red-50 text-red-700',
        note: 'Laporan tidak valid atau belum memenuhi syarat.',
    },
};

type RiskLevel = 'low' | 'medium' | 'high';
type SourceType = 'citizen' | 'police' | 'system';

const riskConfig: Record<RiskLevel, { label: string; color: string; className: string; note: string }> = {
    low: {
        label: 'Rendah',
        color: '#0FA3A0',
        className: 'border-[#0FA3A0]/30 bg-[#ECF8F3] text-[#0B6E78]',
        note: 'Kejadian umum atau dampak awal rendah.',
    },
    medium: {
        label: 'Sedang',
        color: '#F2A20B',
        className: 'border-[#F2A20B]/35 bg-[#FFF8E6] text-[#9A5F00]',
        note: 'Perlu pemantauan dan tindak lanjut admin.',
    },
    high: {
        label: 'Tinggi',
        color: '#F47B52',
        className: 'border-[#F47B52]/35 bg-[#FFF1EA] text-[#B54427]',
        note: 'Prioritas validasi dan respon cepat.',
    },
};

const sourceConfig: Record<SourceType, { label: string; shape: string; note: string }> = {
    citizen: {
        label: 'Laporan Masyarakat',
        shape: 'pin',
        note: 'Titik berasal dari laporan warga.',
    },
    police: {
        label: 'Data Kepolisian',
        shape: 'shield',
        note: 'Titik berasal dari data resmi/petugas.',
    },
    system: {
        label: 'Data Sistem',
        shape: 'diamond',
        note: 'Titik berasal dari integrasi sistem.',
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

function getRiskLevel(type?: string | null): RiskLevel {
    const text = String(type || '').toUpperCase();
    if (text.includes('CURAS') || text.includes('SENJATA')) return 'high';
    if (text.includes('PENGANIAYAAN') || text.includes('PEMERASAN') || text.includes('PENGANCAMAN')) return 'medium';
    return 'low';
}

function getSourceType(report: IncidentReport): SourceType {
    const source = String(report.data_source || report.source_type || '').toLowerCase();
    if (source.includes('polisi') || source.includes('police') || source.includes('resmi')) return 'police';
    if (source.includes('sistem') || source.includes('system') || source.includes('api')) return 'system';
    return 'citizen';
}

function createAdminMarkerIcon(report: IncidentReport) {
    const status = statusConfig[report.status] || statusConfig.pending;
    const source = sourceConfig[getSourceType(report)];
    const code = getReportCode(report).replace(/[^A-Za-z0-9-]/g, '').slice(-4) || 'GIS';

    return L.divIcon({
        className: 'jaga-admin-div-marker-wrapper',
        iconSize: [46, 54],
        iconAnchor: [23, 50],
        popupAnchor: [0, -48],
        html: `
            <div class="jaga-admin-div-marker source-${source.shape}" style="--status:${status.color};">
                <span class="jaga-admin-marker-ring"></span>
                <span class="jaga-admin-marker-core">${source.shape === 'shield' ? 'S' : source.shape === 'diamond' ? 'D' : '!'}</span>
                <span class="jaga-admin-marker-tail"></span>
                <small>${code}</small>
            </div>
        `,
    });
}

function shortText(value?: string | null, max = 140) {
    const text = String(value || '').trim();
    if (!text) return '-';
    return text.length > max ? `${text.slice(0, max).trim()}...` : text;
}

function getPhotos(report: IncidentReport) {
    if (Array.isArray(report.photo_urls) && report.photo_urls.length) return report.photo_urls;
    if (report.photo_url) return [report.photo_url];
    return [];
}

function ReportMapBounds({ reports }: { reports: IncidentReport[] }) {
    const map = useMap();

    useEffect(() => {
        const coords = reports
            .map((report) => [Number(report.latitude), Number(report.longitude)] as [number, number])
            .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));

        if (coords.length >= 2) {
            map.fitBounds(coords, { padding: [54, 54], maxZoom: 14 });
        } else if (coords.length === 1) {
            map.setView(coords[0], 15);
        }
    }, [map, reports]);

    return null;
}

function PhotoStrip({ report }: { report: IncidentReport }) {
    const photos = getPhotos(report);

    if (!photos.length) {
        return (
            <div className="mt-3 flex h-24 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-xs font-bold text-slate-500">
                Tidak ada foto
            </div>
        );
    }

    return (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {photos.map((url, index) => (
                <a key={`${url}-${index}`} href={url} target="_blank" rel="noreferrer" className="shrink-0">
                    <img
                        src={url}
                        alt={`Foto laporan ${index + 1}`}
                        className="h-24 w-32 rounded-2xl object-cover shadow-sm"
                    />
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
        body{font-family:Arial,sans-serif;margin:28px;color:#07324A}
        h1{margin:0;font-size:24px}.muted{color:#64748b;font-size:12px}
        .header{border-bottom:3px solid #334155;padding-bottom:14px;margin-bottom:18px}
        table{width:100%;border-collapse:collapse}
        th{background:#07324A;color:#fff;text-align:left;font-size:11px;padding:10px}
        td{border-bottom:1px solid #e2e8f0;font-size:11px;padding:9px;vertical-align:top}
        button{padding:10px 16px;border:0;border-radius:12px;background:#334155;color:white;font-weight:700;cursor:pointer;float:right}
        @media print{button{display:none}}
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
            <div className="jaga-admin-map-page space-y-6">
                <section className="jaga-admin-map-hero overflow-hidden rounded-[2rem] border border-[#BDE7E1] bg-white shadow-xl shadow-slate-200/70">
                    <div className="grid gap-5 p-6 lg:grid-cols-[1.15fr_.85fr] lg:p-8">
                        <div>
                            <div className="inline-flex items-center rounded-full border border-[#BDE7E1] bg-[#F2FAF6] px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-[#334155]">
                                <MapPin className="mr-2 h-3.5 w-3.5" />
                                Peta Khusus Admin
                            </div>
                            <h1 className="mt-4 text-3xl font-black tracking-tight text-[#07324A] md:text-4xl">
                                Kelola titik pelaporan masyarakat berdasarkan status validasi.
                            </h1>
                            <p className="mt-3 max-w-3xl text-sm font-semibold leading-relaxed text-slate-600">
                                Gunakan warna, bentuk, dan label titik untuk membaca status validasi, tingkat risiko, serta sumber data laporan.
                            </p>
                        </div>

                        <div className="grid grid-cols-3 gap-3 rounded-[2rem] border border-[#BDE7E1] bg-[#F8FAFC] p-4">
                            {(['pending', 'approved', 'rejected'] as ReportStatus[]).map((status) => {
                                const Icon = statusConfig[status].icon;
                                return (
                                    <button
                                        key={status}
                                        type="button"
                                        onClick={() => setStatusFilter(status)}
                                        className={`rounded-2xl border p-3 text-center transition hover:-translate-y-0.5 ${statusConfig[status].className}`}
                                    >
                                        <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-white">
                                            <Icon className="h-5 w-5" />
                                        </span>
                                        <p className="mt-2 text-2xl font-black">{summary[status]}</p>
                                        <p className="text-[11px] font-black">{statusConfig[status].shortLabel}</p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </section>

                <section className="jaga-admin-map-panel rounded-[2rem] border border-[#BDE7E1] bg-white p-4 shadow-xl shadow-slate-200/60 lg:p-5">
                    <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_220px_auto_auto]">
                        <div>
                            <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">Cari laporan</label>
                            <input
                                value={keyword}
                                onChange={(event) => setKeyword(event.target.value)}
                                placeholder="Cari kode, lokasi, kecamatan, jenis, atau nama pelapor..."
                                className="h-12 w-full rounded-2xl border border-[#BDE7E1] bg-[#F8FAFC] px-4 text-sm font-semibold text-[#07324A] outline-none transition focus:border-[#334155] focus:bg-white focus:ring-4 focus:ring-[#BDE7E1]/35"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">Status</label>
                            <select
                                value={statusFilter}
                                onChange={(event) => setStatusFilter(event.target.value as any)}
                                className="h-12 w-full rounded-2xl border border-[#BDE7E1] bg-[#F8FAFC] px-4 text-sm font-black text-[#07324A] outline-none transition focus:border-[#334155] focus:bg-white focus:ring-4 focus:ring-[#BDE7E1]/35"
                            >
                                <option value="all">Semua Status</option>
                                <option value="pending">Pending</option>
                                <option value="approved">Disetujui</option>
                                <option value="rejected">Ditolak</option>
                            </select>
                        </div>

                        <div className="flex items-end">
                            <button
                                type="button"
                                onClick={loadReports}
                                className="h-12 rounded-2xl border border-[#BDE7E1] bg-white px-4 text-sm font-black text-[#07324A] transition hover:bg-[#F2FAF6]"
                            >
                                <RefreshCw className="mr-2 inline h-4 w-4" />
                                Muat Ulang
                            </button>
                        </div>

                        <div className="flex items-end">
                            <button
                                type="button"
                                onClick={() => openMapPdf(reportsWithCoordinate)}
                                className="h-12 rounded-2xl bg-[#07324A] px-4 text-sm font-black text-white transition hover:bg-[#334155]"
                            >
                                <Printer className="mr-2 inline h-4 w-4" />
                                Export PDF
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                            {error}
                        </div>
                    )}

                    <div className="jaga-admin-map-content-grid grid gap-4">
                        <div className="jaga-admin-map-canvas relative overflow-hidden rounded-[1.6rem] border border-[#BDE7E1] bg-slate-100">
                            <div className="jaga-admin-map-height w-full">
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
                                        const StatusIcon = status.icon;
                                        const photos = getPhotos(report);

                                        return (
                                            <Marker
                                                key={report.id}
                                                position={[lat, lng]}
                                                icon={createAdminMarkerIcon(report)}
                                                eventHandlers={{ click: () => setSelectedReport(report) }}
                                            >
                                                <Tooltip direction="top" offset={[0, -42]} opacity={1} className="jaga-admin-marker-tooltip">
                                                    <div className="text-xs font-black">
                                                        {getReportCode(report)} · {status.label} · {sourceConfig[getSourceType(report)].label}
                                                    </div>
                                                </Tooltip>

                                                <Popup maxWidth={360} minWidth={300} className="jaga-admin-map-popup">
                                                    <div className="w-[300px] font-sans text-[#07324A]">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="min-w-0">
                                                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                                                                    {getReportCode(report)}
                                                                </p>
                                                                <h3 className="mt-1 text-sm font-black leading-snug text-[#07324A]">
                                                                    {report.incident_type || 'Laporan Kejadian'}
                                                                </h3>
                                                            </div>

                                                            <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-black ${status.className}`}>
                                                                <StatusIcon className="h-3 w-3" />
                                                                {status.shortLabel}
                                                            </span>
                                                        </div>

                                                        <div className="mt-2 flex flex-wrap gap-2">
                                                            <span className="inline-flex rounded-full border border-[#BDE7E1] bg-[#F2FAF6] px-2 py-1 text-[10px] font-black text-[#0B6E78]">
                                                                {sourceConfig[getSourceType(report)].label}
                                                            </span>
                                                            <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-black ${status.className}`}>
                                                                {status.label}
                                                            </span>
                                                        </div>

                                                        {photos[0] && (
                                                            <img
                                                                src={photos[0]}
                                                                alt={`Foto ${getReportCode(report)}`}
                                                                className="mt-3 h-24 w-full rounded-2xl object-cover"
                                                                onError={(event) => { event.currentTarget.style.display = 'none'; }}
                                                            />
                                                        )}

                                                        <div className="mt-3 space-y-2 text-xs leading-relaxed text-slate-700">
                                                            <p><b>Pelapor:</b> {report.reporter_name || 'Tanpa nama'}</p>
                                                            <p><b>Lokasi:</b> {shortText(report.location, 82)}</p>
                                                            <p><b>Wilayah:</b> {[report.village, report.district].filter(Boolean).join(', ') || '-'}</p>
                                                            <p><b>Waktu:</b> {formatDateTime(report.incident_at)}</p>
                                                            <p className="rounded-xl bg-slate-50 p-2"><b>Deskripsi:</b> {shortText(report.description, 115)}</p>
                                                        </div>

                                                        <div className="mt-3 grid grid-cols-2 gap-2">
                                                            <button type="button" onClick={() => setSelectedReport(report)} className="rounded-xl bg-[#334155] px-3 py-2 text-[11px] font-black text-white">Detail</button>
                                                            <button type="button" onClick={() => deleteReport(report)} className="rounded-xl bg-red-700 px-3 py-2 text-[11px] font-black text-white">Hapus</button>
                                                        </div>
                                                    </div>
                                                </Popup>
                                            </Marker>
                                        );
                                    })}
                                </MapContainer>
                            </div>

                            <div className="pointer-events-none absolute right-4 top-4 z-[500] rounded-2xl border border-white/80 bg-white/95 px-3 py-2 text-xs font-black text-[#07324A] shadow-xl">
                                {summary.all} titik tampil
                            </div>

                            {loading && (
                                <div className="absolute inset-0 z-[500] flex items-center justify-center bg-white/70 backdrop-blur-sm">
                                    <div className="rounded-3xl bg-white px-5 py-4 text-sm font-black text-slate-700 shadow-xl">
                                        Memuat peta admin...
                                    </div>
                                </div>
                            )}
                        </div>

                        <aside className="jaga-admin-map-aside space-y-4">
                            <div className="jaga-admin-map-legend rounded-[1.5rem] border border-[#BDE7E1] bg-[#F8FAFC] p-5">
                                <div className="mb-4 flex items-center gap-2">
                                    <Filter className="h-5 w-5 text-[#334155]" />
                                    <h2 className="font-black text-[#07324A]">Legenda Status</h2>
                                </div>

                                <div className="space-y-3">
                                    {(['pending', 'approved', 'rejected'] as ReportStatus[]).map((status) => {
                                        const Icon = statusConfig[status].icon;
                                        const active = statusFilter === status;
                                        return (
                                            <button
                                                key={status}
                                                type="button"
                                                onClick={() => setStatusFilter(status)}
                                                className={`jaga-admin-map-legend-item ${active ? 'is-active' : ''}`}
                                            >
                                                <span className="flex items-center gap-3">
                                                    <span
                                                        className="flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-sm"
                                                        style={{ backgroundColor: statusConfig[status].color }}
                                                    >
                                                        <Icon className="h-5 w-5" />
                                                    </span>
                                                    <span>
                                                        <span className="block font-black text-[#07324A]">{statusConfig[status].label}</span>
                                                        <span className="mt-0.5 block text-xs font-semibold text-slate-500">{statusConfig[status].note}</span>
                                                    </span>
                                                </span>
                                                <span className="rounded-full bg-white px-3 py-1 text-sm font-black text-[#07324A]">
                                                    {summary[status]}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="mt-5 border-t border-[#D7E3EC] pt-4">
                                    <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Symbology Sumber Data</p>
                                    <div className="grid gap-2">
                                        {(['citizen', 'police', 'system'] as SourceType[]).map((source) => (
                                            <div key={source} className="flex items-center gap-3 rounded-2xl border border-[#D7E3EC] bg-white px-3 py-2">
                                                <span className={`jaga-admin-source-sample source-${sourceConfig[source].shape}`} />
                                                <span>
                                                    <span className="block text-xs font-black text-[#07324A]">{sourceConfig[source].label}</span>
                                                    <span className="block text-[10px] font-semibold text-slate-500">{sourceConfig[source].note}</span>
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {statusFilter !== 'all' && (
                                    <button
                                        type="button"
                                        onClick={() => setStatusFilter('all')}
                                        className="mt-3 w-full rounded-2xl border border-[#BDE7E1] bg-white px-4 py-3 text-sm font-black text-[#334155] transition hover:bg-slate-50"
                                    >
                                        Tampilkan semua titik
                                    </button>
                                )}
                            </div>

                            <div className="jaga-admin-map-summary rounded-[1.5rem] border border-[#BDE7E1] bg-white p-5">
                                <h2 className="font-black text-[#07324A]">Ringkasan Peta</h2>
                                <p className="mt-1 text-sm font-semibold text-slate-500">
                                    Pantau titik laporan yang sedang tampil dan total data yang tersimpan.
                                </p>

                                <div className="mt-4 grid grid-cols-2 gap-3">
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Tampil</p>
                                        <p className="mt-2 text-3xl font-black text-[#07324A]">{summary.all}</p>
                                    </div>
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Total DB</p>
                                        <p className="mt-2 text-3xl font-black text-[#07324A]">{reports.length}</p>
                                    </div>
                                </div>

                                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-relaxed text-amber-800">
                                    <div className="flex gap-3">
                                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                                        <p>
                                            Hapus hanya data yang benar-benar tidak valid. Jika titik sudah disetujui,
                                            data tersebut juga akan hilang dari peta publik.
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold leading-relaxed text-emerald-800">
                                    Gunakan warna legenda untuk membaca status titik dengan cepat sebelum mengambil tindakan.
                                </div>
                            </div>
                        </aside>
                    </div>
                </section>

                {selectedReport && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                        <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.22em] text-[#334155]">Detail Titik Peta Admin</p>
                                    <h2 className="mt-2 text-2xl font-black text-[#07324A]">{getReportCode(selectedReport)}</h2>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusConfig[selectedReport.status].className}`}>
                                            {statusConfig[selectedReport.status].label}
                                        </span>
                                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-700">
                                            {selectedReport.incident_type || '-'}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedReport(null)}
                                    className="rounded-full border border-slate-200 px-3 py-1 text-sm font-black text-slate-600 hover:bg-slate-50"
                                >
                                    Tutup
                                </button>
                            </div>

                            <PhotoStrip report={selectedReport} />

                            <div className="mt-5 grid gap-4 md:grid-cols-2">
                                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Lokasi</p>
                                    <p className="mt-2 text-sm font-bold text-slate-800">{selectedReport.location || '-'}</p>
                                    <p className="mt-1 text-sm text-slate-500">{selectedReport.village || '-'}, {selectedReport.district || '-'}</p>
                                </div>
                                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Koordinat</p>
                                    <p className="mt-2 text-sm font-bold text-slate-800">{selectedReport.latitude}, {selectedReport.longitude}</p>
                                    <p className="mt-1 text-sm text-slate-500">Waktu: {formatDateTime(selectedReport.incident_at)}</p>
                                </div>
                            </div>

                            <div className="mt-4 rounded-3xl border border-slate-200 p-4">
                                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Deskripsi</p>
                                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700">{selectedReport.description || '-'}</p>
                            </div>

                            <div className="mt-5 flex flex-wrap justify-end gap-2">
                                {selectedReport.status !== 'approved' && (
                                    <button
                                        type="button"
                                        disabled={actionLoading === selectedReport.id}
                                        onClick={() => updateStatus(selectedReport, 'approved')}
                                        className="rounded-2xl bg-emerald-700 px-4 py-2 text-sm font-black text-white disabled:opacity-60"
                                    >
                                        <CheckCircle2 className="mr-2 inline h-4 w-4" />
                                        Setujui
                                    </button>
                                )}
                                {selectedReport.status !== 'rejected' && (
                                    <button
                                        type="button"
                                        disabled={actionLoading === selectedReport.id}
                                        onClick={() => updateStatus(selectedReport, 'rejected')}
                                        className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-black text-white disabled:opacity-60"
                                    >
                                        <XCircle className="mr-2 inline h-4 w-4" />
                                        Tolak
                                    </button>
                                )}
                                <button
                                    type="button"
                                    disabled={actionLoading === selectedReport.id}
                                    onClick={() => deleteReport(selectedReport)}
                                    className="rounded-2xl bg-red-800 px-4 py-2 text-sm font-black text-white disabled:opacity-60"
                                >
                                    <Trash2 className="mr-2 inline h-4 w-4" />
                                    Hapus Data
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
