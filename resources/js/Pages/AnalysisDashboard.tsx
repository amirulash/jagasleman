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
import { JagaPageHero } from '@/Components/JagaPageHero';
import { batasKecamatanGeojson } from '@/data/districtBoundaryGeojson';

type SourceFilter = 'all' | 'dummy' | 'report';
type PeriodFilter = 'all' | '7d' | '30d' | '90d' | '2025' | '2024' | '2023' | '2022' | '2021' | '2020';
type ControlTab = 'layer' | 'filter';
type KdeLayerMode = 'official' | 'automatic' | 'none';
type TablePageSize = 5 | 10 | 25 | 50;

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
    photo_url?: string | null;
    image_url?: string | null;
    imageUrl?: string | null;
    photoUrls?: string[];
    photo_urls?: string[];
    photos?: any[];
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
    { label: 'Sangat Rendah', range: 'Konsentrasi sangat rendah', color: '#22C55E', intensity: 'very-low' },
    { label: 'Rendah', range: 'Area relatif rendah', color: '#A3E635', intensity: 'low' },
    { label: 'Sedang', range: 'Perlu dipantau', color: '#FACC15', intensity: 'medium' },
    { label: 'Tinggi', range: 'Area rawan', color: '#F97316', intensity: 'high' },
    { label: 'Sangat Tinggi', range: 'Prioritas utama', color: '#E11D48', intensity: 'very-high' },
];

const KDE_AUTOMATIC_LEGEND_UI = [
    { label: 'Kepadatan Tipis', color: '#22C55E', intensity: 'auto-very-low' },
    { label: 'Kepadatan Rendah', color: '#A3E635', intensity: 'auto-low' },
    { label: 'Kepadatan Sedang', color: '#FACC15', intensity: 'auto-medium' },
    { label: 'Kepadatan Pekat', color: '#F97316', intensity: 'auto-high' },
    { label: 'Kepadatan Terpekat', color: '#E11D48', intensity: 'auto-very-high' },
];

const KDE_LAYER_OPTIONS: Array<{ value: KdeLayerMode; label: string; note: string }> = [
    {
        value: 'official',
        label: 'Daerah Rawan 2020–2025',
        note: 'Peta daerah rawan berdasarkan data kejadian 2020–2025.',
    },
    {
        value: 'automatic',
        label: 'Kepadatan Otomatis',
        note: 'Peta kepadatan kejadian yang berubah mengikuti filter data aktif.',
    },
    {
        value: 'none',
        label: 'Tanpa Kepadatan',
        note: 'Tampilkan peta titik dan batas wilayah saja.',
    },
];

const SLEMAN_KECAMATAN = [
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
    { value: 'dummy', label: 'Data Kepolisian' },
    { value: 'report', label: 'Laporan Masyarakat' },
];

const tablePageSizeOptions: Array<{ value: string; label: string }> = [
    { value: '5', label: '5 kejadian' },
    { value: '10', label: '10 kejadian' },
    { value: '25', label: '25 kejadian' },
    { value: '50', label: '50 kejadian' },
];

const crimePalette: Record<string, { color: string; bg: string; label: string; weight: number }> = {
    PENGEROYOKAN: {
        color: '#EF4444',
        bg: '#FEE2E2',
        label: 'Pengeroyokan',
        weight: 1.25,
    },
    PENGRUSAKAN: {
        color: '#F97316',
        bg: '#FFEDD5',
        label: 'Pengrusakan',
        weight: 1.05,
    },
    PENGANIAYAAN: {
        color: '#EC4899',
        bg: '#FCE7F3',
        label: 'Penganiayaan',
        weight: 1.2,
    },
    'PENYALAHGUNAAN SENJATA TAJAM': {
        color: '#F2A20B',
        bg: '#FEF3C7',
        label: 'Senjata Tajam',
        weight: 1.45,
    },
    'PENCURIAN DENGAN KEKERASAN (CURAS)': {
        color: '#A855F7',
        bg: '#F3E8FF',
        label: 'Curas',
        weight: 1.4,
    },
    'PEMERASAN DAN PENGANCAMAN': {
        color: '#06B6D4',
        bg: '#CFFAFE',
        label: 'Pemerasan',
        weight: 1.15,
    },
};

const fallbackIncidentColors = ['#14B8A6', '#F97316', '#22C55E', '#E11D48', '#A855F7', '#06B6D4', '#F2A20B', '#EF4444'];

function getStableIncidentColor(value: string) {
    const text = String(value || 'Kejadian');
    const sum = Array.from(text).reduce((total, char) => total + char.charCodeAt(0), 0);
    return fallbackIncidentColors[sum % fallbackIncidentColors.length];
}

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
    const props = incident?.properties || {};

    return String(
        incident?.rawKategori ||
            incident?.kategori ||
            incident?.crime_type ||
            incident?.incident_type ||
            incident?.type ||
            props?.rawKategori ||
            props?.kategori ||
            props?.KATEGORI ||
            props?.jenis_kejadian ||
            props?.JENIS_KEJADIAN ||
            props?.jenis ||
            props?.JENIS ||
            props?.kejadian ||
            props?.KEJADIAN ||
            'Kejadian',
    ).trim();
}

function getIncidentTypeLabel(type: string) {
    return crimePalette[type]?.label || titleCase(type);
}

function getIncidentColor(type: string) {
    return crimePalette[type]?.color || crimePalette[getIncidentTypeLabel(type)]?.color || getStableIncidentColor(type);
}

function analysisPointInRing(lng: number, lat: number, ring: any[]) {
    let inside = false;

    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = Number(ring[i]?.[0]);
        const yi = Number(ring[i]?.[1]);
        const xj = Number(ring[j]?.[0]);
        const yj = Number(ring[j]?.[1]);

        if (!Number.isFinite(xi) || !Number.isFinite(yi) || !Number.isFinite(xj) || !Number.isFinite(yj)) {
            continue;
        }

        const intersect = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi || 1e-12) + xi;

        if (intersect) inside = !inside;
    }

    return inside;
}

function analysisPointInPolygon(lng: number, lat: number, polygon: any[]) {
    if (!Array.isArray(polygon) || !polygon.length) return false;

    const outerRing = polygon[0];

    if (!analysisPointInRing(lng, lat, outerRing)) return false;

    for (let i = 1; i < polygon.length; i++) {
        if (analysisPointInRing(lng, lat, polygon[i])) return false;
    }

    return true;
}

function analysisGeometryContainsPoint(geometry: any, lat: number, lng: number) {
    if (!geometry) return false;

    if (geometry.type === 'Polygon') {
        return analysisPointInPolygon(lng, lat, geometry.coordinates);
    }

    if (geometry.type === 'MultiPolygon') {
        return geometry.coordinates.some((polygon: any[]) => analysisPointInPolygon(lng, lat, polygon));
    }

    return false;
}

function getKecamatanByCoordinate(lat: number, lng: number) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return '';

    try {
        const features = (batasKecamatanGeojson as any)?.features || [];
        const match = features.find((feature: any) => analysisGeometryContainsPoint(feature?.geometry, lat, lng));
        const props = match?.properties || {};

        return String(props.wadmkc || props.WADMKC || props.kecamatan || props.KECAMATAN || props.nama_kecamatan || '').trim();
    } catch {
        return '';
    }
}

function getIncidentKecamatan(incident: any) {
    const props = incident?.properties || {};
    const coordinates = incident?.geometry?.coordinates;
    const geoLng = Array.isArray(coordinates) ? coordinates[0] : undefined;
    const geoLat = Array.isArray(coordinates) ? coordinates[1] : undefined;
    const lat = Number(incident?.lat ?? incident?.latitude ?? props?.lat ?? props?.latitude ?? props?.LAT ?? props?.Latitude ?? geoLat);
    const lng = Number(incident?.lng ?? incident?.longitude ?? incident?.lon ?? props?.lng ?? props?.longitude ?? props?.LNG ?? props?.Longitude ?? geoLng);
    const spatialKecamatan = getKecamatanByCoordinate(lat, lng);

    return String(
        spatialKecamatan ||
            incident?.kecamatan_final ||
            props?.kecamatan_final ||
            incident?.kecamatan ||
            props?.kecamatan ||
            incident?.district ||
            props?.district ||
            incident?.wilayah ||
            props?.wilayah ||
            '-'
    ).trim() || '-';
}

function getIncidentDesa(incident: any) {
    return String(incident?.desa || incident?.village || '-').trim() || '-';
}

function getIncidentPhotoUrls(incident: any): string[] {
    const rawList = incident?.photo_urls ?? incident?.photoUrls ?? incident?.photos ?? incident?.images ?? [];
    const urls: string[] = [];

    if (Array.isArray(rawList)) {
        rawList.forEach((entry: any) => {
            const value = typeof entry === 'string'
                ? entry
                : entry?.photo_url ?? entry?.photoUrl ?? entry?.url ?? entry?.image_url ?? entry?.photo_path ?? entry?.path;

            if (value) urls.push(String(value));
        });
    }

    const primary =
        incident?.photo_url ||
        incident?.photoUrl ||
        incident?.image_url ||
        incident?.imageUrl ||
        incident?.attachment_url ||
        incident?.attachmentUrl ||
        incident?.evidence_url ||
        incident?.evidenceUrl ||
        null;

    if (primary) urls.unshift(String(primary));

    return Array.from(new Set(urls.filter(Boolean)));
}

function getIncidentPrimaryPhoto(incident: any) {
    return getIncidentPhotoUrls(incident)[0] ?? null;
}

function getIncidentAddress(incident: any) {
    return String(incident?.location || incident?.address || incident?.alamat || incident?.alamat_kejadian || '-').trim() || '-';
}

function getIncidentShortDescription(incident: any) {
    return String(incident?.description || incident?.deskripsi || incident?.keterangan || incident?.KETERANGAN || '-').trim() || '-';
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
    const props = item?.properties || {};
    const coordinates = item?.geometry?.coordinates;
    const geoLng = Array.isArray(coordinates) ? coordinates[0] : undefined;
    const geoLat = Array.isArray(coordinates) ? coordinates[1] : undefined;

    const lat = Number(item?.lat ?? item?.latitude ?? props?.lat ?? props?.latitude ?? props?.LAT ?? props?.Latitude ?? geoLat);
    const lng = Number(item?.lng ?? item?.longitude ?? item?.lon ?? props?.lng ?? props?.longitude ?? props?.LNG ?? props?.Longitude ?? geoLng);

    if (!inSlemanBounds(lat, lng)) return null;

    const merged = { ...props, ...item, lat, lng, latitude: lat, longitude: lng };
    const type = getIncidentType(merged);

    return {
        ...merged,
        id: item?.id ?? props?.id ?? props?.ID ?? `${source}-${lat}-${lng}-${type}`,
        date: String(item?.date || item?.incident_date || item?.incident_at || item?.created_at || props?.date || props?.tanggal || props?.TANGGAL || '-'),
        time: String(item?.time || item?.incident_time || props?.time || props?.jam || props?.WAKTU || '-'),
        type,
        kategori: type,
        rawKategori: type,
        reportCode: String(item?.reportCode || item?.report_code || item?.kode_laporan || props?.reportCode || props?.report_code || props?.kode_laporan || ''),
        description: String(item?.description || item?.deskripsi || item?.keterangan || props?.description || props?.deskripsi || props?.keterangan || props?.KETERANGAN || '-'),
        location: String(item?.location || item?.address || item?.alamat || props?.location || props?.alamat || props?.LOKASI || '-'),
        address: String(item?.address || item?.alamat || item?.location || props?.address || props?.alamat || props?.LOKASI || '-'),
        photoUrl: item?.photoUrl || item?.photo_url || item?.image_url || item?.imageUrl || props?.photoUrl || props?.photo_url || props?.image_url || null,
        photo_url: item?.photo_url || props?.photo_url || null,
        image_url: item?.image_url || props?.image_url || null,
        photoUrls: item?.photoUrls || item?.photo_urls || item?.photos || props?.photoUrls || props?.photo_urls || props?.photos || [],
        photo_urls: item?.photo_urls || props?.photo_urls || [],
        photos: item?.photos || props?.photos || [],
        status: item?.status || props?.status || 'Aktif',
        kecamatan: getIncidentKecamatan(merged),
        desa: getIncidentDesa(merged),
        lat,
        lng,
        latitude: lat,
        longitude: lng,
        source,
        severity: Number(item?.severity || props?.severity || crimePalette[type]?.weight || 1),
    };
}

function getIncidentSourceKey(incident: DashboardIncident | any): 'dummy' | 'report' {
    const props = incident?.properties || {};
    const source = String(incident?.source ?? props?.source ?? '').toLowerCase().trim();
    const code = String(
        incident?.reportCode ??
        incident?.report_code ??
        incident?.kode_laporan ??
        props?.reportCode ??
        props?.report_code ??
        props?.kode_laporan ??
        '',
    ).toUpperCase();

    const hasCommunityIdentity = Boolean(
        incident?.is_public_report ||
        incident?.public_report ||
        incident?.reporterName ||
        incident?.reporter_name ||
        incident?.reporterPhone ||
        incident?.reporter_phone ||
        incident?.reporterEmail ||
        incident?.reporter_email ||
        props?.is_public_report ||
        props?.reporter_name ||
        props?.reporter_phone ||
        props?.reporter_email ||
        code.startsWith('LAP-') ||
        code.startsWith('JGS-')
    );

    if (['report', 'community', 'pelaporan', 'masyarakat', 'database'].includes(source) || hasCommunityIdentity) {
        return 'report';
    }

    return 'dummy';
}

function isCommunityReportIncident(incident: DashboardIncident | any) {
    return getIncidentSourceKey(incident) === 'report';
}

function isPoliceDatasetIncident(incident: DashboardIncident | any) {
    return getIncidentSourceKey(incident) === 'dummy';
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
            className: 'bg-[#F2FAF6] text-[#F47B52] border-[#BDE7E1]',
        };
    }

    return {
        label: 'Relatif Terkendali',
        className: 'bg-[#F2FAF6] text-[#F47B52] border-[#BDE7E1]',
    };
}

function SmallButton({
    children,
    active,
    onClick,
    title,
    label,
    iconOnly = false,
}: {
    children: ReactNode;
    active?: boolean;
    onClick?: () => void;
    title?: string;
    label?: string;
    iconOnly?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={title}
            aria-label={title || label}
            className={cx(
                'inline-flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-2xl border text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md',
                iconOnly ? 'w-10 px-0' : 'px-2.5',
                active ? 'border-[#0FA3A0] bg-[#E9F8F3] text-[#0B6E78] ring-2 ring-[#0FA3A0]/20' : 'border-slate-200 bg-white hover:bg-[#F2FAF6]',
            )}
        >
            {children}
            {label && !iconOnly && <span className="truncate text-[10px] font-black text-current sm:text-[11px]">{label}</span>}
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
                    className="h-11 w-full appearance-none rounded-2xl border border-[#BDE7E1] bg-white px-3 pr-9 text-sm font-bold text-[#07324A] outline-none transition focus:border-[#F47B52] focus:ring-4 focus:ring-[#F47B52]/20 dark:border-white/10 dark:bg-[#07324A] dark:text-[#F2FAF6] dark:focus:border-[#F47B52] dark:focus:ring-[#F47B52]/15"
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
                'flex w-full items-center gap-3 rounded-2xl border p-3 text-left text-[#07324A] transition hover:-translate-y-0.5 hover:shadow-md',
                checked
                    ? 'border-[#0FA3A0]/35 bg-[#F2FAF6] shadow-sm'
                    : 'border-[#BDE7E1] bg-white hover:border-[#0FA3A0]/45 hover:bg-[#F8FCFA]',
            )}
        >
            <span
                className={cx(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ring-1 transition',
                    checked
                        ? 'bg-[#F47B52] text-white ring-[#F47B52]/25'
                        : 'bg-[#F2FAF6] text-[#0B6E78] ring-[#BDE7E1]',
                )}
            >
                {icon}
            </span>

            <span className="min-w-0 flex-1">
                <span className="block text-sm font-black text-[#07324A]">{title}</span>
                <span className="mt-0.5 block text-xs font-semibold leading-4 text-[#385B64]">{subtitle}</span>
            </span>

            <span className={cx('relative h-6 w-11 shrink-0 rounded-full border transition', checked ? 'border-[#F47B52] bg-[#F47B52]' : 'border-[#BDE7E1] bg-[#EAF7F4]')}>
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
        cyan: 'bg-[#FFF5EF] text-[#C96B4B] border-[#F3D8C9]',
        rose: 'bg-[#FFF1F1] text-[#C15454] border-[#F1CDCD]',
        amber: 'bg-[#FFF8ED] text-[#C67B18] border-[#F4DFC2]',
        emerald: 'bg-[#F2FAF6] text-[#2F8F67] border-[#D6EEE6]',
        slate: 'bg-[#F7F4EF] dark:bg-[#07324A]/60 text-slate-700 border-[#E7DDD2]',
    }[tone];

    return (
        <div className="rounded-[1.6rem] border border-[#BDE7E1] bg-white dark:border-white/10 dark:bg-[#07324A] p-4 shadow-sm">
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
    const [activeTableSource, setActiveTableSource] = useState<'dummy' | 'report'>('dummy');
    const [searchQuery, setSearchQuery] = useState('');

    const [showIncident, setShowIncident] = useState(true);
    const [kdeLayerMode, setKdeLayerMode] = useState<KdeLayerMode>('official');
    const [showDistrict, setShowDistrict] = useState(true);
    const [controlOpen, setControlOpen] = useState(false);
    const [layerSectionOpen, setLayerSectionOpen] = useState(true);
    const [legendSectionOpen, setLegendSectionOpen] = useState(true);
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

    const policeIncidents = useMemo(() => {
        return (dummyIncidents || [])
            .map((item: any) => normalizeIncident(item, 'dummy'))
            .filter((item): item is DashboardIncident => Boolean(item))
            .filter(isPoliceDatasetIncident)
            .map((item) => ({ ...item, source: 'dummy' as const }));
    }, []);

    const communityIncidents = useMemo(() => {
        return (reportIncidents || [])
            .map((item: any) => normalizeIncident(item, 'report'))
            .filter((item): item is DashboardIncident => Boolean(item))
            .map((item) => ({ ...item, source: 'report' as const }));
    }, [reportIncidents]);

    const allIncidents = useMemo(() => {
        return [...policeIncidents, ...communityIncidents].sort(sortByLatest);
    }, [communityIncidents, policeIncidents]);

    const typeOptions = useMemo(() => {
        const values = Array.from(new Set(allIncidents.map((item) => getIncidentType(item))))
            .filter((value): value is string => Boolean(value))
            .sort();

        return [{ value: 'all', label: 'Semua jenis' }, ...values.map((value) => ({ value, label: getIncidentTypeLabel(value) }))];
    }, [allIncidents]);

    const kecamatanOptions = useMemo(() => {
        return [
            { value: 'all', label: 'Semua kecamatan' },
            ...SLEMAN_KECAMATAN.map((value) => ({ value, label: value })),
        ];
    }, []);

    const filteredIncidents = useMemo(() => {
        const query = normalizeText(searchQuery);

        return allIncidents.filter((incident) => {
            const type = getIncidentType(incident);
            const kecamatan = getIncidentKecamatan(incident);
            const source = getIncidentSourceKey(incident);

            if (selectedType !== 'all' && type !== selectedType) return false;
            if (selectedKecamatan !== 'all' && normalizeText(kecamatan) !== normalizeText(selectedKecamatan)) return false;
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

    useEffect(() => {
        if (selectedSource === 'dummy' || selectedSource === 'report') {
            setActiveTableSource(selectedSource);
        }
    }, [selectedSource]);

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
        const dummy = filteredIncidents.filter(isPoliceDatasetIncident).length;
        const report = filteredIncidents.filter(isCommunityReportIncident).length;

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
        setShowIncident(true);
        document.querySelector('.jaga-analysis-map-shell')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        window.setTimeout(() => {
            mapRef.current?.setView([incident.lat, incident.lng], 15, { animate: true });
        }, 260);
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
            <div className="overflow-hidden rounded-2xl border border-[#BDE7E1] bg-white">
                <button
                    type="button"
                    onClick={() => setLayerSectionOpen((value) => !value)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-[#F8FAFC]"
                >
                    <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[#07324A]">
                        <Layers3 className="h-4 w-4 text-[#F47B52]" />
                        Layer Peta
                    </span>
                    {layerSectionOpen ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
                </button>

                {layerSectionOpen && (
                    <div className="space-y-2.5 border-t border-[#BDE7E1] bg-[#F8FAFC] p-3">
                        <div className="rounded-2xl border border-[#BDE7E1] bg-white p-3 shadow-sm">
                            <div className="flex items-start gap-3">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FFF1E8] text-[#F47B52] ring-1 ring-[#FED7AA]">
                                    <Flame className="h-5 w-5" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#07324A]">Peta Kerawanan</p>
                                    <p className="mt-1 text-[11px] font-semibold leading-4 text-slate-500">Pilih peta daerah rawan utama atau kepadatan otomatis dalam satu kontrol.</p>
                                </div>
                            </div>

                            <div className="mt-3 grid gap-2">
                                {KDE_LAYER_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setKdeLayerMode(option.value)}
                                        className={cx(
                                            'flex items-start gap-2 rounded-2xl border px-3 py-2 text-left text-[#07324A] transition',
                                            kdeLayerMode === option.value
                                                ? 'border-[#F47B52] bg-[#FFF7ED] shadow-sm shadow-orange-100'
                                                : 'border-[#BDE7E1] bg-white hover:border-[#F47B52]/60 hover:bg-[#F8FCFA]',
                                        )}
                                        aria-pressed={kdeLayerMode === option.value}
                                    >
                                        <span
                                            className={cx(
                                                'mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border-2',
                                                kdeLayerMode === option.value ? 'border-[#F47B52] bg-[#F47B52]' : 'border-slate-300 bg-white',
                                            )}
                                        />
                                        <span className="min-w-0">
                                            <span className="block text-xs font-black text-[#07324A]">{option.label}</span>
                                            <span className="mt-0.5 block text-[11px] font-semibold leading-4 text-slate-500">{option.note}</span>
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <ToggleRow
                            title="Titik Kejadian"
                            subtitle="Marker data polisi dan laporan warga"
                            checked={showIncident}
                            onChange={() => setShowIncident((value) => !value)}
                            icon={<MapPin className="h-5 w-5" />}
                        />

                        <ToggleRow
                            title="Batas Kecamatan"
                            subtitle="Garis batas wilayah administratif Sleman"
                            checked={showDistrict}
                            onChange={() => setShowDistrict((value) => !value)}
                            icon={<Shield className="h-5 w-5" />}
                        />
                    </div>
                )}
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#BDE7E1] bg-white">
                <button
                    type="button"
                    onClick={() => setLegendSectionOpen((value) => !value)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-[#F8FAFC]"
                >
                    <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[#07324A]">
                        <Target className="h-4 w-4 text-[#F47B52]" />
                        Legenda Titik
                    </span>
                    {legendSectionOpen ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
                </button>

                {legendSectionOpen && (
                    <div className="space-y-2.5 border-t border-[#BDE7E1] bg-[#F8FAFC] p-3">
                        <div className="flex items-center gap-3 rounded-2xl bg-white px-3 py-2 ring-1 ring-[#BDE7E1]">
                            <span className="relative flex h-10 w-9 shrink-0 items-center justify-center">
                                <span className="absolute inset-x-1 top-1 h-7 rounded-full border-[3px] border-white bg-[#0B6E78] shadow-sm" />
                                <span className="absolute bottom-1 h-2.5 w-2.5 rotate-45 border-b-[3px] border-r-[3px] border-white bg-[#0B6E78]" />
                                <span className="relative z-10 text-[9px] font-black tracking-tight text-white">DK</span>
                            </span>
                            <span className="min-w-0">
                                <span className="block text-xs font-black text-[#07324A]">Data Kepolisian</span>
                                <span className="block text-[11px] font-semibold leading-4 text-slate-500">Marker utama berlabel DK di muka peta</span>
                            </span>
                        </div>

                        <div className="flex items-center gap-3 rounded-2xl bg-[#FFF8ED] px-3 py-2 ring-1 ring-[#FDE68A]">
                            <span className="relative flex h-10 w-9 shrink-0 items-center justify-center">
                                <span className="absolute inset-x-1 top-1 h-7 rounded-full border-[3px] border-white bg-[#F2A20B] shadow-sm" />
                                <span className="absolute bottom-1 h-2.5 w-2.5 rotate-45 border-b-[3px] border-r-[3px] border-white bg-[#F2A20B]" />
                                <span className="relative z-10 text-[9px] font-black tracking-tight text-white">LM</span>
                            </span>
                            <span className="min-w-0">
                                <span className="block text-xs font-black text-[#07324A]">Laporan Masyarakat</span>
                                <span className="block text-[11px] font-semibold leading-4 text-slate-500">Marker laporan terverifikasi berlabel LM</span>
                            </span>
                        </div>

                        <div className="flex items-center gap-3 rounded-2xl bg-white px-3 py-2 ring-1 ring-[#BDE7E1]">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-4 border-[#F2FAF6] bg-gradient-to-br from-[#F97316] to-[#FDE68A] text-[11px] font-black text-white shadow-sm ring-4 ring-orange-100">12</span>
                            <span className="min-w-0">
                                <span className="block text-xs font-black text-[#07324A]">Cluster Kejadian</span>
                                <span className="block text-[11px] font-semibold leading-4 text-slate-500">Angka menunjukkan jumlah titik saat peta diperkecil</span>
                            </span>
                        </div>

                        <div className="flex items-center gap-3 rounded-2xl bg-white px-3 py-2 ring-1 ring-[#BDE7E1]">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border-2 border-dashed border-[#0B6E78] bg-[#F2FAF6] text-[10px] font-black text-[#0B6E78] shadow-sm">BT</span>
                            <span className="min-w-0">
                                <span className="block text-xs font-black text-[#07324A]">Batas Kecamatan</span>
                                <span className="block text-[11px] font-semibold leading-4 text-slate-500">Wilayah administrasi Kabupaten Sleman</span>
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    const getTableFilteredIncidents = useCallback((source: 'dummy' | 'report') => {
        const query = normalizeText(searchQuery);
        const sourceItems = source === 'report' ? communityIncidents : policeIncidents;

        return sourceItems
            .filter((incident) => {
                const type = getIncidentType(incident);
                const kecamatan = getIncidentKecamatan(incident);

                if (selectedType !== 'all' && type !== selectedType) return false;
                if (selectedKecamatan !== 'all' && normalizeText(kecamatan) !== normalizeText(selectedKecamatan)) return false;
                if (!isInsidePeriod(incident, selectedPeriod)) return false;

                if (selectedTableYear !== 'all') {
                    const year = getIncidentDate(incident)?.getFullYear();
                    if (String(year) !== selectedTableYear) return false;
                }

                if (query) {
                    const haystack = normalizeText([
                        incident.title,
                        incident.description,
                        incident.location,
                        incident.address,
                        incident.kecamatan,
                        incident.desa,
                        type,
                        incident.reportCode,
                    ].join(' '));

                    if (!haystack.includes(query)) return false;
                }

                return true;
            })
            .sort(sortByLatest);
    }, [communityIncidents, policeIncidents, searchQuery, selectedKecamatan, selectedPeriod, selectedTableYear, selectedType]);

    const policeTableCount = getTableFilteredIncidents('dummy').length;
    const reportTableCount = getTableFilteredIncidents('report').length;
    const tableSourceOptions = useMemo(() => [
        { value: 'dummy' as const, label: `Data Kepolisian (${policeTableCount})` },
        { value: 'report' as const, label: `Laporan Masyarakat (${reportTableCount})` },
    ], [policeTableCount, reportTableCount]);

    const activeTableIncidents = useMemo(() => {
        if (selectedTableYear === 'all') return filteredIncidents;

        return filteredIncidents.filter((incident) => {
            const year = getIncidentDate(incident)?.getFullYear();
            return String(year) === selectedTableYear;
        });
    }, [filteredIncidents, selectedTableYear]);

    const activeTableSourceLabel = selectedSource === 'report'
        ? 'Laporan Masyarakat'
        : selectedSource === 'dummy'
            ? 'Data Kepolisian'
            : 'Semua Sumber Data';

    const totalDataPages = Math.max(1, Math.ceil(activeTableIncidents.length / tablePageSize));
    const currentDataPage = Math.min(tablePage, totalDataPages);
    const tableStartIndex = (currentDataPage - 1) * tablePageSize;
    const visibleTableIncidents = activeTableIncidents.slice(tableStartIndex, tableStartIndex + tablePageSize);
    const dataStartNumber = activeTableIncidents.length ? tableStartIndex + 1 : 0;
    const dataEndNumber = Math.min(tableStartIndex + tablePageSize, activeTableIncidents.length);

    const paginationItems = Array.from({ length: Math.min(totalDataPages, 5) }, (_, index) => {
        if (totalDataPages <= 5) return index + 1;
        if (currentDataPage <= 3) return index + 1;
        if (currentDataPage >= totalDataPages - 2) return totalDataPages - 4 + index;
        return currentDataPage - 2 + index;
    });

    const renderTable = () => (
        <div className="overflow-hidden rounded-[1.7rem] border border-[#BDE7E1] bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-[#BDE7E1] bg-white p-4 xl:flex-row xl:items-end xl:justify-between">
                <PanelTitle
                    title={`Tabel Kejadian · ${activeTableSourceLabel}`}
                    subtitle="Daftar ini mengikuti filter utama di bagian atas, termasuk sumber data, jenis kejadian, kecamatan, periode, dan pencarian."
                    icon={selectedSource === 'report' ? <Shield className="h-5 w-5" /> : <Database className="h-5 w-5" />}
                />

                <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                    <span className="rounded-full border border-[#BDE7E1] bg-[#F2FAF6] px-3 py-2 text-xs font-black text-[#0B6E78]">
                        {activeTableIncidents.length} data sesuai filter utama
                    </span>
                </div>
            </div>

            <div className="overflow-x-auto px-4 pb-3 pt-4">
                <table className="min-w-[920px] w-full text-left text-sm">
                    <thead className="bg-[#07324A] text-[11px] uppercase tracking-[0.12em] text-white">
                        <tr>
                            <th className="px-4 py-3 font-black">No</th>
                            <th className="px-4 py-3 font-black">Sumber</th>
                            <th className="px-4 py-3 font-black">Bukti</th>
                            <th className="px-4 py-3 font-black">Jenis Kejadian</th>
                            <th className="px-4 py-3 font-black">Waktu Kejadian</th>
                            <th className="px-4 py-3 font-black">Alamat</th>
                            <th className="px-4 py-3 font-black">Deskripsi Singkat</th>
                            <th className="px-4 py-3 font-black">Aksi</th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-[#BDE7E1] bg-white">
                        {visibleTableIncidents.length ? visibleTableIncidents.map((incident, index) => {
                            const type = getIncidentType(incident);
                            const color = getIncidentColor(type);
                            const photo = getIncidentPrimaryPhoto(incident);
                            const rowSource = getIncidentSourceKey(incident);

                            return (
                                <tr key={`${rowSource}-${incident.id}`} className="transition hover:bg-[#FFF8ED]">
                                    <td className="whitespace-nowrap px-4 py-4 font-semibold text-[#07324A]">
                                        {tableStartIndex + index + 1}
                                    </td>

                                    <td className="whitespace-nowrap px-4 py-4">
                                        <span className={`rounded-full px-3 py-1 text-[10px] font-black ${rowSource === 'report' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100' : 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100'}`}>
                                            {rowSource === 'report' ? 'Laporan Warga' : 'Data Polisi'}
                                        </span>
                                    </td>

                                    <td className="px-4 py-4">
                                        {photo ? (
                                            <img
                                                src={photo}
                                                alt={`Foto ${getIncidentTypeLabel(type)}`}
                                                className="h-14 w-16 rounded-xl object-cover ring-1 ring-[#BDE7E1]"
                                                onError={(event) => { event.currentTarget.style.display = 'none'; }}
                                            />
                                        ) : (
                                            <div className="flex h-14 w-16 items-center justify-center rounded-xl bg-[#F8FAFC] text-[10px] font-black text-slate-400 ring-1 ring-[#BDE7E1]">
                                                {rowSource === 'report' ? 'Tidak ada' : 'Data'}
                                            </div>
                                        )}
                                    </td>

                                    <td className="px-4 py-4">
                                        <div className="flex min-w-[150px] items-center gap-2">
                                            <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                                            <span className="font-black text-[#07324A]">{getIncidentTypeLabel(type)}</span>
                                        </div>
                                    </td>

                                    <td className="whitespace-nowrap px-4 py-4 font-semibold text-[#07324A]/75">
                                        {incident.date || '-'}<br />{incident.time || '-'}
                                    </td>

                                    <td className="max-w-[300px] px-4 py-4 font-semibold text-[#07324A]/75">
                                        <span className="line-clamp-2">{getIncidentAddress(incident)}</span>
                                    </td>

                                    <td className="max-w-[300px] px-4 py-4 font-semibold text-[#07324A]/75">
                                        <span className="line-clamp-2">{getIncidentShortDescription(incident)}</span>
                                    </td>

                                    <td className="whitespace-nowrap px-4 py-4">
                                        <button
                                            type="button"
                                            onClick={() => zoomToIncident(incident)}
                                            className="rounded-xl bg-[#F47B52] px-4 py-2 text-xs font-black text-white shadow-sm transition hover:bg-[#B94A4A]"
                                        >
                                            Lihat
                                        </button>
                                    </td>
                                </tr>
                            );
                        }) : (
                            <tr>
                                <td colSpan={8} className="px-4 py-10 text-center text-sm font-semibold text-[#07324A]/70">
                                    Tidak ada data sesuai filter aktif.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-[#BDE7E1] bg-[#F8FAFC] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-bold text-[#07324A]/70">
                    Menampilkan {dataStartNumber}–{dataEndNumber} dari {activeTableIncidents.length} data. Klik tombol lihat untuk fokus ke marker peta.
                </p>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        disabled={currentDataPage <= 1}
                        onClick={() => setTablePage((page) => Math.max(1, page - 1))}
                        className="rounded-xl border border-[#BDE7E1] bg-white px-3 py-2 text-xs font-black text-[#07324A] disabled:cursor-not-allowed disabled:opacity-45"
                    >
                        Sebelumnya
                    </button>

                    {paginationItems.map((page) => (
                        <button
                            key={page}
                            type="button"
                            onClick={() => setTablePage(page)}
                            className={cx(
                                'h-9 w-9 rounded-xl text-xs font-black transition',
                                page === currentDataPage ? 'bg-[#07324A] text-white' : 'border border-[#BDE7E1] bg-white text-[#07324A] hover:bg-[#FFF8ED]',
                            )}
                        >
                            {page}
                        </button>
                    ))}

                    <button
                        type="button"
                        disabled={currentDataPage >= totalDataPages}
                        onClick={() => setTablePage((page) => Math.min(totalDataPages, page + 1))}
                        className="rounded-xl bg-[#07324A] px-3 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-45"
                    >
                        Berikutnya
                    </button>
                </div>
            </div>
        </div>
    );

    const activeKdeLegendItems = kdeLayerMode === 'automatic' ? KDE_AUTOMATIC_LEGEND_UI : KDE_LEGEND_UI;
    const activeKdeLegendTitle = kdeLayerMode === 'official' ? 'Daerah Rawan 2020–2025' : 'Kepadatan Otomatis';
    const activeKdeLegendSubtitle = kdeLayerMode === 'official'
        ? 'Data 2020–2025'
        : 'Intensitas KDE otomatis, bukan klasifikasi tingkat risiko';

    return (
        <main className={cx('jaga-analysis-page bg-[#F2FAF6] text-foreground', isFullscreen ? 'fixed inset-0 z-[9999] overflow-hidden p-0' : 'min-h-screen')}>
            <style>{`
                .jaga-analysis-page,
                .jaga-analysis-page * {
                    box-sizing: border-box;
                    text-shadow: none !important;
                }

                .jaga-analysis-map-shell {
                    height: clamp(620px, calc(100dvh - 170px), 860px);
                    min-height: 620px;
                }

                .jaga-analysis-map-shell .leaflet-popup-content-wrapper {
                    overflow: hidden !important;
                    border: 1px solid #BDE7E1 !important;
                    border-radius: 20px !important;
                    background: #ffffff !important;
                    box-shadow: 0 24px 60px rgba(15, 23, 42, 0.22) !important;
                }

                .jaga-analysis-map-shell .leaflet-popup-content {
                    margin: 0 !important;
                    color: #07324A !important;
                }

                .jaga-analysis-map-shell .leaflet-popup-tip {
                    background: #ffffff !important;
                }

                .jaga-analysis-page table thead th {
                    border-color: rgba(189, 231, 225, 0.35) !important;
                    background: #07324A !important;
                    color: #FFFFFF !important;
                }

                .jaga-analysis-control-scroll::-webkit-scrollbar { width: 7px; }
                .jaga-analysis-control-scroll::-webkit-scrollbar-thumb {
                    border-radius: 999px;
                    background: rgba(100, 116, 139, 0.34);
                }

                @media (max-width: 1023px) {
                    .jaga-analysis-map-shell {
                        height: min(760px, 76dvh);
                        min-height: 600px;
                    }
                }

                @media (max-width: 640px) {
                    .jaga-analysis-map-shell {
                        height: 680px;
                        min-height: 680px;
                        border-radius: 1.35rem !important;
                    }
                }

                @media (max-width: 390px) {
                    .jaga-analysis-map-shell {
                        height: 720px;
                        min-height: 720px;
                    }
                }
            `}</style>

            <div className={cx('mx-auto w-full', isFullscreen ? 'h-screen max-w-none p-0' : 'max-w-[1560px] px-4 py-5 sm:px-6 lg:px-8')}>
                {!isFullscreen && (
                    <>
                        <JagaPageHero
                            page="map"
                            eyebrow="Peta Interaktif"
                            title="Peta Hotspot JagaSleman"
                            subtitle="Pantau titik kejadian, pola kerawanan, laporan warga, dan data kepolisian dalam satu tampilan WebGIS."
                            actions={[
                                { label: 'Buat Laporan', href: '/report', tone: 'primary' },
                                { label: 'Lihat Statistik', href: '/statistics', tone: 'secondary' },
                            ]}
                            metrics={[
                                { label: 'Total Titik', value: formatNumber(filteredIncidents.length), note: 'Data sesuai filter aktif' },
                                { label: 'Data Polisi', value: formatNumber(sourceStats.dummy), note: 'Rekaman historis 2020–2025' },
                                { label: 'Laporan Warga', value: formatNumber(sourceStats.report), note: loadingReports ? 'Sedang memuat data' : 'Data dari form laporan' },
                                { label: 'Filter Peta', value: 'Aktif', note: 'Mengikuti tabel dan layer' },
                            ]}
                            sideTitle="Informasi Peta"
                            sideText="Gunakan kontrol layer, basemap, pencarian kecamatan, dan tombol lokasi untuk membaca kondisi spasial dengan lebih cepat."
                            sideItems={['Atur layer peta', 'Klik marker detail', 'Cek tabel laporan']}
                        />

                        <section className="mb-5 rounded-[1.7rem] border border-[#E8D5BE] bg-[#FFF8ED] p-4 shadow-sm">
                            <div className="flex gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FDE68A] text-[#92400E]">
                                    <Shield className="h-5 w-5" />
                                </div>

                                <div>
                                    <h2 className="text-sm font-black text-[#07324A]">Panduan Peta</h2>
                                    <p className="mt-1 text-xs font-semibold leading-relaxed text-[#07324A]/75">
                                        Gunakan <b>Keterangan Peta</b> untuk mengatur layer dan legenda. Klik marker untuk membaca detail. Klik ikon <LocateFixed className="mx-1 inline h-4 w-4 align-[-3px]" /> <b>Lokasi Saya</b> untuk mengetahui posisi Anda berada di zona apa. Tombol <Maximize2 className="mx-1 inline h-4 w-4 align-[-3px]" /> membuka tampilan fullscreen.
                                    </p>
                                </div>
                            </div>
                        </section>

                        <section className="mb-5 rounded-[1.7rem] border border-[#BDE7E1] bg-white p-4 shadow-sm">
                            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-start gap-3">
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#E9F8F3] text-[#0B6E78]">
                                        <Filter className="h-5 w-5" />
                                    </span>
                                    <div>
                                        <h2 className="text-sm font-black text-[#07324A]">Filter Data Peta</h2>
                                        <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">Filter ditempatkan di luar muka peta agar kontrol navigasi tidak saling menutupi.</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="rounded-full border border-[#BDE7E1] bg-[#F2FAF6] px-3 py-1.5 text-xs font-black text-[#0B6E78]">
                                        {formatNumber(filteredIncidents.length)} titik
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedSource('all');
                                            setSelectedType('all');
                                            setSelectedKecamatan('all');
                                            setSelectedPeriod('all');
                                            setSearchQuery('');
                                        }}
                                        disabled={activeFilterCount === 0}
                                        className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#BDE7E1] bg-white px-3 text-xs font-black text-[#07324A] transition hover:border-[#0FA3A0] hover:bg-[#F2FAF6] disabled:cursor-not-allowed disabled:opacity-45"
                                    >
                                        <RefreshCcw className="h-3.5 w-3.5" />
                                        Reset
                                    </button>
                                </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                                <SelectField label="Sumber Data" value={selectedSource} onChange={setSelectedSource} options={sourceOptions} />
                                <SelectField label="Jenis Kejadian" value={selectedType} onChange={setSelectedType} options={typeOptions} />
                                <SelectField label="Kecamatan" value={selectedKecamatan} onChange={setSelectedKecamatan} options={kecamatanOptions} />
                                <SelectField label="Periode" value={selectedPeriod} onChange={setSelectedPeriod} options={periodOptions} />
                                <label className="block">
                                    <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Cari Data</span>
                                    <span className="relative block">
                                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        <input
                                            value={searchQuery}
                                            onChange={(event) => setSearchQuery(event.target.value)}
                                            placeholder="Alamat, jenis, deskripsi..."
                                            className="h-11 w-full rounded-2xl border border-[#BDE7E1] bg-white pl-10 pr-3 text-sm font-black text-[#07324A] outline-none transition focus:border-[#F47B52] focus:ring-4 focus:ring-[#F47B52]/10"
                                        />
                                    </span>
                                </label>
                            </div>
                        </section>
                    </>
                )}

                <section className={cx('grid gap-5', isFullscreen ? 'h-screen grid-cols-1' : 'grid-cols-1')}>
                    <div
                        className={cx(
                            'jaga-analysis-map-shell relative overflow-hidden border border-[#BDE7E1] bg-white shadow-xl shadow-slate-950/8',
                            isFullscreen ? 'h-screen rounded-none border-0' : 'jaga-analysis-map-height h-[calc(100vh-245px)] min-h-[620px] rounded-[2rem]',
                        )}
                    >
                        <MapView
                            ref={mapRef}
                            center={SLEMAN_CENTER}
                            zoom={DEFAULT_ZOOM}
                            incidents={mapIncidents as any}
                            contacts={[]}
                            showHeatmap={kdeLayerMode === 'automatic'}
                            heatmapBandwidthKm={KDE_BANDWIDTH_KM}
                            hotspotClusters={[]}
                            userLocation={userLocation}
                            showDistrictBoundary={showDistrict}
                            fitDistrictBoundary
                            showVillageBoundary={false}
                            villageBoundaryInteractive={false}
                            showIncidentMarkers={showIncident}
                            onShowIncidentMarkersChange={setShowIncident}
                            showMapControls
                            onLocateRequest={locateUser}
                            showEdgePanels
                            showKdeLegend
                            kdeLayerMode={kdeLayerMode}
                            onKdeLayerModeChange={setKdeLayerMode}
                        />

                    </div>

                    {!isFullscreen && userRiskInfo && (
                        <section
                            className={cx(
                                'rounded-[1.5rem] border p-4 shadow-sm',
                                userRiskInfo.status === 'rawan'
                                    ? 'border-red-200 bg-red-50 text-red-900'
                                    : userRiskInfo.status === 'waspada'
                                      ? 'border-amber-200 bg-amber-50 text-amber-900'
                                      : 'border-emerald-200 bg-emerald-50 text-emerald-900',
                            )}
                            role="status"
                            aria-live="polite"
                        >
                            <div className="flex items-start gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/80">
                                    {userRiskInfo.status === 'aman' ? <Shield className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-black">{userRiskInfo.title}</p>
                                    <p className="mt-1 text-xs font-semibold leading-5 opacity-80">{userRiskInfo.message}</p>
                                </div>
                            </div>
                        </section>
                    )}

                    {!isFullscreen && reportError && (
                        <section className="rounded-[1.35rem] border border-[#F2C99F] bg-[#FFF8ED] px-4 py-3 text-xs font-bold leading-5 text-[#7C2D12] shadow-sm" role="alert">
                            {reportError}
                        </section>
                    )}

                    {!isFullscreen && (
                        <section className="rounded-[2rem] border border-[#BDE7E1] bg-white p-4 shadow-sm">
                            <div className="mb-4 flex flex-col gap-3 border-b border-[#BDE7E1] pb-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h2 className="text-base font-black text-[#07324A]">Data Kejadian</h2>
                                    <p className="mt-1 text-xs font-semibold text-slate-500">Tabel otomatis mengikuti filter data peta di atas, sehingga tidak ada filter sumber data ganda pada tabel.</p>
                                </div>

                                <span className="inline-flex h-10 items-center rounded-2xl border border-[#BDE7E1] bg-[#F2FAF6] px-4 text-xs font-black text-[#0B6E78]">
                                    {activeTableSourceLabel}
                                </span>
                            </div>

                            {renderTable()}
                        </section>
                    )}
                </section>
            </div>

        </main>
    );
}
