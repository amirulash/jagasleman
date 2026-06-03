import { useCallback, useEffect, useMemo, useState } from 'react';
import MapView from '@/Components/MapView';
import { analyzeKDE } from '@/lib/kdeAnalysis';
import { incidents as dummyIncidents } from '@/data/dummy';
import {
    fetchReportIncidentsForMap,
    type MapIncident,
} from '@/lib/databaseIncidents';
import {
    BarChart3,
    CircleDot,
    Database,
    Filter,
    Flame,
    Layers,
    RefreshCcw,
    ShieldAlert,
    Maximize2,
    ZoomIn,
    MousePointerClick,
} from 'lucide-react';

type PeriodFilter = 'Semua' | '7 Hari' | '30 Hari' | '90 Hari';
type DataMode = 'database' | 'fallback';
type SourceFilter = 'Semua' | 'report' | 'dummy';
type KdeLayerMode = 'official' | 'automatic' | 'none';

type NormalizedIncident = MapIncident & {
    weight: number;
    normalizedCategory: string;
    incidentDateValue: string;
    createdAt?: string;
};

const PERIOD_OPTIONS: PeriodFilter[] = ['Semua', '7 Hari', '30 Hari', '90 Hari'];

const SLEMAN_DISTRICTS = [
    'Berbah',
    'Cangkringan',
    'Depok',
    'Gamping',
    'Godean',
    'Kalasan',
    'Minggir',
    'Mlati',
    'Moyudan',
    'Ngaglik',
    'Ngemplak',
    'Pakem',
    'Prambanan',
    'Seyegan',
    'Sleman',
    'Tempel',
    'Turi',
];

const FILTER_SELECT_CLASS =
    'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-[#07324A] outline-none transition focus:border-[#0B6E78] focus:ring-2 focus:ring-[#BDE7E1]/60';

const MONTH_OPTIONS = [
    { value: '01', label: 'Januari' },
    { value: '02', label: 'Februari' },
    { value: '03', label: 'Maret' },
    { value: '04', label: 'April' },
    { value: '05', label: 'Mei' },
    { value: '06', label: 'Juni' },
    { value: '07', label: 'Juli' },
    { value: '08', label: 'Agustus' },
    { value: '09', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' },
];

function cleanText(value: unknown, fallback = '-') {
    const text = String(value ?? '').trim();
    return text.length > 0 ? text : fallback;
}

function normalizeComparableText(value: unknown) {
    return cleanText(value, '')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9 ]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase();
}

function normalizeDistrictFilterValue(value: unknown) {
    return normalizeComparableText(value)
        .replace(/^KECAMATAN\s+/, '')
        .replace(/^KEC\s+/, '')
        .replace(/^KAPANEWON\s+/, '')
        .trim();
}

function formatDistrictLabel(value: unknown) {
    const normalized = normalizeDistrictFilterValue(value);

    if (!normalized) return 'Sleman';

    return normalized
        .toLowerCase()
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getIncidentDateParts(value: unknown) {
    const date = parseIncidentDate(value);

    if (!date) return { year: '', month: '' };

    return {
        year: String(date.getFullYear()),
        month: String(date.getMonth() + 1).padStart(2, '0'),
    };
}

function toNumber(value: unknown): number {
    if (value === null || value === undefined || value === '') return Number.NaN;

    const normalized = String(value).replace(',', '.');
    const number = Number(normalized);

    return Number.isFinite(number) ? number : Number.NaN;
}
function normalizeCoordinates(item: any): { lat: number; lng: number } | null {
    let lat = toNumber(item?.lat ?? item?.latitude);
    let lng = toNumber(item?.lng ?? item?.longitude);

    if ((!Number.isFinite(lat) || !Number.isFinite(lng)) && Array.isArray(item?.geometry?.coordinates)) {
        lng = toNumber(item.geometry.coordinates[0]);
        lat = toNumber(item.geometry.coordinates[1]);
    }

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    const coordinateLooksSwapped =
        Math.abs(lat) > 90 && Math.abs(lng) <= 90;

    if (coordinateLooksSwapped) {
        const temporaryLat = lat;
        lat = lng;
        lng = temporaryLat;
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

    return { lat, lng };
}

function normalizeDateString(value: unknown): string {
    if (!value || value === '-') return '-';

    const date = new Date(String(value));

    if (Number.isNaN(date.getTime())) {
        return String(value).split(' ')[0] || '-';
    }

    return date.toISOString().slice(0, 10);
}

function normalizeTimeString(value: unknown): string {
    if (!value || value === '-') return '-';

    const date = new Date(String(value));

    if (Number.isNaN(date.getTime())) {
        const text = String(value);

        if (text.includes(' ')) {
            return text.split(' ')[1]?.slice(0, 5) || '-';
        }

        return text.slice(0, 5) || '-';
    }

    return date.toTimeString().slice(0, 5);
}

function getRawDate(item: any) {
    return (
        item?.incident_at ??
        item?.incident_date ??
        item?.date ??
        item?.created_at ??
        item?.createdAt ??
        null
    );
}

function parseIncidentDate(value: unknown): Date | null {
    if (!value || value === '-') return null;

    const date = new Date(String(value));

    if (Number.isNaN(date.getTime())) return null;

    return date;
}

function isInsidePeriod(incident: NormalizedIncident, period: PeriodFilter): boolean {
    if (period === 'Semua') return true;

    const date = parseIncidentDate(incident.incidentDateValue);

    if (!date) return false;

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (period === '7 Hari') return diffDays <= 7;
    if (period === '30 Hari') return diffDays <= 30;
    if (period === '90 Hari') return diffDays <= 90;

    return true;
}

export function getIncidentWeight(categoryValue: unknown): number {
    const category = String(categoryValue ?? '').toUpperCase();

    if (
        category.includes('CURAS') ||
        category.includes('KEKERASAN') ||
        category.includes('SENJATA') ||
        category.includes('SAJAM')
    ) {
        return 5;
    }

    if (
        category.includes('PENGANIAYAAN') ||
        category.includes('PENGEROYOKAN') ||
        category.includes('PERAMPOKAN')
    ) {
        return 4;
    }

    if (
        category.includes('PEMERASAN') ||
        category.includes('PENGANCAMAN') ||
        category.includes('PENCURIAN')
    ) {
        return 3;
    }

    if (
        category.includes('PENGRUSAKAN') ||
        category.includes('VANDALISME')
    ) {
        return 2;
    }

    return 1;
}

function normalizeIncident(
    item: any,
    index: number,
    sourceFallback: DataMode,
): NormalizedIncident | null {
    const coordinates = normalizeCoordinates(item);

    if (!coordinates) return null;

    const rawDate = getRawDate(item);
    const category = cleanText(
        item?.kategori ??
        item?.rawKategori ??
        item?.type ??
        item?.incident_type ??
        item?.crime_type,
        'Kejadian',
    );

    const normalizedCategory = category.toUpperCase();

    const source =
        item?.source === 'dummy' || sourceFallback === 'fallback'
            ? 'dummy'
            : 'report';

    return {
        id: cleanText(item?.id, `${source}-${index + 1}`),
        reportCode: item?.reportCode ?? item?.report_code ?? undefined,
        title: cleanText(item?.title, `Laporan ${category}`),
        date: normalizeDateString(rawDate),
        time: normalizeTimeString(rawDate ?? item?.time),
        type: category,
        kategori: category,
        rawKategori: category,
        description: cleanText(item?.description ?? item?.deskripsi, '-'),
        location: cleanText(item?.location ?? item?.address ?? item?.alamat, 'Lokasi belum tersedia'),
        kecamatan: cleanText(item?.kecamatan ?? item?.district, 'Sleman'),
        desa: cleanText(item?.desa ?? item?.village, '-'),
        lat: coordinates.lat,
        lng: coordinates.lng,
        status: cleanText(item?.status, 'Aktif'),
        source,
        photoUrl: item?.photoUrl ?? item?.photo_url ?? null,
        reporterName: item?.reporterName ?? item?.reporter_name ?? null,
        reporterPhone: item?.reporterPhone ?? item?.reporter_phone ?? null,
        createdAt: item?.createdAt ?? item?.created_at ?? undefined,
        weight: getIncidentWeight(category),
        normalizedCategory,
        incidentDateValue: normalizeDateString(rawDate),
    };
}

function countBy<T>(items: T[], getter: (item: T) => string) {
    const result = new globalThis.Map<string, number>();

    items.forEach((item) => {
        const key = cleanText(getter(item), 'Lainnya');
        result.set(key, (result.get(key) ?? 0) + 1);
    });

    return Array.from(result.entries())
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total);
}

function formatNumber(value: number) {
    return new Intl.NumberFormat('id-ID').format(value);
}

export default function MapDashboard() {
    const [databaseReports, setDatabaseReports] = useState<MapIncident[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [selectedSource, setSelectedSource] = useState<SourceFilter>('Semua');
    const [selectedCategory, setSelectedCategory] = useState('Semua');
    const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>('Semua');
    const [selectedStatus, setSelectedStatus] = useState('Semua');
    const [selectedDistrict, setSelectedDistrict] = useState('Semua');
    const [selectedMonth, setSelectedMonth] = useState('Semua');
    const [selectedYear, setSelectedYear] = useState('Semua');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [kdeLayerMode, setKdeLayerMode] = useState<KdeLayerMode>('official');
    const [showIncidentPoints, setShowIncidentPoints] = useState(true);
    const [showAnalysisPanel, setShowAnalysisPanel] = useState(true);

    const loadReports = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const reports = await fetchReportIncidentsForMap();
            setDatabaseReports(Array.isArray(reports) ? reports : []);
        } catch (err) {
            console.error('Gagal memuat laporan database:', err);
            setError('Database belum berhasil dimuat. Peta memakai data contoh sementara.');
            setDatabaseReports([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadReports();
    }, [loadReports]);

    const dataMode: DataMode = databaseReports.length > 0 ? 'database' : 'fallback';

    const fallbackReports = useMemo(() => {
        return dummyIncidents
            .map((item, index) => normalizeIncident(item, index, 'fallback'))
            .filter((item): item is NormalizedIncident => item !== null);
    }, []);

    const normalizedDatabaseReports = useMemo(() => {
        return databaseReports
            .map((item, index) => normalizeIncident(item, index, 'database'))
            .filter((item): item is NormalizedIncident => item !== null);
    }, [databaseReports]);

    const allReports = useMemo(() => {
        return normalizedDatabaseReports.length > 0
            ? [...normalizedDatabaseReports, ...fallbackReports]
            : fallbackReports;
    }, [normalizedDatabaseReports, fallbackReports]);

    const sourceOptions = useMemo(() => {
        const options = new globalThis.Set<SourceFilter>();

        allReports.forEach((item) => {
            options.add(item.source === 'dummy' ? 'dummy' : 'report');
        });

        return ['Semua', ...Array.from(options)] as SourceFilter[];
    }, [allReports]);

    const categoryOptions = useMemo(() => {
        const categories = new globalThis.Set<string>();

        allReports.forEach((item) => {
            if (item.normalizedCategory) {
                categories.add(item.normalizedCategory);
            }
        });

        return ['Semua', ...Array.from(categories).sort()];
    }, [allReports]);

    const statusOptions = useMemo(() => {
        const statuses = new globalThis.Set<string>();
        allReports.forEach((item) => statuses.add(cleanText(item.status, 'Aktif')));
        return ['Semua', ...Array.from(statuses).sort()];
    }, [allReports]);

    const districtOptions = useMemo(() => {
        return [
            { value: 'Semua', label: 'Semua Kecamatan' },
            ...SLEMAN_DISTRICTS.map((district) => ({
                value: normalizeDistrictFilterValue(district),
                label: district,
            })),
        ];
    }, []);

    const yearOptions = useMemo(() => {
        const years = new globalThis.Set<string>();

        allReports.forEach((item) => {
            const { year } = getIncidentDateParts(item.incidentDateValue);
            if (year) years.add(year);
        });

        return ['Semua', ...Array.from(years).sort((a, b) => Number(b) - Number(a))];
    }, [allReports]);

    const selectedDistrictLabel = useMemo(() => {
        return districtOptions.find((item) => item.value === selectedDistrict)?.label ?? 'Semua Kecamatan';
    }, [districtOptions, selectedDistrict]);

    const resetFilters = () => {
        setSelectedSource('Semua');
        setSelectedCategory('Semua');
        setSelectedPeriod('Semua');
        setSelectedStatus('Semua');
        setSelectedDistrict('Semua');
        setSelectedMonth('Semua');
        setSelectedYear('Semua');
        setDateFrom('');
        setDateTo('');
    };

    const filteredReports = useMemo(() => {
        return allReports.filter((item) => {
            const matchSource =
                selectedSource === 'Semua' ||
                (selectedSource === 'dummy' ? item.source === 'dummy' : item.source !== 'dummy');
            const matchCategory =
                selectedCategory === 'Semua' ||
                item.normalizedCategory === selectedCategory;

            const matchPeriod = isInsidePeriod(item, selectedPeriod);
            const matchStatus =
                selectedStatus === 'Semua' ||
                cleanText(item.status, 'Aktif') === selectedStatus;
            const matchDistrict =
                selectedDistrict === 'Semua' ||
                normalizeDistrictFilterValue(item.kecamatan ?? item.district ?? 'Sleman') === selectedDistrict;

            const itemDate = item.incidentDateValue && item.incidentDateValue !== '-'
                ? item.incidentDateValue
                : '';
            const { year, month } = getIncidentDateParts(itemDate);
            const matchYear = selectedYear === 'Semua' || year === selectedYear;
            const matchMonth = selectedMonth === 'Semua' || month === selectedMonth;
            const matchDateFrom = !dateFrom || Boolean(itemDate && itemDate >= dateFrom);
            const matchDateTo = !dateTo || Boolean(itemDate && itemDate <= dateTo);

            return (
                matchSource &&
                matchCategory &&
                matchPeriod &&
                matchStatus &&
                matchDistrict &&
                matchYear &&
                matchMonth &&
                matchDateFrom &&
                matchDateTo
            );
        });
    }, [
        allReports,
        selectedSource,
        selectedCategory,
        selectedPeriod,
        selectedStatus,
        selectedDistrict,
        selectedYear,
        selectedMonth,
        dateFrom,
        dateTo,
    ]);

    const mapReports = useMemo(() => filteredReports, [filteredReports]);

    const kdeZones = useMemo(() => {
        if (!mapReports.length) return [];
        try {
            return analyzeKDE(mapReports as any, 1.65);
        } catch {
            return [];
        }
    }, [mapReports]);

    const categoryStats = useMemo(() => {
        return countBy(filteredReports, (item) => item.normalizedCategory).slice(0, 5);
    }, [filteredReports]);

    const districtStats = useMemo(() => {
        return countBy(filteredReports, (item) => formatDistrictLabel(item.kecamatan ?? 'Sleman')).slice(0, 5);
    }, [filteredReports]);

    const totalWeight = useMemo(() => {
        return filteredReports.reduce((total, item) => total + item.weight, 0);
    }, [filteredReports]);

    const dominantCategory = categoryStats[0]?.name ?? '-';
    const dominantDistrict = districtStats[0]?.name ?? '-';

    const averageWeight =
        filteredReports.length > 0 ? totalWeight / filteredReports.length : 0;

    const riskLabel =
        averageWeight >= 4
            ? 'Tinggi'
            : averageWeight >= 2.5
                ? 'Sedang'
                : filteredReports.length > 0
                    ? 'Rendah'
                    : '-';

    const visibleIncidentPointCount = showIncidentPoints ? filteredReports.length : 0;
    const emptyMapMessage =
        selectedDistrict !== 'Semua'
            ? 'Tidak ada data kejadian pada kecamatan yang dipilih.'
            : 'Tidak ada data yang sesuai dengan filter.';

    return (
        <div className="h-[calc(100vh-4rem)] min-h-0 overflow-hidden bg-slate-50 dark:bg-[#17324A]">
            <div className="flex h-full min-h-0 flex-col">
                <div className="border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#102538] px-4 py-3">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F2FAF6] px-3 py-1 text-xs font-semibold text-[#F47B52] ring-1 ring-[#BDE7E1]/35">
                                    <ShieldAlert className="h-3.5 w-3.5" />
                                    WebGIS Keamanan Sleman
                                </span>

                                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-[#17324A] px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-200">
                                    <Database className="h-3.5 w-3.5" />
                                    {dataMode === 'database' ? 'Data aktif' : 'Data contoh'}
                                </span>
                            </div>

                            <h1 className="mt-2 text-xl font-bold tracking-tight text-foreground">
                                Peta Kejadian Sleman
                            </h1>

                            <p className="mt-1 max-w-3xl text-sm font-semibold text-[#07324A] dark:text-slate-200">
                                Lihat titik kejadian, layer KDE 2020–2025, KDE otomatis, batas wilayah, dan sumber data pada peta.
                            </p>

                            <div className="mt-3 rounded-2xl border border-[#BDE7E1] bg-[#F2FAF6] p-3 text-[#07324A] shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white">
                                <div className="flex items-center gap-2 text-sm font-black">
                                    <MousePointerClick className="h-4 w-4 text-[#0B6E78] dark:text-[#5BAE8A]" />
                                    Cara Pakai Peta
                                </div>
                                <ol className="mt-2 grid gap-1.5 text-xs font-semibold leading-relaxed md:grid-cols-2">
                                    <li>1. Gunakan filter kecamatan, kategori, status, dan waktu kejadian.</li>
                                    <li>2. Klik marker untuk melihat detail lokasi, status, deskripsi, dan foto.</li>
                                    <li>3. Pilih layer KDE 2020–2025 atau KDE otomatis melalui kontrol layer pada peta.</li>
                                    <li>4. Gunakan tombol + dan - untuk mengatur skala peta.</li>
                                    <li className="md:col-span-2 inline-flex items-center gap-1">
                                        5. Fullscreen: klik ikon <Maximize2 className="h-3.5 w-3.5" /> di kiri atas peta.
                                    </li>
                                </ol>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <div className="inline-flex items-center gap-2 rounded-xl bg-orange-100 px-3 py-2 text-sm font-semibold text-orange-700 ring-1 ring-orange-200">
                                <Flame className="h-4 w-4" />
                                {kdeLayerMode === 'official'
                                    ? 'KDE 2020–2025'
                                    : kdeLayerMode === 'automatic'
                                        ? 'KDE Otomatis'
                                        : 'KDE Nonaktif'}
                            </div>

                            <button
                                type="button"
                                onClick={() => setShowIncidentPoints((value) => !value)}
                                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${showIncidentPoints
                                        ? 'bg-[#BDE7E1] text-[#F47B52] ring-1 ring-[#BDE7E1]'
                                        : 'bg-white dark:bg-[#102538] text-slate-600 dark:text-slate-200 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-[#17324A]'
                                    }`}
                            >
                                <CircleDot className="h-4 w-4" />
                                Titik Kejadian
                            </button>

                            <button
                                type="button"
                                onClick={() => setShowAnalysisPanel((value) => !value)}
                                className="inline-flex items-center gap-2 rounded-xl bg-white dark:bg-[#102538] px-3 py-2 text-sm font-semibold text-slate-800 dark:text-white ring-1 ring-slate-200 transition hover:bg-slate-50 dark:bg-[#17324A]"
                            >
                                <BarChart3 className="h-4 w-4" />
                                Analisis
                            </button>

                            <button
                                type="button"
                                onClick={loadReports}
                                disabled={loading}
                                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                Muat Ulang
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)_320px]">
                    <aside className="min-h-0 overflow-y-auto border-r border-slate-200 dark:border-white/10 bg-white dark:bg-[#102538] p-4">
                        <div className="mb-4 flex items-center gap-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F2FAF6] text-[#F47B52]">
                                <Filter className="h-4 w-4" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-foreground">Filter Peta</h2>
                                <p className="text-xs text-slate-500 dark:text-slate-300">Atur tampilan data kejadian</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                                    Sumber Data
                                </label>
                                <select
                                    value={selectedSource}
                                    onChange={(event) => setSelectedSource(event.target.value as SourceFilter)}
                                    className={FILTER_SELECT_CLASS}
                                >
                                    {sourceOptions.map((source) => (
                                        <option key={source} value={source}>
                                            {source === 'Semua'
                                                ? 'Semua sumber data'
                                                : source === 'dummy'
                                                    ? 'Kepolisian 2020–2025'
                                                    : 'Pelaporan Masyarakat'}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                                    Kategori
                                </label>
                                <select
                                    value={selectedCategory}
                                    onChange={(event) => setSelectedCategory(event.target.value)}
                                    className={FILTER_SELECT_CLASS}
                                >
                                    {categoryOptions.map((category) => (
                                        <option key={category} value={category}>
                                            {category === 'Semua' ? 'Semua kategori' : category}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-300">Status</label>
                                <select
                                    value={selectedStatus}
                                    onChange={(event) => setSelectedStatus(event.target.value)}
                                    className={FILTER_SELECT_CLASS}
                                >
                                    {statusOptions.map((status) => (
                                        <option key={status} value={status}>
                                            {status === 'Semua' ? 'Semua status' : status}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-300">Wilayah/Kecamatan</label>
                                <select
                                    value={selectedDistrict}
                                    onChange={(event) => setSelectedDistrict(event.target.value)}
                                    className={FILTER_SELECT_CLASS}
                                >
                                    {districtOptions.map((district) => (
                                        <option key={district.value} value={district.value}>
                                            {district.value === 'Semua' ? 'Semua Kecamatan' : district.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-300">Bulan</label>
                                    <select
                                        value={selectedMonth}
                                        onChange={(event) => setSelectedMonth(event.target.value)}
                                        className={FILTER_SELECT_CLASS}
                                    >
                                        <option value="Semua">Semua bulan</option>
                                        {MONTH_OPTIONS.map((month) => (
                                            <option key={month.value} value={month.value}>
                                                {month.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-300">Tahun</label>
                                    <select
                                        value={selectedYear}
                                        onChange={(event) => setSelectedYear(event.target.value)}
                                        className={FILTER_SELECT_CLASS}
                                    >
                                        {yearOptions.map((year) => (
                                            <option key={year} value={year}>
                                                {year === 'Semua' ? 'Semua tahun' : year}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-300">Dari</label>
                                    <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className={FILTER_SELECT_CLASS} />
                                </div>
                                <div>
                                    <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-300">Sampai</label>
                                    <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className={FILTER_SELECT_CLASS} />
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={resetFilters}
                                className="w-full rounded-xl border border-[#BDE7E1] bg-white px-3 py-2 text-sm font-black text-[#07324A] transition hover:bg-[#F2FAF6] dark:border-white/10 dark:bg-[#102538] dark:text-white dark:hover:bg-[#17324A]"
                            >
                                Reset Filter
                            </button>

                            <div>
                                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                                    Periode
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {PERIOD_OPTIONS.map((period) => (
                                        <button
                                            key={period}
                                            type="button"
                                            onClick={() => setSelectedPeriod(period)}
                                            className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${selectedPeriod === period
                                                    ? 'bg-[#F47B52] text-white'
                                                    : 'bg-slate-100 dark:bg-[#17324A] text-slate-600 dark:text-slate-200 hover:bg-slate-200'
                                                }`}
                                        >
                                            {period === 'Semua' ? 'Semua' : period}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-2xl bg-slate-900 p-4 text-white">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-slate-300">
                                        Titik tampil
                                    </span>
                                    <Layers className="h-4 w-4 text-slate-300" />
                                </div>

                                <div className="mt-2 text-3xl font-black">
                                    {formatNumber(visibleIncidentPointCount)}
                                </div>

                                <p className="mt-1 text-xs leading-relaxed text-slate-300">
                                    {showIncidentPoints
                                        ? `Marker mengikuti filter aktif${selectedDistrict !== 'Semua' ? `: ${selectedDistrictLabel}` : ''}.`
                                        : 'Layer Titik Kejadian sedang nonaktif, marker disembunyikan dari peta.'}
                                </p>

                                <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
                                    {dataMode === 'database'
                                        ? 'Menggunakan data pelaporan masyarakat yang tersimpan.'
                                        : 'Menampilkan data Kepolisian 2020–2025 sesuai filter.'}
                                </p>
                            </div>

                            {error && (
                                <div className="rounded-2xl border border-[#BDE7E1] bg-[#F2FAF6] p-3 text-sm text-[#07324A]">
                                    {error}
                                </div>
                            )}
                        </div>
                    </aside>

                    <main className="relative min-h-0 overflow-hidden bg-slate-100 dark:bg-[#17324A]">
                        <div className="pointer-events-none absolute left-4 top-4 z-[520] rounded-2xl border border-[#BDE7E1] bg-white/95 px-4 py-2 text-xs font-black text-[#07324A] shadow-xl backdrop-blur">
                            {showIncidentPoints
                                ? `Menampilkan ${formatNumber(filteredReports.length)} kejadian sesuai filter.`
                                : 'Layer Titik Kejadian nonaktif.'}
                        </div>

                        <MapView
                            incidents={mapReports as any}
                            showHeatmap={kdeLayerMode === 'automatic'}
                            kdeLayerMode={kdeLayerMode}
                            onKdeLayerModeChange={setKdeLayerMode}
                            officialKdeUrl="/data/kde/kde_2020_2025.geojson"
                            showIncidentMarkers={showIncidentPoints}
                            hotspotClusters={kdeLayerMode === 'none' ? kdeZones as any : []}
                            heatmapBandwidthKm={1.65}
                            showDistrictBoundary
                            fitDistrictBoundary={false}
                        />

                        {!loading && mapReports.length === 0 && (
                            <div className="pointer-events-none absolute inset-x-4 top-4 z-[500] rounded-2xl border border-slate-200 bg-white/95 p-4 text-sm font-bold text-[#07324A] shadow-xl backdrop-blur dark:border-white/10 dark:bg-[#102538]/95 dark:text-white">
                                {emptyMapMessage}
                            </div>
                        )}
                    </main>

                    {showAnalysisPanel && (
                        <aside className="min-h-0 overflow-y-auto border-l border-slate-200 dark:border-white/10 bg-white dark:bg-[#102538] p-4">
                            <div className="mb-4 flex items-center gap-2">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-700">
                                    <BarChart3 className="h-4 w-4" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-foreground">Ringkasan</h2>
                                    <p className="text-xs text-slate-500 dark:text-slate-300">Berdasarkan filter aktif</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-2xl bg-[#F2FAF6] p-3 ring-1 ring-[#BDE7E1]/35">
                                    <p className="text-xs font-semibold text-[#F47B52]">
                                        Total Titik
                                    </p>
                                    <p className="mt-1 text-2xl font-black text-[#07324A]">
                                        {formatNumber(filteredReports.length)}
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-orange-50 p-3 ring-1 ring-orange-100">
                                    <p className="text-xs font-semibold text-orange-700">
                                        Indikasi Kepadatan
                                    </p>
                                    <p className="mt-1 text-2xl font-black text-orange-800">
                                        {kdeLayerMode === 'official' ? 'Resmi' : riskLabel}
                                    </p>
                                </div>

                                <div className="col-span-2 rounded-2xl bg-[#F2FAF6] p-3 ring-1 ring-[#BDE7E1]">
                                    <p className="text-xs font-semibold text-[#F47B52]">
                                        Kategori Dominan
                                    </p>
                                    <p className="mt-1 text-sm font-bold text-[#07324A]">
                                        {dominantCategory}
                                    </p>
                                </div>

                                <div className="col-span-2 rounded-2xl bg-violet-50 p-3 ring-1 ring-violet-100">
                                    <p className="text-xs font-semibold text-violet-700">
                                        Cari wilayah Terbanyak
                                    </p>
                                    <p className="mt-1 text-sm font-bold text-violet-900">
                                        {dominantDistrict}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-5">
                                <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                                    Kategori Teratas
                                </h3>

                                <div className="space-y-3">
                                    {categoryStats.length > 0 ? (
                                        categoryStats.map((item) => {
                                            const percentage =
                                                filteredReports.length > 0
                                                    ? Math.round((item.total / filteredReports.length) * 100)
                                                    : 0;

                                            return (
                                                <div key={item.name}>
                                                    <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                                                        <span className="line-clamp-1 font-semibold text-slate-800 dark:text-white">
                                                            {item.name}
                                                        </span>
                                                        <span className="font-bold text-foreground">
                                                            {item.total}
                                                        </span>
                                                    </div>

                                                    <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-[#17324A]">
                                                        <div
                                                            className="h-full rounded-full bg-[#0B6E78]"
                                                            style={{ width: `${percentage}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <p className="rounded-xl bg-slate-50 dark:bg-[#17324A] p-3 text-sm text-slate-500 dark:text-slate-300">
                                            Belum ada data sesuai filter.
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="mt-5">
                                <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                                    Wilayah Teratas
                                </h3>

                                <div className="space-y-2">
                                    {districtStats.length > 0 ? (
                                        districtStats.map((item, index) => (
                                            <div
                                                key={item.name}
                                                className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-[#17324A] px-3 py-2"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white dark:bg-[#102538] text-xs font-black text-slate-800 dark:text-white ring-1 ring-slate-200">
                                                        {index + 1}
                                                    </span>
                                                    <span className="text-sm font-semibold text-slate-800 dark:text-white">
                                                        {item.name}
                                                    </span>
                                                </div>

                                                <span className="text-sm font-black text-foreground">
                                                    {item.total}
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="rounded-xl bg-slate-50 dark:bg-[#17324A] p-3 text-sm text-slate-500 dark:text-slate-300">
                                            Belum ada wilayah yang tampil.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </aside>
                    )}
                </div>
            </div>
        </div>
    );
}
