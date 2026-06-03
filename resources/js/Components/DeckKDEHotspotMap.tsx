import MapView from '@/Components/MapView';
import type { Incident } from '@/data/dummy';

export type KDEReport = Record<string, any>;

type Props = {
    reports?: KDEReport[];
    showKDE?: boolean;
    showHeatmap?: boolean;
    showDeckKDE?: boolean;
    showIncidentPoints?: boolean;
    loading?: boolean;
    error?: string;
    dataMode?: string;
    onReload?: () => void;
    selectedCategory?: string;
    selectedPeriod?: string;
};

function toNumber(value: unknown): number {
    if (value === null || value === undefined || value === '') return Number.NaN;
    const number = Number(String(value).replace(',', '.'));
    return Number.isFinite(number) ? number : Number.NaN;
}

function normalizeReport(report: KDEReport, index: number): Incident | null {
    let lat = toNumber(report?.lat ?? report?.latitude);
    let lng = toNumber(report?.lng ?? report?.longitude);

    if ((!Number.isFinite(lat) || !Number.isFinite(lng)) && Array.isArray(report?.geometry?.coordinates)) {
        lng = toNumber(report.geometry.coordinates[0]);
        lat = toNumber(report.geometry.coordinates[1]);
    }

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) [lat, lng] = [lng, lat];
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

    return {
        ...(report as any),
        id: String(report?.id ?? `report-${index + 1}`),
        title: String(report?.title ?? report?.judul ?? report?.kategori ?? report?.type ?? 'Laporan Kejadian'),
        type: String(report?.type ?? report?.kategori ?? report?.rawKategori ?? 'Laporan'),
        kategori: String(report?.kategori ?? report?.type ?? report?.rawKategori ?? 'Laporan'),
        date: String(report?.date ?? report?.incident_date ?? report?.created_at ?? '-'),
        time: String(report?.time ?? '-'),
        description: String(report?.description ?? report?.deskripsi ?? '-'),
        location: String(report?.location ?? report?.address ?? report?.alamat ?? 'Lokasi belum tersedia'),
        kecamatan: String(report?.kecamatan ?? report?.district ?? 'Sleman'),
        lat,
        lng,
        source: report?.source ?? 'report',
    } as Incident;
}

/**
 * Compatibility wrapper only.
 * KDE visualisasi utama tetap memakai MapView + Leaflet heatmap lama, bukan DeckGL.
 */
export default function DeckKDEHotspotMap({
    reports = [],
    showKDE = true,
    showHeatmap,
    showDeckKDE,
    showIncidentPoints = true,
}: Props) {
    const incidents = reports
        .map((item, index) => normalizeReport(item, index))
        .filter((item): item is Incident => item !== null);

    const heatmapEnabled = Boolean(showHeatmap ?? showKDE ?? showDeckKDE);

    return (
        <MapView
            incidents={incidents}
            showHeatmap={heatmapEnabled}
            showIncidentMarkers={showIncidentPoints}
            heatmapBandwidthKm={1.65}
            showDistrictBoundary
        />
    );
}
