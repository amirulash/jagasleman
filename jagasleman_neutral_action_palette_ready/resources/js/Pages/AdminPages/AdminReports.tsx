import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';

type ReportStatus = 'pending' | 'approved' | 'rejected';

type ReportPhoto = {
    id?: number;
    photo_url?: string | null;
    photoUrl?: string | null;
    url?: string | null;
    photo_path?: string | null;
    path?: string | null;
};

type IncidentReport = {
    id: number;
    user_id?: number | null;
    report_code?: string | null;
    reporter_name?: string | null;
    reporter_email?: string | null;
    reporter_phone?: string | null;
    title?: string | null;
    incident_type?: string | null;
    description?: string | null;
    photo_path?: string | null;
    photo_url?: string | null;
    photo_urls?: string[] | null;
    photoUrl?: string | null;
    photoUrls?: string[] | null;
    image_url?: string | null;
    photos?: ReportPhoto[];
    location?: string | null;
    district?: string | null;
    village?: string | null;
    latitude?: string | number | null;
    longitude?: string | number | null;
    incident_at?: string | null;
    status: ReportStatus;
    reviewed_by?: number | null;
    reviewed_at?: string | null;
    rejection_reason?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
};

type PaginationMeta = {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
};

type PhotoGalleryState = {
    urls: string[];
    index: number;
    code: string;
};

const crimeTypes = [
    'PENGEROYOKAN',
    'PENGRUSAKAN',
    'PENGANIAYAAN',
    'PENYALAHGUNAAN SENJATA TAJAM',
    'PENCURIAN DENGAN KEKERASAN (CURAS)',
    'PEMERASAN DAN PENGANCAMAN',
];

const statusOptions = [
    { value: 'all', label: 'Semua Status' },
    { value: 'pending', label: 'Menunggu Review' },
    { value: 'approved', label: 'Disetujui' },
    { value: 'rejected', label: 'Ditolak' },
];

function getCsrfToken() {
    return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '';
}

function getRequestHeaders(json = false): HeadersInit {
    const csrf = getCsrfToken();

    return {
        Accept: 'application/json',
        ...(json ? { 'Content-Type': 'application/json' } : {}),
        ...(csrf ? { 'X-CSRF-TOKEN': csrf } : {}),
        'X-Requested-With': 'XMLHttpRequest',
    };
}

function getReportCode(report: IncidentReport) {
    return report.report_code || `LAP-${String(report.id).padStart(4, '0')}`;
}

function normalizeStorageUrl(value?: string | null) {
    if (!value) return null;

    const text = String(value).trim();

    if (!text) return null;
    if (text.startsWith('http://') || text.startsWith('https://') || text.startsWith('/')) {
        return text;
    }

    const cleanPath = text.replace(/^\/+/, '');
    return cleanPath.startsWith('storage/') ? `/${cleanPath}` : `/storage/${cleanPath}`;
}

function getReportPhotoUrls(report?: IncidentReport | null) {
    if (!report) return [];

    const urls: string[] = [];
    const directList = report.photo_urls || report.photoUrls || [];

    if (Array.isArray(directList)) {
        directList.forEach((url) => {
            const normalized = normalizeStorageUrl(url);
            if (normalized) urls.push(normalized);
        });
    }

    if (Array.isArray(report.photos)) {
        report.photos.forEach((photo) => {
            const normalized = normalizeStorageUrl(
                photo.photo_url || photo.photoUrl || photo.url || photo.photo_path || photo.path,
            );

            if (normalized) urls.push(normalized);
        });
    }

    [report.photo_url, report.photoUrl, report.image_url, report.photo_path].forEach((url) => {
        const normalized = normalizeStorageUrl(url);
        if (normalized) urls.push(normalized);
    });

    return Array.from(new Set(urls.filter(Boolean)));
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

function formatDateOnly(value?: string | null) {
    if (!value) return '-';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    }).format(date);
}

function formatTimeOnly(value?: string | null) {
    if (!value) return '-';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '-';

    return new Intl.DateTimeFormat('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

function getStatusLabel(status: string) {
    if (status === 'approved') return 'Disetujui';
    if (status === 'rejected') return 'Ditolak';
    return 'Menunggu Review';
}

function getStatusClass(status: string) {
    if (status === 'approved') return 'border-[#D8E4ED] bg-[#EFF4F8] text-[#D95F5F]';
    if (status === 'rejected') return 'border-red-200 bg-red-50 text-red-700';
    return 'border-[#D8E4ED] bg-[#EFF4F8] text-[#D95F5F]';
}

function getTypeClass(type?: string | null) {
    const text = String(type || '').toUpperCase();

    if (text.includes('CURAS')) return 'border-red-200 bg-red-50 text-red-700';
    if (text.includes('SENJATA')) return 'border-orange-200 bg-orange-50 text-orange-700';
    if (text.includes('PENGANIAYAAN')) return 'border-rose-200 bg-rose-50 text-rose-700';
    if (text.includes('PENGEROYOKAN')) return 'border-[#D8E4ED] bg-[#EFF4F8] text-[#D95F5F]';
    if (text.includes('PENGRUSAKAN')) return 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#17324A] text-slate-700 dark:text-slate-100';
    return 'border-[#D8E4ED] bg-[#EFF4F8] text-[#D95F5F]';
}

export default function AdminReports() {
    const [reports, setReports] = useState<IncidentReport[]>([]);
    const [meta, setMeta] = useState<PaginationMeta>({
        current_page: 1,
        last_page: 1,
        per_page: 10,
        total: 0,
    });

    const [status, setStatus] = useState('all');
    const [incidentType, setIncidentType] = useState('all');
    const [keyword, setKeyword] = useState('');
    const [page, setPage] = useState(1);

    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const [selectedReport, setSelectedReport] = useState<IncidentReport | null>(null);
    const [rejectReport, setRejectReport] = useState<IncidentReport | null>(null);
    const [deleteReport, setDeleteReport] = useState<IncidentReport | null>(null);
    const [selectedPhotoGallery, setSelectedPhotoGallery] = useState<PhotoGalleryState | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');

    const queryUrl = useMemo(() => {
        const params = new URLSearchParams();

        params.set('page', String(page));
        params.set('per_page', '10');

        if (status !== 'all') params.set('status', status);
        if (incidentType !== 'all') params.set('incident_type', incidentType);
        if (keyword.trim()) params.set('keyword', keyword.trim());

        return `/api/admin/incident-reports?${params.toString()}`;
    }, [page, status, incidentType, keyword]);

    const loadReports = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(queryUrl, {
                method: 'GET',
                headers: getRequestHeaders(),
                credentials: 'same-origin',
            });

            if (!response.ok) throw new Error(`Gagal memuat laporan. Status: ${response.status}`);

            const payload = await response.json();

            setReports(Array.isArray(payload.data) ? payload.data : []);
            setMeta({
                current_page: payload.meta?.current_page ?? 1,
                last_page: payload.meta?.last_page ?? 1,
                per_page: payload.meta?.per_page ?? 10,
                total: payload.meta?.total ?? 0,
            });
        } catch (err) {
            console.error(err);
            setReports([]);
            setError('Data laporan belum berhasil dimuat. Pastikan endpoint admin aktif dan akun yang login memiliki role admin.');
        } finally {
            setLoading(false);
        }
    }, [queryUrl]);

    useEffect(() => {
        loadReports();
    }, [loadReports]);

    const summary = useMemo(() => {
        const total = meta.total;
        const pending = reports.filter((item) => item.status === 'pending').length;
        const approved = reports.filter((item) => item.status === 'approved').length;
        const rejected = reports.filter((item) => item.status === 'rejected').length;
        return { total, pending, approved, rejected };
    }, [reports, meta.total]);

    const resetFilter = () => {
        setStatus('all');
        setIncidentType('all');
        setKeyword('');
        setPage(1);
    };

    const exportReportsToExcel = () => {
        const headers = [
            'Kode Laporan',
            'Nama Pelapor',
            'Email',
            'Telepon',
            'Jenis Kejadian',
            'Judul',
            'Lokasi',
            'Latitude',
            'Longitude',
            'Waktu Kejadian',
            'Status',
            'Jumlah Foto',
            'Alasan Penolakan',
            'Dibuat Pada',
        ];

        const rows = reports.map((report) => [
            getReportCode(report),
            report.reporter_name || '-',
            report.reporter_email || '-',
            report.reporter_phone || '-',
            report.incident_type || '-',
            report.title || '-',
            report.location || '-',
            report.latitude || '-',
            report.longitude || '-',
            formatDateTime(report.incident_at),
            getStatusLabel(report.status),
            getReportPhotoUrls(report).length,
            report.rejection_reason || '-',
            formatDateTime(report.created_at),
        ]);

        const table = [headers, ...rows]
            .map((row) => `<tr>${row.map((cell) => `<td>${String(cell).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>`).join('')}</tr>`)
            .join('');

        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8" /></head><body><table border="1">${table}</table></body></html>`;
        const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `data-pelaporan-jagasleman-${new Date().toISOString().slice(0, 10)}.xls`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
    };

    const approveReport = async (report: IncidentReport) => {
        setActionLoading(report.id);
        setError(null);
        setSuccessMessage(null);

        try {
            const response = await fetch(`/api/admin/incident-reports/${report.id}/approve`, {
                method: 'PATCH',
                headers: getRequestHeaders(),
                credentials: 'same-origin',
            });

            const payload = await response.json().catch(() => null);
            if (!response.ok) throw new Error(payload?.message || 'Laporan gagal disetujui.');

            setSuccessMessage(`Laporan ${getReportCode(report)} berhasil disetujui dan akan tampil di WebGIS.`);
            setSelectedReport(null);
            await loadReports();
        } catch (err: any) {
            setError(err?.message || 'Terjadi kesalahan saat menyetujui laporan.');
        } finally {
            setActionLoading(null);
        }
    };

    const openRejectModal = (report: IncidentReport) => {
        setRejectReport(report);
        setRejectionReason('');
        setError(null);
        setSuccessMessage(null);
    };

    const submitRejectReport = async () => {
        if (!rejectReport) return;

        if (!rejectionReason.trim()) {
            setError('Alasan penolakan wajib diisi.');
            return;
        }

        setActionLoading(rejectReport.id);
        setError(null);
        setSuccessMessage(null);

        try {
            const response = await fetch(`/api/admin/incident-reports/${rejectReport.id}/reject`, {
                method: 'PATCH',
                headers: getRequestHeaders(true),
                credentials: 'same-origin',
                body: JSON.stringify({ rejection_reason: rejectionReason.trim() }),
            });

            const payload = await response.json().catch(() => null);
            if (!response.ok) throw new Error(payload?.message || 'Laporan gagal ditolak.');

            setSuccessMessage(`Laporan ${getReportCode(rejectReport)} berhasil ditolak.`);
            setRejectReport(null);
            setSelectedReport(null);
            setRejectionReason('');
            await loadReports();
        } catch (err: any) {
            setError(err?.message || 'Terjadi kesalahan saat menolak laporan.');
        } finally {
            setActionLoading(null);
        }
    };

    const openDeleteModal = (report: IncidentReport) => {
        setDeleteReport(report);
        setError(null);
        setSuccessMessage(null);
    };

    const submitDeleteReport = async () => {
        if (!deleteReport) return;

        setActionLoading(deleteReport.id);
        setError(null);
        setSuccessMessage(null);

        try {
            const response = await fetch(`/api/admin/incident-reports/${deleteReport.id}`, {
                method: 'DELETE',
                headers: getRequestHeaders(),
                credentials: 'same-origin',
            });

            const payload = await response.json().catch(() => null);
            if (!response.ok) throw new Error(payload?.message || 'Laporan gagal dihapus.');

            setSuccessMessage(payload?.message || `Laporan ${getReportCode(deleteReport)} berhasil dihapus dan hilang dari peta.`);
            setReports((current) => current.filter((item) => item.id !== deleteReport.id));
            setMeta((current) => ({ ...current, total: Math.max(current.total - 1, 0) }));
            setSelectedReport((current) => (current?.id === deleteReport.id ? null : current));
            setDeleteReport(null);
            await loadReports();
        } catch (err: any) {
            setError(err?.message || 'Terjadi kesalahan saat menghapus laporan.');
        } finally {
            setActionLoading(null);
        }
    };

    const openPhotoGallery = (report: IncidentReport, index = 0) => {
        const urls = getReportPhotoUrls(report);
        if (!urls.length) return;
        setSelectedPhotoGallery({ urls, index, code: getReportCode(report) });
    };

    return (
        <AdminLayout title="Manajemen Laporan Masuk">
            <div className="space-y-6">
                <section className="rounded-[28px] border border-[#D8E4ED] bg-white dark:bg-[#102538] p-6 shadow-sm dark:border-white/10 dark:bg-[#1A3348]">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                        <div>
                            <div className="inline-flex rounded-full border border-[#D95F5F] bg-[#EFF4F8] px-3 py-1 text-xs font-black uppercase tracking-[0.25em] text-[#D95F5F]">
                                Validasi Laporan Masyarakat
                            </div>
                            <h1 className="mt-4 text-3xl font-black tracking-tight text-[#0F1F2E] dark:text-white md:text-4xl">
                                Dashboard Admin Jaga Sleman
                            </h1>
                            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-200 dark:text-slate-300">
                                Periksa laporan, lihat bukti foto, setujui data valid, tolak data tidak lengkap, atau hapus laporan yang tidak layak agar peta publik tetap aman dan akurat.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row">
                            <button
                                type="button"
                                onClick={loadReports}
                                className="rounded-2xl border border-[#D8E4ED] bg-white dark:bg-[#102538] px-5 py-3 text-sm font-black text-[#D95F5F] transition hover:bg-slate-50 dark:bg-[#17324A]"
                            >
                                Muat Ulang
                            </button>
                            <button
                                type="button"
                                onClick={exportReportsToExcel}
                                className="rounded-2xl bg-[#D95F5F] px-5 py-3 text-sm font-black text-white transition hover:bg-[#1A3348]"
                            >
                                Export Excel
                            </button>
                        </div>
                    </div>
                </section>

                <section className="grid gap-4 md:grid-cols-4">
                    <SummaryCard label="Total" value={summary.total} tone="slate" desc="Semua laporan" />
                    <SummaryCard label="Pending" value={summary.pending} tone="amber" desc="Menunggu validasi" />
                    <SummaryCard label="Approved" value={summary.approved} tone="emerald" desc="Tampil di WebGIS" />
                    <SummaryCard label="Rejected" value={summary.rejected} tone="red" desc="Tidak tampil di peta" />
                </section>

                <section className="rounded-[28px] border border-[#D8E4ED] bg-white dark:bg-[#102538] p-5 shadow-sm dark:border-white/10 dark:bg-[#1A3348] sm:p-6">
                    <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr_1fr_auto]">
                        <FilterInput label="Cari Laporan" value={keyword} onChange={(value) => { setKeyword(value); setPage(1); }} />

                        <div>
                            <label className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-300">Status</label>
                            <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="h-12 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 text-sm font-semibold outline-none transition focus:border-[#D95F5F] focus:bg-white dark:bg-[#102538] focus:ring-4 focus:ring-amber-100">
                                {statusOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-300">Jenis Kejadian</label>
                            <select value={incidentType} onChange={(event) => { setIncidentType(event.target.value); setPage(1); }} className="h-12 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 text-sm font-semibold outline-none transition focus:border-[#D95F5F] focus:bg-white dark:bg-[#102538] focus:ring-4 focus:ring-amber-100">
                                <option value="all">Semua Jenis</option>
                                {crimeTypes.map((item) => <option key={item} value={item}>{item}</option>)}
                            </select>
                        </div>

                        <div className="flex items-end">
                            <button type="button" onClick={resetFilter} className="h-12 w-full rounded-2xl border border-[#D8E4ED] bg-white dark:bg-[#102538] px-5 text-sm font-black text-slate-700 dark:text-slate-100 transition hover:bg-stone-50 xl:w-auto">
                                Reset
                            </button>
                        </div>
                    </div>

                    {error && <AlertBox tone="red" message={error} />}
                    {successMessage && <AlertBox tone="emerald" message={successMessage} />}

                    <div className="mt-6 overflow-hidden rounded-3xl border border-stone-200">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-stone-200">
                                <thead className="bg-[#D95F5F] text-white">
                                    <tr>
                                        <TableHead>Laporan & Foto</TableHead>
                                        <TableHead>Pelapor</TableHead>
                                        <TableHead>Kejadian</TableHead>
                                        <TableHead>Lokasi</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead align="right">Aksi</TableHead>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100 bg-white dark:bg-[#102538]">
                                    {loading ? (
                                        <tr><td colSpan={6} className="px-5 py-12 text-center text-sm font-semibold text-slate-500 dark:text-slate-300">Memuat data laporan...</td></tr>
                                    ) : reports.length === 0 ? (
                                        <tr><td colSpan={6} className="px-5 py-12 text-center text-sm font-semibold text-slate-500 dark:text-slate-300">Belum ada laporan sesuai filter.</td></tr>
                                    ) : (
                                        reports.map((report) => {
                                            const photoUrls = getReportPhotoUrls(report);
                                            const thumbnail = photoUrls[0];

                                            return (
                                                <tr key={report.id} className="transition hover:bg-[#EFF4F8]/50">
                                                    <td className="px-5 py-4 align-top">
                                                        <div className="font-black text-[#D95F5F] dark:text-[#D95F5F]">{getReportCode(report)}</div>
                                                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-300">Masuk: {formatDateTime(report.created_at)}</div>

                                                        {thumbnail ? (
                                                            <button type="button" onClick={() => openPhotoGallery(report)} className="group mt-3 block overflow-hidden rounded-2xl border border-[#D8E4ED] bg-[#EFF4F8] text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" title="Lihat foto bukti laporan">
                                                                <img src={thumbnail} alt={`Foto bukti ${getReportCode(report)}`} className="h-20 w-28 object-cover transition group-hover:scale-105" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
                                                                <div className="flex items-center justify-between gap-2 px-2 py-1 text-[10px] font-black text-[#D95F5F]">
                                                                    <span>Lihat foto</span>
                                                                    {photoUrls.length > 1 && <span className="rounded-full bg-white dark:bg-[#102538] px-1.5 py-0.5">{photoUrls.length} foto</span>}
                                                                </div>
                                                            </button>
                                                        ) : (
                                                            <div className="mt-3 inline-flex rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-[10px] font-black text-slate-500 dark:text-slate-300">Tanpa foto</div>
                                                        )}
                                                    </td>

                                                    <td className="px-5 py-4 align-top">
                                                        <div className="font-bold text-slate-800 dark:text-white">{report.reporter_name || 'Tanpa nama'}</div>
                                                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-300">{report.reporter_phone || '-'}</div>
                                                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-300">{report.reporter_email || '-'}</div>
                                                    </td>

                                                    <td className="px-5 py-4 align-top">
                                                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${getTypeClass(report.incident_type)}`}>{report.incident_type || 'Tidak diketahui'}</span>
                                                        <div className="mt-2 text-xs text-slate-500 dark:text-slate-300">{formatDateOnly(report.incident_at)} • {formatTimeOnly(report.incident_at)}</div>
                                                    </td>

                                                    <td className="max-w-xs px-5 py-4 align-top">
                                                        <div className="line-clamp-2 text-sm font-semibold text-slate-700 dark:text-slate-100">{report.location || '-'}</div>
                                                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-300">{report.latitude}, {report.longitude}</div>
                                                        {(report.district || report.village) && <div className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-300">{[report.village, report.district].filter(Boolean).join(', ')}</div>}
                                                    </td>

                                                    <td className="px-5 py-4 align-top"><span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${getStatusClass(report.status)}`}>{getStatusLabel(report.status)}</span></td>

                                                    <td className="px-5 py-4 align-top">
                                                        <div className="flex flex-wrap justify-end gap-2">
                                                            <button type="button" onClick={() => setSelectedReport(report)} className="rounded-xl border border-[#D8E4ED] bg-white dark:bg-[#102538] px-3 py-2 text-xs font-black text-slate-700 dark:text-slate-100 transition hover:bg-stone-50"></button>
                                                            {report.status !== 'approved' && <button type="button" disabled={actionLoading === report.id} onClick={() => approveReport(report)} className="rounded-xl bg-[#D95F5F] px-3 py-2 text-xs font-black text-white transition hover:bg-[#1A3348] disabled:opacity-60">Setujui</button>}
                                                            {report.status !== 'rejected' && <button type="button" disabled={actionLoading === report.id} onClick={() => openRejectModal(report)} className="rounded-xl bg-red-600 px-3 py-2 text-xs font-black text-white transition hover:bg-red-700 disabled:opacity-60">Tolak</button>}
                                                            <button type="button" disabled={actionLoading === report.id} onClick={() => openDeleteModal(report)} className="rounded-xl border border-red-200 bg-white dark:bg-[#102538] px-3 py-2 text-xs font-black text-red-700 transition hover:bg-red-50 disabled:opacity-60">Hapus</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-sm font-semibold text-slate-500 dark:text-slate-300">Halaman {meta.current_page} dari {meta.last_page} • Total {meta.total} laporan</div>
                        <div className="flex gap-2">
                            <button type="button" disabled={page <= 1} onClick={() => setPage((prev) => Math.max(prev - 1, 1))} className="rounded-2xl border border-[#D8E4ED] bg-white dark:bg-[#102538] px-4 py-2 text-sm font-black text-slate-700 dark:text-slate-100 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50">Sebelumnya</button>
                            <button type="button" disabled={page >= meta.last_page} onClick={() => setPage((prev) => Math.min(prev + 1, meta.last_page))} className="rounded-2xl border border-[#D8E4ED] bg-white dark:bg-[#102538] px-4 py-2 text-sm font-black text-slate-700 dark:text-slate-100 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50">Berikutnya</button>
                        </div>
                    </div>
                </section>
            </div>

            {selectedReport && (
                <ReportDetailModal
                    report={selectedReport}
                    actionLoading={actionLoading}
                    onClose={() => setSelectedReport(null)}
                    onOpenPhoto={() => openPhotoGallery(selectedReport)}
                    onApprove={() => approveReport(selectedReport)}
                    onReject={() => openRejectModal(selectedReport)}
                    onDelete={() => openDeleteModal(selectedReport)}
                />
            )}

            {selectedPhotoGallery && (
                <PhotoGalleryModal gallery={selectedPhotoGallery} setGallery={setSelectedPhotoGallery} />
            )}

            {rejectReport && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-xl rounded-[2rem] bg-white dark:bg-[#102538] p-6 shadow-2xl">
                        <div className="text-xs font-black uppercase tracking-[0.25em] text-red-700">Tolak Laporan</div>
                        <h2 className="mt-2 text-2xl font-black text-[#D95F5F] dark:text-[#D95F5F]">{getReportCode(rejectReport)}</h2>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-200">Masukkan alasan penolakan agar proses validasi laporan terdokumentasi dengan jelas.</p>
                        <textarea value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} placeholder="Contoh: Lokasi kejadian belum jelas atau deskripsi belum cukup untuk diverifikasi." className="mt-5 min-h-32 w-full rounded-3xl border border-stone-200 bg-stone-50 p-4 text-sm outline-none transition focus:border-red-300 focus:bg-white dark:bg-[#102538] focus:ring-4 focus:ring-red-100" />
                        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
                            <button type="button" onClick={() => { setRejectReport(null); setRejectionReason(''); }} className="rounded-2xl border border-[#D8E4ED] bg-white dark:bg-[#102538] px-5 py-3 text-sm font-black text-slate-700 dark:text-slate-100 transition hover:bg-stone-50">Batal</button>
                            <button type="button" onClick={submitRejectReport} disabled={actionLoading === rejectReport.id} className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:opacity-60">Simpan Penolakan</button>
                        </div>
                    </div>
                </div>
            )}

            {deleteReport && (
                <div className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-xl rounded-[2rem] bg-white dark:bg-[#102538] p-6 shadow-2xl">
                        <div className="text-xs font-black uppercase tracking-[0.25em] text-red-700">Konfirmasi Hapus Data</div>
                        <h2 className="mt-2 text-2xl font-black text-[#D95F5F] dark:text-[#D95F5F]">{getReportCode(deleteReport)}</h2>
                        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-200">Apakah Anda yakin ingin menghapus laporan ini secara permanen? Data yang sudah dihapus akan hilang dari dashboard admin dan otomatis tidak tampil lagi di peta WebGIS. Tindakan ini tidak bisa dibatalkan.</p>
                        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold leading-relaxed text-red-700">Penghapusan hanya dapat dilakukan oleh akun admin yang sudah login. Sistem juga memakai proteksi CSRF agar aksi tidak mudah disalahgunakan dari luar halaman admin.</div>
                        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
                            <button type="button" onClick={() => setDeleteReport(null)} className="rounded-2xl border border-[#D8E4ED] bg-white dark:bg-[#102538] px-5 py-3 text-sm font-black text-slate-700 dark:text-slate-100 transition hover:bg-stone-50">Batal</button>
                            <button type="button" onClick={submitDeleteReport} disabled={actionLoading === deleteReport.id} className="rounded-2xl bg-red-700 px-5 py-3 text-sm font-black text-white transition hover:bg-red-800 disabled:opacity-60">Ya, Hapus Permanen</button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}

function SummaryCard({ label, value, desc, tone }: { label: string; value: number; desc: string; tone: 'slate' | 'amber' | 'emerald' | 'red' }) {
    const toneClass = {
        slate: 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#102538] text-[#D95F5F]',
        amber: 'border-[#D95F5F] bg-[#EFF4F8] text-[#D95F5F]',
        emerald: 'border-[#D95F5F] bg-[#EFF4F8] text-[#D95F5F]',
        red: 'border-red-300 bg-red-50 text-red-700',
    }[tone];

    return (
        <div className={`rounded-3xl border p-5 shadow-sm ${toneClass}`}>
            <div className="text-xs font-black uppercase tracking-[0.22em]">{label}</div>
            <div className="mt-2 text-4xl font-black">{value}</div>
            <div className="mt-1 text-xs opacity-80">{desc}</div>
        </div>
    );
}

function FilterInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
    return (
        <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-300">{label}</label>
            <input value={value} onChange={(event) => onChange(event.target.value)} placeholder="Cari nama pelapor, lokasi, jenis, atau deskripsi..." className="h-12 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 text-sm outline-none transition focus:border-[#D95F5F] focus:bg-white dark:bg-[#102538] focus:ring-4 focus:ring-amber-100" />
        </div>
    );
}

function TableHead({ children, align = 'left' }: { children: ReactNode; align?: 'left' | 'right' }) {
    const alignClass = align === 'right' ? 'text-right' : 'text-left';
    return <th className={`px-5 py-4 ${alignClass} text-xs font-black uppercase tracking-[0.18em]`}>{children}</th>;
}

function AlertBox({ tone, message }: { tone: 'red' | 'emerald'; message: string }) {
    const className = tone === 'red'
        ? 'border-red-200 bg-red-50 text-red-700'
        : 'border-[#D8E4ED] bg-[#EFF4F8] text-[#D95F5F]';

    return <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold ${className}`}>{message}</div>;
}

function ReportDetailModal({ report, actionLoading, onClose, onOpenPhoto, onApprove, onReject, onDelete }: {
    report: IncidentReport;
    actionLoading: number | null;
    onClose: () => void;
    onOpenPhoto: () => void;
    onApprove: () => void;
    onReject: () => void;
    onDelete: () => void;
}) {
    const photoUrls = getReportPhotoUrls(report);
    const thumbnail = photoUrls[0];

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-white dark:bg-[#102538] p-6 shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="text-xs font-black uppercase tracking-[0.25em] text-[#D95F5F]">Detail Laporan</div>
                        <h2 className="mt-2 text-2xl font-black text-[#D95F5F] dark:text-[#D95F5F]">{getReportCode(report)}</h2>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-full border border-stone-200 px-3 py-1 text-sm font-black text-slate-600 dark:text-slate-200 hover:bg-stone-50">Tutup</button>
                </div>

                {thumbnail && (
                    <button type="button" onClick={onOpenPhoto} className="mt-5 block w-full overflow-hidden rounded-3xl border border-[#D8E4ED] bg-[#EFF4F8] text-left shadow-sm transition hover:shadow-lg">
                        <img src={thumbnail} alt={`Foto bukti ${getReportCode(report)}`} className="h-56 w-full object-cover" />
                        <div className="flex items-center justify-between gap-3 px-4 py-3">
                            <div>
                                <div className="text-xs font-black uppercase tracking-[0.2em] text-[#D95F5F]">Foto Bukti Laporan</div>
                                <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-200">Klik untuk melihat gambar ukuran penuh. Foto hanya tampil di peta publik setelah laporan disetujui.</p>
                            </div>
                            <span className="rounded-full bg-white dark:bg-[#102538] px-3 py-1 text-xs font-black text-[#D95F5F]">{photoUrls.length > 1 ? `${photoUrls.length} Foto` : 'Preview'}</span>
                        </div>
                    </button>
                )}

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <InfoBox title="Pelapor"><div className="text-sm font-bold text-slate-800 dark:text-white">{report.reporter_name || 'Tanpa nama'}</div><div className="mt-1 text-sm text-slate-600 dark:text-slate-200">{report.reporter_phone || '-'}</div><div className="mt-1 text-sm text-slate-600 dark:text-slate-200">{report.reporter_email || '-'}</div></InfoBox>
                    <InfoBox title="Status"><span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${getStatusClass(report.status)}`}>{getStatusLabel(report.status)}</span><div className="mt-2 text-sm text-slate-600 dark:text-slate-200">Direview: {formatDateTime(report.reviewed_at)}</div></InfoBox>
                </div>

                <InfoBox title="Jenis Kejadian" className="mt-4"><span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${getTypeClass(report.incident_type)}`}>{report.incident_type || 'Tidak diketahui'}</span><div className="mt-3 grid gap-3 md:grid-cols-2"><div><div className="text-xs font-bold text-slate-500 dark:text-slate-300">Tanggal Kejadian</div><div className="text-sm font-semibold text-slate-800 dark:text-white">{formatDateOnly(report.incident_at)}</div></div><div><div className="text-xs font-bold text-slate-500 dark:text-slate-300">Jam Kejadian</div><div className="text-sm font-semibold text-slate-800 dark:text-white">{formatTimeOnly(report.incident_at)}</div></div></div></InfoBox>
                <InfoBox title="Lokasi" className="mt-4"><div className="text-sm font-semibold text-slate-800 dark:text-white">{report.location || '-'}</div><div className="mt-1 text-sm text-slate-500 dark:text-slate-300">Koordinat: {report.latitude}, {report.longitude}</div>{(report.village || report.district) && <div className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-300">{[report.village, report.district].filter(Boolean).join(', ')}</div>}</InfoBox>
                <InfoBox title="Deskripsi" className="mt-4"><p className="whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-100">{report.description || '-'}</p></InfoBox>

                {report.rejection_reason && <div className="mt-4 rounded-3xl border border-red-200 bg-red-50 p-4"><div className="text-xs font-black uppercase tracking-[0.2em] text-red-700">Alasan Penolakan</div><p className="mt-2 text-sm leading-relaxed text-red-700">{report.rejection_reason}</p></div>}

                <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
                    {report.status !== 'approved' && <button type="button" onClick={onApprove} disabled={actionLoading === report.id} className="rounded-2xl bg-[#D95F5F] px-5 py-3 text-sm font-black text-white transition hover:bg-[#1A3348] disabled:opacity-60">Setujui Laporan</button>}
                    {report.status !== 'rejected' && <button type="button" onClick={onReject} disabled={actionLoading === report.id} className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:opacity-60">Tolak Laporan</button>}
                    <button type="button" onClick={onDelete} disabled={actionLoading === report.id} className="rounded-2xl border border-red-200 bg-white dark:bg-[#102538] px-5 py-3 text-sm font-black text-red-700 transition hover:bg-red-50 disabled:opacity-60">Hapus Permanen</button>
                </div>
            </div>
        </div>
    );
}

function InfoBox({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
    return (
        <div className={`rounded-3xl border border-stone-200 bg-stone-50 p-4 ${className}`}>
            <div className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">{title}</div>
            {children}
        </div>
    );
}

function PhotoGalleryModal({ gallery, setGallery }: { gallery: PhotoGalleryState; setGallery: Dispatch<SetStateAction<PhotoGalleryState | null>> }) {
    const currentUrl = gallery.urls[gallery.index];

    return (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="relative max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-[2rem] bg-white dark:bg-[#102538] shadow-2xl">
                <button type="button" onClick={() => setGallery(null)} className="absolute right-4 top-4 z-10 rounded-full bg-black/60 px-4 py-2 text-sm font-black text-white backdrop-blur transition hover:bg-black">Tutup</button>
                <div className="relative bg-black">
                    <img src={currentUrl} alt={`Foto bukti ${gallery.code}`} className="max-h-[76vh] w-full object-contain" />
                    {gallery.urls.length > 1 && <><button type="button" onClick={() => setGallery((current) => current ? { ...current, index: (current.index - 1 + current.urls.length) % current.urls.length } : current)} className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white dark:bg-[#102538]/15 text-2xl font-black text-white backdrop-blur transition hover:bg-white dark:bg-[#102538]/25" aria-label="Foto sebelumnya">‹</button><button type="button" onClick={() => setGallery((current) => current ? { ...current, index: (current.index + 1) % current.urls.length } : current)} className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white dark:bg-[#102538]/15 text-2xl font-black text-white backdrop-blur transition hover:bg-white dark:bg-[#102538]/25" aria-label="Foto berikutnya">›</button></>}
                </div>
                <div className="border-t border-stone-200 bg-white dark:bg-[#102538] px-5 py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div><div className="text-xs font-black uppercase tracking-[0.2em] text-[#D95F5F]">Foto Bukti Laporan</div><p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-200">{gallery.code} • Foto {gallery.index + 1} dari {gallery.urls.length}</p></div>
                        {gallery.urls.length > 1 && <div className="flex flex-wrap gap-2">{gallery.urls.map((url, index) => <button key={url} type="button" onClick={() => setGallery((current) => current ? { ...current, index } : current)} className={`h-12 w-16 overflow-hidden rounded-xl border-2 ${gallery.index === index ? 'border-[#27527A]' : 'border-stone-200'}`}><img src={url} alt={`Thumbnail foto ${index + 1}`} className="h-full w-full object-cover" /></button>)}</div>}
                    </div>
                </div>
            </div>
        </div>
    );
}
