import { batasKecamatanGeojson } from '@/data/districtBoundaryGeojson';

export type LatLngPoint = {
    lat?: number | string | null;
    lng?: number | string | null;
    latitude?: number | string | null;
    longitude?: number | string | null;
};

function normalizeName(value: any): string {
    return String(value || '')
        .trim()
        .toUpperCase()
        .replace(/^KECAMATAN\s+/i, '')
        .replace(/\s+/g, ' ');
}

function getFeatureDistrictName(feature: any): string {
    const props = feature?.properties || {};

    return normalizeName(
        props.wadmkc ||
            props.WADMKC ||
            props.kecamatan ||
            props.KECAMATAN ||
            props.nama_kecamatan ||
            props.NAMOBJ ||
            props.namobj ||
            props.KEC ||
            props.name ||
            '',
    );
}

function getCoordinate(point: LatLngPoint): { lat: number; lng: number } | null {
    const lat = Number(point.lat ?? point.latitude);
    const lng = Number(point.lng ?? point.longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    // validasi kasar area DIY/Jawa bagian tengah agar data kebalik langsung gugur
    if (lat < -9 || lat > -6) return null;
    if (lng < 109 || lng > 112) return null;

    return { lat, lng };
}

function isPointInRing(lng: number, lat: number, ring: number[][]): boolean {
    let inside = false;

    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = Number(ring[i][0]);
        const yi = Number(ring[i][1]);
        const xj = Number(ring[j][0]);
        const yj = Number(ring[j][1]);

        const intersect =
            yi > lat !== yj > lat &&
            lng < ((xj - xi) * (lat - yi)) / ((yj - yi) || 1e-12) + xi;

        if (intersect) inside = !inside;
    }

    return inside;
}

function isPointInPolygon(lng: number, lat: number, polygon: number[][][]): boolean {
    if (!Array.isArray(polygon) || polygon.length === 0) return false;

    const outerRing = polygon[0];

    if (!isPointInRing(lng, lat, outerRing)) return false;

    // cek hole jika ada
    for (let i = 1; i < polygon.length; i++) {
        if (isPointInRing(lng, lat, polygon[i])) return false;
    }

    return true;
}

function isPointInGeometry(lng: number, lat: number, geometry: any): boolean {
    if (!geometry) return false;

    if (geometry.type === 'Polygon') {
        return isPointInPolygon(lng, lat, geometry.coordinates);
    }

    if (geometry.type === 'MultiPolygon') {
        return geometry.coordinates.some((polygon: number[][][]) =>
            isPointInPolygon(lng, lat, polygon),
        );
    }

    return false;
}

export function getSpatialDistrictFromPoint(point: LatLngPoint): string | null {
    const coordinate = getCoordinate(point);

    if (!coordinate) return null;

    const features = (batasKecamatanGeojson as any)?.features || [];

    for (const feature of features) {
        if (isPointInGeometry(coordinate.lng, coordinate.lat, feature.geometry)) {
            const districtName = getFeatureDistrictName(feature);
            return districtName || null;
        }
    }

    return null;
}

export function getIncidentSpatialDistrict(incident: any): string {
    const spatialDistrict = getSpatialDistrictFromPoint({
        lat: incident?.lat ?? incident?.latitude,
        lng: incident?.lng ?? incident?.longitude,
    });

    if (spatialDistrict) return spatialDistrict;

    return normalizeName(
        incident?.kecamatan ||
            incident?.district ||
            incident?.subdistrict ||
            incident?.location_district ||
            'TIDAK DIKETAHUI',
    );
}

export function normalizeDistrictLabel(value: any): string {
    return normalizeName(value || 'TIDAK DIKETAHUI');
}
