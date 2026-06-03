import { useEffect, useMemo, useState, type FormEvent } from 'react';
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
    Mail,
    Map as MapIcon,
    MapPin,
    RefreshCcw,
    Search,
    ShieldAlert,
    TrendingUp,
    XCircle,
} from 'lucide-react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { incidents as dummyIncidents } from '@/data/dummy';

type ReportRecord = {
    id?: string | number;
    report_code?: string;
    reportCode?: string;
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
    created_at?: string;
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
    district?: string;
    village?: string;
    date?: string;
    status?: string;
};

type StatusLookupResult = {
    id?: string | number;
    report_code?: string;
    title?: string;
    incident_type?: string;
    location?: string;
    district?: string;
    village?: string;
    incident_at?: string;
    status?: string;
    status_label?: string;
    rejection_reason?: string | null;
    reviewed_at?: string | null;
    created_at?: string | null;
};

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
    recent_reports: RecentReport[];
    available_years: string[];
    updated_at?: string | null;
    source: 'database' | 'map-api' | 'dummy';
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const CATEGORY_COLORS = ['#0F1F2E', '#D95F5F', '#0EA5E9', '#D95F5F', '#F59E0B', '#D95F5F', '#8B5CF6', '#14B8A6'];
const CURRENT_YEAR = '2026';

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
    if (status === 'approved') return 'border-[#D8E4ED] bg-[#EFF4F8] text-[#D95F5F]';
    if (status === 'rejected') return 'border-rose-200 bg-rose-50 text-rose-700';
    return 'border-[#D8E4ED] bg-[#EFF4F8] text-[#D95F5F]';
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

    const total = Number(payload.summary.total || 0);

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
        recent_reports: Array.isArray(payload.recent_reports) ? payload.recent_reports : [],
        available_years: Array.isArray(payload.available_years) && payload.available_years.length
            ? payload.available_years.map(String)
            : [selectedYear],
        updated_at: payload.updated_at || null,
        source: 'database',
    };
}

function buildStatisticsFromReports(
    reports: ReportRecord[],
    selectedYear: string,
    source: 'map-api' | 'dummy'
): StatisticPayload {
    const allYears = Array.from(new Set(reports.map(getReportYear)))
        .filter(Boolean)
        .sort((a, b) => Number(b) - Number(a));

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
        .map(([name, total]) => ({
            name,
            total,
        }))
        .sort((a, b) => b.total - a.total);

    const recentReports = [...filteredReports]
        .sort((a, b) => {
            const dateA = new Date(getReportDate(a)).getTime();
            const dateB = new Date(getReportDate(b)).getTime();
            return dateB - dateA;
        })
        .slice(0, 6)
        .map((item) => ({
            id: item.id,
            report_code:
                item.report_code ||
                item.reportCode ||
                (item.id ? `LAP-${String(item.id).padStart(4, '0')}` : '-'),
            title: item.title || normalizeType(item),
            type: normalizeType(item),
            district: normalizeDistrict(item),
            village: normalizeVillage(item),
            date: getReportDate(item),
            status: item.status || 'pending',
        }));

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
        recent_reports: recentReports,
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
    payload.available_years = Array.from(new Set(['2026', '2025', '2024', '2023', '2022', '2021', '2020', ...payload.available_years]))
        .sort((a, b) => Number(b) - Number(a));
    payload.source = 'database';

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

function riskLevel(total: number, max: number) {
    if (!max) return { label: 'Rendah', cls: 'border-slate-200 bg-slate-50 text-slate-600 dark:text-slate-200' };

    const pct = total / max;
    if (pct >= 0.66) return { label: 'Tinggi', cls: 'border-rose-200 bg-rose-50 text-rose-700' };
    if (pct >= 0.33) return { label: 'Sedang', cls: 'border-[#D8E4ED] bg-[#EFF4F8] text-[#D95F5F]' };
    return { label: 'Rendah', cls: 'border-[#D8E4ED] bg-[#EFF4F8] text-[#D95F5F]' };
}

function SourceBadge({ source }: { source: StatisticPayload['source'] }) {
    const config = {
        database: {
            label: 'Data terintegrasi 2020–2026',
            className: 'border-[#D8E4ED] bg-[#EFF4F8] text-[#D95F5F]',
        },
        'map-api': {
            label: 'Data peta & kepolisian',
            className: 'border-[#D8E4ED] bg-[#EFF4F8] text-[#D95F5F]',
        },
        dummy: {
            label: 'Data kepolisian lokal',
            className: 'border-[#D95F5F]/40 bg-[#D95F5F]/10 text-[#D95F5F]',
        },
    }[source];

    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${config.className}`}>
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
    tone = 'teal',
}: {
    title: string;
    value: string | number;
    description: string;
    icon: any;
    tone?: 'teal' | 'blue' | 'amber' | 'rose';
}) {
    const toneClass = {
        teal: 'bg-[#EFF4F8] text-[#D95F5F] border-[#D8E4ED]',
        blue: 'bg-[#EFF4F8] text-[#D95F5F] border-[#D8E4ED]',
        amber: 'bg-[#EFF4F8] text-[#D95F5F] border-[#D8E4ED]',
        rose: 'bg-rose-50 text-rose-700 border-rose-100',
    }[tone];

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:bg-[#102538] dark:text-white transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">{title}</p>
                    <p className="mt-2 text-3xl font-black text-foreground">{value}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-300">{description}</p>
                </div>
                <div className={`rounded-2xl border p-3 ${toneClass}`}>
                    <Icon className="h-5 w-5" />
                </div>
            </div>
        </div>
    );
}

export default function Statistics() {
    const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
    const [data, setData] = useState<StatisticPayload>(() => buildDummyStatistics(CURRENT_YEAR));
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAllDistricts, setShowAllDistricts] = useState(false);
    const [lookupEmail, setLookupEmail] = useState('');
    const [lookupCode, setLookupCode] = useState('');
    const [lookupLoading, setLookupLoading] = useState(false);
    const [lookupError, setLookupError] = useState<string | null>(null);
    const [lookupResults, setLookupResults] = useState<StatusLookupResult[]>([]);

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
                setError(null);
            } catch (mapError) {
                console.error(statisticsError, mapError);
                setData(buildDummyStatistics(year));
                setError(null);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadStatistics(selectedYear);
    }, [selectedYear]);

    const yearOptions = useMemo(() => {
        const years = new Set<string>(['2026', '2025', '2024', '2023', '2022', '2021', '2020', ...data.available_years]);
        return Array.from(years).sort((a, b) => Number(b) - Number(a));
    }, [data.available_years]);

    const maxDistrict = useMemo(() => Math.max(0, ...data.districts.map((item) => item.total)), [data.districts]);
    const shownDistricts = showAllDistricts ? data.districts : data.districts.slice(0, 7);

    const verifiedPercentage = data.summary.total
        ? Math.round((data.summary.approved / data.summary.total) * 100)
        : 0;

    const downloadableCsv = useMemo(() => {
        const rows = [
            ['Kecamatan', 'Jumlah'],
            ...data.districts.map((item) => [item.name, String(item.total)]),
        ];
        return rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    }, [data.districts]);

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

    const submitStatusLookup = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const email = lookupEmail.trim();
        const code = lookupCode.trim();

        setLookupError(null);
        setLookupResults([]);

        if (!email) {
            setLookupError('Email pelapor wajib diisi.');
            return;
        }

        setLookupLoading(true);

        try {
            const params = new URLSearchParams();
            params.set('reporter_email', email);

            if (code) {
                params.set('report_code', code);
            }

            const payload = await fetchJson(`/api/incident-reports/status?${params.toString()}`);
            setLookupResults(Array.isArray(payload?.data) ? payload.data : []);
        } catch (lookupErrorValue: any) {
            setLookupError(
                lookupErrorValue?.message?.includes('404')
                    ? 'Status laporan tidak ditemukan. Pastikan email dan kode laporan sesuai.'
                    : 'Status laporan belum berhasil dimuat. Coba lagi atau periksa email/kode laporan.',
            );
        } finally {
            setLookupLoading(false);
        }
    };

    return (
        <div className="min-h-screen theme-shell">
            <section className="relative overflow-hidden border-b border-white/70r px-4 py-10 text-white md:px-8">
                <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: 'radial-gradient(circle at 20% 20%, white 0, transparent 28%), radial-gradient(circle at 80% 0%, white 0, transparent 26%)',
                }} />
                <div className="relative mx-auto max-w-6xl">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-3xl">
                            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur">
                                <BarChart3 className="h-4 w-4" />
                                Dashboard Statistik Laporan
                            </div>
                            <h1 className="mt-4 text-3xl font-black tracking-tight md:text-5xl">
                                Statistik Kejadian JagaSleman
                            </h1>
                            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#EFF4F8]/85 md:text-base">
                                Ringkasan laporan masyarakat dan data kepolisian tahun 2020–2026 divisualisasikan dalam grafik bulanan, kategori kejadian, wilayah rawan, serta status laporan terbaru secara terpadu.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <SourceBadge source={data.source} />
                            <button
                                type="button"
                                onClick={() => loadStatistics(selectedYear)}
                                className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-bold text-white shadow-sm backdrop-blur transition hover:bg-white/20"
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-8">
                <div className="-mt-10 rounded-3xl border border-white/70 bg-white/90 p-4 shadow-xl shadow-[#0F1F2E]/10 backdrop-blur md:p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Filter tahun</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {yearOptions.map((year) => (
                                    <button
                                        key={year}
                                        type="button"
                                        onClick={() => setSelectedYear(year)}
                                        className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                                            selectedYear === year
                                                ? 'bg-[#1A3348] text-white shadow-md shadow-[#D95F5F]/20'
                                                : 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15'
                                        }`}
                                    >
                                        {year}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => setSelectedYear('all')}
                                    className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                                        selectedYear === 'all'
                                            ? 'border-[#1A3348] bg-[#1A3348] text-white shadow-md shadow-[#D95F5F]/20'
                                            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-white' 
                                    }`}
                                >
                                    Semua
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600 dark:text-slate-200">
                                <div className="flex items-center gap-2 font-semibold text-slate-800">
                                    <CalendarDays className="h-4 w-4 text-[#D95F5F]" />
                                    Update data
                                </div>
                                <p className="mt-1">{formatDate(data.updated_at || new Date().toISOString())}</p>
                            </div>
                            <button
                                type="button"
                                onClick={downloadCsv}
                                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                            >
                                <Download className="h-4 w-4" />
                                Export CSV
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="mt-4 flex gap-3 rounded-2xl border border-[#D8E4ED] bg-[#EFF4F8] p-4 text-sm text-[#1A3348]">
                            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}
                </div>

                <section className="rounded-3xl border border-[#D8E4ED] bg-white p-5 shadow-sm dark:bg-[#102538] dark:text-white">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="max-w-2xl">
                            <div className="inline-flex items-center gap-2 rounded-full border border-[#D8E4ED] bg-[#EFF4F8] px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-[#D95F5F]">
                                <Mail className="h-3.5 w-3.5" />
                                Cek Status Laporan
                            </div>
                            <h2 className="mt-3 text-xl font-black text-slate-950">Pantau status laporan masyarakat.</h2>
                            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-200">
                                Masukkan kode laporan untuk melihat status terbaru secara cepat. Email dapat ditambahkan bila diperlukan untuk mempersempit hasil pencarian.
                            </p>
                        </div>

                        <form onSubmit={submitStatusLookup} className="w-full max-w-xl rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:bg-[#17324A] dark:text-white">
                            <div className="grid gap-3 sm:grid-cols-[1fr_0.8fr_auto]">
                                <input
                                    type="email"
                                    value={lookupEmail}
                                    onChange={(event) => setLookupEmail(event.target.value)}
                                    placeholder="Email pelapor (opsional)"
                                    className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 outline-none focus:border-[#27527A] dark:border-white/10 dark:bg-[#0F1F2E] dark:text-white"
                                />
                                <input
                                    value={lookupCode}
                                    onChange={(event) => setLookupCode(event.target.value)}
                                    placeholder="Kode laporan"
                                    className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 outline-none focus:border-[#27527A] dark:border-white/10 dark:bg-[#0F1F2E] dark:text-white"
                                />
                                <button
                                    type="submit"
                                    disabled={lookupLoading}
                                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1A3348] px-4 text-sm font-black text-white transition hover:bg-[#1A3348] disabled:opacity-60"
                                >
                                    {lookupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                    Cek
                                </button>
                            </div>

                            {lookupError && (
                                <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                                    {lookupError}
                                </div>
                            )}

                            {lookupResults.length > 0 && (
                                <div className="mt-4 space-y-3">
                                    {lookupResults.map((item) => (
                                        <div key={String(item.id || item.report_code)} className="rounded-2xl border border-white bg-white p-4 shadow-sm">
                                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                                <div>
                                                    <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">Kode Laporan</div>
                                                    <div className="mt-1 text-base font-black text-slate-900">{item.report_code || '-'}</div>
                                                    <div className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-200">{item.incident_type || item.title || '-'}</div>
                                                </div>
                                                <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${statusClass(item.status)}`}>
                                                    {item.status_label || statusLabel(item.status)}
                                                </span>
                                            </div>
                                            <div className="mt-3 grid gap-2 text-xs text-slate-600 dark:text-slate-200 sm:grid-cols-2">
                                                <div><b>Lokasi:</b> {item.district || '-'} / {item.village || '-'}</div>
                                                <div><b>Tanggal:</b> {formatDate(item.incident_at || item.created_at)}</div>
                                            </div>
                                            {normalizeStatus(item.status) === 'rejected' && item.rejection_reason && (
                                                <div className="mt-3 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700">
                                                    <b>Alasan penolakan:</b> {item.rejection_reason}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </form>
                    </div>
                </section>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                        title="Total Laporan"
                        value={numberFormat(data.summary.total)}
                        description={`Data pada tahun ${selectedYear === 'all' ? 'semua periode' : selectedYear}`}
                        icon={Activity}
                        tone="teal"
                    />
                    <MetricCard
                        title="Terverifikasi"
                        value={`${numberFormat(data.summary.approved)} (${verifiedPercentage}%)`}
                        description="Laporan yang telah disetujui admin"
                        icon={CheckCircle2}
                        tone="blue"
                    />
                    <MetricCard
                        title="Menunggu"
                        value={numberFormat(data.summary.pending)}
                        description="Laporan yang masih menunggu verifikasi admin"
                        icon={Clock3}
                        tone="amber"
                    />
                    <MetricCard
                        title="Ditolak"
                        value={numberFormat(data.summary.rejected)}
                        description="Laporan yang ditolak atau perlu perbaikan"
                        icon={XCircle}
                        tone="rose"
                    />
                </div>

                <div className="grid gap-6 lg:grid-cols-[1.35fr_0.9fr]">
                    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:bg-[#102538] dark:text-white">
                        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <h2 className="flex items-center gap-2 text-lg font-black text-foreground">
                                    <TrendingUp className="h-5 w-5 text-[#D95F5F]" />
                                    Tren Laporan Bulanan
                                </h2>
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">Jumlah laporan yang tercatat per bulan.</p>
                            </div>
                            <span className="rounded-full bg-[#EFF4F8] px-3 py-1 text-xs font-bold text-[#D95F5F]">
                                Rata-rata {data.summary.avg_per_month.toFixed(1)} / bulan
                            </span>
                        </div>
                        <div className="min-h-[320px] min-w-0 h-80">
                            <ResponsiveContainer width="100%" height={320}>
                                <BarChart data={data.monthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(39, 82, 122, 0.10)' }}
                                        contentStyle={{ borderRadius: 14, border: '1px solid #e2e8f0', fontSize: 12 }}
                                        formatter={(value: any) => [`${value} laporan`, 'Total']}
                                    />
                                    <Bar dataKey="total" fill="#D95F5F" radius={[12, 12, 0, 0]} barSize={34} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </section>

                    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:bg-[#102538] dark:text-white">
                        <div className="mb-4">
                            <h2 className="flex items-center gap-2 text-lg font-black text-foreground">
                                <ShieldAlert className="h-5 w-5 text-[#D95F5F]" />
                                Jenis Kejadian
                            </h2>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">Komposisi laporan berdasarkan kategori kejadian.</p>
                        </div>

                        {data.categories.length ? (
                            <>
                                <div className="min-h-[260px] min-w-0 h-64">
                                    <ResponsiveContainer width="100%" height={260}>
                                        <PieChart>
                                            <Pie
                                                data={data.categories}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={54}
                                                outerRadius={86}
                                                paddingAngle={3}
                                                dataKey="value"
                                            >
                                                {data.categories.map((entry, index) => (
                                                    <Cell key={entry.name} fill={entry.fill || CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{ borderRadius: 14, border: '1px solid #e2e8f0', fontSize: 12 }}
                                                formatter={(value: any) => [`${value} laporan`, 'Total']}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="mt-3 space-y-2">
                                    {data.categories.slice(0, 6).map((item, index) => (
                                        <div key={item.name} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2">
                                            <div className="flex min-w-0 items-center gap-2">
                                                <span className="h-3 w-3 flex-shrink-0 rounded-full" style={{ backgroundColor: item.fill || CATEGORY_COLORS[index % CATEGORY_COLORS.length] }} />
                                                <span className="truncate text-xs font-semibold text-slate-700">{item.name}</span>
                                            </div>
                                            <span className="text-xs font-black text-foreground">{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-center text-slate-500 dark:text-slate-300">
                                <FileWarning className="mb-2 h-8 w-8" />
                                <p className="text-sm font-semibold">Belum ada data kategori.</p>
                            </div>
                        )}
                    </section>
                </div>

                <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:bg-[#102538] dark:text-white">
                        <div className="mb-4 flex items-start justify-between gap-3">
                            <div>
                                <h2 className="flex items-center gap-2 text-lg font-black text-foreground">
                                    <MapPin className="h-5 w-5 text-[#D95F5F]" />
                                    Kecamatan Rawan
                                </h2>
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">Ranking wilayah berdasarkan jumlah laporan.</p>
                            </div>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:text-slate-200">
                                Top: {data.summary.top_district}
                            </span>
                        </div>

                        <div className="space-y-3">
                            {shownDistricts.length ? shownDistricts.map((item, index) => {
                                const width = maxDistrict ? Math.max(8, Math.round((item.total / maxDistrict) * 100)) : 0;
                                const risk = riskLevel(item.total, maxDistrict);

                                return (
                                    <div key={item.name} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                                        <div className="mb-2 flex items-center justify-between gap-3">
                                            <div className="flex min-w-0 items-center gap-2">
                                                <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-black ${
                                                    index === 0 ? 'bg-rose-100 text-rose-700' :
                                                    index === 1 ? 'bg-[#D8E4ED] text-[#D95F5F]' :
                                                    index === 2 ? 'bg-[#D8E4ED] text-[#D95F5F]' :
                                                    'bg-white text-slate-600 dark:text-slate-200'
                                                }`}>
                                                    {index + 1}
                                                </span>
                                                <span className="truncate text-sm font-bold text-slate-800">{item.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${risk.cls}`}>{risk.label}</span>
                                                <span className="text-sm font-black text-[#D95F5F]">{item.total}</span>
                                            </div>
                                        </div>
                                        <div className="h-2 overflow-hidden rounded-full bg-white">
                                            <div className="h-full rounded-full" style={{ width: `${width}%` }} />
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500 dark:text-slate-300">
                                    Belum ada data kecamatan untuk periode ini.
                                </div>
                            )}
                        </div>

                        {data.districts.length > 7 && (
                            <button
                                type="button"
                                onClick={() => setShowAllDistricts((value) => !value)}
                                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-200 transition hover:bg-slate-50"
                            >
                                {showAllDistricts ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                {showAllDistricts ? 'Sembunyikan' : `Tampilkan semua ${data.districts.length} kecamatan`}
                            </button>
                        )}
                    </section>

                    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:bg-[#102538] dark:text-white">
                        <div className="mb-4 flex items-start justify-between gap-3">
                            <div>
                                <h2 className="flex items-center gap-2 text-lg font-black text-foreground">
                                    <Activity className="h-5 w-5 text-[#D95F5F]" />
                                    Laporan Terbaru
                                </h2>
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">Data terbaru yang masuk ke sistem.</p>
                            </div>
                            <a
                                href="/laporan"
                                className="rounded-full bg-[#EFF4F8] px-3 py-1.5 text-xs font-bold text-[#D95F5F] transition hover:bg-[#D8E4ED]"
                            >
                                Buat laporan
                            </a>
                        </div>

                        <div className="overflow-hidden rounded-2xl border border-slate-200">
                            <div className="max-h-[420px] overflow-auto">
                                <table className="w-full min-w-[680px] text-left text-sm">
                                    <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">
                                        <tr>
                                            <th className="px-4 py-3">Kode</th>
                                            <th className="px-4 py-3">Jenis</th>
                                            <th className="px-4 py-3">Lokasi</th>
                                            <th className="px-4 py-3">Tanggal</th>
                                            <th className="px-4 py-3">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {data.recent_reports.length ? data.recent_reports.map((item, index) => (
                                            <tr key={`${item.report_code}-${index}`} className="bg-white transition hover:bg-slate-50">
                                                <td className="px-4 py-3 font-black text-slate-800">{item.report_code || '-'}</td>
                                                <td className="px-4 py-3">
                                                    <span className="line-clamp-2 text-xs font-semibold text-slate-700">{item.type || item.title || '-'}</span>
                                                </td>
                                                <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-200">
                                                    <div className="font-semibold text-slate-800">{item.district || '-'}</div>
                                                    <div>{item.village || '-'}</div>
                                                </td>
                                                <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-200">{formatDate(item.date)}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusClass(item.status)}`}>
                                                        {statusLabel(item.status)}
                                                    </span>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-300">
                                                    Belum ada laporan terbaru untuk periode ini.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>
                </div>

                <section className="overflow-hidden rounded-3xl border border-[#D8E4ED] p-6 text-white shadow-lg shadow-[#0F1F2E]/10 md:p-8">
                    <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h2 className="text-xl font-black md:text-2xl">Lihat pola kejadian secara spasial</h2>
                            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#EFF4F8]/85">
                                Statistik ini dapat dipadukan dengan peta WebGIS untuk membaca konsentrasi lokasi, prioritas validasi laporan, dan pola wilayah yang perlu pemantauan lebih lanjut.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <a href="/webgis" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-[#1A3348] shadow-sm transition hover:bg-[#EFF4F8]">
                                <MapIcon className="h-4 w-4" />
                                Lihat Peta
                            </a>
                            <a href="/laporan" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/20">
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
