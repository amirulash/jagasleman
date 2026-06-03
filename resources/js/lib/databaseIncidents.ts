export type IncidentSource = 'dummy' | 'report';

export type MapIncident = {
    id: string;
    reportCode?: string;
    title?: string;

    date: string;
    time: string;

    type: string;
    kategori?: string;
    rawKategori?: string;
    incident_type?: string;
    crime_type?: string;

    description: string;
    location: string;
    address?: string;

    kecamatan?: string;
    desa?: string;
    district?: string;
    village?: string;

    lat: number;
    lng: number;
    latitude?: number;
    longitude?: number;

    status: string;
    source: IncidentSource;

    photoUrl?: string | null;
    photoUrls?: string[] | null;
    reporterName?: string | null;
    reporterPhone?: string | null;

    incident_date?: string;
    incident_time?: string;
    incident_at?: string;
    created_at?: string;
    createdAt?: string;
    updated_at?: string;

    weight?: number;
};

type GeoJSONFeature = {
    type?: string;
    properties?: Record<string, any>;
    geometry?: {
        type?: string;
        coordinates?: number[] | number[][] | any;
    };
};

type ApiResponseShape =
    | MapIncident[]
    | {
          success?: boolean;
          data?: any[];
          reports?: any[];
          incidents?: any[];
          items?: any[];
          features?: GeoJSONFeature[];
      }
    | {
          type?: string;
          features?: GeoJSONFeature[];
      };

const REPORT_ENDPOINTS = [
    '/api/map/incidents',
    '/api/report-incidents/map',
];

function padReportCode(id: string | number | null | undefined): string {
    if (id === null || id === undefined || id === '') {
        return 'LAP-0000';
    }

    const cleanId = String(id).replace(/^report-/i, '');

    if (/^\d+$/.test(cleanId)) {
        return `LAP-${cleanId.padStart(4, '0')}`;
    }

    return `LAP-${cleanId}`;
}

function normalizeText(value: any, fallback = '-'): string {
    if (value === null || value === undefined || value === '') {
        return fallback;
    }

    return String(value).trim() || fallback;
}

function normalizeCoordinate(value: any): number {
    if (value === null || value === undefined || value === '') {
        return Number.NaN;
    }

    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : Number.NaN;
    }

    const cleaned = String(value)
        .trim()
        .replace(',', '.')
        .replace(/[^\d.-]/g, '');

    const numberValue = Number(cleaned);

    return Number.isFinite(numberValue) ? numberValue : Number.NaN;
}

function normalizePhotoUrls(item: Record<string, any>): string[] {
    const rawList = item.photo_urls ?? item.photoUrls ?? item.photos ?? item.images ?? [];
    const urls: string[] = [];

    if (Array.isArray(rawList)) {
        rawList.forEach((entry: any) => {
            const value = typeof entry === "string"
                ? entry
                : entry?.photo_url ?? entry?.photoUrl ?? entry?.url ?? entry?.image_url ?? entry?.photo_path ?? entry?.path;

            if (value) urls.push(String(value));
        });
    }

    const primary = item.photo_url ?? item.photoUrl ?? item.photo_path ?? item.photoPath ?? item.image_url ?? item.imageUrl ?? null;
    if (primary) urls.unshift(String(primary));

    return Array.from(new Set(urls.filter(Boolean)));
}

function normalizeLatLng(latValue: any, lngValue: any): { lat: number; lng: number } | null {
    let lat = normalizeCoordinate(latValue);
    let lng = normalizeCoordinate(lngValue);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
        return null;
    }

    if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
        const temp = lat;
        lat = lng;
        lng = temp;
    }

    const isReasonableIndonesia =
        lat >= -11.5 &&
        lat <= 6.5 &&
        lng >= 94 &&
        lng <= 142;

    if (!isReasonableIndonesia) {
        return null;
    }

    return { lat, lng };
}

function normalizeDate(value: any): string {
    if (!value) return '-';

    const text = String(value).trim();

    const ymdMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (ymdMatch) {
        return `${ymdMatch[1]}-${ymdMatch[2]}-${ymdMatch[3]}`;
    }

    const dmyMatch = text.match(/^(\d{2})[/-](\d{2})[/-](\d{4})/);
    if (dmyMatch) {
        return `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
    }

    const date = new Date(text);

    if (Number.isNaN(date.getTime())) {
        return text.split(' ')[0] || '-';
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function normalizeTime(value: any): string {
    if (!value) return '-';

    const text = String(value).trim();

    const timeMatch = text.match(/(\d{2}):(\d{2})/);
    if (timeMatch) {
        return `${timeMatch[1]}:${timeMatch[2]}`;
    }

    const date = new Date(text);

    if (Number.isNaN(date.getTime())) {
        return '-';
    }

    return date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
}

function resolveIncidentType(item: Record<string, any>): string {
    const raw =
        item.incident_type ??
        item.crime_type ??
        item.type ??
        item.kategori ??
        item.category ??
        item.rawKategori ??
        item.jenis_kejadian ??
        item.jenis ??
        item.title ??
        'Lainnya';

    const text = normalizeText(raw, 'Lainnya');
    const upper = text.toUpperCase();

    if (upper.includes('CURAS') || upper.includes('KEKERASAN') || upper.includes('BEGAL')) {
        return 'Pencurian dengan Kekerasan';
    }

    if (upper.includes('SAJAM') || upper.includes('SENJATA TAJAM')) {
        return 'Penyalahgunaan Senjata Tajam';
    }

    if (upper.includes('PENGEROYOKAN') || upper.includes('KLITIH')) {
        return 'Pengeroyokan';
    }

    if (upper.includes('PENGANIAYAAN') || upper.includes('ANIAYA')) {
        return 'Penganiayaan';
    }

    if (upper.includes('PEMERASAN') || upper.includes('PENGANCAMAN')) {
        return 'Pemerasan dan Pengancaman';
    }

    if (upper.includes('PENGRUSAKAN') || upper.includes('PERUSAKAN') || upper.includes('VANDAL')) {
        return 'Pengrusakan';
    }

    return text;
}

export function getIncidentWeight(value: any): number {
    const text = normalizeText(value, '').toUpperCase();

    if (text.includes('CURAS') || text.includes('KEKERASAN') || text.includes('BEGAL')) return 5;
    if (text.includes('SAJAM') || text.includes('SENJATA')) return 5;
    if (text.includes('PENGEROYOKAN') || text.includes('KLITIH')) return 4;
    if (text.includes('PENGANIAYAAN') || text.includes('ANIAYA')) return 4;
    if (text.includes('PEMERASAN') || text.includes('PENGANCAMAN')) return 4;
    if (text.includes('PENGRUSAKAN') || text.includes('PERUSAKAN')) return 3;

    return 2;
}

function resolveStatus(item: Record<string, any>): string {
    const raw = normalizeText(item.status ?? item.report_status ?? item.state, 'Aktif');
    const upper = raw.toUpperCase();

    if (upper.includes('APPROVED') || upper.includes('VALID') || upper.includes('DITERIMA')) {
        return 'Terverifikasi';
    }

    if (upper.includes('PENDING') || upper.includes('MENUNGGU')) {
        return 'Menunggu';
    }

    if (upper.includes('REJECT') || upper.includes('DITOLAK')) {
        return 'Ditolak';
    }

    if (upper.includes('SELESAI') || upper.includes('DONE')) {
        return 'Selesai';
    }

    return raw;
}

function buildIncidentFromPlain(item: Record<string, any>, index = 0): MapIncident | null {
    const coordinate = normalizeLatLng(
        item.latitude ?? item.lat ?? item.Latitude ?? item.LATITUDE ?? item.y,
        item.longitude ?? item.lng ?? item.lon ?? item.Longitude ?? item.LONGITUDE ?? item.x,
    );

    if (!coordinate) {
        return null;
    }

    const rawId =
        item.id ??
        item.report_id ??
        item.reportCode ??
        item.report_code ??
        item.kode_laporan ??
        `${Date.now()}-${index}`;

    const reportCode =
        item.report_code ??
        item.reportCode ??
        item.kode_laporan ??
        padReportCode(rawId);

    const incidentType = resolveIncidentType(item);

    const incidentAt =
        item.incident_at ??
        item.incident_date ??
        item.date ??
        item.tanggal_kejadian ??
        item.created_at ??
        item.createdAt ??
        null;

    const incidentTime =
        item.incident_time ??
        item.time ??
        item.jam_kejadian ??
        item.jam ??
        incidentAt;

    const location =
        item.location ??
        item.address ??
        item.alamat ??
        item.alamat_kejadian ??
        item.lokasi ??
        '-';

    const kecamatan =
        item.kecamatan ??
        item.district ??
        item.kecamatan_name ??
        item.nama_kecamatan ??
        '-';

    const desa =
        item.desa ??
        item.village ??
        item.kelurahan ??
        item.kalurahan ??
        item.nama_desa ??
        '-';

    const photoUrls = normalizePhotoUrls(item);

    return {
        id: String(rawId).startsWith('report-') ? String(rawId) : `report-`,
        reportCode: String(reportCode),
        title: item.title ?? `Laporan ${incidentType}`,

        date: item.date ? normalizeDate(item.date) : normalizeDate(incidentAt),
        time: item.time ? normalizeTime(item.time) : normalizeTime(incidentTime),

        type: incidentType,
        kategori: incidentType,
        rawKategori: normalizeText(
            item.incident_type ??
                item.crime_type ??
                item.type ??
                item.kategori ??
                item.category ??
                incidentType,
            incidentType,
        ),
        incident_type: incidentType,
        crime_type: incidentType,

        description: normalizeText(item.description ?? item.deskripsi ?? item.keterangan, '-'),
        location: normalizeText(location, '-'),
        address: normalizeText(location, '-'),

        kecamatan: normalizeText(kecamatan, '-'),
        desa: normalizeText(desa, '-'),
        district: normalizeText(kecamatan, '-'),
        village: normalizeText(desa, '-'),

        lat: coordinate.lat,
        lng: coordinate.lng,
        latitude: coordinate.lat,
        longitude: coordinate.lng,

        status: resolveStatus(item),
        source: 'report',

        photoUrl: photoUrls[0] ?? null,
        photoUrls,
        reporterName: item.reporter_name ?? item.reporterName ?? item.nama_pelapor ?? null,
        reporterPhone: item.reporter_phone ?? item.reporterPhone ?? item.no_hp ?? null,

        incident_date: normalizeDate(incidentAt),
        incident_time: normalizeTime(incidentTime),
        incident_at: item.incident_at ?? undefined,
        created_at: item.created_at ?? undefined,
        createdAt: item.createdAt ?? item.created_at ?? undefined,
        updated_at: item.updated_at ?? undefined,

        weight: getIncidentWeight(incidentType),
    };
}

function mapFeatureToIncident(feature: GeoJSONFeature, index = 0): MapIncident | null {
    const coordinates = feature?.geometry?.coordinates;

    if (!Array.isArray(coordinates)) {
        return null;
    }

    const lngValue = coordinates[0];
    const latValue = coordinates[1];

    const props = feature?.properties ?? {};

    return buildIncidentFromPlain(
        {
            ...props,
            longitude: lngValue,
            latitude: latValue,
        },
        index,
    );
}

function extractArrayFromResponse(result: ApiResponseShape): {
    type: 'geojson' | 'plain';
    data: any[];
} {
    if (Array.isArray(result)) {
        return {
            type: 'plain',
            data: result,
        };
    }

    if (Array.isArray((result as any)?.features)) {
        return {
            type: 'geojson',
            data: (result as any).features,
        };
    }

    if (Array.isArray((result as any)?.data)) {
        return {
            type: 'plain',
            data: (result as any).data,
        };
    }

    if (Array.isArray((result as any)?.reports)) {
        return {
            type: 'plain',
            data: (result as any).reports,
        };
    }

    if (Array.isArray((result as any)?.incidents)) {
        return {
            type: 'plain',
            data: (result as any).incidents,
        };
    }

    if (Array.isArray((result as any)?.items)) {
        return {
            type: 'plain',
            data: (result as any).items,
        };
    }

    return {
        type: 'plain',
        data: [],
    };
}

function deduplicateIncidents(incidents: MapIncident[]): MapIncident[] {
    const seen = new Set<string>();

    return incidents.filter((item) => {
        const key = `${item.id}-${item.lat.toFixed(6)}-${item.lng.toFixed(6)}`;

        if (seen.has(key)) {
            return false;
        }

        seen.add(key);
        return true;
    });
}

async function fetchJsonWithEndpointFallback(): Promise<any> {
    const errors: string[] = [];

    for (const endpoint of REPORT_ENDPOINTS) {
        try {
            const response = await fetch(endpoint, {
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                },
            });

            if (!response.ok) {
                errors.push(`${endpoint}: ${response.status}`);
                continue;
            }

            return await response.json();
        } catch (error: any) {
            errors.push(`${endpoint}: ${error?.message ?? 'network error'}`);
        }
    }

    throw new Error(`Gagal mengambil data laporan. Endpoint dicoba: ${errors.join(' | ')}`);
}

export async function fetchApprovedReportIncidents(): Promise<MapIncident[]> {
    const result = await fetchJsonWithEndpointFallback();
    const extracted = extractArrayFromResponse(result);

    let reports: MapIncident[] = [];

    if (extracted.type === 'geojson') {
        reports = extracted.data
            .map((feature: GeoJSONFeature, index: number) => mapFeatureToIncident(feature, index))
            .filter((item: MapIncident | null): item is MapIncident => item !== null);
    } else {
        reports = extracted.data
            .map((item: Record<string, any>, index: number) => buildIncidentFromPlain(item, index))
            .filter((item: MapIncident | null): item is MapIncident => item !== null);
    }

    return deduplicateIncidents(
        reports.filter((item) => {
            return (
                item.source === 'report' &&
                Number.isFinite(item.lat) &&
                Number.isFinite(item.lng) &&
                item.lat !== 0 &&
                item.lng !== 0
            );
        }),
    );
}

export async function fetchReportIncidentsForMap(): Promise<MapIncident[]> {
    return fetchApprovedReportIncidents();
}
