import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import L from 'leaflet';
import {
    AlertTriangle,
    BarChart3,
    ChevronDown,
    ChevronUp,
    Crosshair,
    Database,
    Eye,
    EyeOff,
    Filter,
    Flame,
    Layers3,
    LocateFixed,
    MapPin,
    Maximize2,
    Minimize2,
    Minus,
    Plus,
    RefreshCcw,
    Search,
    Shield,
    SlidersHorizontal,
    Table2,
    Target,
    X,
} from 'lucide-react';

import MapView from '@/Components/MapView';
import { incidents as dummyIncidents } from '@/data/dummy';
import { analyzeKDE } from '@/lib/kdeAnalysis';
import { fetchApprovedReportIncidents, type MapIncident } from '@/lib/databaseIncidents';
import type { UserLocation } from '@/lib/geolocation';

type SourceFilter = 'all' | 'dummy' | 'report';
type PeriodFilter = 'all' | '7d' | '30d' | '90d' | '2025' | '2024' | '2023' | '2022' | '2021' | '2020';
type ControlTab = 'layer' | 'filter' | 'analysis';
type TablePageSize = 10 | 20 | 50;

type DashboardIncident = {
    id: string | number;
    date?: string;
    time?: string;
    type?: string;
    kategori?: string;
    rawKategori?: string;
    description?: string;
    location?: string;
    status?: string;
    kecamatan?: string;
    desa?: string;
    lat: number;
    lng: number;
    latitude?: number;
    longitude?: number;
    reportCode?: string;
    source?: 'dummy' | 'report';
    title?: string;
    district?: string;
    village?: string;
    address?: string;
    photoUrl?: string | null;
    image_url?: string | null;
    severity?: number;
};

type KDEZoneLike = {
    id?: string | number;
    name?: string;
    kecamatan?: string;
    district?: string;
    center?: [number, number];
    lat?: number;
    lng?: number;
    latitude?: number;
    longitude?: number;
    score?: number;
    count?: number;
    total?: number;
    intensity?: string;
};

const SLEMAN_CENTER: [number, number] = [-7.716, 110.355];
const DEFAULT_ZOOM = 12;
const KDE_BANDWIDTH_KM = 1.65;

const SLEMAN_BOUNDS = {
    south: -7.86,
    north: -7.53,
    west: 110.2,
    east: 110.56,
};

const KDE_LEGEND_UI = [
    { label: 'Sangat Tinggi', range: 'Zona merah', color: '#D95F5F', intensity: 'very-high' },
    { label: 'Tinggi', range: 'Zona jingga', color: '#D95F5F', intensity: 'high' },
    { label: 'Sedang', range: 'Zona kuning', color: '#facc15', intensity: 'medium' },
    { label: 'Rendah', range: 'Zona hijau', color: '#D95F5F', intensity: 'low' },
];

const periodOptions: Array<{ value: PeriodFilter; label: string }> = [
    { value: 'all', label: 'Semua waktu' },
    { value: '7d', label: '7 hari terakhir' },
    { value: '30d', label: '30 hari terakhir' },
    { value: '90d', label: '90 hari terakhir' },
    { value: '2025', label: 'Tahun 2025' },
    { value: '2024', label: 'Tahun 2024' },
    { value: '2023', label: 'Tahun 2023' },
    { value: '2022', label: 'Tahun 2022' },
    { value: '2021', label: 'Tahun 2021' },
    { value: '2020', label: 'Tahun 2020' },
];

const sourceOptions: Array<{ value: SourceFilter; label: string }> = [
    { value: 'all', label: 'Semua sumber' },
    { value: 'dummy', label: 'Data Polisi 2020–2025' },
    { value: 'report', label: 'Laporan Masyarakat' },
];

const tablePageSizeOptions: Array<{ value: string; label: string }> = [
    { value: '10', label: '10 kejadian' },
    { value: '20', label: '20 kejadian' },
    { value: '50', label: '50 kejadian' },
];

const crimePalette: Record<string, { color: string; bg: string; label: string; weight: number }> = {
    PENGEROYOKAN: {
        color: '#D95F5F',
        bg: '#fee2e2',
        label: 'Pengeroyokan',
        weight: 1.25,
    },
    PENGRUSAKAN: {
        color: '#D95F5F',
        bg: '#ffedd5',
        label: 'Pengrusakan',
        weight: 1.05,
    },
    PENGANIAYAAN: {
        color: '#D95F5F',
        bg: '#ffe4e6',
        label: 'Penganiayaan',
        weight: 1.2,
    },
    'PENYALAHGUNAAN SENJATA TAJAM': {
        color: '#1A3348',
        bg: '#fee2e2',
        label: 'Senjata Tajam',
        weight: 1.45,
    },
    'PENCURIAN DENGAN KEKERASAN (CURAS)': {
        color: '#1A3348',
        bg: '#f3e8ff',
        label: 'Curas',
        weight: 1.4,
    },
    'PEMERASAN DAN PENGANCAMAN': {
        color: '#D95F5F',
        bg: '#fef3c7',
        label: 'Pemerasan',
        weight: 1.15,
    },
};

function cx(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(' ');
}

function formatNumber(value: number) {
    return new Intl.NumberFormat('id-ID').format(value || 0);
}

function normalizeText(value: unknown) {
    return String(value ?? '')
        .toLowerCase()
        .trim();
}

function titleCase(value: unknown) {
    const text = String(value || '-').trim();

    if (!text || text === '-') return '-';

    return text
        .toLowerCase()
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function getIncidentType(incident: any) {
    return String(
        incident?.rawKategori ||
            incident?.kategori ||
            incident?.crime_type ||
            incident?.incident_type ||
            incident?.type ||
            'Kejadian',
    ).trim();
}

function getIncidentTypeLabel(type: string) {
    return crimePalette[type]?.label || titleCase(type);
}

function getIncidentColor(type: string) {
    return crimePalette[type]?.color || '#64748b';
}

function getIncidentKecamatan(incident: any) {
    return String(incident?.kecamatan || incident?.district || incident?.wilayah || '-').trim() || '-';
}

function getIncidentDesa(incident: any) {
    return String(incident?.desa || incident?.village || '-').trim() || '-';
}

function parseDateValue(value: unknown): Date | null {
    if (!value || value === '-') return null;

    const date = new Date(String(value));

    if (Number.isNaN(date.getTime())) return null;

    return date;
}

function getIncidentDate(incident: any): Date | null {
    return parseDateValue(incident?.date || incident?.incident_date || incident?.incident_at || incident?.created_at);
}

function inSlemanBounds(lat: number, lng: number) {
    return (
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        lat >= SLEMAN_BOUNDS.south &&
        lat <= SLEMAN_BOUNDS.north &&
        lng >= SLEMAN_BOUNDS.west &&
        lng <= SLEMAN_BOUNDS.east
    );
}


function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
    const earthRadiusKm = 6371;
    const toRad = (value: number) => (value * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadiusKm * c;
}

function formatDistance(km: number) {
    if (!Number.isFinite(km)) return '-';
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km.toFixed(2)} km`;
}

function getZoneLatLng(zone: KDEZoneLike) {
    const lat = Number(zone?.center?.[0] ?? zone?.lat ?? zone?.latitude ?? (zone as any)?.centerLat);
    const lng = Number(zone?.center?.[1] ?? zone?.lng ?? zone?.longitude ?? (zone as any)?.centerLng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
}

function getZoneRadiusKm(zone: KDEZoneLike) {
    const radius = Number((zone as any)?.radius ?? (zone as any)?.radiusKm ?? KDE_BANDWIDTH_KM / 2);
    return Number.isFinite(radius) && radius > 0 ? radius : KDE_BANDWIDTH_KM / 2;
}

function getZoneIntensityLabel(value?: string) {
    const text = String(value || '').toLowerCase();
    if (text.includes('sangat')) return 'Sangat tinggi';
    if (text.includes('tinggi') || text.includes('high')) return 'Tinggi';
    if (text.includes('sedang') || text.includes('medium')) return 'Sedang';
    if (text.includes('rendah') || text.includes('low')) return 'Rendah';
    return 'Zona rawan';
}

function isInsidePeriod(incident: any, period: PeriodFilter) {
    if (period === 'all') return true;

    const date = getIncidentDate(incident);

    if (!date) return false;

    if (['2020', '2021', '2022', '2023', '2024', '2025'].includes(period)) {
        return String(date.getFullYear()) === period;
    }

    const today = new Date();
    const diffDays = (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);

    if (period === '7d') return diffDays <= 7;
    if (period === '30d') return diffDays <= 30;
    if (period === '90d') return diffDays <= 90;

    return true;
}

function normalizeIncident(item: any, source: 'dummy' | 'report'): DashboardIncident | null {
    const lat = Number(item?.lat ?? item?.latitude);
    const lng = Number(item?.lng ?? item?.longitude);

    if (!inSlemanBounds(lat, lng)) return null;

    const type = getIncidentType(item);

    return {
        ...item,
        id: item?.id ?? `${source}-${lat}-${lng}-${type}`,
        date: String(item?.date || item?.incident_date || item?.created_at || '-'),
        time: String(item?.time || item?.incident_time || '-'),
        type,
        kategori: type,
        rawKategori: type,
        description: String(item?.description || item?.deskripsi || '-'),
        location: String(item?.location || item?.address || item?.alamat || '-'),
        status: item?.status || 'Aktif',
        kecamatan: getIncidentKecamatan(item),
        desa: getIncidentDesa(item),
        lat,
        lng,
        latitude: lat,
        longitude: lng,
        source,
        severity: Number(item?.severity || crimePalette[type]?.weight || 1),
    };
}

function sortByLatest(a: DashboardIncident, b: DashboardIncident) {
    const dateA = getIncidentDate(a)?.getTime() ?? 0;
    const dateB = getIncidentDate(b)?.getTime() ?? 0;

    return dateB - dateA;
}

function getDominantLabel(items: Array<{ name: string; total: number }>) {
    if (!items.length) return '-';

    return items[0].name;
}

function getRiskTone(total: number) {
    if (total >= 80) {
        return {
            label: 'Perlu Atensi Tinggi',
            className: 'bg-rose-50 text-rose-700 border-rose-100',
        };
    }

    if (total >= 35) {
        return {
            label: 'Perlu Dipantau',
            className: 'bg-[#EFF4F8] text-[#D95F5F] border-[#D8E4ED]',
        };
    }

    return {
        label: 'Relatif Terkendali',
        className: 'bg-[#EFF4F8] text-[#D95F5F] border-[#D8E4ED]',
    };
}

function SmallButton({
    children,
    active,
    onClick,
    title,
}: {
    children: ReactNode;
    active?: boolean;
    onClick?: () => void;
    title?: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={title}
            className={cx(
                'inline-flex h-10 w-10 items-center justify-center rounded-2xl border text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md',
                active ? 'border-[#D8E4ED] bg-[#EFF4F8] text-[#1A3348]' : 'border-slate-200 bg-white hover:bg-[#EFF4F8] dark:bg-[#0F1F2E]/60',
            )}
        >
            {children}
        </button>
    );
}

function SelectField({
    label,
    value,
    onChange,
    options,
}: {
    label: string;
    value: string;
    onChange: (value: any) => void;
    options: Array<{ value: string; label: string }>;
}) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
                {label}
            </span>

            <div className="relative">
                <select
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    className="h-11 w-full appearance-none rounded-2xl border border-[#D8E4ED] bg-white px-3 pr-9 text-sm font-bold text-[#0F1F2E] outline-none transition focus:border-[#D95F5F] focus:ring-4 focus:ring-[#D95F5F]/20 dark:border-white/10 dark:bg-[#1A3348] dark:text-[#EFF4F8] dark:focus:border-[#D95F5F] dark:focus:ring-[#D95F5F]/15"
                >
                    {options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>

                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
        </label>
    );
}

function ToggleRow({
    title,
    subtitle,
    checked,
    onChange,
    icon,
}: {
    title: string;
    subtitle: string;
    checked: boolean;
    onChange: () => void;
    icon: ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onChange}
            className={cx(
                'flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md',
                checked ? 'border-[#D8E4ED] bg-[#EFF4F8]/80' : 'border-slate-200 bg-white hover:bg-[#EFF4F8] dark:bg-[#0F1F2E]/60',
            )}
        >
            <span
                className={cx(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl',
                    checked ? 'bg-[#D95F5F] text-white' : 'bg-slate-100 text-slate-500',
                )}
            >
                {icon}
            </span>

            <span className="min-w-0 flex-1">
                <span className="block text-sm font-black text-slate-800">{title}</span>
                <span className="mt-0.5 block text-xs font-semibold leading-4 text-slate-500">{subtitle}</span>
            </span>

            <span className={cx('relative h-6 w-11 shrink-0 rounded-full transition', checked ? 'bg-[#D95F5F]' : 'bg-slate-200')}>
                <span
                    className={cx(
                        'absolute top-1 h-4 w-4 rounded-full bg-white shadow transition',
                        checked ? 'left-6' : 'left-1',
                    )}
                />
            </span>
        </button>
    );
}

function StatCard({
    title,
    value,
    subtitle,
    icon,
    tone = 'cyan',
}: {
    title: string;
    value: string;
    subtitle: string;
    icon: ReactNode;
    tone?: 'cyan' | 'rose' | 'amber' | 'emerald' | 'slate';
}) {
    const toneClass = {
        cyan: 'bg-[#EFF4F8] text-[#1A3348] border-[#D8E4ED]',
        rose: 'bg-rose-50 text-rose-700 border-rose-100',
        amber: 'bg-[#EFF4F8] text-[#D95F5F] border-[#D8E4ED]',
        emerald: 'bg-[#EFF4F8] text-[#D95F5F] border-[#D8E4ED]',
        slate: 'bg-[#EFF4F8] dark:bg-[#0F1F2E]/60 text-slate-700 border-slate-100',
    }[tone];

    return (
        <div className="rounded-[1.6rem] border border-[#D8E4ED] bg-white dark:border-white/10 dark:bg-[#1A3348] p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{title}</p>
                    <p className="mt-2 text-2xl font-black tracking-tight text-foreground">{value}</p>
                </div>

                <div className={cx('flex h-11 w-11 items-center justify-center rounded-2xl border', toneClass)}>
                    {icon}
                </div>
            </div>

            <p className="mt-3 text-sm font-semibold leading-5 text-slate-500">{subtitle}</p>
        </div>
    );
}

function PanelTitle({ title, subtitle, icon }: { title: string; subtitle: string; icon: ReactNode }) {
    return (
        <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
                {icon}
            </div>

            <div>
                <h3 className="text-base font-black text-foreground">{title}</h3>
                <p className="mt-0.5 text-xs font-semibold leading-5 text-slate-500">{subtitle}</p>
            </div>
        </div>
    );
}

export default function AnalysisDashboard() {
    const mapRef = useRef<L.Map | null>(null);

    const [reportIncidents, setReportIncidents] = useState<MapIncident[]>([]);
    const [loadingReports, setLoadingReports] = useState(false);
    const [reportError, setReportError] = useState<string | null>(null);

    const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>('all');
    const [selectedType, setSelectedType] = useState('all');
    const [selectedKecamatan, setSelectedKecamatan] = useState('all');
    const [selectedSource, setSelectedSource] = useState<SourceFilter>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const [showIncident, setShowIncident] = useState(true);
    const [showKde, setShowKde] = useState(true);
    const [showDistrict, setShowDistrict] = useState(true);
    const [controlOpen, setControlOpen] = useState(true);
    const [mobileControlOpen, setMobileControlOpen] = useState(false);
    const [controlTab, setControlTab] = useState<ControlTab>('layer');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [tableOpen, setTableOpen] = useState(false);
    const [selectedTableYear, setSelectedTableYear] = useState('all');
    const [tablePageSize, setTablePageSize] = useState<TablePageSize>(10);
    const [tablePage, setTablePage] = useState(1);
    const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
    const [isLocating, setIsLocating] = useState(false);

    const loadReports = useCallback(async () => {
        setLoadingReports(true);
        setReportError(null);

        try {
            const data = await fetchApprovedReportIncidents();
            setReportIncidents(data || []);
        } catch (error) {
            console.error('Gagal memuat laporan masyarakat:', error);
            setReportError('Laporan masyarakat belum berhasil dimuat. Data polisi tetap ditampilkan.');
            setReportIncidents([]);
        } finally {
            setLoadingReports(false);
        }
    }, []);

    useEffect(() => {
        loadReports();
    }, [loadReports]);

    const allIncidents = useMemo(() => {
        const dummy = (dummyIncidents || [])
            .map((item: any) => normalizeIncident(item, 'dummy'))
            .filter((item): item is DashboardIncident => Boolean(item));

        const reports = (reportIncidents || [])
            .map((item: any) => normalizeIncident(item, 'report'))
            .filter((item): item is DashboardIncident => Boolean(item));

        return [...dummy, ...reports].sort(sortByLatest);
    }, [reportIncidents]);

    const typeOptions = useMemo(() => {
        const values = Array.from(new Set(allIncidents.map((item) => getIncidentType(item))))
            .filter((value): value is string => Boolean(value))
            .sort();

        return [{ value: 'all', label: 'Semua jenis' }, ...values.map((value) => ({ value, label: getIncidentTypeLabel(value) }))];
    }, [allIncidents]);

    const kecamatanOptions = useMemo(() => {
        const values = Array.from(
            new Set(allIncidents.map((item) => getIncidentKecamatan(item)).filter((value) => value && value !== '-')),
        ).sort();

        return [{ value: 'all', label: 'Semua kecamatan' }, ...values.map((value) => ({ value, label: titleCase(value) }))];
    }, [allIncidents]);

    const filteredIncidents = useMemo(() => {
        const query = normalizeText(searchQuery);

        return allIncidents.filter((incident) => {
            const type = getIncidentType(incident);
            const kecamatan = getIncidentKecamatan(incident);
            const source = incident.source || 'dummy';

            if (selectedType !== 'all' && type !== selectedType) return false;
            if (selectedKecamatan !== 'all' && kecamatan !== selectedKecamatan) return false;
            if (selectedSource !== 'all' && source !== selectedSource) return false;
            if (!isInsidePeriod(incident, selectedPeriod)) return false;

            if (query) {
                const haystack = normalizeText(
                    [
                        incident.title,
                        incident.description,
                        incident.location,
                        incident.address,
                        incident.kecamatan,
                        incident.desa,
                        type,
                        incident.reportCode,
                    ].join(' '),
                );

                if (!haystack.includes(query)) return false;
            }

            return true;
        });
    }, [allIncidents, searchQuery, selectedKecamatan, selectedPeriod, selectedSource, selectedType]);

    const tableYearOptions = useMemo(() => {
        const values = Array.from(
            new Set(
                filteredIncidents
                    .map((incident) => getIncidentDate(incident)?.getFullYear())
                    .filter((year): year is number => typeof year === 'number' && Number.isFinite(year)),
            ),
        ).sort((a: number, b: number) => b - a);

        return [
            { value: 'all', label: 'Semua tahun' },
            ...values.map((year) => ({ value: String(year), label: String(year) })),
        ];
    }, [filteredIncidents]);

    const tableIncidents = useMemo(() => {
        if (selectedTableYear === 'all') return filteredIncidents;

        return filteredIncidents.filter((incident) => {
            const year = getIncidentDate(incident)?.getFullYear();
            return String(year) === selectedTableYear;
        });
    }, [filteredIncidents, selectedTableYear]);

    const totalTablePages = Math.max(1, Math.ceil(tableIncidents.length / tablePageSize));

    const currentTablePage = Math.min(tablePage, totalTablePages);

    const paginatedTableIncidents = useMemo(() => {
        const start = (currentTablePage - 1) * tablePageSize;
        return tableIncidents.slice(start, start + tablePageSize);
    }, [currentTablePage, tableIncidents, tablePageSize]);

    const tableStartNumber = tableIncidents.length ? (currentTablePage - 1) * tablePageSize + 1 : 0;
    const tableEndNumber = Math.min(currentTablePage * tablePageSize, tableIncidents.length);

    useEffect(() => {
        setTablePage(1);
    }, [searchQuery, selectedKecamatan, selectedPeriod, selectedSource, selectedTableYear, selectedType, tablePageSize]);

    const kdeZones = useMemo<KDEZoneLike[]>(() => {
        if (!filteredIncidents.length) return [];

        try {
            const result = analyzeKDE(filteredIncidents as any, KDE_BANDWIDTH_KM);
            return Array.isArray(result) ? result.slice(0, 6) : [];
        } catch (error) {
            console.error('Gagal membaca KDE:', error);
            return [];
        }
    }, [filteredIncidents]);

    const sourceStats = useMemo(() => {
        const dummy = filteredIncidents.filter((item) => item.source !== 'report').length;
        const report = filteredIncidents.filter((item) => item.source === 'report').length;

        return { dummy, report };
    }, [filteredIncidents]);

    const typeStats = useMemo(() => {
        const map = new Map<string, number>();

        filteredIncidents.forEach((incident) => {
            const type = getIncidentType(incident);
            map.set(type, (map.get(type) || 0) + 1);
        });

        return Array.from(map.entries())
            .map(([name, total]) => ({ name, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 6);
    }, [filteredIncidents]);

    const kecamatanStats = useMemo(() => {
        const map = new Map<string, number>();

        filteredIncidents.forEach((incident) => {
            const name = getIncidentKecamatan(incident);

            if (!name || name === '-') return;

            map.set(name, (map.get(name) || 0) + 1);
        });

        return Array.from(map.entries())
            .map(([name, total]) => ({ name, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 8);
    }, [filteredIncidents]);

    const latestIncidents = useMemo(() => filteredIncidents.slice(0, 8), [filteredIncidents]);

    const dominantType = getDominantLabel(typeStats.map((item) => ({ name: getIncidentTypeLabel(item.name), total: item.total })));
    const dominantKecamatan = getDominantLabel(kecamatanStats.map((item) => ({ name: titleCase(item.name), total: item.total })));
    const riskTone = getRiskTone(filteredIncidents.length);

    const activeFilterCount = [
        selectedPeriod !== 'all',
        selectedType !== 'all',
        selectedKecamatan !== 'all',
        selectedSource !== 'all',
        Boolean(searchQuery),
    ].filter(Boolean).length;

    const mapIncidents = showIncident ? filteredIncidents : [];

    const userRiskInfo = useMemo(() => {
        if (!userLocation) return null;

        const nearestZone = kdeZones
            .map((zone) => {
                const coordinate = getZoneLatLng(zone);
                if (!coordinate) return null;

                const centerDistanceKm = getDistanceKm(userLocation.lat, userLocation.lng, coordinate.lat, coordinate.lng);
                const radiusKm = getZoneRadiusKm(zone);
                const distanceToZoneKm = Math.max(0, centerDistanceKm - radiusKm);

                return {
                    zone,
                    coordinate,
                    radiusKm,
                    centerDistanceKm,
                    distanceToZoneKm,
                    inside: centerDistanceKm <= radiusKm,
                };
            })
            .filter(Boolean)
            .sort((a: any, b: any) => a.distanceToZoneKm - b.distanceToZoneKm)[0] as any;

        const nearestIncident = filteredIncidents
            .map((incident) => ({
                incident,
                distanceKm: getDistanceKm(userLocation.lat, userLocation.lng, incident.lat, incident.lng),
            }))
            .sort((a, b) => a.distanceKm - b.distanceKm)[0];

        const isInsideRawan = Boolean(nearestZone?.inside);
        const isNearRawan = Boolean(!isInsideRawan && nearestZone && nearestZone.distanceToZoneKm <= 0.5);
        const isNearIncident = Boolean(nearestIncident && nearestIncident.distanceKm <= 0.5);
        const status = isInsideRawan ? 'rawan' : isNearRawan || isNearIncident ? 'waspada' : 'aman';

        return {
            status,
            nearestZone,
            nearestIncident,
            title:
                status === 'rawan'
                    ? 'Anda berada di area rawan'
                    : status === 'waspada'
                      ? 'Anda berada dekat area rawan'
                      : 'Lokasi Anda relatif aman',
            message:
                status === 'rawan'
                    ? `Jarak Anda ke batas zona rawan adalah 0 m. Hindari berhenti terlalu lama, pilih rute ramai, dan segera hubungi kontak darurat bila situasi mencurigakan.`
                    : status === 'waspada'
                      ? `Jarak Anda ke batas zona rawan sekitar ${formatDistance(nearestZone?.distanceToZoneKm ?? Number.NaN)}. Tingkatkan kewaspadaan, perhatikan sekitar, dan gunakan jalur yang terang.`
                      : 'Tidak ada zona rawan yang sangat dekat dari posisi Anda saat ini. Tetap perhatikan kondisi sekitar.',
        };
    }, [filteredIncidents, kdeZones, userLocation]);

    const resetFilters = () => {
        setSelectedPeriod('all');
        setSelectedType('all');
        setSelectedKecamatan('all');
        setSelectedSource('all');
        setSearchQuery('');
    };

    const fitSleman = () => {
        mapRef.current?.setView(SLEMAN_CENTER, DEFAULT_ZOOM);
    };

    const zoomIn = () => {
        mapRef.current?.zoomIn();
    };

    const zoomOut = () => {
        mapRef.current?.zoomOut();
    };

    const zoomToIncident = (incident: DashboardIncident) => {
        mapRef.current?.setView([incident.lat, incident.lng], 15, { animate: true });
    };

    const zoomToKecamatan = (kecamatan: string) => {
        const points = filteredIncidents.filter((incident) => getIncidentKecamatan(incident) === kecamatan);

        if (!points.length) return;

        const bounds = L.latLngBounds(points.map((item) => [item.lat, item.lng] as [number, number]));
        mapRef.current?.fitBounds(bounds.pad(0.22), { animate: true, maxZoom: 14 });
    };

    const locateUser = () => {
        if (!navigator.geolocation) {
            alert('Browser belum mendukung fitur lokasi.');
            return;
        }

        setIsLocating(true);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const location = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                } as UserLocation;

                const nearestZone = kdeZones
                    .map((zone) => {
                        const coordinate = getZoneLatLng(zone);
                        if (!coordinate) return null;

                        const centerDistanceKm = getDistanceKm(location.lat, location.lng, coordinate.lat, coordinate.lng);
                        const radiusKm = getZoneRadiusKm(zone);
                        const distanceToZoneKm = Math.max(0, centerDistanceKm - radiusKm);

                        return {
                            zone,
                            centerDistanceKm,
                            distanceToZoneKm,
                            radiusKm,
                            inside: centerDistanceKm <= radiusKm,
                        };
                    })
                    .filter(Boolean)
                    .sort((a: any, b: any) => a.distanceToZoneKm - b.distanceToZoneKm)[0] as any;

                const nearestIncident = filteredIncidents
                    .map((incident) => ({
                        incident,
                        distanceKm: getDistanceKm(location.lat, location.lng, incident.lat, incident.lng),
                    }))
                    .sort((a, b) => a.distanceKm - b.distanceKm)[0];

                setUserLocation(location);
                mapRef.current?.setView([location.lat, location.lng], 15, { animate: true });
                setIsLocating(false);

                if (nearestZone?.inside) {
                    alert(
                        `Peringatan! Posisi Anda berada di area rawan (${getZoneIntensityLabel(nearestZone.zone?.intensity)}). ` +
                            `Jarak Anda dari batas area rawan: 0 m. ` +
                            `Pusat zona sekitar ${formatDistance(nearestZone.centerDistanceKm)}, titik kejadian terdekat sekitar ${formatDistance(nearestIncident?.distanceKm ?? Number.NaN)}. ` +
                            `Himbauan: tetap bergerak ke area ramai dan hindari berhenti terlalu lama.`,
                    );
                } else if (nearestZone && nearestZone.distanceToZoneKm <= 0.5) {
                    alert(
                        `Waspada! Posisi Anda dekat area rawan. ` +
                            `Jarak Anda dari batas area rawan sekitar ${formatDistance(nearestZone.distanceToZoneKm)}. ` +
                            `Titik kejadian terdekat sekitar ${formatDistance(nearestIncident?.distanceKm ?? Number.NaN)}. ` +
                            `Himbauan: gunakan jalur terang, ramai, dan siapkan kontak darurat.`,
                    );
                }
            },
            () => {
                alert('Lokasi belum dapat diakses. Pastikan izin lokasi browser aktif.');
                setIsLocating(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 12000,
                maximumAge: 0,
            },
        );
    };

    const controlContent = (
        <div className="space-y-3">
            <div className="flex rounded-2xl bg-slate-100 p-1">
                {[
                    { value: 'layer', label: 'Layer', icon: <Layers3 className="h-4 w-4" /> },
                    { value: 'filter', label: 'Filter', icon: <Filter className="h-4 w-4" /> },
                    { value: 'analysis', label: 'Analisis', icon: <BarChart3 className="h-4 w-4" /> },
                ].map((tab) => (
                    <button
                        key={tab.value}
                        type="button"
                        onClick={() => setControlTab(tab.value as ControlTab)}
                        className={cx(
                            'flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-black transition',
                            controlTab === tab.value ? 'bg-white text-[#1A3348] shadow-sm' : 'text-slate-500 hover:text-slate-800',
                        )}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {controlTab === 'layer' && (
                <div className="space-y-2.5">
                    <ToggleRow
                        title="KDE Hotspot"
                        subtitle="Sebaran kerawanan dari titik kejadian"
                        checked={showKde}
                        onChange={() => setShowKde((value) => !value)}
                        icon={<Flame className="h-5 w-5" />}
                    />

                    <ToggleRow
                        title="Titik Kejadian"
                        subtitle="Marker data polisi dan laporan terbaru"
                        checked={showIncident}
                        onChange={() => setShowIncident((value) => !value)}
                        icon={<MapPin className="h-5 w-5" />}
                    />

                    <ToggleRow
                        title="Batas Kecamatan"
                        subtitle="Batas admin agar pembacaan wilayah jelas"
                        checked={showDistrict}
                        onChange={() => setShowDistrict((value) => !value)}
                        icon={<Shield className="h-5 w-5" />}
                    />

                    <div className="rounded-2xl border border-[#D8E4ED] bg-white dark:border-white/10 dark:bg-[#1A3348] p-3">
                        <div className="mb-2 flex items-center justify-between gap-3">
                            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Legenda KDE</p>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-500">
                                Otomatis
                            </span>
                        </div>

                        <div className="space-y-2">
                            {KDE_LEGEND_UI.map((item) => (
                                <div key={item.intensity} className="flex items-center justify-between gap-3">
                                    <div className="flex min-w-0 items-center gap-2">
                                        <span className="h-3 w-8 rounded-full" style={{ backgroundColor: item.color }} />
                                        <span className="truncate text-xs font-bold text-slate-600">{item.label}</span>
                                    </div>

                                    <span className="text-[11px] font-black text-slate-400">{item.range}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {controlTab === 'filter' && (
                <div className="space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            placeholder="Cari lokasi, kecamatan, jenis kasus..."
                            className="h-11 w-full rounded-2xl border border-[#D8E4ED] bg-white dark:border-white/10 dark:bg-[#1A3348] pl-10 pr-3 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#D95F5F] focus:ring-4 focus:ring-[#D8E4ED]"
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        <SelectField label="Periode" value={selectedPeriod} onChange={setSelectedPeriod} options={periodOptions} />
                        <SelectField label="Jenis kejadian" value={selectedType} onChange={setSelectedType} options={typeOptions} />
                        <SelectField label="Kecamatan" value={selectedKecamatan} onChange={setSelectedKecamatan} options={kecamatanOptions} />
                        <SelectField label="Sumber data" value={selectedSource} onChange={setSelectedSource} options={sourceOptions} />
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={resetFilters}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-[#D8E4ED] bg-white dark:border-white/10 dark:bg-[#1A3348] px-3 py-2.5 text-xs font-black text-slate-600 transition hover:bg-[#EFF4F8] dark:bg-[#0F1F2E]/60"
                        >
                            <RefreshCcw className="h-4 w-4" />
                            Reset Filter
                        </button>

                        <span className="rounded-2xl bg-[#EFF4F8] px-3 py-2.5 text-xs font-black text-[#1A3348]">
                            {activeFilterCount} aktif
                        </span>
                    </div>
                </div>
            )}

            {controlTab === 'analysis' && (
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-2xl bg-slate-950 p-3 text-white">
                            <p className="text-[11px] font-bold text-white/55">Titik terbaca</p>
                            <p className="mt-1 text-2xl font-black">{formatNumber(filteredIncidents.length)}</p>
                        </div>

                        <div className="rounded-2xl border border-[#D8E4ED] bg-white dark:border-white/10 dark:bg-[#1A3348] p-3">
                            <p className="text-[11px] font-black text-slate-400">Hotspot</p>
                            <p className="mt-1 text-2xl font-black text-foreground">{formatNumber(kdeZones.length)}</p>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-[#D8E4ED] bg-white dark:border-white/10 dark:bg-[#1A3348] p-3">
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Ringkasan cepat</p>

                        <div className="mt-3 space-y-2 text-sm font-semibold text-slate-600">
                            <div className="flex justify-between gap-3">
                                <span>Wilayah dominan</span>
                                <span className="text-right font-black text-foreground">{dominantKecamatan}</span>
                            </div>

                            <div className="flex justify-between gap-3">
                                <span>Jenis dominan</span>
                                <span className="text-right font-black text-foreground">{dominantType}</span>
                            </div>

                            <div className="flex justify-between gap-3">
                                <span>Data polisi</span>
                                <span className="font-black text-foreground">{formatNumber(sourceStats.dummy)}</span>
                            </div>

                            <div className="flex justify-between gap-3">
                                <span>Laporan warga</span>
                                <span className="font-black text-foreground">{formatNumber(sourceStats.report)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-[#D8E4ED] bg-[#EFF4F8] p-3 text-xs font-semibold leading-5 text-[#0F1F2E]">
                        KDE dibaca sebagai petunjuk konsentrasi kejadian, bukan batas pasti wilayah aman atau rawan.
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <main className={cx('bg-[#EFF4F8] dark:bg-[#0F1F2E]/60 text-foreground', isFullscreen ? 'fixed inset-0 z-[9999] overflow-hidden p-0' : 'min-h-screen')}>
            <style>{`
                .jagasleman-map-shell .leaflet-control-zoom {
                    display: none !important;
                }

                .jagasleman-map-shell .leaflet-control-layers {
                    border: 0 !important;
                    border-radius: 18px !important;
                    box-shadow: 0 16px 38px rgba(15, 23, 42, 0.16) !important;
                    overflow: hidden !important;
                }

                .jagasleman-map-shell .leaflet-control-layers-toggle {
                    width: 42px !important;
                    height: 42px !important;
                    background-size: 18px 18px !important;
                }

                .jagasleman-map-shell .leaflet-control-layers-expanded {
                    padding: 12px !important;
                    min-width: 178px !important;
                    font: 700 12px/1.4 system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
                    color: #334155 !important;
                }

                .jagasleman-map-shell .leaflet-popup-content-wrapper {
                    border-radius: 22px !important;
                    box-shadow: 0 24px 60px rgba(15, 23, 42, 0.24) !important;
                }

                .jagasleman-map-shell .leaflet-popup-content {
                    margin: 0 !important;
                }

                .jagasleman-map-shell .leaflet-container {
                    font-family: inherit;
                    background: #e2e8f0;
                }
            `}</style>

            <div className={cx('mx-auto w-full', isFullscreen ? 'h-screen max-w-none p-0' : 'max-w-[1560px] px-4 py-5 sm:px-6 lg:px-8')}>
                {!isFullscreen && (
                    <header className="mb-5 flex flex-col gap-4 rounded-[2rem] border border-white bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
                        <div className="max-w-3xl">
                            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#EFF4F8] px-3 py-1.5 text-xs font-black text-[#1A3348]">
                                <Target className="h-4 w-4" />
                                Analisis Peta Kejahatan Jalanan
                            </div>

                            <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                                Peta Hotspot JagaSleman
                            </h1>

                            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                                Pantau titik kejadian, pola kerawanan, dan laporan terbaru dalam satu tampilan peta yang ringkas.
                            </p>
                        </div>

                        <div className="grid grid-cols-3 gap-2 sm:min-w-[420px]">
                            <div className="rounded-2xl bg-slate-950 p-3 text-white">
                                <p className="text-[11px] font-bold text-white/55">Data aktif</p>
                                <p className="mt-1 text-xl font-black">{formatNumber(filteredIncidents.length)}</p>
                            </div>

                            <div className="rounded-2xl border border-[#D8E4ED] bg-white dark:border-white/10 dark:bg-[#1A3348] p-3">
                                <p className="text-[11px] font-black text-slate-400">Kecamatan</p>
                                <p className="mt-1 text-xl font-black text-foreground">{formatNumber(kecamatanStats.length)}</p>
                            </div>

                            <div className={cx('rounded-2xl border p-3', riskTone.className)}>
                                <p className="text-[11px] font-black opacity-70">Status</p>
                                <p className="mt-1 text-sm font-black leading-5">{riskTone.label}</p>
                            </div>
                        </div>
                    </header>
                )}

                <section className={cx('grid gap-5', isFullscreen ? 'h-screen grid-cols-1' : 'grid-cols-1')}>
                    <div
                        className={cx(
                            'jagasleman-map-shell relative overflow-hidden border border-[#D8E4ED] bg-white dark:border-white/10 dark:bg-[#1A3348] shadow-xl shadow-slate-950/8',
                            isFullscreen ? 'h-screen rounded-none border-0' : 'h-[calc(100vh-210px)] min-h-[640px] rounded-[2rem]',
                        )}
                    >
                        <MapView
                            ref={mapRef}
                            center={SLEMAN_CENTER}
                            zoom={DEFAULT_ZOOM}
                            incidents={mapIncidents as any}
                            contacts={[]}
                            showHeatmap={showKde}
                            heatmapBandwidthKm={KDE_BANDWIDTH_KM}
                            hotspotClusters={[]}
                            userLocation={userLocation}
                            showDistrictBoundary={showDistrict}
                            fitDistrictBoundary
                            showVillageBoundary={false}
                            villageBoundaryInteractive={false}
                        />

                        <div className="pointer-events-none absolute inset-x-4 top-4 z-[640] flex flex-wrap items-start justify-between gap-3">
                            <div className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-[1.35rem] border border-white/80 bg-white/95 p-2 shadow-xl shadow-slate-950/12 backdrop-blur-xl">
                                <SmallButton onClick={zoomIn} title="Perbesar peta">
                                    <Plus className="h-4 w-4" />
                                </SmallButton>

                                <SmallButton onClick={zoomOut} title="Perkecil peta">
                                    <Minus className="h-4 w-4" />
                                </SmallButton>

                                <SmallButton onClick={fitSleman} title="Kembali ke Sleman">
                                    <Crosshair className="h-4 w-4" />
                                </SmallButton>

                                <SmallButton onClick={locateUser} active={Boolean(userLocation)} title="Lokasi Saya">
                                    <LocateFixed className={cx('h-4 w-4', isLocating && 'animate-pulse')} />
                                </SmallButton>

                                <SmallButton onClick={() => setIsFullscreen((value) => !value)} active={isFullscreen} title="Fullscreen">
                                    {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                                </SmallButton>
                            </div>

                            <div className="pointer-events-auto hidden items-center gap-2 rounded-[1.35rem] border border-white/80 bg-white/95 p-2 shadow-xl shadow-slate-950/12 backdrop-blur-xl md:flex">
                                <button
                                    type="button"
                                    onClick={() => setShowKde((value) => !value)}
                                    className={cx(
                                        'inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-black transition',
                                        showKde ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-500',
                                    )}
                                >
                                    {showKde ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                    KDE
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setShowIncident((value) => !value)}
                                    className={cx(
                                        'inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-black transition',
                                        showIncident ? 'bg-[#EFF4F8] text-[#1A3348]' : 'bg-slate-100 text-slate-500',
                                    )}
                                >
                                    {showIncident ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                    Titik
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setShowDistrict((value) => !value)}
                                    className={cx(
                                        'inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-black transition',
                                        showDistrict ? 'bg-[#EFF4F8] text-[#D95F5F]' : 'bg-slate-100 text-slate-500',
                                    )}
                                >
                                    {showDistrict ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                    Batas
                                </button>
                            </div>
                        </div>

                        {userRiskInfo && (
                            <div
                                className={cx(
                                    'absolute left-4 top-[86px] z-[645] max-w-[430px] rounded-[1.6rem] border p-4 shadow-2xl backdrop-blur-xl',
                                    userRiskInfo.status === 'rawan'
                                        ? 'border-red-200 bg-red-50/95 text-red-900 shadow-red-950/10 dark:border-red-400/25 dark:bg-red-950/80 dark:text-red-50'
                                        : userRiskInfo.status === 'waspada'
                                          ? 'border-[#D8E4ED] bg-[#EFF4F8]/95 text-[#0F1F2E] shadow-amber-950/10 dark:border-[#D95F5F]/25 dark:bg-amber-950/80 dark:text-amber-50'
                                          : 'border-[#D8E4ED] bg-[#EFF4F8]/95 text-[#0F1F2E] shadow-emerald-950/10 dark:border-[#D95F5F]/25 dark:bg-emerald-950/80 dark:text-[#EFF4F8]',
                                )}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-current dark:bg-white/10">
                                        {userRiskInfo.status === 'aman' ? <Shield className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                                    </div>

                                    <div className="min-w-0">
                                        <p className="text-sm font-black">{userRiskInfo.title}</p>
                                        <p className="mt-1 text-xs font-semibold leading-5 opacity-80">{userRiskInfo.message}</p>

                                        <div className="mt-3 grid gap-2 text-[11px] font-black sm:grid-cols-2">
                                            <div className="rounded-xl bg-white/65 px-3 py-2 dark:bg-white/10">
                                                <span className="block opacity-60">Jarak zona</span>
                                                <span>
                                                    {userRiskInfo.nearestZone
                                                        ? userRiskInfo.nearestZone.inside
                                                            ? `Di dalam zona · pusat ${formatDistance(userRiskInfo.nearestZone.centerDistanceKm)}`
                                                            : formatDistance(userRiskInfo.nearestZone.distanceToZoneKm)
                                                        : '-'}
                                                </span>
                                            </div>

                                            <div className="rounded-xl bg-white/65 px-3 py-2 dark:bg-white/10">
                                                <span className="block opacity-60">Titik terdekat</span>
                                                <span>{formatDistance(userRiskInfo.nearestIncident?.distanceKm ?? Number.NaN)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {!controlOpen && (
                            <button
                                type="button"
                                onClick={() => setControlOpen(true)}
                                className="absolute right-4 top-[86px] z-[650] hidden items-center gap-2 rounded-2xl border border-white/80 bg-white/95 px-4 py-3 text-sm font-black text-slate-700 shadow-2xl shadow-slate-950/14 backdrop-blur-xl transition hover:bg-[#EFF4F8] dark:bg-[#0F1F2E]/60 lg:inline-flex"
                            >
                                <SlidersHorizontal className="h-4 w-4 text-[#D95F5F]" />
                                Kontrol Peta
                            </button>
                        )}

                        {controlOpen && (
                            <aside className="absolute right-4 top-[86px] z-[650] hidden w-[348px] max-w-[calc(100%-2rem)] lg:block">
                                <div className="max-h-[calc(100vh-7.6rem)] overflow-y-auto rounded-[1.8rem] border border-white/80 bg-white/95 p-3 shadow-2xl shadow-slate-950/16 backdrop-blur-xl">
                                    <div className="mb-3 flex items-start justify-between gap-3 rounded-[1.45rem] bg-slate-950 px-4 py-3 text-white">
                                        <div>
                                            <p className="text-sm font-black">Kontrol Peta</p>
                                            <p className="mt-1 text-[11px] font-semibold leading-4 text-white/60">
                                                Layer, filter, dan ringkasan analisis.
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => setControlOpen(false)}
                                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>

                                    {controlContent}
                                </div>
                            </aside>
                        )}

                        <button
                            type="button"
                            onClick={() => setMobileControlOpen(true)}
                            className="absolute bottom-4 right-4 z-[650] inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-2xl shadow-slate-950/20 lg:hidden"
                        >
                            <SlidersHorizontal className="h-4 w-4" />
                            Kontrol
                        </button>

                        <div className="absolute bottom-4 left-4 z-[630] hidden max-w-[430px] rounded-[1.6rem] border border-white/80 bg-white/95 p-3 shadow-xl shadow-slate-950/12 backdrop-blur-xl md:block">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                                    <Flame className="h-5 w-5" />
                                </div>

                                <div className="min-w-0">
                                    <p className="text-sm font-black text-foreground">
                                        {formatNumber(filteredIncidents.length)} titik dianalisis
                                    </p>
                                    <p className="truncate text-xs font-semibold text-slate-500">
                                        Dominan: {dominantKecamatan} · {dominantType}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="absolute bottom-4 left-1/2 z-[630] hidden -translate-x-1/2 rounded-[1.35rem] border border-white/80 bg-white/95 p-2 shadow-xl shadow-slate-950/12 backdrop-blur-xl xl:block">
                            <div className="flex items-center gap-2">
                                {KDE_LEGEND_UI.map((item) => (
                                    <div key={item.intensity} className="flex items-center gap-1.5 rounded-xl px-2 py-1">
                                        <span className="h-2.5 w-8 rounded-full" style={{ backgroundColor: item.color }} />
                                        <span className="text-[11px] font-black text-slate-600">{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {reportError && (
                            <div className="absolute left-4 top-[86px] z-[640] max-w-sm rounded-2xl border border-[#D8E4ED] bg-[#EFF4F8] p-3 text-xs font-bold leading-5 text-[#0F1F2E] shadow-xl">
                                {reportError}
                            </div>
                        )}
                    </div>

                    {!isFullscreen && (
                        <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
                            <section className="space-y-5">
                                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                    <StatCard
                                        title="Total Titik"
                                        value={formatNumber(filteredIncidents.length)}
                                        subtitle="Data sesuai filter aktif"
                                        icon={<MapPin className="h-5 w-5" />}
                                        tone="cyan"
                                    />

                                    <StatCard
                                        title="Data Polisi"
                                        value={formatNumber(sourceStats.dummy)}
                                        subtitle="Rekaman historis 2020–2025"
                                        icon={<Database className="h-5 w-5" />}
                                        tone="slate"
                                    />

                                    <StatCard
                                        title="Laporan Warga"
                                        value={formatNumber(sourceStats.report)}
                                        subtitle={loadingReports ? 'Sedang memuat data...' : 'Data dari form laporan'}
                                        icon={<Shield className="h-5 w-5" />}
                                        tone="emerald"
                                    />

                                    <StatCard
                                        title="Hotspot"
                                        value={formatNumber(kdeZones.length)}
                                        subtitle="Zona konsentrasi KDE"
                                        icon={<Flame className="h-5 w-5" />}
                                        tone="rose"
                                    />
                                </div>

                                <div className="rounded-[2rem] border border-[#D8E4ED] bg-white dark:border-white/10 dark:bg-[#1A3348] p-4 shadow-sm">
                                    <button
                                        type="button"
                                        onClick={() => setTableOpen((value) => !value)}
                                        className="flex w-full items-center justify-between gap-3 text-left"
                                    >
                                        <PanelTitle
                                            title="Daftar Kejadian"
                                            subtitle="Data dibuat ringkas agar halaman tidak terasa penuh"
                                            icon={<Table2 className="h-5 w-5" />}
                                        />

                                        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                                            {tableOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                                        </span>
                                    </button>

                                    {tableOpen && (
                                        <div className="mt-4 space-y-4">
                                            <div className="grid gap-3 rounded-3xl border border-[#D8E4ED] bg-[#EFF4F8] p-3 dark:border-white/10 dark:bg-[#0F1F2E]/65 md:grid-cols-[1fr_auto_auto] md:items-end">
                                                <SelectField
                                                    label="Filter tahun daftar"
                                                    value={selectedTableYear}
                                                    onChange={setSelectedTableYear}
                                                    options={tableYearOptions}
                                                />

                                                <SelectField
                                                    label="Tampilkan"
                                                    value={String(tablePageSize)}
                                                    onChange={(value) => setTablePageSize(Number(value) as TablePageSize)}
                                                    options={tablePageSizeOptions}
                                                />

                                                <div className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#0F1F2E] shadow-sm dark:bg-[#1A3348] dark:text-[#EFF4F8]">
                                                    {tableStartNumber}-{tableEndNumber}
                                                    <span className="ml-1 text-[#1A3348]/60 dark:text-[#EFF4F8]/60">
                                                        dari {formatNumber(tableIncidents.length)} data
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="overflow-hidden rounded-3xl border border-[#D8E4ED] bg-white shadow-sm dark:border-white/10 dark:bg-[#1A3348]">
                                                <div className="overflow-x-auto">
                                                    <table className="min-w-full divide-y divide-[#D8E4ED] text-left text-sm dark:divide-white/10">
                                                        <thead className="bg-[#EFF4F8] text-[11px] uppercase tracking-[0.14em] text-[#1A3348]/70 dark:bg-[#0F1F2E]/80 dark:text-[#EFF4F8]/70">
                                                            <tr>
                                                                <th className="px-4 py-3 font-black">Jenis</th>
                                                                <th className="px-4 py-3 font-black">Waktu</th>
                                                                <th className="px-4 py-3 font-black">Kecamatan</th>
                                                                <th className="px-4 py-3 font-black">Lokasi</th>
                                                                <th className="px-4 py-3 font-black">Sumber</th>
                                                            </tr>
                                                        </thead>

                                                        <tbody className="divide-y divide-[#D8E4ED] bg-white dark:divide-white/10 dark:bg-[#1A3348]">
                                                            {paginatedTableIncidents.map((incident) => {
                                                                const type = getIncidentType(incident);
                                                                const color = getIncidentColor(type);

                                                                return (
                                                                    <tr
                                                                        key={incident.id}
                                                                        onClick={() => zoomToIncident(incident)}
                                                                        className="cursor-pointer transition hover:bg-[#EFF4F8] dark:hover:bg-[#0F1F2E]/70"
                                                                    >
                                                                        <td className="px-4 py-3">
                                                                            <div className="flex min-w-[160px] items-center gap-2">
                                                                                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                                                                                <span className="font-black text-[#0F1F2E] dark:text-[#EFF4F8]">
                                                                                    {getIncidentTypeLabel(type)}
                                                                                </span>
                                                                            </div>
                                                                        </td>

                                                                        <td className="whitespace-nowrap px-4 py-3 font-semibold text-[#1A3348]/75 dark:text-[#EFF4F8]/75">
                                                                            {incident.date || '-'} · {incident.time || '-'}
                                                                        </td>

                                                                        <td className="whitespace-nowrap px-4 py-3 font-black text-[#1A3348] dark:text-[#EFF4F8]">
                                                                            {titleCase(getIncidentKecamatan(incident))}
                                                                        </td>

                                                                        <td className="max-w-[280px] px-4 py-3 font-semibold text-[#1A3348]/70 dark:text-[#EFF4F8]/70">
                                                                            <span className="line-clamp-2">{incident.location || '-'}</span>
                                                                        </td>

                                                                        <td className="whitespace-nowrap px-4 py-3">
                                                                            <span
                                                                                className={cx(
                                                                                    'rounded-full px-2.5 py-1 text-xs font-black',
                                                                                    incident.source === 'report'
                                                                                        ? 'bg-[#D95F5F]/15 text-[#1B7A5E] dark:bg-[#D95F5F]/20 dark:text-[#B9F4DC]'
                                                                                        : 'bg-[#EFF4F8] text-[#D95F5F] dark:bg-[#0F1F2E]/70 dark:text-[#BBD9F2]',
                                                                                )}
                                                                            >
                                                                                {incident.source === 'report' ? 'Laporan' : 'Polisi'}
                                                                            </span>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}

                                                            {!tableIncidents.length && (
                                                                <tr>
                                                                    <td colSpan={5} className="px-4 py-8 text-center text-sm font-semibold text-[#1A3348]/70 dark:text-[#EFF4F8]/70">
                                                                        Tidak ada data pada filter ini.
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-3 rounded-3xl border border-[#D8E4ED] bg-white p-3 dark:border-white/10 dark:bg-[#1A3348] sm:flex-row sm:items-center sm:justify-between">
                                                <p className="text-xs font-bold text-[#1A3348]/70 dark:text-[#EFF4F8]/65">
                                                    Halaman {currentTablePage} dari {totalTablePages}. Klik baris untuk fokus ke titik kejadian di peta.
                                                </p>

                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setTablePage((page) => Math.max(1, page - 1))}
                                                        disabled={currentTablePage <= 1}
                                                        className="rounded-2xl border border-[#D8E4ED] px-4 py-2 text-xs font-black text-[#1A3348] transition hover:bg-[#EFF4F8] disabled:cursor-not-allowed disabled:opacity-45 dark:border-white/10 dark:text-[#EFF4F8] dark:hover:bg-white/10"
                                                    >
                                                        Sebelumnya
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => setTablePage((page) => Math.min(totalTablePages, page + 1))}
                                                        disabled={currentTablePage >= totalTablePages}
                                                        className="rounded-2xl bg-[#D95F5F] px-4 py-2 text-xs font-black text-white transition hover:bg-[#1A3348] disabled:cursor-not-allowed disabled:opacity-45 dark:bg-[#D95F5F] dark:text-[#0F1F2E] dark:hover:bg-[#EFF4F8]"
                                                    >
                                                        Berikutnya
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>                            <aside className="space-y-5">
                                <div className="rounded-[2rem] border border-[#D8E4ED] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1A3348]">
                                    <PanelTitle title="Panduan Peta Interaktif" subtitle="Fitur inti untuk membaca area rawan" icon={<Shield className="h-5 w-5" />} />

                                    <div className="mt-4 grid gap-3">
                                        {[
                                            { label: 'Basemap modern', desc: 'Pilih Dark, Google Hybrid, atau Jalan Detail dari tombol layer di dalam peta.' },
                                            { label: 'Hover batas kecamatan', desc: 'Arahkan mouse ke batas admin untuk melihat nama kecamatan.' },
                                            { label: 'Cek posisi saya', desc: 'Klik Lokasi Saya untuk melihat jarak dari area rawan dan titik kejadian terdekat.' },
                                        ].map((item, index) => (
                                            <div key={item.label} className="rounded-2xl bg-[#EFF4F8] p-4 dark:bg-[#0F1F2E]/65">
                                                <div className="flex items-start gap-3">
                                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#D95F5F] text-xs font-black text-white dark:bg-[#D95F5F] dark:text-[#0F1F2E]">
                                                        {index + 1}
                                                    </span>
                                                    <div>
                                                        <p className="text-sm font-black text-[#0F1F2E] dark:text-[#EFF4F8]">{item.label}</p>
                                                        <p className="mt-1 text-xs font-semibold leading-relaxed text-[#1A3348]/75 dark:text-[#EFF4F8]/70">{item.desc}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </aside>
                        </div>
                    )}
                </section>
            </div>

            {mobileControlOpen && (
                <div className="fixed inset-0 z-[10000] bg-slate-950/45 p-4 backdrop-blur-sm lg:hidden">
                    <div className="ml-auto flex h-full max-w-md flex-col rounded-[2rem] bg-white p-4 shadow-2xl">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                                <p className="text-base font-black text-foreground">Kontrol Peta</p>
                                <p className="text-xs font-semibold text-slate-500">Atur layer, filter, dan analisis.</p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setMobileControlOpen(false)}
                                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto pr-1">{controlContent}</div>
                    </div>
                </div>
            )}
        </main>
    );
}
