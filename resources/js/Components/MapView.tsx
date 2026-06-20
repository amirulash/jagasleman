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
import {
    ChevronDown,
    ChevronUp,
    Crosshair,
    Info,
    Layers3,
    LocateFixed,
    Map as MapIcon,
    Maximize2,
    Minimize2,
    Minus,
    Plus,
} from 'lucide-react';
import 'leaflet.heat';
import 'leaflet/dist/leaflet.css';
import officialKde20202025Raw from '@/data/kde_2020_2025.geojson?raw';

import { Incident, EmergencyContact } from '@/data/dummy';
import { KDEZone } from '@/lib/kdeAnalysis';
import { UserLocation } from '@/lib/geolocation';
import { batasKecamatanGeojson } from '@/data/districtBoundaryGeojson';

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
    onShowIncidentMarkersChange?: (visible: boolean) => void;
    showMapControls?: boolean;
    onLocateRequest?: () => void;
    showEdgePanels?: boolean;
    showKdeLegend?: boolean;
    showRiskInfo?: boolean;
    kdeLayerMode?: 'official' | 'automatic' | 'none';
    onKdeLayerModeChange?: (mode: 'official' | 'automatic' | 'none') => void;
    officialKdeUrl?: string;
    fitVillageBoundary?: boolean;
    villageBoundaryInteractive?: boolean;
}

const SLEMAN_BOUNDS = {
    minLat: -7.88,
    maxLat: -7.50,
    minLng: 110.18,
    maxLng: 110.62,
};

const SLEMAN_EXTENT: L.LatLngBoundsExpression = [
    [SLEMAN_BOUNDS.minLat, SLEMAN_BOUNDS.minLng],
    [SLEMAN_BOUNDS.maxLat, SLEMAN_BOUNDS.maxLng],
];

const VILLAGE_BOUNDARY_GEOJSON_URL = '/geojson/batas_desa.geojson';


function parseOfficialKdeGeojson(raw: string) {
    try {
        const parsed = JSON.parse(raw);
        const features = parsed?.type === 'FeatureCollection'
            ? parsed.features
            : parsed?.type === 'Feature'
                ? [parsed]
                : [];

        return features.length > 0 ? parsed : null;
    } catch (error) {
        console.warn('GeoJSON KDE 2020–2025 dari resources/js/data tidak valid:', error);
        return null;
    }
}

const OFFICIAL_KDE_2020_2025_GEOJSON = parseOfficialKdeGeojson(officialKde20202025Raw);


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
    PENGEROYOKAN: '#EF4444',
    PENGRUSAKAN: '#F97316',
    PENGANIAYAAN: '#EC4899',
    'PENYALAHGUNAAN SENJATA TAJAM': '#F2A20B',
    'PENCURIAN DENGAN KEKERASAN (CURAS)': '#A855F7',
    'PEMERASAN DAN PENGANCAMAN': '#06B6D4',
    Pencurian: '#22C55E',
    Perampokan: '#A855F7',
    Kecelakaan: '#F2A20B',
    Kebakaran: '#F97316',
    Tawuran: '#EF4444',
    Vandalisme: '#14B8A6',
    Kejahatan: '#E11D48',
    Laporan: '#FACC15',
};

const fallbackIncidentColors = ['#14B8A6', '#F97316', '#22C55E', '#E11D48', '#A855F7', '#06B6D4', '#F2A20B', '#EF4444'];

function getStableIncidentColor(value: string) {
    const text = String(value || 'Kejadian');
    const sum = Array.from(text).reduce((total, char) => total + char.charCodeAt(0), 0);
    return fallbackIncidentColors[sum % fallbackIncidentColors.length];
}

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
    '#F47B52',
    '#F47B52',
    '#F47B52',
    '#F47B52',
    '#F47B52',
    '#F47B52',
    '#07324A',
    '#F47B52',
    '#F47B52',
    '#07324A',
    '#F47B52',
    '#F47B52',
    '#0d9488',
    '#F47B52',
    '#be123c',
    '#07324A',
    '#64748b',
];

const districtColorMap = new Map<string, string>();

type BasemapKey = 'jalan' | 'satelit' | 'topo';
type MapPanelKey = 'legend' | 'layers' | 'basemap' | null;

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
        title: 'Streets',
        desc: 'Jalan, bangunan, dan permukiman',
        icon: '▦',
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        subdomains: ['a', 'b', 'c', 'd'],
    },
    {
        key: 'satelit',
        title: 'Satellite',
        desc: 'Citra satelit dan nama jalan',
        icon: '◉',
        attribution: 'Tiles &copy; Esri — Sources: Esri, Maxar, Earthstar Geographics',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        maxZoom: 19,
    },
    {
        key: 'topo',
        title: 'Topo',
        desc: 'Kontur dan bentuk permukaan wilayah',
        icon: '≋',
        attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap',
        url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        subdomains: ['a', 'b', 'c'],
        maxZoom: 17,
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

                .jagasleman-kde-popup-shell .leaflet-popup-content-wrapper {
                    border-radius: 22px;
                    overflow: hidden;
                    border: 1px solid rgba(189, 231, 225, 0.95);
                    box-shadow: 0 24px 60px rgba(7, 50, 74, 0.22);
                    background: rgba(255, 255, 255, 0.98);
                    backdrop-filter: blur(18px);
                }

                .jagasleman-kde-popup-shell .leaflet-popup-content {
                    margin: 0;
                }

                .jagasleman-kde-popup-shell .leaflet-popup-tip {
                    background: #ffffff;
                    box-shadow: 0 10px 24px rgba(7, 50, 74, 0.16);
                }

                .jagasleman-kde-popup {
                    width: 290px;
                    padding: 14px;
                    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                    color: #07324A;
                    background: radial-gradient(circle at top right, rgba(189, 231, 225, 0.42), transparent 42%), #ffffff;
                }

                .jagasleman-kde-popup__top {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 10px;
                }

                .jagasleman-kde-popup__badge {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    height: 28px;
                    min-width: 44px;
                    padding: 0 10px;
                    border-radius: 999px;
                    color: #ffffff;
                    font-size: 11px;
                    font-weight: 950;
                    letter-spacing: 0.12em;
                    box-shadow: 0 10px 22px rgba(15, 23, 42, 0.18);
                }

                .jagasleman-kde-popup__source {
                    font-size: 10px;
                    font-weight: 900;
                    text-transform: uppercase;
                    letter-spacing: 0.12em;
                    color: #64748b;
                }

                .jagasleman-kde-popup__title {
                    margin-top: 12px;
                    font-size: 19px;
                    font-weight: 950;
                    letter-spacing: -0.03em;
                    color: #07324A;
                }

                .jagasleman-kde-popup__bar {
                    margin-top: 10px;
                    height: 9px;
                    overflow: hidden;
                    border-radius: 999px;
                    background: #E2E8F0;
                }

                .jagasleman-kde-popup__bar span {
                    display: block;
                    height: 100%;
                    border-radius: inherit;
                    box-shadow: 0 0 18px currentColor;
                }

                .jagasleman-kde-popup__grid {
                    margin-top: 12px;
                    display: grid;
                    grid-template-columns: 72px 1fr;
                    gap: 7px 10px;
                    border-radius: 16px;
                    background: rgba(248, 250, 252, 0.92);
                    padding: 10px;
                    font-size: 11px;
                    line-height: 1.35;
                }

                .jagasleman-kde-popup__grid span {
                    color: #64748b;
                    font-weight: 800;
                }

                .jagasleman-kde-popup__grid b {
                    color: #07324A;
                    font-weight: 950;
                }

                .jagasleman-kde-popup__explain {
                    margin-top: 12px;
                    border-radius: 16px;
                    background: linear-gradient(135deg, #F8FAFC, #FFFFFF);
                    border: 1px solid rgba(191, 209, 222, 0.88);
                    padding: 11px 12px;
                    box-shadow: inset 0 1px 0 rgba(255,255,255,.85);
                }

                .jagasleman-kde-popup__explain b {
                    display: block;
                    color: #07324A;
                    font-size: 12px;
                    font-weight: 950;
                    margin-bottom: 4px;
                }

                .jagasleman-kde-popup__explain p {
                    margin: 0;
                    color: #334155;
                    font-size: 11.5px;
                    font-weight: 750;
                    line-height: 1.55;
                }

                .jagasleman-kde-popup__note {
                    margin: 10px 2px 0;
                    font-size: 11px;
                    font-weight: 750;
                    line-height: 1.55;
                    color: #5C7186;
                }


                .jagasleman-leaflet-map .leaflet-control-layers {
                    border: 1px solid rgba(191, 209, 222, 0.98);
                    border-radius: 16px;
                    box-shadow: 0 18px 36px rgba(15, 23, 42, 0.16);
                    overflow: hidden;
                    background: rgba(255, 255, 255, 0.98);
                    backdrop-filter: blur(14px);
                }

                .jagasleman-leaflet-map .leaflet-top.leaflet-left .leaflet-control-layers {
                    margin-top: 16px;
                    margin-left: 12px;
                }

                .jagasleman-leaflet-map .leaflet-control-layers-toggle {
                    width: 34px;
                    height: 34px;
                    border-radius: 13px;
                    background-color: #ffffff;
                    background-image: url('/images/logo_jagasleman.png');
                    background-size: 22px 22px;
                    background-position: center;
                    background-repeat: no-repeat;
                }

                .jagasleman-leaflet-map .leaflet-control-layers-expanded {
                    padding: 10px 10px 9px;
                    min-width: 168px;
                    max-width: 190px;
                }

                .jagasleman-leaflet-map .leaflet-control-layers-expanded::before {
                    content: 'Basemap';
                    display: block;
                    margin-bottom: 10px;
                    padding-bottom: 8px;
                    border-bottom: 1px solid rgba(191,209,222,.95);
                    color: #07324A;
                    font-size: 10px;
                    font-weight: 900;
                    letter-spacing: .12em;
                    text-transform: uppercase;
                }

                .jagasleman-leaflet-map .leaflet-control-layers label {
                    margin: 4px 0;
                    font-size: 11px;
                    font-weight: 800;
                    color: #334155;
                }

                .jagasleman-leaflet-map .leaflet-control-layers-list {
                    display: grid;
                    gap: 6px;
                }

                .jagasleman-leaflet-map .leaflet-control-layers-base label {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    margin: 0;
                    border-radius: 12px;
                    border: 1px solid rgba(216, 228, 237, 0.95);
                    background: #F2FAF6;
                    padding: 7px 8px;
                    color: #07324A;
                    cursor: pointer;
                    transition: 0.18s ease;
                }

                .jagasleman-leaflet-map .leaflet-control-layers-base label:hover {
                    background: #ffffff;
                    border-color: #F47B52;
                    transform: translateY(-1px);
                }

                .jagasleman-leaflet-map .leaflet-control-layers-base input {
                    accent-color: #F47B52;
                }

                .district-boundary-tooltip .leaflet-tooltip-content {
                    margin: 0;
                }


                .jagasleman-basemap-panel {
                    position: absolute;
                    left: 16px;
                    top: 76px;
                    z-index: 850;
                    pointer-events: auto;
                    font-family: "Plus Jakarta Sans", system-ui, sans-serif;
                }

                .jagasleman-basemap-toggle {
                    width: 36px;
                    height: 36px;
                    border-radius: 16px;
                    border: 1px solid #BDE7E1;
                    background: #ffffff;
                    color: #0B6E78;
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
                    font-size: 19px;
                    line-height: 1;
                }

                .jagasleman-basemap-menu {
                    margin-top: 10px;
                    width: 210px;
                    border: 1px solid #BDE7E1;
                    border-radius: 18px;
                    background: rgba(255,255,255,.97);
                    color: #07324A;
                    box-shadow: 0 24px 60px rgba(15,31,46,.22);
                    padding: 10px;
                    backdrop-filter: blur(14px);
                }

                .jagasleman-basemap-title {
                    margin-bottom: 10px;
                    padding: 0 4px 9px;
                    border-bottom: 1px solid #BDE7E1;
                    color: #0B6E78;
                    font-size: 11px;
                    font-weight: 900;
                    letter-spacing: .16em;
                    text-transform: uppercase;
                }

                .jagasleman-basemap-option {
                    width: 100%;
                    display: grid;
                    grid-template-columns: 36px 1fr;
                    gap: 8px;
                    align-items: center;
                    border: 1px solid transparent;
                    border-radius: 16px;
                    background: transparent;
                    padding: 7px;
                    text-align: left;
                    color: #07324A;
                    cursor: pointer;
                    transition: background .18s ease, border-color .18s ease, transform .18s ease;
                }

                .jagasleman-basemap-option:hover,
                .jagasleman-basemap-option.is-active {
                    background: #F2FAF6;
                    border-color: #5BAE8A;
                    transform: translateY(-1px);
                }

                .jagasleman-basemap-option-icon {
                    display: flex;
                    width: 36px;
                    height: 36px;
                    align-items: center;
                    justify-content: center;
                    border-radius: 14px;
                    background: linear-gradient(135deg, #0B6E78, #5BAE8A);
                    color: #ffffff;
                    font-size: 17px;
                    box-shadow: inset 0 0 0 1px rgba(255,255,255,.18);
                }

                .jagasleman-basemap-option-title {
                    display: block;
                    color: #07324A;
                    font-size: 12px;
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
                    border-radius: 26px;
                    box-shadow: 0 28px 70px rgba(15, 23, 42, 0.25);
                    border: 1px solid rgba(226, 232, 240, 0.95);
                    overflow: hidden;
                    background: #ffffff;
                }

                .jagasleman-leaflet-map .leaflet-popup-content {
                    margin: 0;
                    width: auto !important;
                }

                .jagasleman-leaflet-map .compact-map-popup .leaflet-popup-content-wrapper {
                    max-width: min(92vw, 430px) !important;
                }

                .jagasleman-leaflet-map .compact-map-popup .leaflet-popup-content {
                    max-width: min(88vw, 360px) !important;
                    overflow: visible !important;
                }

                .jagasleman-leaflet-map .leaflet-popup {
                    max-width: min(88vw, 380px) !important;
                }

                .jaga-map-popup-card {
                    max-height: min(68vh, 520px);
                    overflow-y: auto;
                    scrollbar-width: thin;
                }

                .jaga-map-popup-card {
                    font-family: "Plus Jakarta Sans", system-ui, sans-serif;
                }

                @media (max-width: 480px) {
                    .jagasleman-leaflet-map .leaflet-popup {
                        max-width: calc(100vw - 28px) !important;
                    }
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


                /* REVISI 4: kontrol peta dan layer dibuat satu gaya card modern */
                .jagasleman-map-action-controls {
                    position: absolute;
                    left: 14px;
                    top: 14px;
                    z-index: 870;
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 8px;
                    padding: 8px;
                    border: 1px solid rgba(185, 216, 216, .95);
                    border-radius: 24px;
                    background: rgba(255,255,255,.94);
                    box-shadow: 0 22px 50px rgba(15,31,46,.16);
                    backdrop-filter: blur(18px);
                    pointer-events: auto;
                }

                .jagasleman-map-action-controls button {
                    width: 42px;
                    height: 42px;
                    border-radius: 16px;
                    border: 1px solid rgba(185,216,216,.95);
                    background: #F8FAFC;
                    color: #0B6E78;
                    font-size: 18px;
                    font-weight: 950;
                    line-height: 1;
                    box-shadow: none;
                    transition: transform .18s ease, background .18s ease, color .18s ease, border-color .18s ease;
                }

                .jagasleman-map-action-controls button:hover,
                .jagasleman-map-action-controls button.is-active {
                    transform: translateY(-1px);
                    border-color: #0FA3A0;
                    background: linear-gradient(135deg, #0B6E78, #0FA3A0);
                    color: #FFFFFF;
                }

                .jagasleman-basemap-panel {
                    left: 14px;
                    top: 188px;
                    z-index: 860;
                }

                .jagasleman-basemap-toggle {
                    width: 58px;
                    height: 58px;
                    border-radius: 24px;
                    border: 1px solid rgba(185,216,216,.95);
                    background: rgba(255,255,255,.94);
                    color: #0B6E78;
                    box-shadow: 0 22px 50px rgba(15,31,46,.16);
                    backdrop-filter: blur(18px);
                }

                .jagasleman-basemap-toggle-icon {
                    display: flex;
                    width: 38px;
                    height: 38px;
                    align-items: center;
                    justify-content: center;
                    border-radius: 16px;
                    background: linear-gradient(135deg, #0B6E78, #0FA3A0);
                    color: #FFFFFF;
                    font-size: 18px;
                }

                .jagasleman-basemap-menu {
                    width: min(260px, calc(100vw - 34px));
                    border: 1px solid rgba(185,216,216,.95);
                    border-radius: 26px;
                    background: linear-gradient(180deg, rgba(255,255,255,.98), rgba(241,251,248,.97));
                    box-shadow: 0 26px 64px rgba(15,31,46,.20);
                    padding: 12px;
                    backdrop-filter: blur(18px);
                }

                .jagasleman-basemap-title {
                    margin-bottom: 10px;
                    border-bottom: 1px solid rgba(185,216,216,.8);
                    color: #0B6E78;
                    font-size: 11px;
                    font-weight: 950;
                    letter-spacing: .14em;
                }

                .jagasleman-basemap-option {
                    grid-template-columns: 38px 1fr;
                    gap: 9px;
                    border-radius: 18px;
                    padding: 8px;
                    color: #07324A;
                }

                .jagasleman-basemap-option:hover,
                .jagasleman-basemap-option.is-active {
                    border-color: rgba(14,165,160,.46);
                    background: #FFFFFF;
                    box-shadow: 0 12px 28px rgba(6,35,51,.08);
                }

                .jagasleman-basemap-option-icon {
                    width: 38px;
                    height: 38px;
                    border-radius: 15px;
                    background: linear-gradient(135deg, #0B6E78, #0FA3A0);
                }

                @media (max-width: 640px) {
                    .jagasleman-map-action-controls {
                        left: 10px;
                        top: 10px;
                        gap: 6px;
                        padding: 7px;
                        border-radius: 20px;
                    }
                    .jagasleman-map-action-controls button {
                        width: 38px;
                        height: 38px;
                        border-radius: 14px;
                    }
                    .jagasleman-basemap-panel {
                        left: 10px;
                        top: 164px;
                    }
                    .jagasleman-basemap-toggle {
                        width: 50px;
                        height: 50px;
                        border-radius: 20px;
                    }
                    .jagasleman-basemap-toggle-icon {
                        width: 34px;
                        height: 34px;
                    }
                }

                .jagasleman-basemap-toggle {
                    width: auto;
                    min-width: 132px;
                    height: 46px;
                    padding: 6px 12px 6px 7px;
                    gap: 8px;
                    border-radius: 18px;
                }

                .jagasleman-basemap-toggle-text {
                    color: #0B6E78;
                    font-size: 12px;
                    font-weight: 950;
                    letter-spacing: .01em;
                }

                /* Basemap dibuat sebagai pilihan langsung, bukan dropdown, agar menyatu dengan kontrol peta. */
                .jagasleman-basemap-panel {
                    left: 14px;
                    top: 156px;
                    z-index: 860;
                }

                .jagasleman-basemap-inline {
                    width: min(286px, calc(100vw - 34px));
                    border: 1px solid rgba(185,216,216,.95);
                    border-radius: 24px;
                    background: rgba(255,255,255,.96);
                    box-shadow: 0 22px 50px rgba(15,31,46,.16);
                    padding: 10px;
                    backdrop-filter: blur(18px);
                    color: #07324A;
                }

                .jagasleman-basemap-inline .jagasleman-basemap-title {
                    margin: 0 0 8px;
                    padding: 0 2px 8px;
                    border-bottom: 1px solid rgba(185,216,216,.8);
                    color: #0B6E78;
                    font-size: 10px;
                    font-weight: 950;
                    letter-spacing: .16em;
                    text-transform: uppercase;
                }

                .jagasleman-basemap-inline-options {
                    display: grid;
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    gap: 7px;
                }

                .jagasleman-basemap-inline .jagasleman-basemap-option {
                    display: flex;
                    min-width: 0;
                    width: 100%;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 5px;
                    border: 1px solid rgba(216,228,237,.95);
                    border-radius: 16px;
                    background: #F8FAFC;
                    padding: 8px 5px;
                    color: #0B6E78;
                    text-align: center;
                    cursor: pointer;
                    transition: transform .18s ease, background .18s ease, border-color .18s ease, box-shadow .18s ease;
                }

                .jagasleman-basemap-inline .jagasleman-basemap-option:hover,
                .jagasleman-basemap-inline .jagasleman-basemap-option.is-active {
                    transform: translateY(-1px);
                    border-color: rgba(14,165,160,.55);
                    background: #E9F8F3;
                    box-shadow: 0 12px 28px rgba(6,35,51,.08);
                }

                .jagasleman-basemap-inline .jagasleman-basemap-option-icon {
                    display: flex;
                    width: 30px;
                    height: 30px;
                    align-items: center;
                    justify-content: center;
                    border-radius: 13px;
                    background: linear-gradient(135deg, #0B6E78, #0FA3A0);
                    color: #FFFFFF;
                    font-size: 15px;
                    box-shadow: inset 0 0 0 1px rgba(255,255,255,.18);
                }

                .jagasleman-basemap-inline .jagasleman-basemap-option-title {
                    display: block;
                    max-width: 100%;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    color: #0B6E78;
                    font-size: 10px;
                    font-weight: 950;
                    line-height: 1.1;
                }

                @media (max-width: 640px) {
                    .jagasleman-basemap-panel {
                        left: 10px;
                        top: 232px;
                    }

                    .jagasleman-basemap-inline {
                        width: min(268px, calc(100vw - 24px));
                        padding: 9px;
                        border-radius: 22px;
                    }
                }



                .jagasleman-kde-layer-control {
                    position: absolute;
                    right: 14px;
                    top: 14px;
                    z-index: 870;
                    width: min(292px, calc(100vw - 34px));
                    border: 1px solid rgba(185,216,216,.95);
                    border-radius: 24px;
                    background: rgba(255,255,255,.96);
                    box-shadow: 0 22px 50px rgba(15,31,46,.16);
                    padding: 12px;
                    color: #07324A;
                    font-family: "Plus Jakarta Sans", system-ui, sans-serif;
                    backdrop-filter: blur(18px);
                    pointer-events: auto;
                }

                .jagasleman-kde-layer-title {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 10px;
                    margin-bottom: 10px;
                    padding-bottom: 9px;
                    border-bottom: 1px solid rgba(185,216,216,.8);
                    color: #0B6E78;
                    font-size: 10px;
                    font-weight: 950;
                    letter-spacing: .14em;
                    text-transform: uppercase;
                }

                .jagasleman-kde-layer-options {
                    display: grid;
                    gap: 8px;
                }

                .jagasleman-kde-layer-option {
                    display: grid;
                    grid-template-columns: 28px 1fr;
                    gap: 8px;
                    align-items: start;
                    width: 100%;
                    border: 1px solid rgba(216,228,237,.95);
                    border-radius: 17px;
                    background: #F8FAFC;
                    padding: 9px;
                    text-align: left;
                    color: #07324A;
                    cursor: pointer;
                    transition: transform .18s ease, background .18s ease, border-color .18s ease, box-shadow .18s ease;
                }

                .jagasleman-kde-layer-option:hover,
                .jagasleman-kde-layer-option.is-active {
                    transform: translateY(-1px);
                    border-color: rgba(14,165,160,.55);
                    background: #E9F8F3;
                    box-shadow: 0 12px 28px rgba(6,35,51,.08);
                }

                .jagasleman-kde-layer-radio {
                    margin-top: 2px;
                    accent-color: #0B6E78;
                }

                .jagasleman-kde-layer-option b {
                    display: block;
                    color: #07324A;
                    font-size: 12px;
                    font-weight: 950;
                    line-height: 1.15;
                }

                .jagasleman-kde-layer-option span {
                    display: block;
                    margin-top: 3px;
                    color: #5C7186;
                    font-size: 10px;
                    font-weight: 750;
                    line-height: 1.35;
                }

                .jagasleman-kde-layer-note {
                    margin-top: 10px;
                    border-radius: 16px;
                    background: #FFF8ED;
                    padding: 9px;
                    color: #7C2D12;
                    font-size: 10px;
                    font-weight: 800;
                    line-height: 1.45;
                }

                .jagasleman-kde-legend {
                    position: absolute;
                    right: 14px;
                    bottom: 18px;
                    z-index: 865;
                    width: min(252px, calc(100vw - 34px));
                    padding: 12px;
                    border-radius: 22px;
                    border: 1px solid rgba(185,216,216,.95);
                    background: rgba(255,255,255,.96);
                    box-shadow: 0 22px 50px rgba(15,31,46,.16);
                    backdrop-filter: blur(18px);
                    color: #07324A;
                    font-family: "Plus Jakarta Sans", system-ui, sans-serif;
                    pointer-events: none;
                }

                .jagasleman-kde-legend-title {
                    margin-bottom: 8px;
                    color: #0B6E78;
                    font-size: 10px;
                    font-weight: 950;
                    letter-spacing: .14em;
                    text-transform: uppercase;
                }

                .jagasleman-kde-legend-subtitle {
                    margin-bottom: 9px;
                    color: #5C7186;
                    font-size: 10px;
                    font-weight: 800;
                    line-height: 1.35;
                }

                .jagasleman-kde-gradient {
                    height: 10px;
                    border-radius: 999px;
                    background: linear-gradient(90deg, #22C55E, #FACC15, #F97316, #E11D48, #7F1D1D);
                    box-shadow: inset 0 0 0 1px rgba(255,255,255,.48);
                }

                .jagasleman-kde-legend-grid {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 6px;
                    margin-top: 8px;
                }

                .jagasleman-kde-legend-item {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    min-width: 0;
                    font-size: 10px;
                    font-weight: 900;
                    color: #07324A;
                }

                .jagasleman-kde-legend-item span {
                    width: 11px;
                    height: 11px;
                    flex: 0 0 auto;
                    border-radius: 999px;
                    box-shadow: 0 0 0 2px rgba(255,255,255,.9), 0 4px 10px rgba(15,31,46,.14);
                }

                .jagasleman-official-kde-missing {
                    position: absolute;
                    left: 50%;
                    top: 50%;
                    z-index: 835;
                    width: min(390px, calc(100vw - 36px));
                    transform: translate(-50%, -50%);
                    border: 1px solid rgba(185,216,216,.95);
                    border-radius: 24px;
                    background: rgba(255,255,255,.96);
                    box-shadow: 0 24px 58px rgba(15,31,46,.18);
                    padding: 16px;
                    color: #07324A;
                    font-family: "Plus Jakarta Sans", system-ui, sans-serif;
                    pointer-events: none;
                    backdrop-filter: blur(18px);
                }

                .jagasleman-official-kde-missing b {
                    display: block;
                    margin-bottom: 5px;
                    color: #0B6E78;
                    font-size: 13px;
                    font-weight: 950;
                }

                .jagasleman-official-kde-missing span {
                    display: block;
                    color: #5C7186;
                    font-size: 11px;
                    font-weight: 800;
                    line-height: 1.5;
                }

                @media (max-width: 640px) {
                    .jagasleman-kde-layer-control {
                        left: 10px;
                        right: 10px;
                        top: auto;
                        bottom: 12px;
                        width: auto;
                        padding: 10px;
                    }

                    .jagasleman-kde-layer-options {
                        grid-template-columns: repeat(3, minmax(0, 1fr));
                    }

                    .jagasleman-kde-layer-option {
                        display: block;
                        padding: 8px;
                    }

                    .jagasleman-kde-layer-option span,
                    .jagasleman-kde-layer-note {
                        display: none;
                    }

                    .jagasleman-kde-legend {
                        right: 10px;
                        bottom: 132px;
                        width: min(220px, calc(100vw - 24px));
                        padding: 10px;
                    }
                }

                .jagasleman-contact-legend {
                    position: absolute;
                    right: 14px;
                    bottom: 18px;
                    z-index: 865;
                    width: min(240px, calc(100vw - 34px));
                    padding: 12px;
                    border-radius: 22px;
                    border: 1px solid rgba(185,216,216,.95);
                    background: rgba(255,255,255,.96);
                    box-shadow: 0 22px 50px rgba(15,31,46,.16);
                    backdrop-filter: blur(18px);
                    color: #07324A;
                    font-family: "Plus Jakarta Sans", system-ui, sans-serif;
                    pointer-events: none;
                }

                .jagasleman-contact-legend-title {
                    margin-bottom: 8px;
                    color: #0B6E78;
                    font-size: 10px;
                    font-weight: 950;
                    letter-spacing: .14em;
                    text-transform: uppercase;
                }

                .jagasleman-contact-legend-row {
                    display: grid;
                    grid-template-columns: 28px 1fr auto;
                    align-items: center;
                    gap: 8px;
                    margin-top: 6px;
                    padding: 8px;
                    border-radius: 16px;
                    background: #F8FAFC;
                    color: #07324A;
                    font-size: 12px;
                    font-weight: 850;
                }

                .jagasleman-contact-legend-row b {
                    color: #0B6E78;
                    font-size: 12px;
                    font-weight: 950;
                }

                .jagasleman-contact-legend-icon {
                    display: flex;
                    width: 28px;
                    height: 28px;
                    align-items: center;
                    justify-content: center;
                    border-radius: 12px;
                    color: #fff;
                    font-size: 13px;
                    font-weight: 950;
                }

                .jagasleman-contact-legend-icon.police { background: #0B6E78; }
                .jagasleman-contact-legend-icon.hospital { background: #16A34A; }
                .jagasleman-contact-legend-icon.fire { background: #F97316; }

                @media (max-width: 640px) {
    

                .jagasleman-kde-layer-control {
                    position: absolute;
                    right: 14px;
                    top: 14px;
                    z-index: 870;
                    width: min(292px, calc(100vw - 34px));
                    border: 1px solid rgba(185,216,216,.95);
                    border-radius: 24px;
                    background: rgba(255,255,255,.96);
                    box-shadow: 0 22px 50px rgba(15,31,46,.16);
                    padding: 12px;
                    color: #07324A;
                    font-family: "Plus Jakarta Sans", system-ui, sans-serif;
                    backdrop-filter: blur(18px);
                    pointer-events: auto;
                }

                .jagasleman-kde-layer-title {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 10px;
                    margin-bottom: 10px;
                    padding-bottom: 9px;
                    border-bottom: 1px solid rgba(185,216,216,.8);
                    color: #0B6E78;
                    font-size: 10px;
                    font-weight: 950;
                    letter-spacing: .14em;
                    text-transform: uppercase;
                }

                .jagasleman-kde-layer-options {
                    display: grid;
                    gap: 8px;
                }

                .jagasleman-kde-layer-option {
                    display: grid;
                    grid-template-columns: 28px 1fr;
                    gap: 8px;
                    align-items: start;
                    width: 100%;
                    border: 1px solid rgba(216,228,237,.95);
                    border-radius: 17px;
                    background: #F8FAFC;
                    padding: 9px;
                    text-align: left;
                    color: #07324A;
                    cursor: pointer;
                    transition: transform .18s ease, background .18s ease, border-color .18s ease, box-shadow .18s ease;
                }

                .jagasleman-kde-layer-option:hover,
                .jagasleman-kde-layer-option.is-active {
                    transform: translateY(-1px);
                    border-color: rgba(14,165,160,.55);
                    background: #E9F8F3;
                    box-shadow: 0 12px 28px rgba(6,35,51,.08);
                }

                .jagasleman-kde-layer-radio {
                    margin-top: 2px;
                    accent-color: #0B6E78;
                }

                .jagasleman-kde-layer-option b {
                    display: block;
                    color: #07324A;
                    font-size: 12px;
                    font-weight: 950;
                    line-height: 1.15;
                }

                .jagasleman-kde-layer-option span {
                    display: block;
                    margin-top: 3px;
                    color: #5C7186;
                    font-size: 10px;
                    font-weight: 750;
                    line-height: 1.35;
                }

                .jagasleman-kde-layer-note {
                    margin-top: 10px;
                    border-radius: 16px;
                    background: #FFF8ED;
                    padding: 9px;
                    color: #7C2D12;
                    font-size: 10px;
                    font-weight: 800;
                    line-height: 1.45;
                }

                .jagasleman-kde-legend {
                    position: absolute;
                    right: 14px;
                    bottom: 18px;
                    z-index: 865;
                    width: min(252px, calc(100vw - 34px));
                    padding: 12px;
                    border-radius: 22px;
                    border: 1px solid rgba(185,216,216,.95);
                    background: rgba(255,255,255,.96);
                    box-shadow: 0 22px 50px rgba(15,31,46,.16);
                    backdrop-filter: blur(18px);
                    color: #07324A;
                    font-family: "Plus Jakarta Sans", system-ui, sans-serif;
                    pointer-events: none;
                }

                .jagasleman-kde-legend-title {
                    margin-bottom: 8px;
                    color: #0B6E78;
                    font-size: 10px;
                    font-weight: 950;
                    letter-spacing: .14em;
                    text-transform: uppercase;
                }

                .jagasleman-kde-legend-subtitle {
                    margin-bottom: 9px;
                    color: #5C7186;
                    font-size: 10px;
                    font-weight: 800;
                    line-height: 1.35;
                }

                .jagasleman-kde-gradient {
                    height: 10px;
                    border-radius: 999px;
                    background: linear-gradient(90deg, #22C55E, #FACC15, #F97316, #E11D48, #7F1D1D);
                    box-shadow: inset 0 0 0 1px rgba(255,255,255,.48);
                }

                .jagasleman-kde-legend-grid {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 6px;
                    margin-top: 8px;
                }

                .jagasleman-kde-legend-item {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    min-width: 0;
                    font-size: 10px;
                    font-weight: 900;
                    color: #07324A;
                }

                .jagasleman-kde-legend-item span {
                    width: 11px;
                    height: 11px;
                    flex: 0 0 auto;
                    border-radius: 999px;
                    box-shadow: 0 0 0 2px rgba(255,255,255,.9), 0 4px 10px rgba(15,31,46,.14);
                }

                .jagasleman-official-kde-missing {
                    position: absolute;
                    left: 50%;
                    top: 50%;
                    z-index: 835;
                    width: min(390px, calc(100vw - 36px));
                    transform: translate(-50%, -50%);
                    border: 1px solid rgba(185,216,216,.95);
                    border-radius: 24px;
                    background: rgba(255,255,255,.96);
                    box-shadow: 0 24px 58px rgba(15,31,46,.18);
                    padding: 16px;
                    color: #07324A;
                    font-family: "Plus Jakarta Sans", system-ui, sans-serif;
                    pointer-events: none;
                    backdrop-filter: blur(18px);
                }

                .jagasleman-official-kde-missing b {
                    display: block;
                    margin-bottom: 5px;
                    color: #0B6E78;
                    font-size: 13px;
                    font-weight: 950;
                }

                .jagasleman-official-kde-missing span {
                    display: block;
                    color: #5C7186;
                    font-size: 11px;
                    font-weight: 800;
                    line-height: 1.5;
                }

                @media (max-width: 640px) {
                    .jagasleman-kde-layer-control {
                        left: 10px;
                        right: 10px;
                        top: auto;
                        bottom: 12px;
                        width: auto;
                        padding: 10px;
                    }

                    .jagasleman-kde-layer-options {
                        grid-template-columns: repeat(3, minmax(0, 1fr));
                    }

                    .jagasleman-kde-layer-option {
                        display: block;
                        padding: 8px;
                    }

                    .jagasleman-kde-layer-option span,
                    .jagasleman-kde-layer-note {
                        display: none;
                    }

                    .jagasleman-kde-legend {
                        right: 10px;
                        bottom: 132px;
                        width: min(220px, calc(100vw - 24px));
                        padding: 10px;
                    }
                }

                .jagasleman-contact-legend {
                        right: 10px;
                        bottom: 12px;
                        width: min(210px, calc(100vw - 24px));
                        padding: 10px;
                    }
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

    return districtColorMap.get(normalized) || '#F47B52';
}

function getIncidentType(incident: Incident | any) {
    const props = incident?.properties || {};

    return (
        incident?.rawKategori ||
        incident?.kategori ||
        incident?.category ||
        incident?.crime_type ||
        incident?.incident_type ||
        incident?.type ||
        incident?.jenis ||
        incident?.jenis_kejadian ||
        props?.rawKategori ||
        props?.kategori ||
        props?.KATEGORI ||
        props?.jenis_kejadian ||
        props?.JENIS_KEJADIAN ||
        props?.jenis ||
        props?.JENIS ||
        props?.kejadian ||
        props?.KEJADIAN ||
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
    const props = incident?.properties || {};

    return (
        incident?.date ||
        incident?.incident_date ||
        incident?.tanggal ||
        incident?.tanggal_kejadian ||
        incident?.incident_at ||
        props?.date ||
        props?.incident_date ||
        props?.tanggal ||
        props?.tanggal_kejadian ||
        props?.incident_at ||
        incident?.created_at ||
        props?.created_at ||
        '-'
    );
}

function getIncidentTime(incident: any) {
    const props = incident?.properties || {};

    return (
        incident?.time ||
        incident?.incident_time ||
        incident?.jam ||
        incident?.jam_kejadian ||
        props?.time ||
        props?.incident_time ||
        props?.jam ||
        props?.jam_kejadian ||
        incident?.incident_at ||
        props?.incident_at ||
        ''
    );
}

function getIncidentLocation(incident: any) {
    const props = incident?.properties || {};

    return (
        incident?.location ||
        incident?.address ||
        incident?.alamat ||
        incident?.alamat_kejadian ||
        incident?.lokasi ||
        props?.location ||
        props?.address ||
        props?.alamat ||
        props?.alamat_kejadian ||
        props?.lokasi ||
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
    const props = incident?.properties || {};
    const value =
        incident?.description ||
        incident?.deskripsi ||
        incident?.description_full ||
        incident?.full_description ||
        incident?.keterangan ||
        incident?.chronology ||
        incident?.kronologi ||
        incident?.uraian ||
        incident?.detail ||
        incident?.catatan ||
        props?.description ||
        props?.deskripsi ||
        props?.description_full ||
        props?.full_description ||
        props?.keterangan ||
        props?.chronology ||
        props?.kronologi ||
        props?.uraian ||
        props?.detail ||
        props?.catatan ||
        '-';

    return String(value ?? '-').replace(/\r\n/g, '\n').trim() || '-';
}

function formatIncidentDate(value: any) {
    const text = String(value || '').trim();
    if (!text || text === '-') return '-';

    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
        const [, year, month, day] = match;
        const monthNames = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
        ];
        const monthIndex = Number(month) - 1;
        if (monthNames[monthIndex]) return `${Number(day)} ${monthNames[monthIndex]} ${year}`;
    }

    const date = new Date(text);
    if (!Number.isNaN(date.getTime())) {
        return new Intl.DateTimeFormat('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        }).format(date);
    }

    return text;
}

function formatIncidentTime(value: any) {
    const text = String(value || '').trim();
    if (!text || text === '-') return '-';

    const match = text.match(/(?:T|\s)?(\d{1,2}):(\d{2})/);
    if (match) return `${match[1].padStart(2, '0')}:${match[2]}`;

    return text;
}

function getIncidentColor(type: string) {
    return incidentColor[type] || incidentColor[getIncidentTypeLabel(type)] || getStableIncidentColor(type);
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

function findDistrictByPoint(lat: number, lng: number) {
    try {
        const features = (batasKecamatanGeojson as any)?.features || [];
        const match = features.find((feature: any) => geometryContainsPoint(feature?.geometry, lat, lng));
        if (!match) return null;
        return getFeatureInfo(match);
    } catch {
        return null;
    }
}

function findKdeClassByPoint(lat: number, lng: number) {
    try {
        const data: any = OFFICIAL_KDE_2020_2025_GEOJSON;
        const features = data?.type === 'FeatureCollection' ? data.features : data ? [data] : [];
        const matches = features.filter((feature: any) => geometryContainsPoint(feature?.geometry, lat, lng));

        if (!matches.length) return null;

        const sorted = matches.sort((a: any, b: any) => {
            const aValue = Number(a?.properties?.gridcode ?? a?.properties?.GRIDCODE ?? a?.properties?.value ?? a?.properties?.VALUE ?? 0);
            const bValue = Number(b?.properties?.gridcode ?? b?.properties?.GRIDCODE ?? b?.properties?.value ?? b?.properties?.VALUE ?? 0);
            return bValue - aValue;
        });

        const feature = sorted[0];
        const style = getOfficialKdeStyle(feature);
        const props = feature?.properties || {};
        const gridcode = props.gridcode ?? props.GRIDCODE ?? props.value ?? props.VALUE ?? '-';
        const kerawanan = props.Kerawanan ?? props.kerawanan ?? props.KELAS ?? props.kelas ?? style.label;

        return {
            gridcode,
            kerawanan: String(kerawanan || style.label),
            color: style.fillColor,
            note: getKdePlainLanguageNote(String(kerawanan || style.label)),
        };
    } catch {
        return null;
    }
}

function getKdePlainLanguageNote(level: string) {
    const normalized = normalizeKdeClass(level);

    if (normalized.includes('sangat tinggi')) {
        return 'Area ini menjadi prioritas perhatian karena konsentrasi kejadian paling tinggi pada data 2020–2025.';
    }

    if (normalized.includes('tinggi')) {
        return 'Area ini perlu diwaspadai karena konsentrasi kejadian tergolong tinggi.';
    }

    if (normalized.includes('sedang')) {
        return 'Area ini perlu dipantau, tetapi bukan kelompok kerawanan tertinggi.';
    }

    if (normalized.includes('rendah') && !normalized.includes('sangat')) {
        return 'Area ini memiliki konsentrasi kejadian relatif rendah.';
    }

    return 'Area ini memiliki konsentrasi kejadian sangat rendah pada data 2020–2025.';
}

function makeLocationContext(lat: number, lng: number) {
    const districtInfo = findDistrictByPoint(lat, lng);
    const kdeInfo = findKdeClassByPoint(lat, lng);

    return {
        district: districtInfo?.kecamatan ? titleCase(districtInfo.kecamatan) : 'Belum terdeteksi',
        village: districtInfo?.desa ? titleCase(districtInfo.desa) : '-',
        regency: districtInfo?.kabupaten ? titleCase(districtInfo.kabupaten) : 'Sleman',
        risk: kdeInfo?.kerawanan || 'Belum terdeteksi',
        riskColor: kdeInfo?.color || '#64748B',
        riskNote: kdeInfo?.note || 'Titik ini belum masuk ke zona kerawanan yang tersedia pada layer 2020–2025.',
    };
}

function sanitizeIncidents(incidents: Incident[] = []) {
    return incidents
        .map((incident: any) => {
            const props = incident?.properties || {};
            const coordinates = incident?.geometry?.coordinates;
            const geoLng = Array.isArray(coordinates) ? coordinates[0] : undefined;
            const geoLat = Array.isArray(coordinates) ? coordinates[1] : undefined;
            const lat = Number(incident?.lat ?? incident?.latitude ?? props?.lat ?? props?.latitude ?? props?.LAT ?? geoLat);
            const lng = Number(incident?.lng ?? incident?.longitude ?? incident?.lon ?? props?.lng ?? props?.longitude ?? props?.LNG ?? geoLng);

            return {
                ...props,
                ...incident,
                lat,
                lng,
                latitude: lat,
                longitude: lng,
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

function createIncidentIcon(_type: string, source: string) {
    const isReport = source === 'report';
    const color = isReport ? '#F2A20B' : getIncidentColor(_type);
    const halo = isReport ? 'rgba(242,162,11,.22)' : `${color}2E`;
    const label = isReport ? 'LM' : getIncidentLabel(_type);
    const title = isReport ? 'Laporan Masyarakat' : getIncidentTypeLabel(_type);

    return svgIcon(
        `<div title="${title}" style="position:relative;width:36px;height:40px;display:flex;align-items:center;justify-content:center;">
            <div style="position:absolute;inset:2px 2px 6px;border-radius:999px;background:${halo};filter:blur(.2px);"></div>
            <div style="position:absolute;top:2px;width:30px;height:30px;border-radius:999px;background:${color};border:3px solid #fff;box-shadow:0 12px 24px rgba(15,23,42,.24);display:flex;align-items:center;justify-content:center;color:white;font:900 9px system-ui;letter-spacing:.02em;">
                ${label}
            </div>
            <div style="position:absolute;bottom:4px;width:10px;height:10px;background:${color};transform:rotate(45deg);border-right:3px solid #fff;border-bottom:3px solid #fff;"></div>
        </div>`,
        [36, 40],
        [18, 38],
    );
}

function createContactIcon(type: 'Polsek' | 'Rumah Sakit' | 'Damkar') {
    const isPolice = type === 'Polsek';
    const isHospital = type === 'Rumah Sakit';
    const color = isPolice ? '#0B6E78' : isHospital ? '#16A34A' : '#F97316';
    const ring = isPolice ? 'rgba(14,165,160,.18)' : isHospital ? 'rgba(22,163,74,.18)' : 'rgba(249,115,22,.18)';
    const halo = isPolice ? 'rgba(11,74,99,.16)' : isHospital ? 'rgba(22,163,74,.16)' : 'rgba(249,115,22,.18)';

    const symbol = isPolice
        ? `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.35" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 4v5c0 5-3 8-7 9-4-1-7-4-7-9V7l7-4Z"/><path d="M9 12h6"/><path d="M12 9v6"/></svg>`
        : isHospital
            ? `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.35" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 7v10"/><path d="M7 12h10"/></svg>`
            : `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.35" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 16.6 7.1 19.2l.9-5.5-4-3.9 5.5-.8L12 3Z"/></svg>`;

    return svgIcon(
        `<div style="position:relative;width:44px;height:44px;border-radius:18px;background:${ring};display:flex;align-items:center;justify-content:center;box-shadow:0 16px 30px rgba(15,31,46,.18);">
            <div style="position:absolute;inset:6px;border-radius:15px;background:${halo};filter:blur(1px);"></div>
            <div style="position:relative;width:34px;height:34px;border-radius:14px;background:${color};border:3px solid #fff;box-shadow:0 12px 24px rgba(15,23,42,.24);display:flex;align-items:center;justify-content:center;">${symbol}</div>
        </div>`,
        [44, 44],
        [22, 22],
    );
}

function createReportMarkerIcon() {
    return svgIcon(
        `<div style="position:relative;width:46px;height:46px;display:flex;align-items:center;justify-content:center;">
            <div style="position:absolute;inset:0;border-radius:999px;background:rgba(239,68,68,.18);box-shadow:0 0 0 10px rgba(239,68,68,.08);"></div>
            <div style="width:32px;height:32px;border-radius:999px;background:#F47B52;border:4px solid #fff;box-shadow:0 16px 28px rgba(239,68,68,.42);display:flex;align-items:center;justify-content:center;color:white;font:900 16px system-ui;">
                !
            </div>
        </div>`,
        [46, 46],
        [23, 23],
    );
}

function createClusterIcon(count: number) {
    const size = count >= 50 ? 58 : count >= 20 ? 52 : count >= 10 ? 46 : 40;
    const color = count >= 50 ? '#E11D48' : count >= 20 ? '#F97316' : count >= 10 ? '#FACC15' : '#14B8A6';
    const ring = count >= 50 ? 'rgba(225,29,72,.20)' : count >= 20 ? 'rgba(249,115,22,.20)' : 'rgba(6,182,212,.18)';

    return svgIcon(
        `<div style="position:relative;width:${size}px;height:${size}px;border-radius:999px;background:linear-gradient(135deg,${color},#FDE68A);border:4px solid #F2FAF6;box-shadow:0 20px 38px rgba(15,31,46,.32);display:flex;align-items:center;justify-content:center;outline:8px solid ${ring};color:white;font:900 13px system-ui;">
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


function PopupPanelAutoCollapse({ onPopupOpen }: { onPopupOpen: () => void }) {
    const map = useMap();

    useEffect(() => {
        map.on('popupopen', onPopupOpen);
        return () => {
            map.off('popupopen', onPopupOpen);
        };
    }, [map, onPopupOpen]);

    return null;
}

function LocationRiskAlert({ userLocation, showRiskInfo }: { userLocation: UserLocation | null; showRiskInfo: boolean }) {
    if (!userLocation || !showRiskInfo) return null;

    const lat = Number(userLocation.lat);
    const lng = Number(userLocation.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    const insideSleman = isInsideSlemanBoundary(lat, lng);
    const context = makeLocationContext(lat, lng);
    const riskText = String(context.risk || '').toLowerCase();
    const isHighRisk = riskText.includes('tinggi') || riskText.includes('ekstrem');

    return (
        <div className={`jagasleman-location-risk-alert ${insideSleman ? (isHighRisk ? 'is-high' : 'is-normal') : 'is-outside'}`} role="status" aria-live="polite">
            <div className="jagasleman-location-risk-alert__badge">!</div>
            <div>
                <b>{insideSleman ? `Area ${context.district}` : 'Di luar cakupan utama Sleman'}</b>
                <span>
                    {insideSleman
                        ? `Kerawanan: ${context.risk}. ${context.riskNote || 'Tetap waspada dan pilih rute ramai.'}`
                        : 'Fitur risiko utama difokuskan pada wilayah Kabupaten Sleman.'}
                </span>
            </div>
        </div>
    );
}

function MapInvalidation() {
    const map = useMap();

    useEffect(() => {
        let disposed = false;
        const animationFrames = new Set<number>();

        const invalidate = () => {
            if (disposed) return;

            const frameId = window.requestAnimationFrame(() => {
                animationFrames.delete(frameId);
                if (disposed) return;

                const leafletMap = map as L.Map & {
                    _mapPane?: HTMLElement;
                    _loaded?: boolean;
                };
                const container = leafletMap.getContainer();

                // React can remove the Leaflet map before a delayed resize callback runs.
                // Skip invalidation once the map pane/container is no longer mounted.
                if (!leafletMap._mapPane || !leafletMap._loaded || !container?.isConnected) return;

                leafletMap.invalidateSize({ animate: false, pan: false });
            });

            animationFrames.add(frameId);
        };

        const timers = [
            window.setTimeout(invalidate, 80),
            window.setTimeout(invalidate, 260),
            window.setTimeout(invalidate, 700),
        ];

        const container = map.getContainer();
        const resizeObserver = typeof ResizeObserver !== 'undefined'
            ? new ResizeObserver(invalidate)
            : null;

        resizeObserver?.observe(container);
        window.addEventListener('resize', invalidate);
        document.addEventListener('fullscreenchange', invalidate);

        return () => {
            disposed = true;
            timers.forEach((timer) => window.clearTimeout(timer));
            animationFrames.forEach((frameId) => window.cancelAnimationFrame(frameId));
            animationFrames.clear();
            resizeObserver?.disconnect();
            window.removeEventListener('resize', invalidate);
            document.removeEventListener('fullscreenchange', invalidate);
        };
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
                color: '#07324A',
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
                        <div style="font-weight:900;font-size:13px;color:#07324A;margin-bottom:4px">Kecamatan ${titleCase(kecamatan)}</div>
                        <div style="font-size:12px;color:#F47B52;font-weight:800">Kabupaten ${titleCase(kabupaten)}</div>
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
                            color: '#F47B52',
                            weight: 4,
                            opacity: 1,
                            fillColor: '#F47B52',
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
    const [villageBoundaryData, setVillageBoundaryData] = useState<any>(null);

    useEffect(() => {
        const controller = new AbortController();
        let active = true;

        fetch(VILLAGE_BOUNDARY_GEOJSON_URL, {
            signal: controller.signal,
            headers: { Accept: 'application/geo+json, application/json' },
        })
            .then((response) => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response.json();
            })
            .then((data) => {
                if (active) setVillageBoundaryData(data);
            })
            .catch((error) => {
                if (error?.name !== 'AbortError') {
                    console.warn('Batas kalurahan tidak berhasil dimuat:', error);
                }
            });

        return () => {
            active = false;
            controller.abort();
        };
    }, []);

    useEffect(() => {
        if (!geojsonRef.current || !fitVillageBoundary || !villageBoundaryData) return;

        const bounds = geojsonRef.current.getBounds();

        safeFitBounds(map, bounds, { maxZoom: 12 });
    }, [map, fitVillageBoundary, villageBoundaryData]);

    if (!villageBoundaryData) return null;

    return (
        <GeoJSON
            ref={(layer) => {
                geojsonRef.current = layer;
            }}
            data={villageBoundaryData as any}
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


function BasemapControl({
    open: controlledOpen,
    onToggle,
}: {
    open?: boolean;
    onToggle?: () => void;
} = {}) {
    const [selected, setSelected] = useState<BasemapKey>('jalan');
    const [internalOpen, setInternalOpen] = useState(false);
    const open = controlledOpen ?? internalOpen;
    const toggleOpen = () => {
        if (onToggle) onToggle();
        else setInternalOpen((value) => !value);
    };
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
                maxZoom={active.maxZoom}
                {...(active.subdomains ? { subdomains: active.subdomains } : {})}
            />

            <div ref={controlRef} className={`jagasleman-basemap-panel jagasleman-map-edge-panel ${open ? 'is-open' : ''}`} aria-label="Pilihan basemap">
                <button
                    type="button"
                    className={`jagasleman-map-edge-heading jagasleman-basemap-toggle ${open ? 'is-active' : ''}`}
                    onClick={toggleOpen}
                    aria-expanded={open}
                    title={`Basemap aktif: ${active.title}`}
                >
                    <span className="jagasleman-map-edge-heading-main">
                        <span className="jagasleman-map-edge-heading-icon" aria-hidden="true"><MapIcon /></span>
                        <span>Basemap</span>
                    </span>
                    <span className="jagasleman-map-edge-chevron" aria-hidden="true">{open ? <ChevronUp /> : <ChevronDown />}</span>
                </button>

                {open && (
                    <div className="jagasleman-basemap-menu jagasleman-map-edge-content">
                        <div className="jagasleman-basemap-active-label">Aktif: {active.title}</div>
                        <div className="space-y-2">
                            {BASEMAP_OPTIONS.map((option) => (
                                <button
                                    key={option.key}
                                    type="button"
                                    onClick={() => setSelected(option.key)}
                                    className={`jagasleman-basemap-option ${selected === option.key ? 'is-active' : ''}`}
                                    aria-pressed={selected === option.key}
                                    title={option.desc}
                                >
                                    <span className="jagasleman-basemap-option-icon">{option.icon}</span>
                                    <span>
                                        <span className="jagasleman-basemap-option-title">{option.title}</span>
                                        <span className="jagasleman-basemap-option-desc">{option.desc}</span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}


function MapControlPanel({
    onLocateRequest,
    panelOpen = false,
}: {
    onLocateRequest?: () => void;
    panelOpen?: boolean;
}) {
    const map = useMap();
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
        document.addEventListener('fullscreenchange', onFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
    }, []);

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

    const fitSlemanExtent = () => {
        map.fitBounds(SLEMAN_EXTENT, { padding: [28, 28], maxZoom: 12 });
    };

    const locateUser = () => {
        if (onLocateRequest) {
            onLocateRequest();
            return;
        }

        map.locate({ setView: true, maxZoom: 16, enableHighAccuracy: true });
    };

    return (
        <div className={`jagasleman-map-action-controls ${panelOpen ? 'is-edge-panel-open' : ''}`} role="group" aria-label="Kontrol navigasi peta">
            <button type="button" onClick={() => map.zoomIn()} aria-label="Perbesar peta" title="Perbesar peta"><Plus /></button>
            <button type="button" onClick={() => map.zoomOut()} aria-label="Perkecil peta" title="Perkecil peta"><Minus /></button>
            <button type="button" onClick={fitSlemanExtent} aria-label="Tampilkan seluruh Kabupaten Sleman" title="Tampilkan seluruh Kabupaten Sleman"><Crosshair /></button>
            <button type="button" onClick={locateUser} aria-label="Tampilkan lokasi saya" title="Tampilkan lokasi saya"><LocateFixed /></button>
            <button
                type="button"
                onClick={handleFullscreen}
                className={isFullscreen ? 'is-active' : ''}
                aria-label={isFullscreen ? 'Keluar dari layar penuh' : 'Buka layar penuh'}
                title={isFullscreen ? 'Keluar dari layar penuh' : 'Layar penuh'}
            >
                {isFullscreen ? <Minimize2 /> : <Maximize2 />}
            </button>
        </div>
    );
}




type KdeLayerMode = 'official' | 'automatic' | 'none';

const KDE_LAYER_OPTIONS: Array<{
    value: KdeLayerMode;
    title: string;
    description: string;
}> = [
    {
        value: 'official',
        title: 'KDE 2020–2025',
        description: 'Peta daerah rawan tahun 2020–2025. Mudah dibaca sebagai acuan kerawanan wilayah.',
    },
    {
        value: 'automatic',
        title: 'KDE Otomatis',
        description: 'Peta kepadatan otomatis dari data yang sedang aktif di filter.',
    },
    {
        value: 'none',
        title: 'Tanpa KDE',
        description: 'Sembunyikan peta kerawanan dan tampilkan titik kejadian saja.',
    },
];

type DataLayerKey = 'incidents' | 'districts' | 'villages' | 'contacts';

type DataLayerOption = {
    key: DataLayerKey;
    title: string;
    description: string;
    checked: boolean;
};

function KdeLayerControl({
    mode,
    onChange,
    dataLayers,
    onDataLayerChange,
    open: controlledOpen,
    onToggle,
}: {
    mode: KdeLayerMode;
    onChange: (mode: KdeLayerMode) => void;
    dataLayers: DataLayerOption[];
    onDataLayerChange: (key: DataLayerKey, visible: boolean) => void;
    open?: boolean;
    onToggle?: () => void;
}) {
    const controlRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!controlRef.current) return;
        L.DomEvent.disableClickPropagation(controlRef.current);
        L.DomEvent.disableScrollPropagation(controlRef.current);
    }, []);

    const activeOption = KDE_LAYER_OPTIONS.find((item) => item.value === mode) ?? KDE_LAYER_OPTIONS[0];

    const [internalOpen, setInternalOpen] = useState(false);
    const open = controlledOpen ?? internalOpen;
    const toggleOpen = () => {
        if (onToggle) onToggle();
        else setInternalOpen((value) => !value);
    };

    return (
        <div ref={controlRef} className={`jagasleman-kde-layer-control jagasleman-map-edge-panel ${open ? 'is-open' : ''}`} aria-label="Kontrol Layer Peta">
            <button
                type="button"
                className={`jagasleman-map-edge-heading ${open ? 'is-active' : ''}`}
                onClick={toggleOpen}
                aria-expanded={open}
            >
                <span className="jagasleman-map-edge-heading-main">
                    <span className="jagasleman-map-edge-heading-icon" aria-hidden="true"><Layers3 /></span>
                    <span>Layer Peta</span>
                </span>
                <span className="jagasleman-map-edge-chevron" aria-hidden="true">{open ? <ChevronUp /> : <ChevronDown />}</span>
            </button>

            {open && (
                <div className="jagasleman-map-edge-content">
                    <div className="jagasleman-kde-layer-title">
                        <span>Peta Tematik</span>
                        <span>{activeOption.title}</span>
                    </div>

                    <div className="jagasleman-kde-layer-options">
                        {KDE_LAYER_OPTIONS.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                className={`jagasleman-kde-layer-option ${mode === option.value ? 'is-active' : ''}`}
                                onClick={() => onChange(option.value)}
                                aria-pressed={mode === option.value}
                            >
                                <input
                                    className="jagasleman-kde-layer-radio"
                                    type="radio"
                                    checked={mode === option.value}
                                    readOnly
                                    tabIndex={-1}
                                />
                                <span>
                                    <b>{option.title}</b>
                                    <span>{option.description}</span>
                                </span>
                            </button>
                        ))}
                    </div>

                    {dataLayers.length > 0 && (
                        <>
                            <div className="jagasleman-data-layer-section-title">Data & Batas Peta</div>
                            <div className="jagasleman-data-layer-options">
                                {dataLayers.map((layer) => (
                                    <button
                                        key={layer.key}
                                        type="button"
                                        className={`jagasleman-data-layer-option ${layer.checked ? 'is-active' : ''}`}
                                        onClick={() => onDataLayerChange(layer.key, !layer.checked)}
                                        aria-pressed={layer.checked}
                                    >
                                        <span className="jagasleman-data-layer-check" aria-hidden="true">{layer.checked ? '✓' : ''}</span>
                                        <span className="jagasleman-data-layer-copy">
                                            <b>{layer.title}</b>
                                            <span>{layer.description}</span>
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}

                    <div className="jagasleman-kde-layer-note">
                        Aktifkan layer yang dibutuhkan. Kontrol ini mengikuti pola panel layer pada peta referensi.
                    </div>
                </div>
            )}
        </div>
    );
}

function KdeLegendControl({
    mode,
    showIncidents,
    showDistricts,
    showVillages,
    showContacts,
    open: controlledOpen,
    onToggle,
}: {
    mode: KdeLayerMode;
    showIncidents: boolean;
    showDistricts: boolean;
    showVillages: boolean;
    showContacts: boolean;
    open?: boolean;
    onToggle?: () => void;
}) {
    const riskLevels = [
        { label: 'Rendah', color: '#22C55E' },
        { label: 'Sedang', color: '#FACC15' },
        { label: 'Tinggi', color: '#F97316' },
        { label: 'Sangat Tinggi', color: '#E11D48' },
        { label: 'Ekstrem', color: '#7F1D1D' },
    ];
    const densityLevels = [
        { label: 'Tipis', color: '#22C55E' },
        { label: 'Rendah', color: '#A3E635' },
        { label: 'Sedang', color: '#FACC15' },
        { label: 'Pekat', color: '#F97316' },
        { label: 'Terpekat', color: '#E11D48' },
    ];
    const levels = mode === 'official' ? riskLevels : mode === 'automatic' ? densityLevels : [];

    const subtitle = mode === 'official'
        ? 'Daerah rawan berdasarkan data kejadian periode 2020–2025.'
        : mode === 'automatic'
            ? 'Intensitas warna mengikuti kepadatan titik yang sedang aktif.'
            : 'Layer kerawanan sedang dinonaktifkan. Simbol data peta tetap dapat digunakan.';

    const [internalOpen, setInternalOpen] = useState(false);
    const open = controlledOpen ?? internalOpen;
    const toggleOpen = () => {
        if (onToggle) onToggle();
        else setInternalOpen((value) => !value);
    };
    const controlRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!controlRef.current) return;
        L.DomEvent.disableClickPropagation(controlRef.current);
        L.DomEvent.disableScrollPropagation(controlRef.current);
    }, []);

    const symbols = [
        showIncidents ? { key: 'incidents', label: 'Titik Kejadian', type: 'point' } : null,
        showDistricts ? { key: 'districts', label: 'Batas Kecamatan', type: 'district' } : null,
        showVillages ? { key: 'villages', label: 'Batas Kalurahan', type: 'village' } : null,
        showContacts ? { key: 'contacts', label: 'Lokasi Bantuan', type: 'contact' } : null,
    ].filter(Boolean) as Array<{ key: string; label: string; type: string }>;

    const incidentLegendItems = [
        'PENGEROYOKAN',
        'PENGRUSAKAN',
        'PENGANIAYAAN',
        'PENYALAHGUNAAN SENJATA TAJAM',
        'PENCURIAN DENGAN KEKERASAN (CURAS)',
        'PEMERASAN DAN PENGANCAMAN',
    ].map((type) => ({
        type,
        label: getIncidentTypeLabel(type),
        short: getIncidentLabel(type),
        color: getIncidentColor(type),
    }));

    return (
        <div ref={controlRef} className={`jagasleman-kde-legend jagasleman-map-edge-panel ${open ? 'is-open' : ''}`}>
            <button
                type="button"
                className={`jagasleman-map-edge-heading ${open ? 'is-active' : ''}`}
                onClick={toggleOpen}
                aria-expanded={open}
            >
                <span className="jagasleman-map-edge-heading-main">
                    <span className="jagasleman-map-edge-heading-icon" aria-hidden="true"><Info /></span>
                    <span>Keterangan Peta</span>
                </span>
                <span className="jagasleman-map-edge-chevron" aria-hidden="true">{open ? <ChevronUp /> : <ChevronDown />}</span>
            </button>

            {open && (
                <div className="jagasleman-map-edge-content">
                    <div className="jagasleman-kde-legend-title">
                        {mode === 'official' ? 'Kerawanan 2020–2025' : mode === 'automatic' ? 'Kepadatan Otomatis' : 'Simbol Data Peta'}
                    </div>
                    <div className="jagasleman-kde-legend-subtitle">{subtitle}</div>
                    {levels.length > 0 && (
                        <>
                            <div className="jagasleman-kde-gradient" />
                            <div className="jagasleman-kde-legend-grid">
                                {levels.map((level) => (
                                    <div key={level.label} className="jagasleman-kde-legend-item">
                                        <span style={{ backgroundColor: level.color }} />
                                        <b>{level.label}</b>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {showIncidents && (
                        <div className="jagasleman-incident-legend-list" aria-label="Legenda jenis kejadian">
                            {incidentLegendItems.map((item) => (
                                <div key={item.type} className="jagasleman-incident-legend-item">
                                    <span style={{ backgroundColor: item.color }}>{item.short}</span>
                                    <b>{item.label}</b>
                                </div>
                            ))}
                        </div>
                    )}

                    {symbols.length > 0 && (
                        <div className="jagasleman-map-symbol-list">
                            {symbols.map((symbol) => (
                                <div key={symbol.key} className="jagasleman-map-symbol-item">
                                    <span className={`jagasleman-map-symbol jagasleman-map-symbol--${symbol.type}`} aria-hidden="true" />
                                    <b>{symbol.label}</b>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function normalizeKdeClass(value: unknown) {
    return normalizeText(value)
        .toLowerCase()
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function getOfficialKdeClass(feature: any) {
    const props = feature?.properties || {};

    return (
        props.kelas ||
        props.KELAS ||
        props.class ||
        props.CLASS ||
        props.level ||
        props.LEVEL ||
        props.intensity ||
        props.INTENSITY ||
        props.kategori ||
        props.KATEGORI ||
        props.risk ||
        props.RISK ||
        props.gridcode ||
        props.GRIDCODE ||
        props.value ||
        props.VALUE ||
        'sedang'
    );
}

function getOfficialKdeStyle(feature: any) {
    const rawClass = getOfficialKdeClass(feature);
    const normalized = normalizeKdeClass(rawClass);
    const numericValue = Number(rawClass);

    if (normalized.includes('sangat tinggi') || normalized.includes('ekstrem') || numericValue >= 5) {
        return { fillColor: '#7F1D1D', color: '#7F1D1D', label: 'Sangat Tinggi' };
    }

    if (normalized.includes('tinggi') || numericValue === 4) {
        return { fillColor: '#E11D48', color: '#BE123C', label: 'Tinggi' };
    }

    if (normalized.includes('sedang') || numericValue === 3) {
        return { fillColor: '#F97316', color: '#EA580C', label: 'Sedang' };
    }

    if (normalized.includes('rendah') || numericValue === 2) {
        return { fillColor: '#FACC15', color: '#CA8A04', label: 'Rendah' };
    }

    return { fillColor: '#22C55E', color: '#16A34A', label: 'Sangat Rendah' };
}

function OfficialKdeLayer() {
    const map = useMap();
    const data = OFFICIAL_KDE_2020_2025_GEOJSON;
    const loadState: 'ready' | 'empty' = data ? 'ready' : 'empty';

    useEffect(() => {
        if (!data || loadState !== 'ready') return;

        const layer = L.geoJSON(data);
        const bounds = layer.getBounds();
        if (isReasonableSlemanBounds(bounds)) {
            safeFitBounds(map, bounds, { maxZoom: 13 });
        }
        layer.remove();
    }, [data, loadState, map]);

    if (loadState === 'empty') {
        return (
            <div className="jagasleman-official-kde-missing">
                <b>Peta Kerawanan 2020–2025 belum tersedia</b>
                <span>
                    Simpan file peta kerawanan sebagai GeoJSON di <code>resources/js/data/kde_2020_2025.geojson</code>.
                    File ini dibaca melalui import Vite, bukan <code>public/data</code>.
                </span>
            </div>
        );
    }

    return (
        <GeoJSON
            data={data as any}
            style={(feature) => {
                const style = getOfficialKdeStyle(feature);
                return {
                    color: style.color,
                    weight: 1.25,
                    opacity: 0.86,
                    fillColor: style.fillColor,
                    fillOpacity: 0.38,
                    dashArray: '5 7',
                    lineCap: 'round',
                    lineJoin: 'round',
                };
            }}
            onEachFeature={(feature, layer) => {
                const style = getOfficialKdeStyle(feature);
                const props = feature?.properties || {};
                const kelas = props.Kerawanan ?? props.kerawanan ?? props.KELAS ?? props.kelas ?? style.label;
                const gridcode = props.gridcode ?? props.GRIDCODE ?? props.value ?? props.VALUE ?? '-';

                const friendlyNote = getKdePlainLanguageNote(String(kelas));

                layer.bindPopup(
                    `<div class="jagasleman-kde-popup">
                        <div class="jagasleman-kde-popup__top">
                            <span class="jagasleman-kde-popup__badge" style="background:${style.fillColor}">Daerah Rawan</span>
                            <span class="jagasleman-kde-popup__source">Data 2020–2025</span>
                        </div>
                        <div class="jagasleman-kde-popup__title">Tingkat Kerawanan: ${kelas}</div>
                        <div class="jagasleman-kde-popup__bar"><span style="background:${style.fillColor};width:${Math.max(18, Math.min(100, Number(gridcode) * 20 || 60))}%"></span></div>
                        <div class="jagasleman-kde-popup__grid">
                            <span>Arti warna</span><b>${kelas}</b>
                            <span>Kelas peta</span><b>${gridcode} dari 5</b>
                            <span>Periode</span><b>2020–2025</b>
                        </div>
                        <div class="jagasleman-kde-popup__explain">
                            <b>Apa artinya?</b>
                            <p>${friendlyNote}</p>
                        </div>
                        <p class="jagasleman-kde-popup__note">Peta ini menunjukkan area dengan konsentrasi kejadian, bukan memastikan bahwa lokasi tersebut pasti berbahaya setiap waktu.</p>
                    </div>`,
                    { className: 'jagasleman-kde-popup-shell', maxWidth: 340 },
                );

                layer.on({
                    mouseover: (event: L.LeafletMouseEvent) => {
                        const target = event.target as any;
                        target.setStyle({ weight: 3.2, opacity: 1, fillOpacity: 0.58, dashArray: '' });
                        if (target.bringToFront) target.bringToFront();
                    },
                    mouseout: (event: L.LeafletMouseEvent) => {
                        const target = event.target as any;
                        const resetStyle = getOfficialKdeStyle(feature);
                        target.setStyle({
                            color: resetStyle.color,
                            weight: 1.25,
                            opacity: 0.86,
                            fillColor: resetStyle.fillColor,
                            fillOpacity: 0.38,
                            dashArray: '5 7',
                            lineCap: 'round',
                            lineJoin: 'round',
                        });
                    },
                });
            }}
        />
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

function ClusteredIncidentMarkers({ incidents, showRiskInfo = true }: { incidents: Incident[]; showRiskInfo?: boolean }) {
    const map = useMap();
    const [zoom, setZoom] = useState(() => map.getZoom());
    const [viewTick, setViewTick] = useState(0);

    useEffect(() => {
        const handleViewChange = () => {
            setZoom(map.getZoom());
            setViewTick((value) => value + 1);
        };

        map.on('zoomend moveend resize', handleViewChange);

        return () => {
            map.off('zoomend moveend resize', handleViewChange);
        };
    }, [map]);

    const clusterMode = incidents.length >= 2 && zoom < 17;

    const clusters = useMemo(() => {
        if (!clusterMode) return [];

        const pixelRadius = zoom <= 8 ? 132 : zoom <= 9 ? 118 : zoom <= 10 ? 104 : zoom <= 11 ? 90 : zoom <= 12 ? 76 : zoom <= 13 ? 64 : zoom <= 14 ? 52 : zoom <= 15 ? 42 : 32;
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

            const point = map.latLngToLayerPoint([lat, lng]);
            const key = `${Math.floor(point.x / pixelRadius)}:${Math.floor(point.y / pixelRadius)}`;

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
    }, [clusterMode, incidents, map, zoom, viewTick]);

    if (clusterMode) {
        return (
            <>
                {clusters.map((cluster) => {
                    if (cluster.count === 1) {
                        return <IncidentMarker key={cluster.key} incident={cluster.items[0]} showRiskInfo={showRiskInfo} />;
                    }

                    const topTypes = cluster.items.reduce((acc: Record<string, number>, item: any) => {
                        const type = getIncidentTypeLabel(getIncidentType(item));
                        acc[type] = (acc[type] || 0) + 1;
                        return acc;
                    }, {});

                    const dominantType =
                        Object.entries(topTypes).sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0] || 'Kejahatan';
                    const reportCount = cluster.items.filter((item: any) => getIncidentSource(item) === 'report').length;
                    const policeCount = cluster.count - reportCount;

                    return (
                        <Marker
                            key={cluster.key}
                            position={[cluster.lat, cluster.lng]}
                            icon={createClusterIcon(cluster.count)}
                            eventHandlers={{
                                click: () => {
                                    map.flyTo([cluster.lat, cluster.lng], Math.min(17, Math.max(zoom + 2, 12)), {
                                        duration: 0.65,
                                    });
                                },
                            }}
                        >
                            <Popup className="modern-popup compact-map-popup" maxWidth={280}>
                                <div className="w-[240px] p-3 text-[#07324A]">
                                    <div className="mb-3 flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white">
                                            {cluster.count}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-[#07324A]">Cluster Kejadian</p>
                                            <p className="text-[11px] font-bold text-slate-500">Klik untuk memperbesar area</p>
                                        </div>
                                    </div>

                                    <div className="rounded-2xl bg-slate-50 p-3">
                                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                                            Kategori dominan
                                        </p>
                                        <p className="mt-1 text-sm font-black text-slate-800">{dominantType}</p>
                                    </div>

                                    <div className="mt-2 grid grid-cols-2 gap-2 text-center text-[11px] font-black text-slate-700">
                                        <div className="rounded-xl bg-[#FFF8ED] px-2 py-2">Laporan Masyarakat: {reportCount}</div>
                                        <div className="rounded-xl bg-[#F2FAF6] px-2 py-2">Data Kepolisian: {policeCount}</div>
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
                    showRiskInfo={showRiskInfo}
                />
            ))}
        </>
    );
}

function IncidentMarker({ incident, showRiskInfo = true }: { incident: any; showRiskInfo?: boolean }) {
    const displayType = getIncidentType(incident);
    const typeLabel = getIncidentTypeLabel(displayType);
    const source = getIncidentSource(incident);
    const isReport = source === 'report';
    const reportCode = getIncidentReportCode(incident);
    const photoUrls = getIncidentPhotoUrls(incident);
    const [activePhotoIndex, setActivePhotoIndex] = useState(0);
    const activePhotoUrl = photoUrls[activePhotoIndex] ?? photoUrls[0] ?? null;
    const color = getIncidentColor(displayType);
    const date = formatIncidentDate(getIncidentDate(incident));
    const time = formatIncidentTime(getIncidentTime(incident));
    const location = getIncidentLocation(incident);
    const description = getIncidentDescription(incident);

    const lat = Number(incident.lat);
    const lng = Number(incident.lng);

    const accent = isReport ? '#F2A20B' : '#0B6E78';
    const softAccent = isReport ? '#FFF7ED' : '#EAFBF8';
    const labelText = isReport ? 'Laporan Masyarakat' : 'Data Kepolisian';

    return (
        <Marker position={[lat, lng]} icon={createIncidentIcon(displayType, source)}>
            <Popup className="incident-popup modern-popup compact-map-popup" minWidth={270} maxWidth={350}>
                <div className="jaga-map-popup-card w-[min(86vw,330px)] max-w-[330px] overflow-hidden bg-white text-[#07324A]">
                    <div
                        className="relative overflow-hidden border-b border-slate-200 px-4 pb-3 pt-4"
                        style={{ background: `linear-gradient(135deg, ${softAccent} 0%, #FFFFFF 60%, rgba(216,228,237,.55) 100%)` }}
                    >
                        <div
                            className="absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-20 blur-2xl"
                            style={{ backgroundColor: accent }}
                        />
                        <div className="relative flex items-start justify-between gap-4 pr-7">
                            <div className="min-w-0">
                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                    <span
                                        className="inline-flex rounded-full border bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] shadow-sm"
                                        style={{ borderColor: `${accent}33`, color: accent }}
                                    >
                                        {labelText}
                                    </span>
                                    <span
                                        className="inline-flex rounded-full px-2.5 py-1 text-[10px] font-black text-white shadow-sm"
                                        style={{ backgroundColor: accent, color: isReport ? '#422006' : '#FFFFFF' }}
                                    >
                                        {isReport ? 'LM' : 'DK'}
                                    </span>
                                </div>

                                <h3 className="text-base font-black leading-tight text-[#07324A]">
                                    {typeLabel}
                                </h3>

                                {reportCode && (
                                    <p className="mt-2 inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-black text-slate-700">
                                        {reportCode}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {activePhotoUrl && (
                        <div className="relative h-24 w-full overflow-hidden bg-[#F8FAFC]">
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
                                    <div className="absolute left-3 right-3 top-1/2 flex -translate-y-1/2 items-center justify-between">
                                        <button
                                            type="button"
                                            onClick={() => setActivePhotoIndex((prev) => (prev - 1 + photoUrls.length) % photoUrls.length)}
                                            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-sm font-black text-white backdrop-blur transition hover:bg-black/75"
                                            aria-label="Foto sebelumnya"
                                        >
                                            ‹
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setActivePhotoIndex((prev) => (prev + 1) % photoUrls.length)}
                                            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-sm font-black text-white backdrop-blur transition hover:bg-black/75"
                                            aria-label="Foto berikutnya"
                                        >
                                            ›
                                        </button>
                                    </div>

                                    <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                                        {photoUrls.map((url, index) => (
                                            <button
                                                key={`${url}-${index}`}
                                                type="button"
                                                onClick={() => setActivePhotoIndex(index)}
                                                className={`h-1.5 rounded-full transition ${index === activePhotoIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/55'}`}
                                                aria-label={`Lihat foto ${index + 1}`}
                                            />
                                        ))}
                                    </div>

                                    <span className="absolute right-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-black text-white backdrop-blur">
                                        {activePhotoIndex + 1}/{photoUrls.length}
                                    </span>
                                </>
                            )}
                        </div>
                    )}

                    <div className="space-y-2.5 p-3">
                        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Jenis Kejadian</p>
                            <p className="mt-1.5 text-sm font-black leading-relaxed text-[#07324A]">{typeLabel || '-'}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Tanggal Kejadian</p>
                                <p className="mt-1.5 text-sm font-black leading-relaxed text-[#07324A]">{date || '-'}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Waktu Kejadian</p>
                                <p className="mt-1.5 text-sm font-black leading-relaxed text-[#07324A]">{time || '-'}</p>
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Alamat Kejadian</p>
                            <p className="mt-1.5 break-words text-sm font-bold leading-relaxed text-[#07324A]">{location || '-'}</p>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Deskripsi Kejadian</p>
                            <p className="mt-1.5 whitespace-pre-wrap break-words text-xs font-semibold leading-relaxed text-[#07324A]">
                                {description && description !== '-' ? description : 'Deskripsi kejadian belum tersedia.'}
                            </p>
                        </div>

                        <a
                            href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex h-10 items-center justify-center rounded-2xl bg-[#F47B52] px-4 text-xs font-black text-white shadow-sm transition hover:bg-[#B94A4A]"
                        >
                            Buka Google Maps
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
                    const rawContactType = String(contact.type || '').toLowerCase();
                    const contactType = rawContactType.includes('damkar') || rawContactType.includes('pemadam')
                        ? 'Damkar'
                        : rawContactType.includes('rumah') || rawContactType.includes('rs') || rawContactType.includes('sakit')
                            ? 'Rumah Sakit'
                            : 'Polsek';
                    const accent = contactType === 'Rumah Sakit' ? '#16A34A' : contactType === 'Damkar' ? '#F97316' : '#0B6E78';

                    return (
                        <Marker
                            key={contact.id}
                            position={[Number(contact.lat), Number(contact.lng)]}
                            icon={createContactIcon(contactType)}
                        >
                            <Popup className="contact-popup modern-popup compact-map-popup" minWidth={300} maxWidth={380}>
                                <div className="jaga-map-popup-card w-[min(82vw,290px)] max-w-[290px] overflow-hidden bg-white text-[#07324A]">
                                    <div
                                        className="border-b border-slate-200 px-5 py-4"
                                        style={{ background: `linear-gradient(135deg, ${accent}14 0%, #FFFFFF 72%)` }}
                                    >
                                        <div className="mb-3 flex items-center gap-2">
                                            <span
                                                className="inline-flex rounded-full border bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] shadow-sm"
                                                style={{ borderColor: `${accent}33`, color: accent }}
                                            >
                                                {contactType}
                                            </span>
                                        </div>

                                        <h3 className="text-base font-black leading-tight text-[#07324A]">
                                            {contact.name || '-'}
                                        </h3>
                                    </div>

                                    <div className="space-y-2 p-3">
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Alamat</p>
                                            <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-700">
                                                {contact.address || '-'}
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
                                                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Telepon</p>
                                                <p className="mt-1 break-words text-sm font-black text-[#07324A]">{contact.phone || '-'}</p>
                                            </div>
                                            <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
                                                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Jarak</p>
                                                <p className="mt-1 text-sm font-black" style={{ color: accent }}>
                                                    {contact.distanceText || 'Cek rute'}
                                                </p>
                                            </div>
                                        </div>

                                        {contact.website && (
                                            <a
                                                href={contact.website}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="block rounded-2xl bg-slate-950 px-4 py-3 text-center text-xs font-black text-white transition hover:bg-slate-800"
                                            >
                                                Buka Google Maps
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
        </>
    );
}

function EmergencyContactLegend({ contacts }: { contacts: EmergencyContact[] }) {
    if (!contacts?.length) return null;

    const policeCount = contacts.filter((contact: any) => String(contact?.type || '').toLowerCase().includes('polsek')).length;
    const hospitalCount = contacts.filter((contact: any) => String(contact?.type || '').toLowerCase().includes('rumah') || String(contact?.type || '').toLowerCase().includes('sakit') || String(contact?.type || '').toLowerCase().includes('rs')).length;
    const fireCount = contacts.filter((contact: any) => String(contact?.type || '').toLowerCase().includes('damkar') || String(contact?.type || '').toLowerCase().includes('pemadam')).length;

    return (
        <div className="jagasleman-contact-legend">
            <div className="jagasleman-contact-legend-title">Legenda Bantuan</div>
            <div className="jagasleman-contact-legend-row">
                <span className="jagasleman-contact-legend-icon police">⚑</span>
                <span>Polsek</span>
                <b>{policeCount}</b>
            </div>
            <div className="jagasleman-contact-legend-row">
                <span className="jagasleman-contact-legend-icon hospital">✚</span>
                <span>Rumah Sakit</span>
                <b>{hospitalCount}</b>
            </div>
            <div className="jagasleman-contact-legend-row">
                <span className="jagasleman-contact-legend-icon fire">🔥</span>
                <span>Damkar</span>
                <b>{fireCount}</b>
            </div>
        </div>
    );
}

function SelectedLocationMarker({ clickMarker, showRiskInfo = true }: { clickMarker: { lat: number; lng: number } | null; showRiskInfo?: boolean }) {
    if (!clickMarker) return null;

    return (
        <Marker position={[Number(clickMarker.lat), Number(clickMarker.lng)]} icon={createReportMarkerIcon()}>
            <Popup>
                <div className="w-[210px] max-w-[210px] p-3">
                    <p className="text-sm font-black text-foreground">Lokasi Laporan Dipilih</p>
                    <p className="mt-1 font-mono text-xs font-bold text-slate-500">
                        {Number(clickMarker.lat).toFixed(6)}, {Number(clickMarker.lng).toFixed(6)}
                    </p>
                    {showRiskInfo && (() => {
                        const context = makeLocationContext(Number(clickMarker.lat), Number(clickMarker.lng));
                        return (
                            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs">
                                <p className="font-black text-[#07324A]">Kecamatan {context.district}</p>
                                <p className="mt-1 font-semibold text-slate-500">Tingkat kerawanan: <b style={{ color: context.riskColor }}>{context.risk}</b></p>
                                <p className="mt-1 font-semibold leading-relaxed text-slate-500">{context.riskNote}</p>
                            </div>
                        );
                    })()}
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
    onShowIncidentMarkersChange,
    showMapControls = true,
    onLocateRequest,
    showEdgePanels = false,
    showKdeLegend = true,
    showRiskInfo = true,
    kdeLayerMode = showHeatmap ? 'automatic' : 'official',
    onKdeLayerModeChange,
    officialKdeUrl,
}: Omit<MapViewProps, 'center' | 'zoom'>) {
    const cleanIncidents = useMemo(() => sanitizeIncidents(incidents), [incidents]);
    const [internalKdeLayerMode, setInternalKdeLayerMode] = useState<KdeLayerMode>(kdeLayerMode);
    const activeKdeLayerMode = onKdeLayerModeChange ? kdeLayerMode : internalKdeLayerMode;
    const changeKdeLayerMode = (mode: KdeLayerMode) => {
        if (onKdeLayerModeChange) {
            onKdeLayerModeChange(mode);
        } else {
            setInternalKdeLayerMode(mode);
        }
    };
    const showOfficialKde = activeKdeLayerMode === 'official';
    const showAutomaticKde = activeKdeLayerMode === 'automatic';
    const userAccuracy = Number(userLocation?.accuracy ?? 80);
    const [incidentLayerVisible, setIncidentLayerVisible] = useState(showIncidentMarkers);
    const [districtLayerVisible, setDistrictLayerVisible] = useState(showDistrictBoundary);
    const [villageLayerVisible, setVillageLayerVisible] = useState(showVillageBoundary);
    const [contactLayerVisible, setContactLayerVisible] = useState(contacts.length > 0);
    const [activeEdgePanel, setActiveEdgePanel] = useState<MapPanelKey>(null);

    useEffect(() => setIncidentLayerVisible(showIncidentMarkers), [showIncidentMarkers]);
    useEffect(() => setDistrictLayerVisible(showDistrictBoundary), [showDistrictBoundary]);
    useEffect(() => setVillageLayerVisible(showVillageBoundary), [showVillageBoundary]);
    useEffect(() => setContactLayerVisible(contacts.length > 0), [contacts.length]);

    const dataLayers: DataLayerOption[] = [
        {
            key: 'incidents',
            title: 'Titik Kejadian',
            description: 'Marker data kepolisian dan laporan masyarakat.',
            checked: incidentLayerVisible,
        },
        ...(showDistrictBoundary ? [{
            key: 'districts' as DataLayerKey,
            title: 'Batas Kecamatan',
            description: 'Garis administrasi kecamatan Kabupaten Sleman.',
            checked: districtLayerVisible,
        }] : []),
        ...(showVillageBoundary ? [{
            key: 'villages' as DataLayerKey,
            title: 'Batas Kalurahan',
            description: 'Garis administrasi kalurahan/desa.',
            checked: villageLayerVisible,
        }] : []),
        ...(contacts.length > 0 ? [{
            key: 'contacts' as DataLayerKey,
            title: 'Lokasi Bantuan',
            description: 'Polisi dan fasilitas kesehatan terdekat.',
            checked: contactLayerVisible,
        }] : []),
    ];

    const changeDataLayer = (key: DataLayerKey, visible: boolean) => {
        if (key === 'incidents') {
            setIncidentLayerVisible(visible);
            onShowIncidentMarkersChange?.(visible);
            return;
        }
        if (key === 'districts') setDistrictLayerVisible(visible);
        if (key === 'villages') setVillageLayerVisible(visible);
        if (key === 'contacts') setContactLayerVisible(visible);
    };

    return (
        <>
            <MapStyle />
            {showMapControls && <MapControlPanel onLocateRequest={onLocateRequest} />}
            {showEdgePanels ? (
                <>
                    <div
                        className={`jagasleman-map-right-stack jagasleman-bantara-control-stack ${activeEdgePanel ? 'has-open-panel' : ''}`}
                        data-open-panel={activeEdgePanel ?? 'none'}
                        role="region"
                        aria-label="Kontrol peta"
                    >
                        {showKdeLegend && (
                            <KdeLegendControl
                                mode={activeKdeLayerMode}
                                showIncidents={incidentLayerVisible}
                                showDistricts={districtLayerVisible}
                                showVillages={villageLayerVisible}
                                showContacts={contactLayerVisible}
                                open={activeEdgePanel === 'legend'}
                                onToggle={() => setActiveEdgePanel((current) => current === 'legend' ? null : 'legend')}
                            />
                        )}
                        <KdeLayerControl
                            mode={activeKdeLayerMode}
                            onChange={changeKdeLayerMode}
                            dataLayers={dataLayers}
                            onDataLayerChange={changeDataLayer}
                            open={activeEdgePanel === 'layers'}
                            onToggle={() => setActiveEdgePanel((current) => current === 'layers' ? null : 'layers')}
                        />
                        <BasemapControl
                            open={activeEdgePanel === 'basemap'}
                            onToggle={() => setActiveEdgePanel((current) => current === 'basemap' ? null : 'basemap')}
                        />
                    </div>
                </>
            ) : (
                <BasemapControl />
            )}
            <MapInvalidation />
            <PopupPanelAutoCollapse onPopupOpen={() => setActiveEdgePanel(null)} />
            <ClickHandler onClick={onClick} />
            <LocationRiskAlert userLocation={userLocation || null} showRiskInfo={showRiskInfo} />

            {districtLayerVisible && <DistrictBoundaryLayer fitDistrictBoundary={fitDistrictBoundary} incidents={cleanIncidents} />}

            {villageLayerVisible && (
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
                            color: '#F47B52',
                            weight: 1,
                            opacity: 0.45,
                            fillColor: '#BDE7E1',
                            fillOpacity: 0.12,
                        }}
                    />

                    <Marker
                        position={[Number(userLocation.lat), Number(userLocation.lng)]}
                        icon={svgIcon(
                            '<div style="width:24px;height:24px;border-radius:50%;background:#F47B52;border:4px solid white;box-shadow:0 10px 20px rgba(14,165,233,.35);"></div>',
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
                                {showRiskInfo ? (() => {
                                    const context = makeLocationContext(Number(userLocation.lat), Number(userLocation.lng));
                                    return (
                                        <>
                                            <p className="mt-1 text-xs font-semibold text-slate-500">
                                                Akurasi ±{Math.round(userAccuracy)}m
                                            </p>
                                            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs">
                                                <p className="font-black text-[#07324A]">Kecamatan {context.district}</p>
                                                <p className="mt-1 font-semibold text-slate-500">Tingkat kerawanan: <b style={{ color: context.riskColor }}>{context.risk}</b></p>
                                            </div>
                                        </>
                                    );
                                })() : (
                                    <p className="mt-1 text-xs font-semibold text-slate-500">
                                        Akurasi ±{Math.round(userAccuracy)}m
                                    </p>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                </>
            )}

            {showOfficialKde && <OfficialKdeLayer />}

            {showAutomaticKde && cleanIncidents.length > 0 && (
                <ContinuousHeatmapLayer incidents={cleanIncidents} bandwidthKm={heatmapBandwidthKm} />
            )}

            {activeKdeLayerMode === 'none' && hotspotClusters.length > 0 && (
                <HotspotClusterLayer hotspotClusters={hotspotClusters} onClusterClick={onClusterClick} />
            )}

            {incidentLayerVisible && <ClusteredIncidentMarkers incidents={cleanIncidents} showRiskInfo={showRiskInfo} />}

            {contactLayerVisible && !showEdgePanels && <EmergencyContactLegend contacts={contacts} />}
            {contactLayerVisible && <EmergencyContactMarkers contacts={contacts} />}

            <SelectedLocationMarker clickMarker={clickMarker || null} showRiskInfo={showRiskInfo} />
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
            onShowIncidentMarkersChange,
            showMapControls = true,
            onLocateRequest,
            showEdgePanels = false,
            showKdeLegend = true,
            showRiskInfo = true,
            kdeLayerMode,
            onKdeLayerModeChange,
            officialKdeUrl,
        },
        ref,
    ) => {
        const isVillageBoundaryOnlyMap = Boolean(showVillageBoundary && !showDistrictBoundary && !showHeatmap && !kdeLayerMode && (!incidents || incidents.length === 0));
        const resolvedKdeLayerMode = kdeLayerMode ?? (isVillageBoundaryOnlyMap ? 'none' : undefined);
        const resolvedShowKdeLegend = isVillageBoundaryOnlyMap ? false : showKdeLegend;
        const resolvedShowRiskInfo = isVillageBoundaryOnlyMap ? false : showRiskInfo;

        return (
            <MapContainer
                ref={ref as any}
                center={center}
                zoom={zoom}
                className="jagasleman-leaflet-map h-full w-full"
                maxBounds={[[SLEMAN_BOUNDS.minLat - 1.35, SLEMAN_BOUNDS.minLng - 1.35], [SLEMAN_BOUNDS.maxLat + 1.35, SLEMAN_BOUNDS.maxLng + 1.35]]}
                maxBoundsViscosity={0.25}
                minZoom={7}
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
                    onShowIncidentMarkersChange={onShowIncidentMarkersChange}
                    showMapControls={showMapControls}
                    onLocateRequest={onLocateRequest}
                    showEdgePanels={showEdgePanels}
                    showKdeLegend={resolvedShowKdeLegend}
                    showRiskInfo={resolvedShowRiskInfo}
                    kdeLayerMode={resolvedKdeLayerMode}
                    onKdeLayerModeChange={onKdeLayerModeChange}
                    officialKdeUrl={officialKdeUrl}
                />
            </MapContainer>
        );
    },
);

MapView.displayName = 'MapView';

export default MapView;
