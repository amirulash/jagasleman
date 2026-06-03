import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import {
    CheckCircle2,
    Edit3,
    Eye,
    FileText,
    Image as ImageIcon,
    Map,
    MapPin,
    Printer,
    RefreshCw,
    Save,
    Search,
    ShieldCheck,
    Trash2,
    X,
} from 'lucide-react';

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
    status: 'pending' | 'approved' | 'rejected';
    rejection_reason?: string | null;
    photo_url?: string | null;
    photo_urls?: string[];
    created_at?: string | null;
    reviewed_at?: string | null;
};

type EditForm = {
    title: string;
    incident_type: string;
    description: string;
    location: string;
    district: string;
    village: string;
    latitude: string;
    longitude: string;
    incident_at: string;
    admin_note: string;
};

const crimeTypes = [
    'PENGEROYOKAN',
    'PENGRUSAKAN',
    'PENGANIAYAAN',
    'PENYALAHGUNAAN SENJATA TAJAM',
    'PENCURIAN DENGAN KEKERASAN (CURAS)',
    'PEMERASAN DAN PENGANCAMAN',
    'LAINNYA',
];

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

function toDatetimeLocal(value?: string | null) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60 * 1000);
    return local.toISOString().slice(0, 16);
}

function normalize(value?: string | number | null) {
    return String(value ?? '').toLowerCase();
}

function makeEditForm(report: IncidentReport): EditForm {
    return {
        title: report.title || '',
        incident_type: report.incident_type || '',
        description: report.description || '',
        location: report.location || '',
        district: report.district || '',
        village: report.village || '',
        latitude: String(report.latitude || ''),
        longitude: String(report.longitude || ''),
        incident_at: toDatetimeLocal(report.incident_at),
        admin_note: '',
    };
}

function getPhotos(report: IncidentReport) {
    if (Array.isArray(report.photo_urls) && report.photo_urls.length) return report.photo_urls;
    if (report.photo_url) return [report.photo_url];
    return [];
}

function openPointsPdf(reports: IncidentReport[]) {
    const rows = reports.map((item, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${getReportCode(item)}</td>
            <td>${item.incident_type || '-'}</td>
            <td>${item.location || '-'}</td>
            <td>${item.district || '-'}</td>
            <td>${item.latitude || '-'}, ${item.longitude || '-'}</td>
            <td>${formatDateTime(item.reviewed_at || item.created_at)}</td>
        </tr>
    `).join('');

    const html = `<!doctype html><html><head><title>Data Titik Terverifikasi JagaSleman</title><style>
        body{font-family:Arial,sans-serif;margin:28px;color:#07324A}h1{margin:0;font-size:24px}.muted{color:#64748b;font-size:12px}.header{border-bottom:3px solid #F47B52;padding-bottom:14px;margin-bottom:18px}.summary{display:flex;gap:10px;margin:16px 0}.card{border:1px solid #BDE7E1;border-radius:14px;padding:12px;background:#f8fafc}.card b{font-size:22px}table{width:100%;border-collapse:collapse}th{background:#07324A;color:#fff;text-align:left;font-size:11px;padding:10px}td{border-bottom:1px solid #e2e8f0;font-size:11px;padding:9px;vertical-align:top}button{padding:10px 16px;border:0;border-radius:12px;background:#F47B52;font-weight:700;cursor:pointer;float:right}@media print{button{display:none}}
    </style></head><body>
        <button onclick="window.print()">Cetak / Simpan PDF</button>
        <div class="header"><h1>Data Titik Laporan Terverifikasi</h1><div class="muted">JagaSleman · ${formatDateTime(new Date().toISOString())}</div></div>
        <div class="summary"><div class="card">Total titik: <b>${reports.length}</b></div></div>
        <table><thead><tr><th>No</th><th>Kode</th><th>Jenis</th><th>Lokasi</th><th>Kecamatan</th><th>Koordinat</th><th>Waktu Review</th></tr></thead><tbody>${rows || '<tr><td colspan="7">Belum ada data.</td></tr>'}</tbody></table>
        <script>setTimeout(()=>window.print(),500)</script>
    </body></html>`;

    const win = window.open('', '_blank', 'width=1024,height=720');
    if (!win) return;
    win.document.write(html);
    win.document.close();
}

export default function AdminPoints() {
    const [reports, setReports] = useState<IncidentReport[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [keyword, setKeyword] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [districtFilter, setDistrictFilter] = useState('all');
    const [selectedReport, setSelectedReport] = useState<IncidentReport | null>(null);
    const [editingReport, setEditingReport] = useState<IncidentReport | null>(null);
    const [editForm, setEditForm] = useState<EditForm | null>(null);

    const loadReports = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/admin/incident-reports?status=approved&per_page=500', {
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': getCsrfToken(),
                },
            });

            if (!response.ok) throw new Error('Gagal memuat titik terverifikasi.');

            const json = await response.json();
            setReports(Array.isArray(json.data) ? json.data : []);
        } catch (err) {
            console.error(err);
            setError('Data titik terverifikasi belum berhasil dimuat. Pastikan API admin aktif dan akun sudah login sebagai admin.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReports();
    }, []);

    const typeOptions = useMemo(() => {
        return Array.from(new Set(reports.map((item) => item.incident_type).filter(Boolean) as string[])).sort();
    }, [reports]);

    const districtOptions = useMemo(() => {
        return Array.from(new Set(reports.map((item) => item.district).filter(Boolean) as string[])).sort();
    }, [reports]);

    const filteredReports = useMemo(() => {
        const key = keyword.trim().toLowerCase();

        return reports.filter((item) => {
            const matchKeyword = !key ||
                normalize(item.report_code).includes(key) ||
                normalize(item.incident_type).includes(key) ||
                normalize(item.description).includes(key) ||
                normalize(item.location).includes(key) ||
                normalize(item.district).includes(key) ||
                normalize(item.village).includes(key) ||
                normalize(item.reporter_name).includes(key) ||
                normalize(item.reporter_phone).includes(key);

            const matchType = typeFilter === 'all' || item.incident_type === typeFilter;
            const matchDistrict = districtFilter === 'all' || item.district === districtFilter;

            return matchKeyword && matchType && matchDistrict;
        });
    }, [reports, keyword, typeFilter, districtFilter]);

    const summary = useMemo(() => {
        const withPhoto = reports.filter((item) => getPhotos(item).length > 0).length;
        const withCoordinate = reports.filter((item) => Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude))).length;

        return {
            total: reports.length,
            filtered: filteredReports.length,
            withPhoto,
            withCoordinate,
        };
    }, [reports, filteredReports]);

    const openEdit = (report: IncidentReport) => {
        setEditingReport(report);
        setEditForm(makeEditForm(report));
    };

    const updateForm = (field: keyof EditForm, value: string) => {
        setEditForm((current) => current ? { ...current, [field]: value } : current);
    };

    const saveEdit = async () => {
        if (!editingReport || !editForm) return;

        setSaving(true);

        try {
            const response = await fetch(`/api/admin/incident-reports/${editingReport.id}`, {
                method: 'PATCH',
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': getCsrfToken(),
                },
                body: JSON.stringify({
                    ...editForm,
                    status: 'approved',
                    incident_at: editForm.incident_at || null,
                }),
            });

            const json = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(json.message || 'Gagal menyimpan perubahan titik.');

            setReports((current) => current.map((item) => item.id === editingReport.id ? json.data : item));
            setEditingReport(null);
            setEditForm(null);
            setSelectedReport(json.data);
            alert(json.message || 'Titik terverifikasi berhasil diperbarui.');
        } catch (err: any) {
            alert(err.message || 'Gagal menyimpan perubahan titik.');
        } finally {
            setSaving(false);
        }
    };

    const deleteReport = async (report: IncidentReport) => {
        const ok = window.confirm(`Apakah yakin ingin menghapus data terverifikasi ${getReportCode(report)}? Titik ini akan hilang dari peta publik dan tidak dapat dikembalikan.`);
        if (!ok) return;

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
            if (!response.ok) throw new Error(json.message || 'Gagal menghapus data.');

            setReports((current) => current.filter((item) => item.id !== report.id));
            setSelectedReport(null);
            alert(json.message || 'Data berhasil dihapus.');
        } catch (err: any) {
            alert(err.message || 'Gagal menghapus data.');
        }
    };

    const resetFilter = () => {
        setKeyword('');
        setTypeFilter('all');
        setDistrictFilter('all');
    };

    return (
        <AdminLayout title="Titik Tervalidasi">
            <div className="space-y-6">
                <section className="overflow-hidden rounded-[2rem] border border-[#BDE7E1] bg-white dark:bg-[#102538] shadow-xl shadow-slate-200/70 dark:border-white/10 dark:bg-white dark:bg-[#102538]/5">
                    <div className="grid gap-5r p-6 text-white lg:grid-cols-[1.15fr_.85fr] lg:p-8">
                        <div>
                            <div className="inline-flex items-center rounded-full border border-white/20 bg-white dark:bg-[#102538]/10 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-[#BDE7E1]">
                                <ShieldCheck className="mr-2 h-3.5 w-3.5" /> Data Tervalidasi
                            </div>
                            <h1 className="mt-4 text-3xl font-black tracking-tight md:text-4xl">
                                Kelola Titik Tervalidasi
                            </h1>
                            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/70">
                                Edit, hapus, dan ekspor titik laporan yang sudah disetujui.
                            </p>
                            <div className="mt-5 flex flex-wrap gap-3">
                                <button type="button" onClick={loadReports} className="rounded-2xl bg-white dark:bg-[#102538] px-5 py-3 text-sm font-black text-[#07324A] shadow-lg transition hover:bg-[#F2FAF6]">
                                    <RefreshCw className="mr-2 inline h-4 w-4" />Muat Ulang
                                </button>
                                <a href="/admin/peta" className="rounded-2xl border border-white/25 bg-white dark:bg-[#102538]/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white dark:bg-[#102538]/15">
                                    <Map className="mr-2 inline h-4 w-4" />Peta Admin
                                </a>
                                <button type="button" onClick={() => openPointsPdf(filteredReports)} className="rounded-2xl border border-white/25 bg-white dark:bg-[#102538]/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white dark:bg-[#102538]/15">
                                    <Printer className="mr-2 inline h-4 w-4" />Export PDF
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 rounded-[2rem] border border-white/20 bg-white dark:bg-[#102538]/10 p-4 backdrop-blur">
                            {[
                                { label: 'Titik Approved', value: summary.total, icon: CheckCircle2 },
                                { label: 'Hasil Filter', value: summary.filtered, icon: Search },
                                { label: 'Dengan Foto', value: summary.withPhoto, icon: ImageIcon },
                                { label: 'Koordinat Valid', value: summary.withCoordinate, icon: MapPin },
                            ].map((item) => {
                                const Icon = item.icon;
                                return (
                                    <div key={item.label} className="rounded-2xl bg-white dark:bg-[#102538]/10 p-4">
                                        <Icon className="h-5 w-5" />
                                        <p className="mt-2 text-3xl font-black">{item.value}</p>
                                        <p className="text-[11px] text-white/60">{item.label}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                <section className="rounded-[2rem] border border-[#BDE7E1] bg-white dark:bg-[#102538] p-5 shadow-xl shadow-slate-200/60 dark:border-white/10 dark:bg-white dark:bg-[#102538]/5">
                    <div className="grid gap-3 lg:grid-cols-[1fr_220px_220px_auto]">
                        <div>
                            <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">Cari data</label>
                            <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Cari kode, jenis, lokasi, kecamatan, desa, pelapor..." className="h-12 w-full rounded-2xl border border-[#BDE7E1] bg-[#F8FAFC] px-4 text-sm font-semibold outline-none transition focus:border-[#F47B52] focus:bg-white dark:bg-[#102538] focus:ring-4 focus:ring-[#BDE7E1]/35 dark:border-white/10 dark:bg-white dark:bg-[#102538]/5" />
                        </div>
                        <div>
                            <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">Jenis</label>
                            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="h-12 w-full rounded-2xl border border-[#BDE7E1] bg-[#F8FAFC] px-4 text-sm font-black outline-none transition focus:border-[#F47B52] focus:bg-white dark:bg-[#102538] focus:ring-4 focus:ring-[#BDE7E1]/35 dark:border-white/10 dark:bg-white dark:bg-[#102538]/5">
                                <option value="all">Semua Jenis</option>
                                {typeOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">Kecamatan</label>
                            <select value={districtFilter} onChange={(event) => setDistrictFilter(event.target.value)} className="h-12 w-full rounded-2xl border border-[#BDE7E1] bg-[#F8FAFC] px-4 text-sm font-black outline-none transition focus:border-[#F47B52] focus:bg-white dark:bg-[#102538] focus:ring-4 focus:ring-[#BDE7E1]/35 dark:border-white/10 dark:bg-white dark:bg-[#102538]/5">
                                <option value="all">Semua Kecamatan</option>
                                {districtOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button type="button" onClick={resetFilter} className="h-12 rounded-2xl border border-[#BDE7E1] bg-white dark:bg-[#102538] px-5 text-sm font-black text-slate-700 dark:text-slate-100 transition hover:bg-[#F2FAF6] dark:border-white/10 dark:bg-white dark:bg-[#102538]/5 dark:text-white">Reset</button>
                        </div>
                    </div>

                    {error && <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}

                    <div className="mt-5 overflow-hidden rounded-3xl border border-[#BDE7E1] dark:border-white/10">
                        <div className="overflow-x-auto">
                            <table className="min-w-[1120px] w-full divide-y divide-slate-200 dark:divide-white/10">
                                <thead className="bg-[#07324A] text-white">
                                    <tr>
                                        <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.18em]">Foto</th>
                                        <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.18em]">Kode & Jenis</th>
                                        <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.18em]">Lokasi</th>
                                        <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.18em]">Koordinat</th>
                                        <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.18em]">Waktu</th>
                                        <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-[0.18em]">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white dark:bg-[#102538] dark:divide-white/10 dark:bg-transparent">
                                    {loading ? (
                                        <tr><td colSpan={6} className="px-5 py-12 text-center text-sm font-bold text-slate-500 dark:text-slate-300">Memuat titik terverifikasi...</td></tr>
                                    ) : filteredReports.length === 0 ? (
                                        <tr><td colSpan={6} className="px-5 py-12 text-center text-sm font-bold text-slate-500 dark:text-slate-300">Belum ada titik terverifikasi sesuai filter.</td></tr>
                                    ) : filteredReports.map((report) => {
                                        const photos = getPhotos(report);
                                        return (
                                            <tr key={report.id} className="transition hover:bg-[#F2FAF6]/50 dark:hover:bg-white dark:bg-[#102538]/5">
                                                <td className="px-5 py-4 align-top">
                                                    {photos[0] ? (
                                                        <button type="button" onClick={() => setSelectedReport(report)} className="relative block">
                                                            <img src={photos[0]} alt="Foto laporan" className="h-16 w-20 rounded-2xl object-cover shadow-sm" />
                                                            {photos.length > 1 && <span className="absolute -right-2 -top-2 rounded-full bg-[#07324A] px-2 py-0.5 text-[10px] font-black text-white">+{photos.length - 1}</span>}
                                                        </button>
                                                    ) : (
                                                        <div className="flex h-16 w-20 items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#17324A] text-slate-500 dark:text-slate-300"><ImageIcon className="h-5 w-5" /></div>
                                                    )}
                                                </td>
                                                <td className="px-5 py-4 align-top">
                                                    <div className="text-xs font-black text-[#F47B52]">{getReportCode(report)}</div>
                                                    <div className="mt-1 max-w-xs text-sm font-black text-[#07324A] dark:text-white">{report.incident_type || '-'}</div>
                                                    <div className="mt-2 inline-flex rounded-full border border-[#BDE7E1] bg-[#F2FAF6] px-2.5 py-1 text-[11px] font-black text-[#F47B52]">Terverifikasi</div>
                                                </td>
                                                <td className="px-5 py-4 align-top">
                                                    <div className="max-w-sm text-sm font-bold text-slate-800 dark:text-white dark:text-white/85">{report.location || '-'}</div>
                                                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-300">{report.village || '-'}, {report.district || '-'}</div>
                                                </td>
                                                <td className="px-5 py-4 align-top">
                                                    <div className="rounded-2xl bg-slate-50 dark:bg-[#17324A] px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-100 dark:bg-white dark:bg-[#102538]/5 dark:text-white/70">{report.latitude || '-'}, {report.longitude || '-'}</div>
                                                </td>
                                                <td className="px-5 py-4 align-top text-sm font-semibold text-slate-700 dark:text-slate-100 dark:text-white/70">{formatDateTime(report.incident_at || report.created_at)}</td>
                                                <td className="px-5 py-4 align-top">
                                                    <div className="flex justify-end gap-2">
                                                        <button type="button" onClick={() => setSelectedReport(report)} className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#102538] px-3 py-2 text-xs font-black text-slate-700 dark:text-slate-100 transition hover:bg-slate-50 dark:bg-[#17324A] dark:border-white/10 dark:bg-white dark:bg-[#102538]/5 dark:text-white"><Eye className="mr-1 inline h-3.5 w-3.5" /></button>
                                                        <button type="button" onClick={() => openEdit(report)} className="rounded-xl bg-[#F47B52] px-3 py-2 text-xs font-black text-white transition hover:bg-[#07324A]"><Edit3 className="mr-1 inline h-3.5 w-3.5" />Edit</button>
                                                        <button type="button" onClick={() => deleteReport(report)} className="rounded-xl bg-red-600 px-3 py-2 text-xs font-black text-white transition hover:bg-red-700"><Trash2 className="mr-1 inline h-3.5 w-3.5" />Hapus</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                {selectedReport && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                        <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] bg-white dark:bg-[#102538] p-6 shadow-2xl dark:bg-[#122334]">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.22em] text-[#F47B52]">Detail Titik Tervalidasi</p>
                                    <h2 className="mt-2 text-2xl font-black text-[#07324A] dark:text-white">{getReportCode(selectedReport)}</h2>
                                </div>
                                <button type="button" onClick={() => setSelectedReport(null)} className="rounded-full border border-slate-200 dark:border-white/10 p-2 text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:bg-[#17324A]"><X className="h-5 w-5" /></button>
                            </div>

                            <div className="mt-5 flex gap-3 overflow-x-auto pb-2">
                                {getPhotos(selectedReport).length ? getPhotos(selectedReport).map((url, index) => (
                                    <a key={`${url}-${index}`} href={url} target="_blank" rel="noreferrer" className="shrink-0">
                                        <img src={url} alt={`Foto laporan ${index + 1}`} className="h-44 w-64 rounded-3xl object-cover shadow-sm" />
                                    </a>
                                )) : <div className="flex h-36 w-full items-center justify-center rounded-3xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#17324A] text-sm font-bold text-slate-500 dark:text-slate-300">Tidak ada foto laporan</div>}
                            </div>

                            <div className="mt-5 grid gap-4 md:grid-cols-2">
                                <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#17324A] p-4 dark:border-white/10 dark:bg-white dark:bg-[#102538]/5">
                                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">Jenis & Waktu</p>
                                    <p className="mt-2 text-sm font-black text-slate-800 dark:text-white dark:text-white">{selectedReport.incident_type || '-'}</p>
                                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{formatDateTime(selectedReport.incident_at)}</p>
                                </div>
                                <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#17324A] p-4 dark:border-white/10 dark:bg-white dark:bg-[#102538]/5">
                                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">Koordinat</p>
                                    <p className="mt-2 text-sm font-black text-slate-800 dark:text-white dark:text-white">{selectedReport.latitude}, {selectedReport.longitude}</p>
                                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{selectedReport.village || '-'}, {selectedReport.district || '-'}</p>
                                </div>
                            </div>

                            <div className="mt-4 rounded-3xl border border-slate-200 dark:border-white/10 p-4 dark:border-white/10">
                                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">Lokasi</p>
                                <p className="mt-2 text-sm font-bold text-slate-800 dark:text-white dark:text-white/80">{selectedReport.location || '-'}</p>
                            </div>
                            <div className="mt-4 rounded-3xl border border-slate-200 dark:border-white/10 p-4 dark:border-white/10">
                                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">Deskripsi</p>
                                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-100 dark:text-white/70">{selectedReport.description || '-'}</p>
                            </div>

                            <div className="mt-6 flex flex-wrap justify-end gap-2">
                                <button type="button" onClick={() => openEdit(selectedReport)} className="rounded-2xl bg-[#F47B52] px-4 py-2 text-sm font-black text-white"><Edit3 className="mr-2 inline h-4 w-4" />Edit</button>
                                <button type="button" onClick={() => deleteReport(selectedReport)} className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-black text-white"><Trash2 className="mr-2 inline h-4 w-4" />Hapus</button>
                            </div>
                        </div>
                    </div>
                )}

                {editingReport && editForm && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                        <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] bg-white dark:bg-[#102538] p-6 shadow-2xl dark:bg-[#122334]">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.22em] text-[#F47B52]">Edit Titik Tervalidasi</p>
                                    <h2 className="mt-2 text-2xl font-black text-[#07324A] dark:text-white">{getReportCode(editingReport)}</h2>
                                </div>
                                <button type="button" onClick={() => { setEditingReport(null); setEditForm(null); }} className="rounded-full border border-slate-200 dark:border-white/10 p-2 text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:bg-[#17324A]"><X className="h-5 w-5" /></button>
                            </div>

                            <div className="mt-6 grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">Judul</label>
                                    <input value={editForm.title} onChange={(event) => updateForm('title', event.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#17324A] px-4 text-sm font-semibold outline-none focus:border-[#F47B52] focus:ring-4 focus:ring-[#BDE7E1]/35" />
                                </div>
                                <div>
                                    <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">Jenis Kejadian</label>
                                    <select value={editForm.incident_type} onChange={(event) => updateForm('incident_type', event.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#17324A] px-4 text-sm font-semibold outline-none focus:border-[#F47B52] focus:ring-4 focus:ring-[#BDE7E1]/35">
                                        <option value="">Pilih jenis</option>
                                        {crimeTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">Lokasi</label>
                                    <input value={editForm.location} onChange={(event) => updateForm('location', event.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#17324A] px-4 text-sm font-semibold outline-none focus:border-[#F47B52] focus:ring-4 focus:ring-[#BDE7E1]/35" />
                                </div>
                                <div>
                                    <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">Kecamatan</label>
                                    <input value={editForm.district} onChange={(event) => updateForm('district', event.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#17324A] px-4 text-sm font-semibold outline-none focus:border-[#F47B52] focus:ring-4 focus:ring-[#BDE7E1]/35" />
                                </div>
                                <div>
                                    <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">Desa/Kalurahan</label>
                                    <input value={editForm.village} onChange={(event) => updateForm('village', event.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#17324A] px-4 text-sm font-semibold outline-none focus:border-[#F47B52] focus:ring-4 focus:ring-[#BDE7E1]/35" />
                                </div>
                                <div>
                                    <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">Latitude</label>
                                    <input value={editForm.latitude} onChange={(event) => updateForm('latitude', event.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#17324A] px-4 text-sm font-semibold outline-none focus:border-[#F47B52] focus:ring-4 focus:ring-[#BDE7E1]/35" />
                                </div>
                                <div>
                                    <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">Longitude</label>
                                    <input value={editForm.longitude} onChange={(event) => updateForm('longitude', event.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#17324A] px-4 text-sm font-semibold outline-none focus:border-[#F47B52] focus:ring-4 focus:ring-[#BDE7E1]/35" />
                                </div>
                                <div>
                                    <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">Waktu Kejadian</label>
                                    <input type="datetime-local" value={editForm.incident_at} onChange={(event) => updateForm('incident_at', event.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#17324A] px-4 text-sm font-semibold outline-none focus:border-[#F47B52] focus:ring-4 focus:ring-[#BDE7E1]/35" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">Deskripsi</label>
                                    <textarea value={editForm.description} onChange={(event) => updateForm('description', event.target.value)} rows={5} className="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#17324A] px-4 py-3 text-sm font-semibold outline-none focus:border-[#F47B52] focus:ring-4 focus:ring-[#BDE7E1]/35" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">Catatan Admin</label>
                                    <textarea value={editForm.admin_note} onChange={(event) => updateForm('admin_note', event.target.value)} rows={3} placeholder="Opsional, misalnya alasan koreksi titik atau catatan validasi." className="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#17324A] px-4 py-3 text-sm font-semibold outline-none focus:border-[#F47B52] focus:ring-4 focus:ring-[#BDE7E1]/35" />
                                </div>
                            </div>

                            <div className="mt-6 flex flex-wrap justify-end gap-2">
                                <button type="button" onClick={() => { setEditingReport(null); setEditForm(null); }} className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#102538] px-5 py-3 text-sm font-black text-slate-700 dark:text-slate-100 hover:bg-slate-50 dark:bg-[#17324A]">Batal</button>
                                <button type="button" disabled={saving} onClick={saveEdit} className="rounded-2xl bg-[#F47B52] px-5 py-3 text-sm font-black text-white disabled:opacity-60">
                                    <Save className="mr-2 inline h-4 w-4" />{saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
