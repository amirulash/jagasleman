import { forwardRef, Fragment, useEffect, useMemo, useRef, useState } from 'react';
import {
    Circle,
    CircleMarker,
    GeoJSON,
    MapContainer,
    Marker,
    Popup,
    TileLayer,
    useMap,
    useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import 'leaflet/dist/leaflet.css';

import { Incident, EmergencyContact } from '@/data/dummy';
import { KDEZone } from '@/lib/kdeAnalysis';
import { UserLocation } from '@/lib/geolocation';
import { batasKecamatanGeojson } from '@/data/districtBoundaryGeojson';
import { batasDesaGeojson } from '@/data/villageBoundaryGeojson';

delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface MapViewProps {
    incidents?: Incident[];
    contacts?: EmergencyContact[];
    showHeatmap?: boolean;
    heatmapBandwidthKm?: number;
    hotspotClusters?: KDEZone[];
    center?: [number, number];
    zoom?: number;
    onClick?: (lat: number, lng: number) => void;
    clickMarker?: { lat: number; lng: number } | null;
    onClusterClick?: (cluster: KDEZone) => void;
    userLocation?: UserLocation | null;
    showDistrictBoundary?: boolean;
    fitDistrictBoundary?: boolean;
    showVillageBoundary?: boolean;
    showIncidentMarkers?: boolean;
    fitVillageBoundary?: boolean;
    villageBoundaryInteractive?: boolean;
}

const SLEMAN_BOUNDS = {
    minLat: -7.88,
    maxLat: -7.50,
    minLng: 110.18,
    maxLng: 110.62,
};


function isFiniteLeafletBounds(bounds: L.LatLngBounds): boolean {
    const south = bounds.getSouth();
    const north = bounds.getNorth();
    const west = bounds.getWest();
    const east = bounds.getEast();

    return [south, north, west, east].every(Number.isFinite);
}

function isReasonableSlemanBounds(bounds: L.LatLngBounds): boolean {
    if (!bounds.isValid() || !isFiniteLeafletBounds(bounds)) return false;

    const south = bounds.getSouth();
    const north = bounds.getNorth();
    const west = bounds.getWest();
    const east = bounds.getEast();

    const latSpan = Math.abs(north - south);
    const lngSpan = Math.abs(east - west);

    if (latSpan <= 0 || lngSpan <= 0) return false;
    if (latSpan > 1.2 || lngSpan > 1.2) return false;

    const slemanSafeBounds = L.latLngBounds(
        [SLEMAN_BOUNDS.minLat - 0.12, SLEMAN_BOUNDS.minLng - 0.12],
        [SLEMAN_BOUNDS.maxLat + 0.12, SLEMAN_BOUNDS.maxLng + 0.12],
    );

    return slemanSafeBounds.intersects(bounds);
}

function safeFitBounds(map: L.Map, bounds: L.LatLngBounds, options?: L.FitBoundsOptions) {
    if (!isReasonableSlemanBounds(bounds)) return;

    try {
        map.fitBounds(bounds, {
            padding: [36, 36],
            maxZoom: 13,
            ...options,
        });
    } catch (error) {
        // Prevent Leaflet from crashing when GeoJSON bounds are invalid or too wide.
        map.setView([-7.716, 110.355], 12);
    }
}


const incidentColor: Record<string, string> = {
    PENGEROYOKAN: '#D95F5F',
    PENGRUSAKAN: '#D95F5F',
    PENGANIAYAAN: '#1A3348',
    'PENYALAHGUNAAN SENJATA TAJAM': '#0F1F2E',
    'PENCURIAN DENGAN KEKERASAN (CURAS)': '#D95F5F',
    'PEMERASAN DAN PENGANCAMAN': '#D8E4ED',
    Pencurian: '#D95F5F',
    Perampokan: '#D95F5F',
    Kecelakaan: '#D95F5F',
    Kebakaran: '#D95F5F',
    Tawuran: '#1A3348',
    Vandalisme: '#D95F5F',
    Kejahatan: '#D95F5F',
    Laporan: '#D95F5F',
};

const incidentShortLabel: Record<string, string> = {
    PENGEROYOKAN: 'PK',
    PENGRUSAKAN: 'PR',
    PENGANIAYAAN: 'PA',
    'PENYALAHGUNAAN SENJATA TAJAM': 'SJ',
    'PENCURIAN DENGAN KEKERASAN (CURAS)': 'CR',
    'PEMERASAN DAN PENGANCAMAN': 'PM',
    Pencurian: 'PC',
    Perampokan: 'RP',
    Kecelakaan: 'KL',
    Kebakaran: 'KB',
    Tawuran: 'TW',
    Vandalisme: 'VD',
    Kejahatan: 'KJ',
    Laporan: 'LP',
};

const districtColorPalette = [
    '#D95F5F',
    '#D95F5F',
    '#D95F5F',
    '#D95F5F',
    '#D95F5F',
    '#D95F5F',
    '#1A3348',
    '#D95F5F',
    '#D95F5F',
    '#1A3348',
    '#D95F5F',
    '#D95F5F',
    '#0d9488',
    '#D95F5F',
    '#be123c',
    '#1A3348',
    '#64748b',
];

const districtColorMap = new Map<string, string>();

type BasemapKey = 'jalan' | 'satelit' | 'gelap';

const BASEMAP_OPTIONS: Array<{
    key: BasemapKey;
    title: string;
    desc: string;
    icon: string;
    url: string;
    attribution: string;
    subdomains?: string[];
    maxZoom?: number;
}> = [
    {
        key: 'jalan',
        title: 'Peta Jalan',
        desc: 'Detail jalan dan permukiman',
        icon: '🗺️',
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        subdomains: ['a', 'b', 'c', 'd'],
    },
    {
        key: 'satelit',
        title: 'Satelit',
        desc: 'Citra hybrid Google',
        icon: '🛰️',
        attribution: '&copy; Google Maps',
        url: 'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        maxZoom: 20,
    },
    {
        key: 'gelap',
        title: 'Gelap',
        desc: 'Basemap kontras malam',
        icon: '🌙',
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        subdomains: ['a', 'b', 'c', 'd'],
    },
];


function MapStyle() {
    return (
        <style>
            {`
                .jagasleman-leaflet-map {
                    background: #f8fafc;
                    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                }

                .jagasleman-leaflet-map .leaflet-control-attribution {
                    border-radius: 999px 0 0 0;
                    background: rgba(255, 255, 255, 0.88);
                    color: #64748b;
                    font-size: 10px;
                    font-weight: 700;
                    backdrop-filter: blur(10px);
                    padding: 4px 8px;
                }

                .jagasleman-leaflet-map .leaflet-control-layers {
                    border: 1px solid rgba(191, 209, 222, 0.98);
                    border-radius: 18px;
                    box-shadow: 0 18px 36px rgba(15, 23, 42, 0.16);
                    overflow: hidden;
                    background: rgba(255, 255, 255, 0.98);
                    backdrop-filter: blur(14px);
                }

                .jagasleman-leaflet-map .leaflet-top.leaflet-left .leaflet-control-layers {
                    margin-top: 122px;
                    margin-left: 12px;
                }

                .jagasleman-leaflet-map .leaflet-control-layers-toggle {
                    width: 48px;
                    height: 48px;
                    border-radius: 16px;
                    background-color: #ffffff;
                    background-image: url('/images/logo_jagasleman.png');
                    background-size: 26px 26px;
                    background-position: center;
                    background-repeat: no-repeat;
                }

                .jagasleman-leaflet-map .leaflet-control-layers-expanded {
                    padding: 14px 14px 12px;
                    min-width: 196px;
                }

                .jagasleman-leaflet-map .leaflet-control-layers-expanded::before {
                    content: 'Basemap';
                    display: block;
                    margin-bottom: 10px;
                    padding-bottom: 8px;
                    border-bottom: 1px solid rgba(191,209,222,.95);
                    color: #0F1F2E;
                    font-size: 12px;
                    font-weight: 900;
                    letter-spacing: .12em;
                    text-transform: uppercase;
                }

                .jagasleman-leaflet-map .leaflet-control-layers label {
                    margin: 6px 0;
                    font-size: 12px;
                    font-weight: 800;
                    color: #334155;
                }

                .jagasleman-leaflet-map .leaflet-control-layers-list {
                    display: grid;
                    gap: 8px;
                }

                .jagasleman-leaflet-map .leaflet-control-layers-base label {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin: 0;
                    border-radius: 14px;
                    border: 1px solid rgba(216, 228, 237, 0.95);
                    background: #EFF4F8;
                    padding: 9px 10px;
                    color: #1A3348;
                    cursor: pointer;
                    transition: 0.18s ease;
                }

                .jagasleman-leaflet-map .leaflet-control-layers-base label:hover {
                    background: #ffffff;
                    border-color: #D95F5F;
                    transform: translateY(-1px);
                }

                .jagasleman-leaflet-map .leaflet-control-layers-base input {
                    accent-color: #D95F5F;
                }

                .district-boundary-tooltip .leaflet-tooltip-content {
                    margin: 0;
                }


                .jagasleman-basemap-panel {
                    position: absolute;
                    left: 12px;
                    top: 122px;
                    z-index: 850;
                    pointer-events: auto;
                    font-family: "Plus Jakarta Sans", system-ui, sans-serif;
                }

                .jagasleman-basemap-toggle {
                    width: 48px;
                    height: 48px;
                    border-radius: 18px;
                    border: 1px solid #D8E4ED;
                    background: #ffffff;
                    color: #27527A;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 18px 38px rgba(15,31,46,.18);
                    cursor: pointer;
                    transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease;
                }

                .jagasleman-basemap-toggle:hover {
                    transform: translateY(-2px);
                    border-color: #5BAE8A;
                    box-shadow: 0 22px 48px rgba(91,174,138,.18);
                }

                .jagasleman-basemap-toggle-icon {
                    font-size: 22px;
                    line-height: 1;
                }

                .jagasleman-basemap-menu {
                    margin-top: 10px;
                    width: 226px;
                    border: 1px solid #D8E4ED;
                    border-radius: 22px;
                    background: rgba(255,255,255,.97);
                    color: #0F1F2E;
                    box-shadow: 0 24px 60px rgba(15,31,46,.22);
                    padding: 12px;
                    backdrop-filter: blur(14px);
                }

                .jagasleman-basemap-title {
                    margin-bottom: 10px;
                    padding: 0 4px 9px;
                    border-bottom: 1px solid #D8E4ED;
                    color: #27527A;
                    font-size: 11px;
                    font-weight: 900;
                    letter-spacing: .16em;
                    text-transform: uppercase;
                }

                .jagasleman-basemap-option {
                    width: 100%;
                    display: grid;
                    grid-template-columns: 42px 1fr;
                    gap: 10px;
                    align-items: center;
                    border: 1px solid transparent;
                    border-radius: 16px;
                    background: transparent;
                    padding: 9px;
                    text-align: left;
                    color: #0F1F2E;
                    cursor: pointer;
                    transition: background .18s ease, border-color .18s ease, transform .18s ease;
                }

                .jagasleman-basemap-option:hover,
                .jagasleman-basemap-option.is-active {
                    background: #EFF4F8;
                    border-color: #5BAE8A;
                    transform: translateY(-1px);
                }

                .jagasleman-basemap-option-icon {
                    display: flex;
                    width: 42px;
                    height: 42px;
                    align-items: center;
                    justify-content: center;
                    border-radius: 14px;
                    background: linear-gradient(135deg, #27527A, #5BAE8A);
                    color: #ffffff;
                    font-size: 20px;
                    box-shadow: inset 0 0 0 1px rgba(255,255,255,.18);
                }

                .jagasleman-basemap-option-title {
                    display: block;
                    color: #0F1F2E;
                    font-size: 13px;
                    font-weight: 900;
                    line-height: 1.1;
                }

                .jagasleman-basemap-option-desc {
                    display: block;
                    margin-top: 3px;
                    color: #5C7186;
                    font-size: 10px;
                    font-weight: 700;
                    line-height: 1.25;
                }



                .jagasleman-leaflet-map .leaflet-popup-content-wrapper {
                    border-radius: 24px;
                    box-shadow: 0 24px 60px rgba(15, 23, 42, 0.24);
                    border: 1px solid rgba(226, 232, 240, 0.95);
                    overflow: hidden;
                }

                .jagasleman-leaflet-map .leaflet-popup-content {
                    margin: 0;
                    width: auto !important;
                }

                .jagasleman-leaflet-map .leaflet-popup-tip {
                    box-shadow: 0 12px 30px rgba(15, 23, 42, 0.16);
                }

                .jagasleman-leaflet-map .leaflet-popup-close-button {
                    width: 28px !important;
                    height: 28px !important;
                    top: 10px !important;
                    right: 10px !important;
                    border-radius: 999px;
                    background: #f1f5f9 !important;
                    color: #475569 !important;
                    font-size: 20px !important;
                    line-height: 26px !important;
                    transition: 0.18s ease;
                }

                .jagasleman-leaflet-map .leaflet-popup-close-button:hover {
                    background: #e2e8f0 !important;
                    color: #0f172a !important;
                }

                .district-boundary-popup .leaflet-popup-content-wrapper,
                .village-boundary-popup .leaflet-tooltip {
                    border-radius: 18px;
                }

                .jaga-map-icon {
                    background: transparent;
                    border: none;
                }

                .leaflet-interactive {
                    outline: none;
                }
            `}
        </style>
    );
}

function normalizeText(value: any) {
    return String(value || '')
        .trim()
        .replace(/\s+/g, ' ');
}

function titleCase(value: any) {
    const text = normalizeText(value).toLowerCase();

    if (!text) return '-';

    return text.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeDistrictName(name: string) {
    return normalizeText(name || 'LAINNYA')
        .toUpperCase()
        .replace(/^KECAMATAN\s+/i, '');
}

function getDistrictColor(kecamatan: string) {
    const normalized = normalizeDistrictName(kecamatan);

    if (!districtColorMap.has(normalized)) {
        const index = districtColorMap.size % districtColorPalette.length;
        districtColorMap.set(normalized, districtColorPalette[index]);
    }

    return districtColorMap.get(normalized) || '#D95F5F';
}

function getIncidentType(incident: Incident | any) {
    return (
        incident?.kategori ||
        incident?.category ||
        incident?.type ||
        incident?.jenis ||
        incident?.jenis_kejadian ||
        'Kejahatan'
    );
}

function getIncidentTypeLabel(type: any) {
    const text = normalizeText(type);

    if (!text) return 'Kejahatan';

    if (text === text.toUpperCase()) {
        return titleCase(text);
    }

    return text;
}

function getIncidentSource(incident: any) {
    const sourceText = String(
        incident?.source ||
            incident?.data_source ||
            incident?.origin ||
            incident?.sumber ||
            '',
    ).toLowerCase();

    if (
        sourceText.includes('report') ||
        sourceText.includes('lapor') ||
        sourceText.includes('warga') ||
        incident?.reportCode ||
        incident?.report_code
    ) {
        return 'report';
    }

    return 'dummy';
}

function getIncidentReportCode(incident: any) {
    if (incident?.reportCode) return incident.reportCode;
    if (incident?.report_code) return incident.report_code;
    if (incident?.kode_laporan) return incident.kode_laporan;

    const source = getIncidentSource(incident);

    if (source === 'report') {
        const cleanId = String(incident?.id || '')
            .replace('report-', '')
            .replace('laporan-', '');

        return `LAP-${cleanId.padStart(4, '0')}`;
    }

    return null;
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

function getIncidentPhotoUrl(incident: any) {
    return getIncidentPhotoUrls(incident)[0] ?? null;
}

function getIncidentDate(incident: any) {
    return (
        incident?.date ||
        incident?.incident_date ||
        incident?.tanggal ||
        incident?.tanggal_kejadian ||
        incident?.created_at ||
        '-'
    );
}

function getIncidentTime(incident: any) {
    return (
        incident?.time ||
        incident?.incident_time ||
        incident?.jam ||
        incident?.jam_kejadian ||
        ''
    );
}

function getIncidentLocation(incident: any) {
    return (
        incident?.location ||
        incident?.address ||
        incident?.alamat ||
        incident?.alamat_kejadian ||
        '-'
    );
}

function getIncidentVillage(incident: any) {
    return incident?.desa || incident?.village || incident?.kelurahan || incident?.kalurahan || '-';
}

function getIncidentDistrict(incident: any) {
    return incident?.kecamatan || incident?.district || incident?.wilayah || '-';
}

function getIncidentDescription(incident: any) {
    return (
        incident?.description ||
        incident?.deskripsi ||
        incident?.keterangan ||
        incident?.chronology ||
        incident?.kronologi ||
        '-'
    );
}

function getIncidentColor(type: string) {
    return incidentColor[type] || incidentColor[getIncidentTypeLabel(type)] || '#D95F5F';
}

function getIncidentLabel(type: string) {
    return (
        incidentShortLabel[type] ||
        incidentShortLabel[getIncidentTypeLabel(type)] ||
        String(type || 'KJ').slice(0, 2).toUpperCase()
    );
}

export function getIncidentHeatWeight(incident: any) {
    const type = String(getIncidentType(incident)).toUpperCase();

    if (type.includes('SENJATA')) return 1.45;
    if (type.includes('CURAS') || type.includes('KEKERASAN')) return 1.4;
    if (type.includes('PENGANIAYAAN')) return 1.3;
    if (type.includes('PENGEROYOKAN')) return 1.25;
    if (type.includes('PEMERASAN') || type.includes('PENGANCAMAN')) return 1.15;
    if (type.includes('PENGRUSAKAN')) return 1.05;
    if (type.includes('PERAMPOKAN')) return 1.35;
    if (type.includes('PENCURIAN')) return 1.2;
    if (type.includes('TAWURAN')) return 1.25;
    if (type.includes('KEBAKARAN')) return 1.0;
    if (type.includes('KECELAKAAN')) return 0.95;

    return 1;
}

function isInsideRoughSlemanBounds(lat: number, lng: number) {
    return (
        lat >= SLEMAN_BOUNDS.minLat &&
        lat <= SLEMAN_BOUNDS.maxLat &&
        lng >= SLEMAN_BOUNDS.minLng &&
        lng <= SLEMAN_BOUNDS.maxLng
    );
}

function pointInRing(lng: number, lat: number, ring: any[]) {
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

function pointInPolygon(lng: number, lat: number, polygon: any[]) {
    if (!Array.isArray(polygon) || !polygon.length) return false;

    const outerRing = polygon[0];

    if (!pointInRing(lng, lat, outerRing)) return false;

    for (let i = 1; i < polygon.length; i++) {
        if (pointInRing(lng, lat, polygon[i])) return false;
    }

    return true;
}

function geometryContainsPoint(geometry: any, lat: number, lng: number) {
    if (!geometry) return false;

    if (geometry.type === 'Polygon') {
        return pointInPolygon(lng, lat, geometry.coordinates);
    }

    if (geometry.type === 'MultiPolygon') {
        return geometry.coordinates.some((polygon: any[]) => pointInPolygon(lng, lat, polygon));
    }

    return false;
}

function geoJsonContainsPoint(geojson: any, lat: number, lng: number) {
    const features = geojson?.type === 'FeatureCollection' ? geojson.features : [geojson];

    if (!Array.isArray(features) || !features.length) return false;

    return features.some((feature: any) => geometryContainsPoint(feature?.geometry, lat, lng));
}

function isInsideSlemanBoundary(lat: number, lng: number) {
    if (!isInsideRoughSlemanBounds(lat, lng)) return false;

    try {
        return geoJsonContainsPoint(batasKecamatanGeojson as any, lat, lng);
    } catch {
        return true;
    }
}

function sanitizeIncidents(incidents: Incident[] = []) {
    return incidents
        .map((incident: any) => {
            const lat = Number(incident?.lat ?? incident?.latitude);
            const lng = Number(incident?.lng ?? incident?.longitude ?? incident?.lon);

            return {
                ...incident,
                lat,
                lng,
            };
        })
        .filter((incident: any) => {
            const lat = Number(incident.lat);
            const lng = Number(incident.lng);

            return Number.isFinite(lat) && Number.isFinite(lng) && isInsideSlemanBoundary(lat, lng);
        });
}

function svgIcon(html: string, size: [number, number], anchor: [number, number]) {
    return L.divIcon({
        className: 'jaga-map-icon',
        html,
        iconSize: size,
        iconAnchor: anchor,
        popupAnchor: [0, -Math.max(anchor[1] - 4, 12)],
    });
}

function createIncidentIcon(type: string, source: string) {
    const color = getIncidentColor(type);
    const label = getIncidentLabel(type);
    const isReport = source === 'report';

    if (isReport) {
        return svgIcon(
            `<div style="position:relative;width:42px;height:48px;display:flex;align-items:center;justify-content:center;">
                <div style="position:absolute;top:1px;width:38px;height:38px;border-radius:18px;background:linear-gradient(135deg,#D95F5F,#14b8a6);border:4px solid #fff;box-shadow:0 18px 30px rgba(15,118,110,.34);display:flex;align-items:center;justify-content:center;">
                    <div style="width:20px;height:20px;border-radius:999px;background:white;color:#D95F5F;display:flex;align-items:center;justify-content:center;font:900 9px system-ui;">
                        ${label}
                    </div>
                </div>
                <div style="position:absolute;right:-3px;top:-4px;background:#facc15;color:#422006;border:2px solid #fff;border-radius:999px;padding:2px 5px;font:900 8px system-ui;box-shadow:0 8px 16px rgba(15,23,42,.22);">
                    LAP
                </div>
                <div style="position:absolute;bottom:2px;width:13px;height:13px;background:#D95F5F;transform:rotate(45deg);border-right:4px solid #fff;border-bottom:4px solid #fff;box-shadow:8px 8px 14px rgba(15,23,42,.16);"></div>
            </div>`,
            [42, 48],
            [21, 46],
        );
    }

    return svgIcon(
        `<div style="position:relative;width:34px;height:40px;display:flex;align-items:center;justify-content:center;">
            <div style="position:absolute;top:2px;width:30px;height:30px;border-radius:999px;background:${color};border:3px solid #fff;box-shadow:0 14px 24px rgba(15,23,42,.28);"></div>
            <div style="position:absolute;top:10px;width:14px;height:14px;border-radius:999px;background:rgba(255,255,255,.94);display:flex;align-items:center;justify-content:center;font:900 8px system-ui;color:${color};">${label}</div>
            <div style="position:absolute;bottom:4px;width:11px;height:11px;background:${color};transform:rotate(45deg);border-right:3px solid #fff;border-bottom:3px solid #fff;box-shadow:8px 8px 14px rgba(15,23,42,.12);"></div>
        </div>`,
        [34, 40],
        [17, 38],
    );
}

function createContactIcon(type: 'Polsek' | 'Rumah Sakit') {
    const isPolice = type === 'Polsek';
    const color = isPolice ? '#D95F5F' : '#D95F5F';
    const bg = isPolice ? '#e0f2fe' : '#dcfce7';

    const symbol = isPolice
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 4v5c0 5-3 8-7 9-4-1-7-4-7-9V7l7-4Z"/><path d="M9 12h6"/><path d="M12 9v6"/></svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6v12"/><path d="M6 12h12"/><rect x="4" y="4" width="16" height="16" rx="4"/></svg>`;

    return svgIcon(
        `<div style="width:36px;height:36px;border-radius:16px;background:${color};border:4px solid #fff;box-shadow:0 15px 25px rgba(15,23,42,.25);display:flex;align-items:center;justify-content:center;outline:6px solid ${bg};">${symbol}</div>`,
        [42, 42],
        [21, 21],
    );
}

function createReportMarkerIcon() {
    return svgIcon(
        `<div style="position:relative;width:46px;height:46px;display:flex;align-items:center;justify-content:center;">
            <div style="position:absolute;inset:0;border-radius:999px;background:rgba(239,68,68,.18);box-shadow:0 0 0 10px rgba(239,68,68,.08);"></div>
            <div style="width:32px;height:32px;border-radius:999px;background:#D95F5F;border:4px solid #fff;box-shadow:0 16px 28px rgba(239,68,68,.42);display:flex;align-items:center;justify-content:center;color:white;font:900 16px system-ui;">
                !
            </div>
        </div>`,
        [46, 46],
        [23, 23],
    );
}

function createClusterIcon(count: number) {
    const size = count >= 50 ? 58 : count >= 20 ? 52 : count >= 10 ? 46 : 40;
    const color = count >= 50 ? '#D95F5F' : count >= 20 ? '#D95F5F' : count >= 10 ? '#D95F5F' : '#1A3348';
    const ring = count >= 50 ? 'rgba(217,95,95,.18)' : 'rgba(91,174,138,.18)';

    return svgIcon(
        `<div style="position:relative;width:${size}px;height:${size}px;border-radius:999px;background:linear-gradient(135deg,${color},#0F1F2E);border:4px solid #EFF4F8;box-shadow:0 20px 38px rgba(15,31,46,.32);display:flex;align-items:center;justify-content:center;outline:8px solid ${ring};color:white;font:900 13px system-ui;">
            <span style="position:absolute;inset:7px;border-radius:999px;border:1px solid rgba(255,255,255,.24)"></span>
            <span style="position:relative;z-index:2">${count}</span>
        </div>`,
        [size, size],
        [size / 2, size / 2],
    );
}

function ClickHandler({ onClick }: { onClick?: (lat: number, lng: number) => void }) {
    useMapEvents({
        click(e) {
            onClick?.(e.latlng.lat, e.latlng.lng);
        },
    });

    return null;
}

function MapInvalidation() {
    const map = useMap();

    useEffect(() => {
        const timers = [
            window.setTimeout(() => map.invalidateSize(), 100),
            window.setTimeout(() => map.invalidateSize(), 350),
            window.setTimeout(() => map.invalidateSize(), 800),
        ];

        return () => timers.forEach((timer) => window.clearTimeout(timer));
    }, [map]);

    return null;
}

function getFeatureInfo(feature: any) {
    const props = feature?.properties || {};

    return {
        desa:
            props.wadmkd ||
            props.WADMKD ||
            props.namobj ||
            props.NAMOBJ ||
            props.DESA ||
            props.desa ||
            props.name ||
            'Desa tidak tersedia',
        kecamatan:
            props.wadmkc ||
            props.WADMKC ||
            props.kecamatan ||
            props.KECAMATAN ||
            props.nama_kecamatan ||
            props.KEC ||
            'Kecamatan Sleman',
        kabupaten:
            props.wadmkk ||
            props.WADMKK ||
            props.kabupaten ||
            props.KABUPATEN ||
            'Sleman',
    };
}

function DistrictBoundaryLayer({
    fitDistrictBoundary = false,
    incidents = [],
}: {
    fitDistrictBoundary?: boolean;
    incidents?: any[];
}) {
    const map = useMap();
    const geojsonRef = useRef<L.GeoJSON | null>(null);
    const districtIncidentCounts = useMemo(() => {
        const counts = new Map<string, number>();

        incidents.forEach((item: any) => {
            const key = normalizeDistrictName(item?.kecamatan ?? item?.district ?? item?.wilayah ?? '');
            if (!key) return;
            counts.set(key, (counts.get(key) ?? 0) + 1);
        });

        return counts;
    }, [incidents]);

    useEffect(() => {
        if (!geojsonRef.current || !fitDistrictBoundary) return;

        const bounds = geojsonRef.current.getBounds();

        safeFitBounds(map, bounds, { maxZoom: 12 });
    }, [map, fitDistrictBoundary]);

    return (
        <GeoJSON
            ref={(layer) => {
                geojsonRef.current = layer;
            }}
            data={batasKecamatanGeojson as any}
            style={() => ({
                color: '#0F1F2E',
                weight: 1.6,
                opacity: 0.72,
                fillColor: '#5BAE8A',
                fillOpacity: 0.018,
                dashArray: '6 5',
                interactive: true,
            })}
            onEachFeature={(feature, layer) => {
                const { kecamatan, kabupaten } = getFeatureInfo(feature);
                const normalizedDistrict = normalizeDistrictName(kecamatan);
                const totalIncidents = districtIncidentCounts.get(normalizedDistrict) ?? 0;

                layer.bindPopup(
                    `<div class="jaga-boundary-popup">
                        <div class="jaga-boundary-popup-title">Kecamatan ${titleCase(kecamatan)}</div>
                        <div class="jaga-boundary-popup-muted">Wilayah administrasi Kabupaten ${titleCase(kabupaten)}</div>
                        <div class="jaga-boundary-popup-count">${totalIncidents} kejadian terfilter</div>
                    </div>`,
                    { className: 'district-boundary-popup', maxWidth: 220 },
                );

                layer.bindTooltip(
                    `<div style="min-width:170px;padding:10px 12px;border-radius:16px">
                        <div style="font-weight:900;font-size:13px;color:#0F1F2E;margin-bottom:4px">Kecamatan ${titleCase(kecamatan)}</div>
                        <div style="font-size:12px;color:#D95F5F;font-weight:800">Kabupaten ${titleCase(kabupaten)}</div>
                    </div>`,
                    {
                        sticky: true,
                        direction: 'top',
                        opacity: 1,
                        className: 'district-boundary-tooltip',
                    },
                );

                layer.on({
                    mouseover: (e: L.LeafletMouseEvent) => {
                        const target = e.target as any;

                        target.setStyle({
                            color: '#D95F5F',
                            weight: 4,
                            opacity: 1,
                            fillColor: '#D95F5F',
                            fillOpacity: 0.06,
                            dashArray: '0',
                        });

                        if (target.bringToFront) target.bringToFront();
                        
                    },
                    mouseout: (e: L.LeafletMouseEvent) => {
                        const target = e.target as any;
                        if (geojsonRef.current) geojsonRef.current.resetStyle(target);
                        
                    },
                });
            }}
        />
    );
}

function VillageBoundaryLayer({
    fitVillageBoundary = false,
    interactive = true,
    onClick,
}: {
    fitVillageBoundary?: boolean;
    interactive?: boolean;
    onClick?: (lat: number, lng: number) => void;
}) {
    const map = useMap();
    const geojsonRef = useRef<L.GeoJSON | null>(null);

    useEffect(() => {
        if (!geojsonRef.current || !fitVillageBoundary) return;

        const bounds = geojsonRef.current.getBounds();

        safeFitBounds(map, bounds, { maxZoom: 12 });
    }, [map, fitVillageBoundary]);

    return (
        <GeoJSON
            ref={(layer) => {
                geojsonRef.current = layer;
            }}
            data={batasDesaGeojson as any}
            interactive={interactive}
            style={(feature?: any) => {
                const { kecamatan } = getFeatureInfo(feature);
                const color = getDistrictColor(kecamatan);

                return {
                    color,
                    weight: 1.1,
                    opacity: 0.8,
                    fillColor: color,
                    fillOpacity: 0.09,
                };
            }}
            onEachFeature={
                interactive
                    ? (feature, layer) => {
                          const { desa, kecamatan, kabupaten } = getFeatureInfo(feature);
                          const districtColor = getDistrictColor(kecamatan);

                          layer.bindTooltip(
                              `<div style="min-width:190px;padding:10px 12px">
                                <div style="font-weight:900;font-size:13px;color:#0f172a;margin-bottom:4px">${titleCase(desa)}</div>
                                <div style="font-size:12px;color:#334155;font-weight:700">Kecamatan: ${titleCase(kecamatan)}</div>
                                <div style="font-size:12px;color:#64748b;font-weight:700">Kabupaten ${titleCase(kabupaten)}</div>
                            </div>`,
                              {
                                  sticky: true,
                                  direction: 'top',
                                  opacity: 1,
                                  className: 'village-boundary-popup',
                              },
                          );

                          layer.on({
                              mouseover: (e: L.LeafletMouseEvent) => {
                                  const target = e.target as any;

                                  target.setStyle({
                                      color: districtColor,
                                      weight: 3,
                                      opacity: 1,
                                      fillColor: districtColor,
                                      fillOpacity: 0.23,
                                  });

                                  if (target.bringToFront) target.bringToFront();
                              },
                              mouseout: (e: L.LeafletMouseEvent) => {
                                  const target = e.target as any;

                                  if (geojsonRef.current) {
                                      geojsonRef.current.resetStyle(target);
                                  }
                              },
                              click: (e: L.LeafletMouseEvent) => {
                                  if (e.originalEvent) {
                                      L.DomEvent.stopPropagation(e.originalEvent);
                                      L.DomEvent.preventDefault(e.originalEvent);
                                  }

                                  onClick?.(e.latlng.lat, e.latlng.lng);
                              },
                          });
                      }
                    : undefined
            }
        />
    );
}


function BasemapControl() {
    const [selected, setSelected] = useState<BasemapKey>('jalan');
    const [open, setOpen] = useState(false);
    const controlRef = useRef<HTMLDivElement | null>(null);
    const active = BASEMAP_OPTIONS.find((item) => item.key === selected) ?? BASEMAP_OPTIONS[0];

    useEffect(() => {
        if (!controlRef.current) return;
        L.DomEvent.disableClickPropagation(controlRef.current);
        L.DomEvent.disableScrollPropagation(controlRef.current);
    }, []);

    return (
        <>
            <TileLayer
                key={active.key}
                attribution={active.attribution}
                url={active.url}
                subdomains={active.subdomains}
                maxZoom={active.maxZoom}
            />

            <div ref={controlRef} className="jagasleman-basemap-panel">
                <button
                    type="button"
                    onClick={() => setOpen((value) => !value)}
                    className="jagasleman-basemap-toggle"
                    aria-label="Pilih basemap"
                    title="Pilih basemap"
                >
                    <span className="jagasleman-basemap-toggle-icon">{active.icon}</span>
                </button>

                {open && (
                    <div className="jagasleman-basemap-menu">
                        <div className="jagasleman-basemap-title">Basemap</div>
                        {BASEMAP_OPTIONS.map((option) => (
                            <button
                                key={option.key}
                                type="button"
                                onClick={() => {
                                    setSelected(option.key);
                                    setOpen(false);
                                }}
                                className={`jagasleman-basemap-option ${selected === option.key ? 'is-active' : ''}`}
                            >
                                <span className="jagasleman-basemap-option-icon">{option.icon}</span>
                                <span className="min-w-0">
                                    <span className="jagasleman-basemap-option-title">{option.title}</span>
                                    <span className="jagasleman-basemap-option-desc">{option.desc}</span>
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}


function MapControlPanel() {
    const map = useMap();

    const handleFullscreen = () => {
        const container = map.getContainer() as HTMLElement & {
            webkitRequestFullscreen?: () => Promise<void> | void;
            msRequestFullscreen?: () => Promise<void> | void;
        };

        if (document.fullscreenElement) {
            document.exitFullscreen?.();
            return;
        }

        if (container.requestFullscreen) {
            container.requestFullscreen();
        } else if (container.webkitRequestFullscreen) {
            container.webkitRequestFullscreen();
        } else if (container.msRequestFullscreen) {
            container.msRequestFullscreen();
        }
    };

    return (
        <div className="jagasleman-map-action-controls">
            <button type="button" onClick={() => map.zoomIn()} aria-label="Perbesar peta" title="Perbesar peta">+</button>
            <button type="button" onClick={() => map.zoomOut()} aria-label="Perkecil peta" title="Perkecil peta">−</button>
            <button type="button" onClick={handleFullscreen} aria-label="Fullscreen peta" title="Fullscreen peta">⛶</button>
        </div>
    );
}

function KdeLegendControl() {
    const levels = [
        { label: 'Rendah', color: '#22C55E' },
        { label: 'Sedang', color: '#FACC15' },
        { label: 'Tinggi', color: '#F97316' },
        { label: 'Sangat Tinggi', color: '#E11D48' },
    ];

    return (
        <div className="jagasleman-kde-legend">
            <div className="jagasleman-kde-legend-title">Intensitas KDE</div>
            <div className="jagasleman-kde-gradient" />
            <div className="jagasleman-kde-legend-grid">
                {levels.map((level) => (
                    <div key={level.label} className="jagasleman-kde-legend-item">
                        <span style={{ backgroundColor: level.color }} />
                        <b>{level.label}</b>
                    </div>
                ))}
            </div>
        </div>
    );
}


function ContinuousHeatmapLayer({
    incidents,
    bandwidthKm,
}: {
    incidents: Incident[];
    bandwidthKm: number;
}) {
    const map = useMap();

    useEffect(() => {
        if (!incidents.length) return;

        let heatLayer: any = null;

        const buildHeatmap = () => {
            if (heatLayer) {
                map.removeLayer(heatLayer);
                heatLayer = null;
            }

            const center = map.getCenter();
            const pointA = L.latLng(center.lat, center.lng);
            const pointB = L.latLng(center.lat, center.lng + 0.01);
            const meters = Math.max(map.distance(pointA, pointB), 1);
            const pxA = map.latLngToContainerPoint(pointA).x;
            const pxB = map.latLngToContainerPoint(pointB).x;
            const pxPerMeter = Math.abs(pxB - pxA) / meters;

            const radiusPx = Math.max(24, Math.min(86, bandwidthKm * 1000 * pxPerMeter));
            const blurPx = Math.max(14, Math.round(radiusPx * 0.48));

            const heatPoints: Array<[number, number, number]> = incidents
                .map((inc: any) => {
                    const lat = Number(inc.lat);
                    const lng = Number(inc.lng);
                    const weight = getIncidentHeatWeight(inc);

                    return [lat, lng, weight] as [number, number, number];
                })
                .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));

            if (!heatPoints.length) return;

            const maxWeight = Math.max(...heatPoints.map((item) => item[2]), 1);

            heatLayer = (L as any).heatLayer(heatPoints, {
                radius: radiusPx,
                blur: blurPx,
                max: Math.max(1, maxWeight * 0.72),
                minOpacity: 0.22,
                maxZoom: 17,
                gradient: {
                    0.0: '#14B8A6',
                    0.18: '#22C55E',
                    0.36: '#84CC16',
                    0.55: '#FACC15',
                    0.74: '#F97316',
                    1.0: '#E11D48',
                },
            });

            const size = map.getSize();

            if (!size || size.x <= 0 || size.y <= 0) {
                return;
            }

            requestAnimationFrame(() => {
                const latestSize = map.getSize();

                if (!latestSize || latestSize.x <= 0 || latestSize.y <= 0) {
                    return;
                }

                try {
                    heatLayer.addTo(map);
                } catch (error) {
                    if (heatLayer) {
                        try {
                            map.removeLayer(heatLayer);
                        } catch {
                            // noop
                        }
                        heatLayer = null;
                    }
                }
            });
        };

        buildHeatmap();

        map.on('zoomend moveend resize', buildHeatmap);

        return () => {
            map.off('zoomend moveend resize', buildHeatmap);

            if (heatLayer) {
                map.removeLayer(heatLayer);
                heatLayer = null;
            }
        };
    }, [map, incidents, bandwidthKm]);

    return null;
}

function ClusteredIncidentMarkers({ incidents }: { incidents: Incident[] }) {
    const map = useMap();
    const [zoom, setZoom] = useState(() => map.getZoom());

    useEffect(() => {
        const handleZoom = () => setZoom(map.getZoom());

        map.on('zoomend', handleZoom);

        return () => {
            map.off('zoomend', handleZoom);
        };
    }, [map]);

    const clusterMode = incidents.length >= 80 && zoom < 13;

    const clusters = useMemo(() => {
        if (!clusterMode) return [];

        const cellSize = zoom <= 10 ? 0.032 : zoom <= 11 ? 0.022 : 0.014;
        const grouped = new Map<
            string,
            {
                latSum: number;
                lngSum: number;
                count: number;
                items: any[];
            }
        >();

        incidents.forEach((incident: any) => {
            const lat = Number(incident.lat);
            const lng = Number(incident.lng);

            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

            const key = `${Math.round(lat / cellSize)}:${Math.round(lng / cellSize)}`;

            if (!grouped.has(key)) {
                grouped.set(key, {
                    latSum: 0,
                    lngSum: 0,
                    count: 0,
                    items: [],
                });
            }

            const group = grouped.get(key)!;

            group.latSum += lat;
            group.lngSum += lng;
            group.count += 1;
            group.items.push(incident);
        });

        return Array.from(grouped.entries()).map(([key, group]) => ({
            key,
            lat: group.latSum / group.count,
            lng: group.lngSum / group.count,
            count: group.count,
            items: group.items,
        }));
    }, [clusterMode, incidents, zoom]);

    if (clusterMode) {
        return (
            <>
                {clusters.map((cluster) => {
                    if (cluster.count === 1) {
                        return <IncidentMarker key={cluster.key} incident={cluster.items[0]} />;
                    }

                    const topTypes = cluster.items.reduce((acc: Record<string, number>, item: any) => {
                        const type = getIncidentTypeLabel(getIncidentType(item));
                        acc[type] = (acc[type] || 0) + 1;
                        return acc;
                    }, {});

                    const dominantType =
                        Object.entries(topTypes).sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0] || 'Kejahatan';

                    return (
                        <Marker
                            key={cluster.key}
                            position={[cluster.lat, cluster.lng]}
                            icon={createClusterIcon(cluster.count)}
                            eventHandlers={{
                                click: () => {
                                    map.flyTo([cluster.lat, cluster.lng], Math.min(15, zoom + 2), {
                                        duration: 0.65,
                                    });
                                },
                            }}
                        >
                            <Popup>
                                <div className="w-[250px] p-4">
                                    <div className="mb-3 flex items-center gap-3">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white">
                                            {cluster.count}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-foreground">Kumpulan Titik Kejadian</p>
                                            <p className="text-xs font-bold text-slate-500">Klik marker untuk memperbesar peta</p>
                                        </div>
                                    </div>

                                    <div className="rounded-2xl bg-slate-50 p-3">
                                        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
                                            Dominan
                                        </p>
                                        <p className="mt-1 text-sm font-black text-slate-800">{dominantType}</p>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </>
        );
    }

    return (
        <>
            {incidents.map((incident: any) => (
                <IncidentMarker
                    key={`${getIncidentSource(incident)}-${incident.id || incident.lat + '-' + incident.lng}`}
                    incident={incident}
                />
            ))}
        </>
    );
}

function IncidentMarker({ incident }: { incident: any }) {
    const displayType = getIncidentType(incident);
    const typeLabel = getIncidentTypeLabel(displayType);
    const source = getIncidentSource(incident);
    const isReport = source === 'report';
    const reportCode = getIncidentReportCode(incident);
    const photoUrls = getIncidentPhotoUrls(incident);
    const [activePhotoIndex, setActivePhotoIndex] = useState(0);
    const activePhotoUrl = photoUrls[activePhotoIndex] ?? photoUrls[0] ?? null;
    const color = getIncidentColor(displayType);
    const date = getIncidentDate(incident);
    const time = getIncidentTime(incident);
    const location = getIncidentLocation(incident);
    const district = titleCase(getIncidentDistrict(incident));
    const village = titleCase(getIncidentVillage(incident));
    const description = getIncidentDescription(incident);

    const lat = Number(incident.lat);
    const lng = Number(incident.lng);

    return (
        <Marker position={[lat, lng]} icon={createIncidentIcon(displayType, source)}>
            <Popup className="incident-popup modern-popup compact-map-popup">
                <div className="w-[236px] max-w-[236px] overflow-hidden bg-white dark:bg-[#1A3348]">
                    <div className="px-3 pb-2.5 pt-3 text-white" style={{ background: `linear-gradient(135deg, ${color}, #0F1F2E)` }}>
                        <div className="flex items-start justify-between gap-3 pr-6">
                            <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/70">
                                    {isReport ? 'Laporan Warga' : 'Data Kepolisian'}
                                </p>
                                <p className="mt-1 line-clamp-2 text-base font-black leading-tight text-white">
                                    {typeLabel}
                                </p>
                            </div>

                            <span className="shrink-0 rounded-full border border-white/25 bg-white/15 px-2.5 py-1 text-[10px] font-black text-white backdrop-blur">
                                {isReport ? 'LAP' : 'POL'}
                            </span>
                        </div>

                        {reportCode && (
                            <div className="mt-3 inline-flex rounded-full border border-white/20 bg-white/15 px-3 py-1 text-[11px] font-black text-white">
                                {reportCode}
                            </div>
                        )}
                    </div>

                    {activePhotoUrl && (
                        <div className="relative h-20 w-full overflow-hidden bg-[#EFF4F8] dark:bg-[#0F1F2E]">
                            <img
                                src={activePhotoUrl}
                                alt={`Foto laporan kejadian ${activePhotoIndex + 1}`}
                                className="h-full w-full object-cover"
                                onError={(event) => {
                                    event.currentTarget.style.display = 'none';
                                }}
                            />

                            {photoUrls.length > 1 && (
                                <>
                                    <div className="absolute left-2 right-2 top-1/2 flex -translate-y-1/2 items-center justify-between">
                                        <button
                                            type="button"
                                            onClick={() => setActivePhotoIndex((prev) => (prev - 1 + photoUrls.length) % photoUrls.length)}
                                            className="flex h-7 w-7 items-center justify-center rounded-full bg-black/45 text-xs font-black text-white backdrop-blur transition hover:bg-black/70"
                                            aria-label="Foto sebelumnya"
                                        >
                                            ‹
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setActivePhotoIndex((prev) => (prev + 1) % photoUrls.length)}
                                            className="flex h-7 w-7 items-center justify-center rounded-full bg-black/45 text-xs font-black text-white backdrop-blur transition hover:bg-black/70"
                                            aria-label="Foto berikutnya"
                                        >
                                            ›
                                        </button>
                                    </div>

                                    <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-1.5">
                                        {photoUrls.map((_, index) => (
                                            <button
                                                key={`popup-photo-${index}`}
                                                type="button"
                                                onClick={() => setActivePhotoIndex(index)}
                                                className={`h-1.5 rounded-full transition ${activePhotoIndex === index ? 'w-5 bg-white' : 'w-1.5 bg-white/55'}`}
                                                aria-label={`Lihat foto ${index + 1}`}
                                            />
                                        ))}
                                    </div>

                                    <span className="absolute right-2 top-2 rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-black text-white backdrop-blur">
                                        {activePhotoIndex + 1}/{photoUrls.length}
                                    </span>
                                </>
                            )}
                        </div>
                    )}

                    <div className="max-h-[250px] space-y-2 overflow-y-auto p-3">
                        <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-2xl bg-[#EFF4F8] p-3 dark:bg-[#0F1F2E]/70">
                                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#D95F5F] dark:text-[#D95F5F]">Tanggal</p>
                                <p className="mt-1 text-xs font-black text-[#0F1F2E] dark:text-[#EFF4F8]">{date || '-'}</p>
                            </div>
                            <div className="rounded-2xl bg-[#EFF4F8] p-3 dark:bg-[#0F1F2E]/70">
                                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#D95F5F] dark:text-[#D95F5F]">Waktu</p>
                                <p className="mt-1 text-xs font-black text-[#0F1F2E] dark:text-[#EFF4F8]">{time || '-'}</p>
                            </div>
                        </div>

                        {location && location !== '-' && (
                            <div className="rounded-2xl border border-[#D8E4ED] bg-white p-3 dark:border-white/10 dark:bg-white/5">
                                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#D95F5F] dark:text-[#D95F5F]">Lokasi</p>
                                <p className="mt-1 line-clamp-3 text-xs font-bold leading-relaxed text-[#1A3348] dark:text-[#EFF4F8]/85">{location}</p>
                            </div>
                        )}

                        <div className="flex flex-wrap gap-2">
                            
                        </div>

                        {description && description !== '-' && (
                            <p className="rounded-2xl bg-[#EFF4F8] p-3 text-xs font-semibold leading-relaxed text-[#1A3348] dark:bg-[#0F1F2E]/70 dark:text-[#EFF4F8]/80">
                                {description}
                            </p>
                        )}

                        <a
                            href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex h-10 items-center justify-center rounded-2xl bg-[#0F1F2E] px-3 text-[11px] font-black text-white transition hover:bg-[#D95F5F] dark:bg-[#D95F5F] dark:text-[#0F1F2E]"
                        >
                            Buka di Google Maps
                        </a>
                    </div>
                </div>
            </Popup>
        </Marker>
    );
}

function EmergencyContactMarkers({ contacts }: { contacts: EmergencyContact[] }) {
    return (
        <>
            {contacts
                .filter((contact: any) => {
                    const lat = Number(contact?.lat);
                    const lng = Number(contact?.lng);

                    return Number.isFinite(lat) && Number.isFinite(lng);
                })
                .map((contact: any) => {
                    const contactType =
                        String(contact.type || '').toLowerCase().includes('rumah') ||
                        String(contact.type || '').toLowerCase().includes('rs') ||
                        String(contact.type || '').toLowerCase().includes('sakit')
                            ? 'Rumah Sakit'
                            : 'Polsek';

                    return (
                        <Marker
                            key={contact.id}
                            position={[Number(contact.lat), Number(contact.lng)]}
                            icon={createContactIcon(contactType)}
                        >
                            <Popup>
                                <div className="w-[230px] max-w-[230px] p-3">
                                    <div
                                        className={`mb-3 inline-flex rounded-full px-3 py-1 text-[11px] font-black ${
                                            contactType === 'Rumah Sakit'
                                                ? 'bg-[#EFF4F8] text-[#D95F5F]'
                                                : 'bg-[#EFF4F8] text-[#D95F5F]'
                                        }`}
                                    >
                                        {contactType}
                                    </div>

                                    <p className="text-base font-black leading-tight text-foreground">
                                        {contact.name || '-'}
                                    </p>

                                    <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-500">
                                        {contact.address || '-'}
                                    </p>

                                    <p className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-black text-slate-700">
                                        Telepon: {contact.phone || '-'}
                                    </p>

                                    {contact.distanceText && (
                                        <p className="mt-2 text-xs font-black text-[#D95F5F]">
                                            Jarak dari lokasi Anda: {contact.distanceText}
                                        </p>
                                    )}

                                    {contact.website && (
                                        <a
                                            href={contact.website}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="mt-3 block rounded-2xl bg-slate-950 px-3 py-2 text-center text-xs font-black text-white transition hover:bg-slate-800"
                                        >
                                            Buka Google Maps
                                        </a>
                                    )}
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
        </>
    );
}

function SelectedLocationMarker({ clickMarker }: { clickMarker: { lat: number; lng: number } | null }) {
    if (!clickMarker) return null;

    return (
        <Marker position={[Number(clickMarker.lat), Number(clickMarker.lng)]} icon={createReportMarkerIcon()}>
            <Popup>
                <div className="w-[210px] max-w-[210px] p-3">
                    <p className="text-sm font-black text-foreground">Lokasi Laporan Dipilih</p>
                    <p className="mt-1 font-mono text-xs font-bold text-slate-500">
                        {Number(clickMarker.lat).toFixed(6)}, {Number(clickMarker.lng).toFixed(6)}
                    </p>
                    <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-500">
                        Klik ulang pada peta untuk mengganti titik lokasi.
                    </p>
                </div>
            </Popup>
        </Marker>
    );
}

function HotspotClusterLayer({
    hotspotClusters,
    onClusterClick,
}: {
    hotspotClusters: KDEZone[];
    onClusterClick?: (cluster: KDEZone) => void;
}) {
    return (
        <>
            {hotspotClusters.map((cluster) => {
                const center: [number, number] = [Number(cluster.centerLat), Number(cluster.centerLng)];
                const radius = Number(cluster.radius) * 1000;

                return (
                    <Fragment key={cluster.id}>
                        <Circle
                            center={center}
                            radius={radius * 1.8}
                            pathOptions={{
                                color: 'transparent',
                                fillColor: cluster.color,
                                fillOpacity: 0.08,
                            }}
                        />

                        <Circle
                            center={center}
                            radius={radius * 1.25}
                            pathOptions={{
                                color: 'transparent',
                                fillColor: cluster.color,
                                fillOpacity: 0.15,
                            }}
                        />

                        <Circle
                            center={center}
                            radius={radius}
                            pathOptions={{
                                color: cluster.color,
                                weight: 3,
                                opacity: 0.95,
                                fillColor: cluster.color,
                                fillOpacity: 0.22,
                            }}
                            eventHandlers={{
                                click: () => onClusterClick?.(cluster),
                            }}
                        >
                            <Popup>
                                <div className="w-[210px] max-w-[210px] p-3">
                                    <p className="text-sm font-black text-foreground">{cluster.label}</p>

                                    <div className="mt-3 space-y-2 text-xs font-semibold text-slate-600">
                                        <p>
                                            Titik kejadian: <b>{cluster.pointCount}</b>
                                        </p>
                                        <p>
                                            Densitas: <b>{(Number(cluster.density) * 100).toFixed(1)}%</b>
                                        </p>
                                        <p>
                                            Radius: <b>{Number(cluster.radius).toFixed(1)} km</b>
                                        </p>
                                    </div>
                                </div>
                            </Popup>
                        </Circle>
                    </Fragment>
                );
            })}
        </>
    );
}

function MapViewContent({
    incidents = [],
    contacts = [],
    showHeatmap = false,
    heatmapBandwidthKm = 2.5,
    hotspotClusters = [],
    onClick,
    clickMarker,
    onClusterClick,
    userLocation,
    showDistrictBoundary = false,
    fitDistrictBoundary = false,
    showVillageBoundary = false,
    fitVillageBoundary = false,
    villageBoundaryInteractive = true,
    showIncidentMarkers = true,
}: Omit<MapViewProps, 'center' | 'zoom'>) {
    const cleanIncidents = useMemo(() => sanitizeIncidents(incidents), [incidents]);
    const userAccuracy = Number(userLocation?.accuracy ?? 80);

    return (
        <>
            <MapStyle />
            <BasemapControl />
            <MapControlPanel />
            {showHeatmap && <KdeLegendControl />}
            <MapInvalidation />
            <ClickHandler onClick={onClick} />

            {showDistrictBoundary && <DistrictBoundaryLayer fitDistrictBoundary={fitDistrictBoundary} incidents={cleanIncidents} />}

            {showVillageBoundary && (
                <VillageBoundaryLayer
                    fitVillageBoundary={fitVillageBoundary}
                    interactive={villageBoundaryInteractive}
                    onClick={onClick}
                />
            )}

            {userLocation && (
                <>
                    <CircleMarker
                        center={[Number(userLocation.lat), Number(userLocation.lng)]}
                        radius={Math.max(10, Math.min(46, userAccuracy / 8))}
                        pathOptions={{
                            color: '#D95F5F',
                            weight: 1,
                            opacity: 0.45,
                            fillColor: '#D8E4ED',
                            fillOpacity: 0.12,
                        }}
                    />

                    <Marker
                        position={[Number(userLocation.lat), Number(userLocation.lng)]}
                        icon={svgIcon(
                            '<div style="width:24px;height:24px;border-radius:50%;background:#D95F5F;border:4px solid white;box-shadow:0 10px 20px rgba(14,165,233,.35);"></div>',
                            [24, 24],
                            [12, 12],
                        )}
                    >
                        <Popup>
                            <div className="w-[190px] max-w-[190px] p-3">
                                <p className="text-sm font-black text-foreground">Lokasi Anda</p>
                                <p className="mt-1 font-mono text-xs font-bold text-slate-500">
                                    {Number(userLocation.lat).toFixed(5)}, {Number(userLocation.lng).toFixed(5)}
                                </p>
                                <p className="mt-1 text-xs font-semibold text-slate-500">
                                    Akurasi ±{Math.round(userAccuracy)}m
                                </p>
                            </div>
                        </Popup>
                    </Marker>
                </>
            )}

            {showHeatmap && cleanIncidents.length > 0 && (
                <ContinuousHeatmapLayer incidents={cleanIncidents} bandwidthKm={heatmapBandwidthKm} />
            )}

            {!showHeatmap && hotspotClusters.length > 0 && (
                <HotspotClusterLayer hotspotClusters={hotspotClusters} onClusterClick={onClusterClick} />
            )}

            {showIncidentMarkers && <ClusteredIncidentMarkers incidents={cleanIncidents} />}

            <EmergencyContactMarkers contacts={contacts} />

            <SelectedLocationMarker clickMarker={clickMarker || null} />
        </>
    );
}

export const MapView = forwardRef<L.Map | null, MapViewProps>(
    (
        {
            incidents = [],
            contacts = [],
            showHeatmap = false,
            heatmapBandwidthKm = 2.5,
            hotspotClusters = [],
            center = [-7.716, 110.355],
            zoom = 12,
            onClick,
            clickMarker,
            onClusterClick,
            userLocation,
            showDistrictBoundary = false,
            fitDistrictBoundary = false,
            showVillageBoundary = false,
            fitVillageBoundary = false,
            villageBoundaryInteractive = true,
            showIncidentMarkers = true,
        },
        ref,
    ) => {
        return (
            <MapContainer
                ref={ref as any}
                center={center}
                zoom={zoom}
                className="jagasleman-leaflet-map h-full w-full"
                maxBounds={[[SLEMAN_BOUNDS.minLat - 0.18, SLEMAN_BOUNDS.minLng - 0.18], [SLEMAN_BOUNDS.maxLat + 0.18, SLEMAN_BOUNDS.maxLng + 0.18]]}
                maxBoundsViscosity={0.65}
                minZoom={9}
                maxZoom={20}
                scrollWheelZoom
                zoomControl={false}
                preferCanvas
            >
                <MapViewContent
                    incidents={incidents}
                    contacts={contacts}
                    showHeatmap={showHeatmap}
                    heatmapBandwidthKm={heatmapBandwidthKm}
                    hotspotClusters={hotspotClusters}
                    onClick={onClick}
                    clickMarker={clickMarker}
                    onClusterClick={onClusterClick}
                    userLocation={userLocation}
                    showDistrictBoundary={showDistrictBoundary}
                    fitDistrictBoundary={fitDistrictBoundary}
                    showVillageBoundary={showVillageBoundary}
                    fitVillageBoundary={fitVillageBoundary}
                    villageBoundaryInteractive={villageBoundaryInteractive}
                    showIncidentMarkers={showIncidentMarkers}
                />
            </MapContainer>
        );
    },
);

MapView.displayName = 'MapView';

export default MapView;
