import { useEffect, useMemo, useRef, useState } from 'react';
import { CircleMarker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

import type { EmergencyContact } from '@/data/dummy';

export type RouteOrigin = {
    lat: number;
    lng: number;
    label: string;
    detail?: string;
    source: 'incident' | 'user';
};

export type AssistanceRouteKind = 'police' | 'hospital';

export type AssistanceRoute = {
    kind: AssistanceRouteKind;
    contact: EmergencyContact;
    coordinates: Array<[number, number]>;
    distanceKm: number;
    durationMinutes: number;
    routingMode: 'network' | 'straight-line';
};

type UseNearestAssistanceRoutesResult = {
    routes: AssistanceRoute[];
    loading: boolean;
    error: string | null;
};

const ROUTE_COLORS: Record<AssistanceRouteKind, string> = {
    police: '#173A66',
    hospital: '#E11D2E',
};

const DEFAULT_OSRM_BASE_URL = 'https://router.project-osrm.org';

function normalizeContactType(contact: EmergencyContact): AssistanceRouteKind | null {
    const value = String(contact?.type || contact?.jenis || '').toLowerCase();

    if (value.includes('rumah') || value.includes('sakit') || value.includes('hospital') || value === 'rs') {
        return 'hospital';
    }

    if (value.includes('polsek') || value.includes('polres') || value.includes('polisi') || value.includes('police')) {
        return 'police';
    }

    return null;
}

export function haversineDistanceKm(
    origin: Pick<RouteOrigin, 'lat' | 'lng'>,
    destination: Pick<EmergencyContact, 'lat' | 'lng'>,
): number {
    const earthRadiusKm = 6371;
    const toRadians = (degree: number) => (degree * Math.PI) / 180;
    const deltaLat = toRadians(Number(destination.lat) - Number(origin.lat));
    const deltaLng = toRadians(Number(destination.lng) - Number(origin.lng));
    const lat1 = toRadians(Number(origin.lat));
    const lat2 = toRadians(Number(destination.lat));

    const a =
        Math.sin(deltaLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getNearestContact(
    origin: RouteOrigin,
    contacts: EmergencyContact[],
    kind: AssistanceRouteKind,
): EmergencyContact | null {
    const candidates = contacts
        .filter((contact) => normalizeContactType(contact) === kind)
        .filter((contact) => Number.isFinite(Number(contact.lat)) && Number.isFinite(Number(contact.lng)));

    if (candidates.length === 0) return null;

    return [...candidates].sort(
        (a, b) => haversineDistanceKm(origin, a) - haversineDistanceKm(origin, b),
    )[0];
}

function makeFallbackRoute(
    kind: AssistanceRouteKind,
    origin: RouteOrigin,
    contact: EmergencyContact,
): AssistanceRoute {
    const distanceKm = haversineDistanceKm(origin, contact);
    const estimatedSpeedKmh = 30;

    return {
        kind,
        contact,
        coordinates: [
            [Number(origin.lat), Number(origin.lng)],
            [Number(contact.lat), Number(contact.lng)],
        ],
        distanceKm,
        durationMinutes: Math.max(1, (distanceKm / estimatedSpeedKmh) * 60),
        routingMode: 'straight-line',
    };
}

async function fetchRoadRoute(
    kind: AssistanceRouteKind,
    origin: RouteOrigin,
    contact: EmergencyContact,
    signal: AbortSignal,
): Promise<AssistanceRoute> {
    const configuredBaseUrl = String((import.meta as any).env?.VITE_OSRM_BASE_URL || DEFAULT_OSRM_BASE_URL).replace(/\/$/, '');
    const coordinates = `${origin.lng},${origin.lat};${contact.lng},${contact.lat}`;
    const url = `${configuredBaseUrl}/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false&alternatives=false`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { Accept: 'application/json' },
            signal,
        });

        if (!response.ok) {
            throw new Error(`Layanan rute merespons ${response.status}`);
        }

        const payload = await response.json();
        const result = payload?.routes?.[0];
        const routeCoordinates = result?.geometry?.coordinates;

        if (!Array.isArray(routeCoordinates) || routeCoordinates.length < 2) {
            throw new Error('Geometri rute tidak tersedia');
        }

        return {
            kind,
            contact,
            coordinates: routeCoordinates
                .map((coordinate: unknown[]) => [Number(coordinate?.[1]), Number(coordinate?.[0])] as [number, number])
                .filter(([lat, lng]: [number, number]) => Number.isFinite(lat) && Number.isFinite(lng)),
            distanceKm: Number(result.distance || 0) / 1000,
            durationMinutes: Number(result.duration || 0) / 60,
            routingMode: 'network',
        };
    } catch (error) {
        if ((error as Error)?.name === 'AbortError') throw error;
        return makeFallbackRoute(kind, origin, contact);
    }
}

export function useNearestAssistanceRoutes(
    origin: RouteOrigin | null,
    contacts: EmergencyContact[],
): UseNearestAssistanceRoutesResult {
    const [routes, setRoutes] = useState<AssistanceRoute[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const availableContacts = useMemo(
        () => contacts.filter((contact) => normalizeContactType(contact) !== null),
        [contacts],
    );

    useEffect(() => {
        if (!origin) {
            setRoutes((current) => (current.length === 0 ? current : []));
            setLoading(false);
            setError(null);
            return;
        }

        const nearestPolice = getNearestContact(origin, availableContacts, 'police');
        const nearestHospital = getNearestContact(origin, availableContacts, 'hospital');
        const targets = [
            nearestPolice ? { kind: 'police' as const, contact: nearestPolice } : null,
            nearestHospital ? { kind: 'hospital' as const, contact: nearestHospital } : null,
        ].filter(Boolean) as Array<{ kind: AssistanceRouteKind; contact: EmergencyContact }>;

        if (targets.length === 0) {
            setRoutes([]);
            setLoading(false);
            setError('Data Polsek dan rumah sakit belum tersedia pada peta.');
            return;
        }

        const controller = new AbortController();
        setLoading(true);
        setError(null);

        Promise.all(
            targets.map(({ kind, contact }) => fetchRoadRoute(kind, origin, contact, controller.signal)),
        )
            .then((result) => {
                setRoutes(result);
                const usesFallback = result.some((route) => route.routingMode === 'straight-line');
                setError(
                    usesFallback
                        ? 'Sebagian rute jalan tidak dapat dimuat. Garis lurus ditampilkan sebagai perkiraan sementara.'
                        : null,
                );
            })
            .catch((routeError) => {
                if ((routeError as Error)?.name === 'AbortError') return;
                setRoutes([]);
                setError('Analisis rute tidak dapat diproses. Periksa koneksi internet atau layanan OSRM.');
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });

        return () => controller.abort();
    }, [origin, availableContacts]);

    return { routes, loading, error };
}

function formatDistance(value: number) {
    if (!Number.isFinite(value)) return '-';
    if (value < 1) return `${Math.round(value * 1000)} m`;
    return `${value.toFixed(value < 10 ? 1 : 0)} km`;
}

function formatDuration(value: number) {
    if (!Number.isFinite(value)) return '-';
    if (value < 60) return `${Math.max(1, Math.round(value))} menit`;

    const hours = Math.floor(value / 60);
    const minutes = Math.round(value % 60);
    return `${hours} jam ${minutes} menit`;
}

function googleDirectionsUrl(origin: RouteOrigin, route: AssistanceRoute) {
    const destination = route.contact;
    return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&travelmode=driving`;
}

export function AssistanceRouteControl({
    open,
    onToggle,
    origin,
    routes,
    loading,
    error,
    onUseCurrentLocation,
    locating,
    onClear,
}: {
    open: boolean;
    onToggle: () => void;
    origin: RouteOrigin | null;
    routes: AssistanceRoute[];
    loading: boolean;
    error: string | null;
    onUseCurrentLocation: () => void;
    locating: boolean;
    onClear: () => void;
}) {
    const controlRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!controlRef.current) return;
        L.DomEvent.disableClickPropagation(controlRef.current);
        L.DomEvent.disableScrollPropagation(controlRef.current);
    }, []);

    return (
        <div
            ref={controlRef}
            className={`jagasleman-route-control jagasleman-map-edge-panel ${open ? 'is-open' : ''}`}
            aria-label="Analisis rute bantuan terdekat"
        >
            <button
                type="button"
                className={`jagasleman-map-edge-heading ${open ? 'is-active' : ''}`}
                onClick={onToggle}
                aria-expanded={open}
            >
                <span className="jagasleman-map-edge-heading-main">
                    <span className="jagasleman-map-edge-heading-icon" aria-hidden="true">↗</span>
                    <span>Rute Bantuan</span>
                </span>
                <span className="jagasleman-map-edge-chevron" aria-hidden="true">{open ? '⌃' : '⌄'}</span>
            </button>

            {open && (
                <div className="jagasleman-map-edge-content jagasleman-route-content">
                    <div className="jagasleman-route-intro">
                        Rute dihitung menuju Polsek dan rumah sakit terdekat dari titik kejadian atau lokasi pengguna.
                    </div>

                    {!origin ? (
                        <div className="jagasleman-route-empty">
                            <b>Pilih titik awal</b>
                            <span>Klik marker kejadian lalu tekan tombol <i>Analisis Rute Bantuan</i>.</span>
                            <button type="button" onClick={onUseCurrentLocation} disabled={locating}>
                                {locating ? 'Mencari lokasi...' : 'Gunakan Lokasi Saya'}
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="jagasleman-route-origin">
                                <div>
                                    <span>Titik awal</span>
                                    <b>{origin.label}</b>
                                    {origin.detail && <small>{origin.detail}</small>}
                                </div>
                                <button type="button" onClick={onClear}>Hapus</button>
                            </div>

                            {loading && (
                                <div className="jagasleman-route-loading">
                                    <span /> Menghitung rute jalan terdekat...
                                </div>
                            )}

                            {!loading && routes.length > 0 && (
                                <div className="jagasleman-route-results">
                                    {routes.map((route) => (
                                        <article key={`${route.kind}-${route.contact.id}`} className={`is-${route.kind}`}>
                                            <div className="jagasleman-route-result-heading">
                                                <span>{route.kind === 'police' ? 'POLSEK TERDEKAT' : 'RUMAH SAKIT TERDEKAT'}</span>
                                                <i style={{ backgroundColor: ROUTE_COLORS[route.kind] }} />
                                            </div>
                                            <b>{route.contact.name}</b>
                                            <p>{route.contact.address || '-'}</p>
                                            <div className="jagasleman-route-metrics">
                                                <span><small>Jarak</small><b>{formatDistance(route.distanceKm)}</b></span>
                                                <span><small>Estimasi</small><b>{formatDuration(route.durationMinutes)}</b></span>
                                            </div>
                                            <div className="jagasleman-route-mode">
                                                {route.routingMode === 'network' ? 'Rute jaringan jalan' : 'Perkiraan garis lurus'}
                                            </div>
                                            <a href={googleDirectionsUrl(origin, route)} target="_blank" rel="noreferrer">
                                                Buka Petunjuk Arah
                                            </a>
                                        </article>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {error && <div className="jagasleman-route-warning">{error}</div>}
                </div>
            )}
        </div>
    );
}

export function AssistanceRouteLayer({
    origin,
    routes,
}: {
    origin: RouteOrigin | null;
    routes: AssistanceRoute[];
}) {
    const map = useMap();

    useEffect(() => {
        if (!origin || routes.length === 0) return;

        const allCoordinates = routes.flatMap((route) => route.coordinates);
        if (allCoordinates.length < 2) return;

        const bounds = L.latLngBounds(allCoordinates as L.LatLngExpression[]);
        if (bounds.isValid()) {
            map.fitBounds(bounds, {
                paddingTopLeft: [42, 42],
                paddingBottomRight: [340, 42],
                maxZoom: 15,
            });
        }
    }, [map, origin, routes]);

    if (!origin) return null;

    return (
        <>
            <CircleMarker
                center={[origin.lat, origin.lng]}
                radius={8}
                pathOptions={{
                    color: '#FFFFFF',
                    weight: 3,
                    fillColor: '#F47B52',
                    fillOpacity: 1,
                }}
            >
                <Popup>
                    <div className="p-2 text-sm">
                        <b>Titik awal rute</b>
                        <div>{origin.label}</div>
                    </div>
                </Popup>
            </CircleMarker>

            {routes.map((route) => (
                <Polyline
                    key={`${route.kind}-${route.contact.id}`}
                    positions={route.coordinates}
                    pathOptions={{
                        color: ROUTE_COLORS[route.kind],
                        weight: route.kind === 'police' ? 6 : 5,
                        opacity: 0.92,
                        dashArray: route.routingMode === 'straight-line' ? '9 10' : undefined,
                        lineCap: 'round',
                        lineJoin: 'round',
                    }}
                >
                    <Popup>
                        <div className="w-[220px] p-2 text-[#07324A]">
                            <b>{route.kind === 'police' ? 'Rute ke Polsek' : 'Rute ke Rumah Sakit'}</b>
                            <p className="mt-1 text-sm font-semibold">{route.contact.name}</p>
                            <p className="mt-2 text-xs">{formatDistance(route.distanceKm)} · {formatDuration(route.durationMinutes)}</p>
                        </div>
                    </Popup>
                </Polyline>
            ))}
        </>
    );
}
