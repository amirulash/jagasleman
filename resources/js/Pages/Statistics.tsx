import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
    Activity,
    AlertCircle,
    BarChart3,
    CalendarDays,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Clock3,
    Database,
    Download,
    FileWarning,
    Loader2,
    Map as MapIcon,
    MapPin,
    RefreshCcw,
    ShieldAlert,
    TrendingUp,
} from 'lucide-react';
import {
    Bar,
    BarChart,
    Line,
    LineChart,
    Pie,
    PieChart,
    Cell,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { incidents as dummyIncidents } from '@/data/dummy';
import { JagaPageHero } from '@/Components/JagaPageHero';

type ReportRecord = {
    id?: string | number;
    report_code?: string;
    reportCode?: string;
    kode_laporan?: string;
    title?: string;
    incident_type?: string;
    crime_type?: string;
    type?: string;
    kategori?: string;
    category?: string;
    description?: string;
    location?: string;
    address?: string;
    district?: string;
    kecamatan?: string;
    village?: string;
    desa?: string;
    latitude?: string | number;
    longitude?: string | number;
    incident_at?: string;
    incident_date?: string;
    date?: string;
    updated_at?: string;
    reviewed_at?: string;
    created_at?: string;
    reporter_name?: string;
    reporter_email?: string;
    reporter_phone?: string;
    admin_note?: string;
    reviewed_by?: string | number;
    reviewer_name?: string;
    status?: string;
    source?: string;
};

type MonthlyStat = {
    month: string;
    total: number;
    month_number?: number;
};

type CategoryStat = {
    name: string;
    value: number;
    fill?: string;
};

type DistrictStat = {
    name: string;
    total: number;
};

type RecentReport = {
    id?: string | number;
    report_code?: string;
    title?: string;
    type?: string;
    description?: string;
    location?: string;
    district?: string;
    village?: string;
    latitude?: string | number;
    longitude?: string | number;
    date?: string;
    updated_at?: string;
    reporter_name?: string;
    status?: string;
    admin_note?: string;
    reviewer_name?: string;
    source?: string;
};

type StatisticSource = 'database' | 'map-api' | 'dummy';

type StatisticPayload = {
    summary: {
        total: number;
        pending: number;
        approved: number;
        rejected: number;
        districts: number;
        top_district: string;
        avg_per_month: number;
    };
    monthly: MonthlyStat[];
    categories: CategoryStat[];
    districts: DistrictStat[];
    annual: Array<{ year: string; total: number }>;
    recent_reports: RecentReport[];
    recent_police_reports?: RecentReport[];
    recent_community_reports?: RecentReport[];
    export_reports?: RecentReport[];
    available_years: string[];
    updated_at?: string | null;
    source: StatisticSource;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const CATEGORY_COLORS = ['#334155', '#F47B52', '#0EA5E9', '#F2A20B', '#8B5CF6', '#14B8A6', '#22C55E', '#E11D48'];
const CURRENT_YEAR = String(new Date().getFullYear());
const DEFAULT_STATISTICS_YEAR = '2025';
const HISTORICAL_YEAR_OPTIONS = ['2025', '2024', '2023', '2022', '2021', '2020'];

function numberFormat(value: number) {
    return new Intl.NumberFormat('id-ID').format(Number(value || 0));
}

function formatDate(value?: string | null) {
    if (!value || value === '-') return '-';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(date);
}

function normalizeStatus(value?: string | null) {
    const text = String(value || '').toLowerCase().trim();

    if (['approved', 'approve', 'diterima', 'disetujui', 'verified', 'aktif', 'selesai'].includes(text)) return 'approved';
    if (['rejected', 'reject', 'ditolak', 'invalid'].includes(text)) return 'rejected';
    return 'pending';
}

function statusLabel(value?: string | null) {
    const status = normalizeStatus(value);
    if (status === 'approved') return 'Terverifikasi';
    if (status === 'rejected') return 'Ditolak';
    return 'Menunggu';
}

function statusClass(value?: string | null) {
    const status = normalizeStatus(value);
    if (status === 'approved') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    if (status === 'rejected') return 'border-rose-200 bg-rose-50 text-rose-700';
    return 'border-amber-200 bg-amber-50 text-amber-700';
}

function getDataSourceLabel(source?: string) {
    if (source === 'database') return 'Data Sistem';
    if (source === 'map-api') return 'Data Peta';
    if (source === 'dummy') return 'Data Lokal';
    return 'Data Statistik';
}

function getDataSourceDescription(source?: string) {
    if (source === 'database') {
        return 'Statistik dibaca dari API utama. Jika tersedia, data pelaporan masyarakat dan kejadian kepolisian ditampilkan dalam satu halaman.';
    }

    if (source === 'map-api') {
        return 'Statistik dibangun dari data peta dan data kejadian yang tersedia pada sistem.';
    }

    if (source === 'dummy') {
        return 'Data lokal digunakan sebagai pengganti ketika API statistik dan data peta belum tersedia.';
    }

    return 'Data digunakan untuk membaca tren kejadian, kategori, wilayah, dan status laporan.';
}

function getRecentSourceLabel(item: RecentReport) {
    const source = String(item.source || '').toLowerCase();
    const code = String(item.report_code || '').toUpperCase();

    if (source === 'database' || source === 'community' || source === 'report' || code.startsWith('LAP-')) {
        return 'Pelaporan';
    }

    return 'Kepolisian';
}

function getRecentSourceKey(item: RecentReport) {
    return getRecentSourceLabel(item) === 'Pelaporan' ? 'community' : 'police';
}

function sourceBadgeClass(item: RecentReport) {
    return getRecentSourceKey(item) === 'community'
        ? 'border-rose-200 bg-rose-50 text-rose-700'
        : 'border-slate-200 bg-slate-100 text-slate-700';
}

function getReportDate(item: ReportRecord) {
    return item.incident_at || item.incident_date || item.date || item.created_at || '';
}

function getReportYear(item: ReportRecord) {
    const value = getReportDate(item);
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        const text = String(value || '');
        const match = text.match(/(20\d{2})/);
        return match?.[1] || CURRENT_YEAR;
    }

    return String(date.getFullYear());
}

function getReportMonthIndex(item: ReportRecord) {
    const value = getReportDate(item);
    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) return date.getMonth();

    const monthText = String(value || '').slice(5, 7);
    const month = Number(monthText);
    if (month >= 1 && month <= 12) return month - 1;

    return new Date().getMonth();
}

function normalizeType(item: ReportRecord) {
    return String(
        item.incident_type ||
        item.crime_type ||
        item.type ||
        item.kategori ||
        item.category ||
        'Tidak diketahui'
    ).trim() || 'Tidak diketahui';
}

function normalizeDistrict(item: ReportRecord) {
    return String(item.district || item.kecamatan || 'Belum terdeteksi').trim() || 'Belum terdeteksi';
}

function normalizeVillage(item: ReportRecord) {
    return String(item.village || item.desa || '-').trim() || '-';
}

function normalizeRecentReportItem(item: ReportRecord | any, index = 0, source: string = 'database'): RecentReport {
    const sourceType = String(item.source || source || '').toLowerCase();
    const code = String(item.report_code || item.reportCode || item.kode_laporan || '').toUpperCase();
    const isPoliceData = ['police', 'kepolisian', 'map-api', 'dummy'].includes(sourceType) || code.startsWith('POL-');
    const rawId = String(item.id ?? index + 1).replace(/^police-/i, '').replace(/^report-/i, '').replace(/^laporan-/i, '');
    const fallbackCode = isPoliceData
        ? `POL-${rawId.padStart(4, '0')}`
        : `LAP-${rawId.padStart(4, '0')}`;

    return {
        id: item.id,
        report_code: item.report_code || item.reportCode || item.kode_laporan || fallbackCode,
        title: item.title || normalizeType(item),
        type: normalizeType(item),
        description: item.description || item.kronologi || item.catatan || '-',
        location: item.location || item.address || item.alamat || '-',
        district: normalizeDistrict(item),
        village: normalizeVillage(item),
        latitude: item.latitude ?? item.lat ?? '-',
        longitude: item.longitude ?? item.lng ?? '-',
        date: getReportDate(item),
        updated_at: item.updated_at || item.reviewed_at || item.created_at || getReportDate(item),
        reporter_name: item.reporter_name || item.nama_pelapor || '',
        status: item.status || (isPoliceData ? 'approved' : 'pending'),
        admin_note: item.admin_note || item.tindak_lanjut || '',
        reviewer_name: item.reviewer_name || item.petugas || item.admin || '',
        source: item.source || (isPoliceData ? 'police' : source),
    };
}

function isCommunityRecentReport(item: RecentReport) {
    return getRecentSourceKey(item) === 'community';
}

function isPoliceRecentReport(item: RecentReport) {
    return !isCommunityRecentReport(item);
}

function extractReports(payload: any): ReportRecord[] {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.reports)) return payload.reports;
    if (Array.isArray(payload?.incident_reports)) return payload.incident_reports;
    if (Array.isArray(payload?.incidents)) return payload.incidents;

    if (Array.isArray(payload?.features)) {
        return payload.features.map((feature: any) => {
            const props = feature?.properties || {};
            const coordinates = feature?.geometry?.coordinates || [];

            return {
                ...props,
                longitude: coordinates[0],
                latitude: coordinates[1],
            };
        });
    }

    return [];
}

function normalizeSource(value?: string): StatisticSource {
    if (value === 'map-api' || value === 'dummy' || value === 'database') return value;
    return 'database';
}

function normalizeApiStatistics(payload: any, selectedYear: string): StatisticPayload | null {
    if (!payload || !payload.summary) return null;

    const monthly = Array.isArray(payload.monthly)
        ? payload.monthly.map((item: any, index: number) => ({
            month: String(item.month || MONTHS[index] || '-'),
            total: Number(item.total || item.value || 0),
            month_number: Number(item.month_number || index + 1),
        }))
        : MONTHS.map((month, index) => ({ month, total: 0, month_number: index + 1 }));

    const categories = Array.isArray(payload.categories)
        ? payload.categories.map((item: any, index: number) => ({
            name: String(item.name || item.type || item.category || 'Tidak diketahui'),
            value: Number(item.value || item.total || 0),
            fill: item.fill || CATEGORY_COLORS[index % CATEGORY_COLORS.length],
        }))
        : [];

    const districts = Array.isArray(payload.districts)
        ? payload.districts.map((item: any) => ({
            name: String(item.name || item.district || item.kecamatan || 'Belum terdeteksi'),
            total: Number(item.total || item.value || 0),
        }))
        : [];

    const annual = Array.isArray(payload.annual)
        ? payload.annual.map((item: any) => ({
            year: String(item.year),
            total: Number(item.total || item.value || 0),
        }))
        : [];

    const total = Number(payload.summary.total || 0);
    const normalizedRecentReports = Array.isArray(payload.recent_reports)
        ? payload.recent_reports.map((item: any, index: number) => normalizeRecentReportItem(item, index, item.source || 'database'))
        : [];
    const normalizedPoliceReports = Array.isArray(payload.recent_police_reports)
        ? payload.recent_police_reports.map((item: any, index: number) => normalizeRecentReportItem(item, index, item.source || 'police'))
        : normalizedRecentReports.filter(isPoliceRecentReport);
    const normalizedCommunityReports = Array.isArray(payload.recent_community_reports)
        ? payload.recent_community_reports.map((item: any, index: number) => normalizeRecentReportItem(item, index, item.source || 'database'))
        : normalizedRecentReports.filter(isCommunityRecentReport);
    const normalizedExportReports = Array.isArray(payload.export_reports)
        ? payload.export_reports.map((item: any, index: number) => normalizeRecentReportItem(item, index, item.source || 'database'))
        : normalizedRecentReports;

    return {
        summary: {
            total,
            pending: Number(payload.summary.pending || 0),
            approved: Number(payload.summary.approved || 0),
            rejected: Number(payload.summary.rejected || 0),
            districts: Number(payload.summary.districts || districts.length || 0),
            top_district: String(payload.summary.top_district || districts[0]?.name || '-'),
            avg_per_month: Number(payload.summary.avg_per_month || (total / 12)),
        },
        monthly,
        categories,
        districts,
        annual,
        recent_reports: normalizedRecentReports,
        recent_police_reports: normalizedPoliceReports,
        recent_community_reports: normalizedCommunityReports,
        export_reports: normalizedExportReports,
        available_years: Array.isArray(payload.available_years) && payload.available_years.length
            ? payload.available_years.map(String)
            : [selectedYear],
        updated_at: payload.updated_at || null,
        source: normalizeSource(payload.source),
    };
}

function buildStatisticsFromReports(
    reports: ReportRecord[],
    selectedYear: string,
    source: StatisticSource
): StatisticPayload {
    const allYears = Array.from(new Set(reports.map(getReportYear)))
        .filter(Boolean)
        .sort((a, b) => Number(b) - Number(a));

    const annual = Array.from(new Set([...HISTORICAL_YEAR_OPTIONS, ...allYears]))
        .sort((a, b) => Number(a) - Number(b))
        .map((year) => ({
            year,
            total: reports.filter((item) => getReportYear(item) === year).length,
        }));

    const filteredReports = selectedYear === 'all'
        ? reports
        : reports.filter((item) => getReportYear(item) === selectedYear);

    const monthlyMap = new globalThis.Map<number, number>();
    MONTHS.forEach((_, index) => monthlyMap.set(index, 0));

    const categoryMap = new globalThis.Map<string, number>();
    const districtMap = new globalThis.Map<string, number>();

    let pending = 0;
    let approved = 0;
    let rejected = 0;

    filteredReports.forEach((item) => {
        const monthIndex = getReportMonthIndex(item);
        monthlyMap.set(monthIndex, (monthlyMap.get(monthIndex) || 0) + 1);

        const type = normalizeType(item);
        categoryMap.set(type, (categoryMap.get(type) || 0) + 1);

        const district = normalizeDistrict(item);
        districtMap.set(district, (districtMap.get(district) || 0) + 1);

        const status = normalizeStatus(item.status);

        if (status === 'approved') {
            approved += 1;
        } else if (status === 'rejected') {
            rejected += 1;
        } else {
            pending += 1;
        }
    });

    const monthly = MONTHS.map((month, index) => ({
        month,
        total: monthlyMap.get(index) || 0,
        month_number: index + 1,
    }));

    const categories = Array.from(categoryMap.entries())
        .map(([name, value], index) => ({
            name,
            value,
            fill: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
        }))
        .sort((a, b) => b.value - a.value);

    const districts = Array.from(districtMap.entries())
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total);

    const allRecentReports = [...filteredReports]
        .sort((a, b) => {
            const dateA = new Date(getReportDate(a)).getTime() || 0;
            const dateB = new Date(getReportDate(b)).getTime() || 0;
            return dateB - dateA;
        })
        .map((item, index) => normalizeRecentReportItem(item, index, source));

    const total = filteredReports.length;

    return {
        summary: {
            total,
            pending,
            approved,
            rejected,
            districts: districts.length,
            top_district: districts[0]?.name || '-',
            avg_per_month: total / 12,
        },
        monthly,
        categories,
        districts,
        annual,
        recent_reports: allRecentReports.slice(0, 10),
        recent_police_reports: allRecentReports.filter(isPoliceRecentReport).slice(0, 8),
        recent_community_reports: allRecentReports.filter(isCommunityRecentReport).slice(0, 8),
        export_reports: allRecentReports,
        available_years: allYears.length ? allYears : [CURRENT_YEAR],
        updated_at: new Date().toISOString(),
        source,
    };
}

function buildIntegratedStatistics(mapReports: ReportRecord[], selectedYear: string): StatisticPayload {
    const policeReports: ReportRecord[] = dummyIncidents.map((item: any) => ({
        id: `police-${item.id}`,
        type: item.type,
        kategori: item.kategori,
        description: item.description,
        location: item.location,
        district: item.kecamatan,
        date: item.date,
        status: 'approved',
        source: 'police',
    }));

    const communityReports: ReportRecord[] = mapReports.map((item: any) => ({
        ...item,
        status: item.status || 'approved',
        source: item.source || 'community',
    }));

    const payload = buildStatisticsFromReports([...policeReports, ...communityReports], selectedYear, 'map-api');
    payload.available_years = Array.from(new Set([CURRENT_YEAR, ...HISTORICAL_YEAR_OPTIONS, ...payload.available_years]))
        .sort((a, b) => Number(b) - Number(a));

    return payload;
}

function buildDummyStatistics(selectedYear: string): StatisticPayload {
    const reports: ReportRecord[] = dummyIncidents.map((item: any) => ({
        id: item.id,
        type: item.type,
        kategori: item.kategori,
        description: item.description,
        location: item.location,
        district: item.kecamatan,
        date: item.date,
        status: item.status || 'approved',
        source: 'police',
    }));

    return buildStatisticsFromReports(reports, selectedYear, 'dummy');
}

async function fetchJson(url: string) {
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        },
    });

    if (!response.ok) {
        throw new Error(`Gagal memuat ${url}. Status ${response.status}`);
    }

    return response.json();
}

function districtLevel(total: number, max: number) {
    if (!max) return { label: 'Rendah', cls: 'border-slate-200 bg-slate-50 text-slate-600' };

    const pct = total / max;
    if (pct >= 0.66) return { label: 'Tertinggi', cls: 'border-rose-200 bg-rose-50 text-rose-700' };
    if (pct >= 0.33) return { label: 'Sedang', cls: 'border-amber-200 bg-amber-50 text-amber-700' };
    return { label: 'Rendah', cls: 'border-slate-200 bg-slate-50 text-slate-600' };
}

function SourceBadge({ source }: { source: StatisticSource }) {
    const config = {
        database: {
            label: 'Data Sistem',
            className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        },
        'map-api': {
            label: 'Data Peta',
            className: 'border-sky-200 bg-sky-50 text-sky-700',
        },
        dummy: {
            label: 'Data Lokal',
            className: 'border-slate-200 bg-slate-100 text-slate-700',
        },
    }[source];

    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-black ${config.className}`}>
            <Database className="h-3.5 w-3.5" />
            {config.label}
        </span>
    );
}

function MetricCard({
    title,
    value,
    description,
    icon: Icon,
    tone = 'slate',
}: {
    title: string;
    value: string | number;
    description: string;
    icon: any;
    tone?: 'slate' | 'emerald' | 'amber' | 'rose' | 'sky';
}) {
    const config = {
        slate: {
            border: 'border-t-[#6366F1]',
            icon: 'bg-indigo-100 text-indigo-700',
            text: 'text-indigo-700',
        },
        emerald: {
            border: 'border-t-[#10B981]',
            icon: 'bg-emerald-100 text-emerald-700',
            text: 'text-emerald-700',
        },
        amber: {
            border: 'border-t-[#F2A20B]',
            icon: 'bg-amber-100 text-amber-700',
            text: 'text-amber-700',
        },
        rose: {
            border: 'border-t-[#EF4444]',
            icon: 'bg-rose-100 text-rose-700',
            text: 'text-rose-700',
        },
        sky: {
            border: 'border-t-[#06B6D4]',
            icon: 'bg-cyan-100 text-cyan-700',
            text: 'text-cyan-700',
        },
    }[tone];

    return (
        <div className={`group rounded-2xl border border-slate-100 ${config.border} border-t-4 bg-white p-4 shadow-[0_14px_35px_rgba(15,118,110,0.10)] transition hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(15,118,110,0.16)]`}>
            <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${config.icon}`}>
                    <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                    <div className={`text-2xl font-black leading-none ${config.text}`}>{value}</div>
                    <div className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{title}</div>
                </div>
            </div>
            <p className="mt-3 line-clamp-2 text-[11px] font-semibold leading-5 text-slate-500">{description}</p>
        </div>
    );
}

function SelectField({
    label,
    value,
    onChange,
    children,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    children: ReactNode;
}) {
    return (
        <label className="block">
            <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</span>
            <select
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-[#334155] focus:ring-2 focus:ring-slate-200"
            >
                {children}
            </select>
        </label>
    );
}

function CombinedRecentTable({ records }: { records: RecentReport[] }) {
    return (
        <section className="jaga-statistics-card rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 className="flex items-center gap-2 text-lg font-black text-[#07324A]">
                        <FileWarning className="h-5 w-5 text-[#334155]" />
                        Data Terbaru
                    </h2>
                    <p className="mt-1 text-xs font-semibold text-slate-500">Gabungan data kepolisian dan pelaporan masyarakat sesuai filter tampilan.</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                    {records.length} data tampil
                </span>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="px-4 py-3">Kode</th>
                                <th className="px-4 py-3">Jenis</th>
                                <th className="px-4 py-3">Sumber</th>
                                <th className="px-4 py-3">Lokasi</th>
                                <th className="px-4 py-3">Tanggal</th>
                                <th className="px-4 py-3 font-black">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {records.length ? records.map((item, index) => (
                                <tr key={`${item.report_code}-${index}`} className="bg-white transition hover:bg-slate-50">
                                    <td className="px-4 py-3 font-black text-slate-800">{item.report_code || '-'}</td>
                                    <td className="px-4 py-3">
                                        <span className="line-clamp-2 text-xs font-semibold text-slate-700">{item.type || item.title || '-'}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black ${sourceBadgeClass(item)}`}>
                                            {getRecentSourceLabel(item)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-slate-600">
                                        <div className="font-black text-slate-800">{item.district || '-'}</div>
                                        <div>{item.village || '-'}</div>
                                    </td>
                                    <td className="px-4 py-3 text-xs font-semibold text-slate-600">{formatDate(item.date)}</td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black ${statusClass(item.status)}`}>
                                            {statusLabel(item.status)}
                                        </span>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                                        Belum ada data yang cocok dengan filter tampilan.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    );
}

export default function Statistics() {
    const [selectedYear, setSelectedYear] = useState(DEFAULT_STATISTICS_YEAR);
    const [selectedMonth, setSelectedMonth] = useState('all');
    const [selectedSource, setSelectedSource] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [selectedDistrict, setSelectedDistrict] = useState('all');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [data, setData] = useState<StatisticPayload>(() => buildDummyStatistics(DEFAULT_STATISTICS_YEAR));
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAllDistricts, setShowAllDistricts] = useState(false);

    const loadStatistics = async (year: string) => {
        setLoading(true);
        setError(null);

        try {
            const payload = await fetchJson(`/api/statistics?year=${encodeURIComponent(year)}`);
            const normalized = normalizeApiStatistics(payload, year);

            if (normalized) {
                setData(normalized);
                return;
            }

            throw new Error('Format response /api/statistics belum sesuai.');
        } catch (statisticsError: any) {
            try {
                const mapPayload = await fetchJson('/api/map/incidents');
                const reports = extractReports(mapPayload);
                setData(buildIntegratedStatistics(reports, year));
                setError('API statistik utama belum tersedia. Halaman memakai data peta dan data lokal sebagai pengganti.');
            } catch (mapError) {
                console.error(statisticsError, mapError);
                setData(buildDummyStatistics(year));
                setError('API statistik dan data peta belum berhasil dimuat. Halaman memakai data lokal/demo.');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadStatistics(selectedYear);
        setShowAllDistricts(false);
    }, [selectedYear]);

    const yearOptions = useMemo(() => {
        const years = new Set<string>([CURRENT_YEAR, ...HISTORICAL_YEAR_OPTIONS, ...data.available_years]);
        return Array.from(years).sort((a, b) => Number(b) - Number(a));
    }, [data.available_years]);

    const categoryOptions = useMemo(() => data.categories.map((item) => item.name), [data.categories]);
    const districtOptions = useMemo(() => data.districts.map((item) => item.name), [data.districts]);

    const maxDistrict = useMemo(() => Math.max(0, ...data.districts.map((item) => item.total)), [data.districts]);
    const filteredDistricts = useMemo(() => {
        return selectedDistrict === 'all'
            ? data.districts
            : data.districts.filter((item) => item.name === selectedDistrict);
    }, [data.districts, selectedDistrict]);
    const shownDistricts = showAllDistricts ? filteredDistricts : filteredDistricts.slice(0, 5);

    const filteredMonthly = useMemo(() => {
        return selectedMonth === 'all'
            ? data.monthly
            : data.monthly.filter((item) => String(item.month_number) === selectedMonth);
    }, [data.monthly, selectedMonth]);

    const categoryChartData = useMemo(() => {
        const source = selectedCategory === 'all'
            ? data.categories.slice(0, 8)
            : data.categories.filter((item) => item.name === selectedCategory);

        return source.map((item, index) => ({
            ...item,
            fill: item.fill || CATEGORY_COLORS[index % CATEGORY_COLORS.length],
        }));
    }, [data.categories, selectedCategory]);

    const allRecentReports = useMemo(() => {
        const map = new globalThis.Map<string, RecentReport>();
        const records = (data.export_reports && data.export_reports.length)
            ? data.export_reports
            : [
                ...(data.recent_reports || []),
                ...(data.recent_police_reports || []),
                ...(data.recent_community_reports || []),
            ];

        records.forEach((item, index) => {
            const key = `${item.report_code || item.id || index}-${getRecentSourceKey(item)}`;
            map.set(key, item);
        });

        return Array.from(map.values()).sort((a, b) => {
            const dateA = new Date(a.date || '').getTime() || 0;
            const dateB = new Date(b.date || '').getTime() || 0;
            return dateB - dateA;
        });
    }, [data.export_reports, data.recent_reports, data.recent_police_reports, data.recent_community_reports]);

    const filteredRecentReports = useMemo(() => {
        return allRecentReports
            .filter((item) => selectedSource === 'all' || getRecentSourceKey(item) === selectedSource)
            .filter((item) => selectedStatus === 'all' || normalizeStatus(item.status) === selectedStatus)
            .filter((item) => selectedDistrict === 'all' || item.district === selectedDistrict)
            .filter((item) => selectedCategory === 'all' || item.type === selectedCategory)
            .slice(0, 12);
    }, [allRecentReports, selectedSource, selectedStatus, selectedDistrict, selectedCategory]);

    const verifiedPercentage = data.summary.total
        ? Math.round((data.summary.approved / data.summary.total) * 100)
        : 0;
    const periodLabel = selectedYear === 'all' ? 'Semua Tahun' : selectedYear;

    const downloadableCsv = useMemo(() => {
        const value = (input?: string | number | null) => {
            const text = String(input ?? '').trim();
            return text || '-';
        };

        const getMonthName = (dateValue?: string) => {
            const date = new Date(dateValue || '');
            if (Number.isNaN(date.getTime())) return '-';
            return new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(date);
        };

        const getYear = (dateValue?: string) => {
            const date = new Date(dateValue || '');
            if (Number.isNaN(date.getTime())) return periodLabel;
            return String(date.getFullYear());
        };

        const rows = [
            [
                'Nomor',
                'ID/Kode Laporan',
                'Tanggal Laporan',
                'Tahun',
                'Bulan',
                'Nama Pelapor atau Anonim',
                'Jenis Kejahatan',
                'Deskripsi Kejadian',
                'Lokasi Kejadian',
                'Kecamatan',
                'Kelurahan',
                'Latitude',
                'Longitude',
                'Status Laporan',
                'Tindak Lanjut',
                'Petugas/Admin',
                'Tanggal Update',
                'Catatan',
            ],
            ...allRecentReports.map((item, index) => [
                String(index + 1),
                value(item.report_code || item.id),
                value(formatDate(item.date)),
                value(getYear(item.date)),
                value(getMonthName(item.date)),
                value(item.reporter_name || 'Anonim'),
                value(item.type || item.title),
                value(item.description),
                value(item.location),
                value(item.district),
                value(item.village),
                value(item.latitude),
                value(item.longitude),
                value(statusLabel(item.status)),
                value(item.admin_note),
                value(item.reviewer_name),
                value(formatDate(item.updated_at || item.date)),
                value(getRecentSourceLabel(item)),
            ]),
        ];

        return rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    }, [allRecentReports, periodLabel]);

    const downloadCsv = () => {
        const blob = new Blob([downloadableCsv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `statistik-kejadian-${selectedYear}.csv`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
    };



    const yearlyTrendData = data.annual
        .filter((item) => HISTORICAL_YEAR_OPTIONS.includes(item.year))
        .sort((a, b) => Number(a.year) - Number(b.year));
    const districtDistribution = (selectedDistrict === 'all' ? data.districts : filteredDistricts)
        .slice(0, 5)
        .map((item, index) => ({
            ...item,
            fill: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
        }));
    const distributionTotal = districtDistribution.reduce((sum, item) => sum + Number(item.total || 0), 0);
    const tableDistricts = showAllDistricts ? filteredDistricts : filteredDistricts.slice(0, 6);
    const maxTableDistrict = Math.max(0, ...filteredDistricts.map((item) => item.total));
    const topDistrictCount = data.districts[0]?.total || 0;
    const topDistrictPercentage = data.summary.total ? Math.round((topDistrictCount / data.summary.total) * 100) : 0;

    return (
        <div className="min-h-screen bg-[#F6FBF8] text-slate-800">
            <JagaPageHero
                page="statistics"
                eyebrow="Dashboard Statistik"
                title="Statistik Kejadian JagaSleman"
                subtitle="Ringkasan tren kejadian, laporan terverifikasi, distribusi wilayah, dan status data untuk pemantauan keamanan secara cepat."
                actions={[
                    { label: 'Lihat Peta', href: '/webgis', tone: 'primary' },
                    { label: 'Buat Laporan', href: '/report', tone: 'secondary' },
                ]}
                sideTitle="Ringkasan Statistik"
                sideText="Gunakan filter tahun dan sumber data untuk membaca tren kejadian, wilayah dominan, serta validasi laporan tanpa tampilan yang berlebihan."
                sideItems={['Tren kejadian', 'Sebaran wilayah', 'Status validasi']}
            />

            <main className="mx-auto max-w-6xl space-y-6 px-4 pb-10 md:px-8">
                <section className="overflow-hidden rounded-3xl bg-gradient-to-r from-[#07324A] via-[#0B6E78] to-[#0FA3A0] p-5 text-white shadow-[0_18px_45px_rgba(7,50,74,0.18)] md:p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-start gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
                                <TrendingUp className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black">Tentang Data</h2>
                                <p className="mt-1 max-w-3xl text-xs font-semibold leading-5 text-[#E9F8F3] md:text-sm">
                                    Data menampilkan kejadian pada {periodLabel}, memadukan Data Kepolisian dan Laporan Masyarakat agar tren, wilayah rawan, dan status validasi lebih mudah dibaca.
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => loadStatistics(selectedYear)}
                                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black text-[#0B6E78] shadow-sm transition hover:bg-cyan-50"
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                                Perbarui
                            </button>
                            <button
                                type="button"
                                onClick={downloadCsv}
                                className="inline-flex items-center justify-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-black text-white ring-1 ring-white/25 transition hover:bg-white/20"
                            >
                                <Download className="h-4 w-4" />
                                Export CSV
                            </button>
                        </div>
                    </div>
                </section>

                <section className="rounded-3xl border border-[#BDE7E1] bg-white p-4 shadow-[0_16px_45px_rgba(8,145,178,0.10)] md:p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h2 className="text-sm font-black uppercase tracking-[0.18em] text-[#0B6E78]">Filter Cepat</h2>
                            <p className="mt-1 text-xs font-semibold text-slate-500">Pilih periode dan sumber data tanpa membuat tampilan terasa penuh.</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {yearOptions.slice(0, 7).map((year) => (
                                <button
                                    key={year}
                                    type="button"
                                    onClick={() => setSelectedYear(year)}
                                    className={`rounded-full border px-3 py-1.5 text-xs font-black transition ${selectedYear === year ? 'border-[#0B6E78] bg-[#0B6E78] text-white shadow-sm' : 'border-[#BDE7E1] bg-[#F2FAF6] text-[#0B6E78] hover:bg-[#E9F8F3]'}`}
                                >
                                    {year}
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={() => setSelectedYear('all')}
                                className={`rounded-full border px-3 py-1.5 text-xs font-black transition ${selectedYear === 'all' ? 'border-[#0B6E78] bg-[#0B6E78] text-white shadow-sm' : 'border-[#BDE7E1] bg-[#F2FAF6] text-[#0B6E78] hover:bg-[#E9F8F3]'}`}
                            >
                                Semua
                            </button>
                        </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-4">
                        <select
                            value={selectedMonth}
                            onChange={(event) => setSelectedMonth(event.target.value)}
                            className="h-11 rounded-2xl border border-[#BDE7E1] bg-cyan-50 px-3 text-xs font-black text-[#0B6E78] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                        >
                            <option value="all">Semua bulan</option>
                            {MONTHS.map((month, index) => (
                                <option key={month} value={String(index + 1)}>{month}</option>
                            ))}
                        </select>
                        <select
                            value={selectedSource}
                            onChange={(event) => setSelectedSource(event.target.value)}
                            className="h-11 rounded-2xl border border-[#BDE7E1] bg-cyan-50 px-3 text-xs font-black text-[#0B6E78] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                        >
                            <option value="all">Semua sumber</option>
                            <option value="police">Data Kepolisian</option>
                            <option value="community">Laporan Masyarakat</option>
                        </select>
                        <select
                            value={selectedDistrict}
                            onChange={(event) => { setSelectedDistrict(event.target.value); setShowAllDistricts(false); }}
                            className="h-11 rounded-2xl border border-[#BDE7E1] bg-cyan-50 px-3 text-xs font-black text-[#0B6E78] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                        >
                            <option value="all">Semua kecamatan</option>
                            {districtOptions.map((district) => (
                                <option key={district} value={district}>{district}</option>
                            ))}
                        </select>
                        <select
                            value={selectedStatus}
                            onChange={(event) => setSelectedStatus(event.target.value)}
                            className="h-11 rounded-2xl border border-[#BDE7E1] bg-cyan-50 px-3 text-xs font-black text-[#0B6E78] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                        >
                            <option value="all">Semua status</option>
                            <option value="approved">Terverifikasi</option>
                            <option value="pending">Menunggu</option>
                            <option value="rejected">Ditolak</option>
                        </select>
                    </div>

                    {error && (
                        <div className="mt-4 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}
                </section>

                <div className="grid gap-5 lg:grid-cols-[1.18fr_0.82fr]">
                    <section className="rounded-3xl border border-[#BDE7E1] bg-white p-5 shadow-[0_16px_45px_rgba(8,145,178,0.10)]">
                        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <h2 className="flex items-center gap-2 text-base font-black text-cyan-900">
                                    <TrendingUp className="h-5 w-5 text-cyan-700" />
                                    Tren Bulanan <span className="text-xs text-slate-400">({periodLabel})</span>
                                </h2>
                                <p className="mt-1 text-xs font-semibold text-slate-500">Pola kenaikan dan penurunan kejadian sepanjang bulan terpilih.</p>
                            </div>
                            <span className="w-fit rounded-full bg-cyan-100 px-3 py-1 text-[11px] font-black text-cyan-700">Bulanan</span>
                        </div>

                        <div className="h-[310px] min-w-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={filteredMonthly} margin={{ top: 16, right: 14, left: -18, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#E2E8F0" />
                                    <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                                    <Tooltip formatter={(value) => [numberFormat(Number(value)), 'Kejadian']} />
                                    <Line type="monotone" dataKey="total" stroke="#0891B2" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="mt-3 grid gap-2 text-[11px] font-semibold text-slate-500 sm:grid-cols-2">
                            <div className="rounded-xl bg-slate-50 px-3 py-2"><b className="text-[#0B6E78]">Sumber:</b> Data Kepolisian 2020–2025 dan data pelaporan masyarakat.</div>
                            <div className="rounded-xl bg-slate-50 px-3 py-2"><b className="text-[#0B6E78]">Update:</b> {formatDate(data.updated_at || new Date().toISOString())}</div>
                        </div>
                    </section>

                    <section className="rounded-3xl border border-[#BDE7E1] bg-white p-5 shadow-[0_16px_45px_rgba(8,145,178,0.10)]">
                        <div className="mb-4 flex items-start justify-between gap-3">
                            <div>
                                <h2 className="flex items-center gap-2 text-base font-black text-cyan-900">
                                    <Activity className="h-5 w-5 text-cyan-700" />
                                    Distribusi per Kecamatan
                                </h2>
                                <p className="mt-1 text-xs font-semibold text-slate-500">Proporsi wilayah berdasarkan total kejadian.</p>
                            </div>
                            <span className="rounded-full bg-cyan-100 px-3 py-1 text-[11px] font-black text-cyan-700">Top 5</span>
                        </div>

                        <div className="grid items-center gap-4 md:grid-cols-[0.9fr_1fr] lg:grid-cols-1 xl:grid-cols-[0.9fr_1fr]">
                            <div className="relative h-56 min-w-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={districtDistribution}
                                            dataKey="total"
                                            nameKey="name"
                                            innerRadius={54}
                                            outerRadius={78}
                                            paddingAngle={4}
                                            stroke="none"
                                        >
                                            {districtDistribution.map((entry, index) => (
                                                <Cell key={`cell-${entry.name}`} fill={entry.fill || CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value) => [numberFormat(Number(value)), 'Kejadian']} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-center">
                                    <div>
                                        <div className="text-2xl font-black text-cyan-900">{numberFormat(distributionTotal)}</div>
                                        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Total</div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                {districtDistribution.length ? districtDistribution.map((item) => {
                                    const pct = distributionTotal ? Math.round((item.total / distributionTotal) * 100) : 0;
                                    return (
                                        <div key={item.name} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                                            <div className="flex min-w-0 items-center gap-2">
                                                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: item.fill }} />
                                                <span className="truncate text-xs font-black text-slate-700">{item.name}</span>
                                            </div>
                                            <div className="text-right text-[11px] font-black text-cyan-700">
                                                {numberFormat(item.total)} <span className="text-slate-400">({pct}%)</span>
                                            </div>
                                        </div>
                                    );
                                }) : (
                                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs font-semibold text-slate-500">
                                        Belum ada distribusi kecamatan untuk filter ini.
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                </div>

                <section className="rounded-3xl border border-[#BDE7E1] bg-white p-5 shadow-[0_16px_45px_rgba(8,145,178,0.10)]">
                    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                            <h2 className="flex items-center gap-2 text-base font-black text-cyan-900">
                                <MapPin className="h-5 w-5 text-cyan-700" />
                                Detail Statistik per Kecamatan <span className="text-xs text-slate-400">({periodLabel})</span>
                            </h2>
                            <p className="mt-1 text-xs font-semibold text-slate-500">Ranking wilayah, jumlah kejadian, proporsi, dan status konsentrasi data.</p>
                        </div>
                        <select
                            value={selectedCategory}
                            onChange={(event) => setSelectedCategory(event.target.value)}
                            className="h-10 w-full rounded-2xl border border-[#BDE7E1] bg-cyan-50 px-3 text-xs font-black text-[#0B6E78] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 md:w-56"
                        >
                            <option value="all">Semua kategori</option>
                            {categoryOptions.map((category) => (
                                <option key={category} value={category}>{category}</option>
                            ))}
                        </select>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-cyan-50">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[740px] text-left text-sm">
                                <thead className="bg-[#07324A] text-[11px] uppercase tracking-[0.14em] text-white">
                                    <tr>
                                        <th className="px-4 py-3 font-black">Rank</th>
                                        <th className="px-4 py-3 font-black">Kecamatan</th>
                                        <th className="px-4 py-3 font-black">Jumlah</th>
                                        <th className="px-4 py-3 font-black">Proporsi</th>
                                        <th className="px-4 py-3 font-black">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {tableDistricts.length ? tableDistricts.map((item, index) => {
                                        const pct = data.summary.total ? Math.round((item.total / data.summary.total) * 100) : 0;
                                        const barWidth = maxTableDistrict ? Math.max(8, Math.round((item.total / maxTableDistrict) * 100)) : 0;
                                        const level = districtLevel(item.total, maxTableDistrict);

                                        return (
                                            <tr key={item.name} className="bg-white transition hover:bg-cyan-50/50">
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black text-white ${index === 0 ? 'bg-amber-500' : index === 1 ? 'bg-slate-500' : index === 2 ? 'bg-orange-500' : 'bg-cyan-600'}`}>{index + 1}</span>
                                                </td>
                                                <td className="px-4 py-3 font-black text-slate-800">{item.name}</td>
                                                <td className="px-4 py-3 text-xs font-semibold text-slate-600"><span className="font-black text-[#0B6E78]">{numberFormat(item.total)}</span> kejadian</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <span className="w-12 rounded-full bg-rose-100 px-2 py-1 text-center text-[10px] font-black text-rose-700">{pct}%</span>
                                                        <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                                                            <div className="h-full rounded-full bg-cyan-600" style={{ width: `${barWidth}%` }} />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black ${level.cls}`}>{level.label}</span>
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-10 text-center text-sm font-semibold text-slate-500">
                                                Belum ada data kecamatan untuk filter ini.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {filteredDistricts.length > 6 && (
                        <button
                            type="button"
                            onClick={() => setShowAllDistricts((value) => !value)}
                            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-[#BDE7E1] bg-cyan-50 px-4 py-3 text-xs font-black text-[#0B6E78] transition hover:bg-cyan-100"
                        >
                            {showAllDistricts ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            {showAllDistricts ? 'Sembunyikan daftar' : `Tampilkan semua ${filteredDistricts.length} kecamatan`}
                        </button>
                    )}

                    <div className="mt-4 grid gap-2 text-[11px] font-semibold text-slate-500 md:grid-cols-2">
                        <div className="rounded-xl bg-slate-50 px-3 py-2"><b className="text-[#0B6E78]">Sumber:</b> Data Kepolisian 2020–2025.</div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2"><b className="text-[#0B6E78]">Sumber:</b> Laporan Masyarakat yang masuk ke sistem Jaga Sleman.</div>
                    </div>
                </section>

                <section className="rounded-3xl border border-[#BDE7E1] bg-white p-6 text-center shadow-[0_16px_45px_rgba(8,145,178,0.10)] md:p-8">
                    <div className="mx-auto max-w-2xl">
                        <div className="inline-flex items-center justify-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[#0B6E78]">
                            <MapIcon className="h-4 w-4" />
                            Eksplorasi Lebih Lanjut
                        </div>
                        <h2 className="mt-3 text-xl font-black text-cyan-950">Lihat sebaran kejadian langsung di peta interaktif.</h2>
                        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                            Gunakan peta dan form laporan untuk membaca detail lokasi, menambahkan laporan baru, dan mendukung pemantauan wilayah secara lebih cepat.
                        </p>
                        <div className="mt-5 flex flex-wrap justify-center gap-3">
                            <a
                                href="/webgis"
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-700 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-cyan-800"
                            >
                                <MapIcon className="h-4 w-4" />
                                Lihat Peta Interaktif
                            </a>
                            <a
                                href="/report"
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-emerald-700"
                            >
                                <FileWarning className="h-4 w-4" />
                                Lapor Kejadian
                            </a>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
