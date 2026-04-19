import { useMemo, useRef, useState, useEffect } from "react";
import L from "leaflet";
import { MapView } from "@/components/MapView";
import { incidents, emergencyContacts } from "@/data/dummy";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ChevronRight, ChevronLeft, Copy, Check, X, AlertCircle,
  BarChart3, Shield, AlertTriangle
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { analyzeKDE, KDE_LEGEND, KDE_INFO, KDEZone } from "@/lib/kdeAnalysis";
import { getUserLocation, findNearestByType, UserLocation, NearestContact } from "@/lib/geolocation";

type LayerType = "incident" | "hospital" | "police";

export default function AnalysisDashboard() {
  const [activeLayers, setActiveLayers] = useState<LayerType[]>(["incident", "hospital", "police"]);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<typeof incidents[0] | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [rightTab, setRightTab] = useState<"kde" | "stats" | "kec" | "nearby">("kde");
  const [showReportForm, setShowReportForm] = useState(false);
  const [copiedCoord, setCopiedCoord] = useState(false);
  const [bandwidth, setBandwidth] = useState(2.5);
  const [kdeViewMode, setKdeViewMode] = useState<"heatmap" | "zone">("heatmap");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedCrimeType, setSelectedCrimeType] = useState<string>("all");
  const [selectedKecamatan, setSelectedKecamatan] = useState<string>("all");
  const mapRef = useRef<any>(null);
  const activePopupRef = useRef<L.Popup | null>(null);

  // Get user location
  useEffect(() => {
    getUserLocation()
      .then(setUserLocation)
      .catch(console.error);
  }, []);

  const incidentYears = useMemo(() => {
    const years = new Set<string>();
    incidents.forEach((inc) => {
      const rawDate = String(inc.date || "");
      const match = rawDate.match(/(\d{4})/);
      if (match) years.add(match[1]);
    });
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, []);

  const incidentCrimeTypes = useMemo(() => {
    const types = new Set<string>();
    incidents.forEach((inc: any) => types.add(inc.kategori || inc.type));
    return Array.from(types).sort();
  }, []);

  const incidentKecamatans = useMemo(() => {
    const kecamatans = new Set<string>();
    incidents.forEach((inc) => kecamatans.add(inc.kecamatan));
    return Array.from(kecamatans).sort();
  }, []);

  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc: any) => {
      const rawDate = String(inc.date || "");
      const yearMatch = rawDate.match(/(\d{4})/);
      const incidentYear = yearMatch ? yearMatch[1] : "";
      const incidentCrime = inc.kategori || inc.type;

      const matchYear = selectedYear === "all" || incidentYear === selectedYear;
      const matchType = selectedCrimeType === "all" || incidentCrime === selectedCrimeType;
      const matchKecamatan = selectedKecamatan === "all" || inc.kecamatan === selectedKecamatan;

      return matchYear && matchType && matchKecamatan;
    });
  }, [selectedYear, selectedCrimeType, selectedKecamatan]);

  // Analyze KDE
  const kdeZones = useMemo(() => {
    if (!activeLayers.includes("incident")) return [];
    return analyzeKDE(filteredIncidents, bandwidth);
  }, [activeLayers, filteredIncidents, bandwidth]);

  // Calculate kecamatan stats
  const kecamatanStats = useMemo(() => {
    const stats = new Map<string, number>();
    filteredIncidents.forEach(inc => {
      stats.set(inc.kecamatan, (stats.get(inc.kecamatan) || 0) + 1);
    });
    return Array.from(stats.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredIncidents]);

  // Crime type stats
  const crimeTypeStats = useMemo(() => {
    const stats = new Map<string, number>();
    filteredIncidents.forEach(inc => {
      stats.set(inc.type, (stats.get(inc.type) || 0) + 1);
    });
    const total = filteredIncidents.length || 1;
    return Array.from(stats.entries())
      .map(([name, count]) => ({ name, count, pct: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count);
  }, [filteredIncidents]);

  const nearestHospitals: NearestContact[] = useMemo(() => {
    if (!userLocation) return [];
    return findNearestByType(userLocation, emergencyContacts, "Rumah Sakit", 5);
  }, [userLocation]);

  const nearestPolice: NearestContact[] = useMemo(() => {
    if (!userLocation) return [];
    return findNearestByType(userLocation, emergencyContacts, "Polsek", 5);
  }, [userLocation]);

  const toggleLayer = (layer: LayerType) => {
    setActiveLayers(prev =>
      prev.includes(layer) ? prev.filter(l => l !== layer) : [...prev, layer]
    );
  };

  const copyCoordinates = () => {
    if (userLocation) {
      navigator.clipboard.writeText(`${userLocation.lat.toFixed(6)}, ${userLocation.lng.toFixed(6)}`);
      setCopiedCoord(true);
      setTimeout(() => setCopiedCoord(false), 2000);
    }
  };

  const zoomToLocation = (lat: number, lng: number, zoom = 15) => {
    if (mapRef.current?.setView) {
      mapRef.current.setView([lat, lng], zoom);
    }
  };

  const showPopupAtLocation = (lat: number, lng: number, content: string, zoom = 15) => {
    if (!mapRef.current) return;

    zoomToLocation(lat, lng, zoom);

    if (activePopupRef.current) {
      mapRef.current.closePopup(activePopupRef.current);
    }

    const popup = L.popup({ autoClose: true, closeOnClick: true })
      .setLatLng([lat, lng])
      .setContent(content)
      .openOn(mapRef.current);

    activePopupRef.current = popup;
  };

  const zoomToExtent = () => {
    if (!mapRef.current) return;

    const visibleIncidents = activeLayers.includes("incident") ? filteredIncidents : [];
    const visibleContacts = emergencyContacts.filter(c =>
      (activeLayers.includes("hospital") && c.type === "Rumah Sakit") ||
      (activeLayers.includes("police") && c.type === "Polsek")
    );

    const latLngs: Array<[number, number]> = [
      ...visibleIncidents.map((inc) => [inc.lat, inc.lng] as [number, number]),
      ...visibleContacts.map((contact) => [contact.lat, contact.lng] as [number, number]),
    ];

    if (userLocation) {
      latLngs.push([userLocation.lat, userLocation.lng]);
    }

    if (latLngs.length === 0) return;

    const bounds = L.latLngBounds(latLngs.map(([lat, lng]) => L.latLng(lat, lng)));
    mapRef.current.fitBounds(bounds.pad(0.15), { animate: true });
  };

  return (
    <div className="flex flex-col h-full bg-gray-100">

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
          {/* Stats */}
          <div className="p-4 border-b border-gray-200">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Ringkasan</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <div className="text-2xl font-bold text-red-600">{filteredIncidents.length}</div>
                <div className="text-xs text-gray-500">Total Kejadian</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <div className="text-2xl font-bold text-amber-600">{kecamatanStats.length > 0 ? Math.max(...kecamatanStats.map(k => k.count)) : 0}</div>
                <div className="text-xs text-gray-500">Tertinggi</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <div className="text-2xl font-bold text-green-600">{crimeTypeStats.length}</div>
                <div className="text-xs text-gray-500">Jenis Kejahatan</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <div className="text-2xl font-bold">{kecamatanStats.length}</div>
                <div className="text-xs text-gray-500">Kecamatan</div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="p-4 border-b border-gray-200 space-y-4">
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Layer Peta</div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox 
                    checked={activeLayers.includes("incident")}
                    onCheckedChange={() => toggleLayer("incident")}
                  />
                  <span className="text-sm">📍 Titik Kejadian ({filteredIncidents.length})</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox 
                    checked={activeLayers.includes("hospital")}
                    onCheckedChange={() => toggleLayer("hospital")}
                  />
                  <span className="text-sm">🏥 Rumah Sakit ({emergencyContacts.filter(c => c.type === "Rumah Sakit").length})</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox 
                    checked={activeLayers.includes("police")}
                    onCheckedChange={() => toggleLayer("police")}
                  />
                  <span className="text-sm">🚓 Polsek ({emergencyContacts.filter(c => c.type === "Polsek").length})</span>
                </label>
              </div>
            </div>

            <div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Filter Data</div>
              <div className="space-y-2">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs bg-white"
                >
                  <option value="all">Tahun: Semua</option>
                  {incidentYears.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                <select
                  value={selectedCrimeType}
                  onChange={(e) => setSelectedCrimeType(e.target.value)}
                  className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs bg-white"
                >
                  <option value="all">Jenis Kejahatan: Semua</option>
                  {incidentCrimeTypes.map((crimeType) => (
                    <option key={crimeType} value={crimeType}>{crimeType}</option>
                  ))}
                </select>
                <select
                  value={selectedKecamatan}
                  onChange={(e) => setSelectedKecamatan(e.target.value)}
                  className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs bg-white"
                >
                  <option value="all">Kecamatan: Semua</option>
                  {incidentKecamatans.map((kecamatan) => (
                    <option key={kecamatan} value={kecamatan}>{kecamatan}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-black text-white p-3 rounded-lg">
              <div className="text-xs font-bold mb-2 flex items-center gap-2">
                Analisis KDE Otomatis <Badge className="text-xs bg-teal-500">AUTO</Badge>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="opacity-75">Metode:</span>
                  <span className="font-bold">Kernel Density Estimation</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-75">Bandwidth:</span>
                  <span className="font-bold">{bandwidth.toFixed(1)} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-75">Total Titik:</span>
                  <span className="font-bold">{filteredIncidents.length} titik</span>
                </div>
              </div>
              <div className="flex gap-1 mt-2">
                {KDE_LEGEND.map((leg, i) => (
                  <div key={i} className="flex-1 text-center">
                    <div style={{ background: leg.color }} className="h-2 rounded mb-1"></div>
                    <div className="text-xs opacity-75">{leg.label.split(' ')[0]}</div>
                  </div>
                ))}
              </div>
            </div>

            <input
              type="range"
              min="0.5"
              max="3"
              step="0.1"
              value={bandwidth}
              onChange={(e) => setBandwidth(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Incident List */}
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wide px-4 pt-3">Kejadian Terbaru</div>
          <div className="flex-1 overflow-y-auto">
            {filteredIncidents.slice(0, 10).map(inc => (
              <div
                key={inc.id}
                onClick={() => {
                  setSelectedIncident(selectedIncident?.id === inc.id ? null : inc);
                  showPopupAtLocation(
                    inc.lat,
                    inc.lng,
                    `<div style="min-width:180px"><div style="font-weight:700;font-size:12px;margin-bottom:4px">${inc.type}</div><div style="font-size:11px;color:#555;margin-bottom:2px">📍 ${inc.kecamatan} · ${inc.location}</div><div style="font-size:11px;color:#777">🕐 ${inc.date} ${inc.time}</div></div>`,
                    16
                  );
                }}
                className={`p-3 border-b border-gray-100 cursor-pointer transition-colors ${
                  selectedIncident?.id === inc.id ? "bg-red-50 border-l-4 border-l-red-600" : "hover:bg-gray-50"
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-bold text-sm">{inc.type}</span>
                  <span className="text-xs text-gray-500">{inc.time}</span>
                </div>
                <div className="text-xs text-gray-600 mb-1">📍 {inc.kecamatan} · {inc.location}</div>
                <Badge className="text-xs">{inc.kategori}</Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Map Area */}
        <div className="flex-1 flex flex-col">
          {/* Toolbar */}
          <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-2">
            <Button variant="outline" size="sm" className="text-xs" onClick={zoomToExtent}>
              Zoom to Extent
            </Button>
            <div className="flex-1"></div>
            <span className="text-xs text-gray-500">
              Zoom: <span className="font-bold">13</span> | Sleman: 7°34'–7°47' LS, 110°12'–110°32' BT
            </span>
          </div>

          {/* Map */}
          <div className="flex-1 relative bg-gray-200">
            <MapView
              ref={mapRef}
              incidents={activeLayers.includes("incident") ? filteredIncidents : []}
              showHeatmap={kdeViewMode === "heatmap"}
              heatmapBandwidthKm={bandwidth}
              contacts={emergencyContacts.filter(c =>
                (activeLayers.includes("hospital") && c.type === "Rumah Sakit") ||
                (activeLayers.includes("police") && c.type === "Polsek")
              )}
              hotspotClusters={kdeZones}
              userLocation={userLocation}
              onClusterClick={(cluster) => {
                showPopupAtLocation(
                  cluster.centerLat,
                  cluster.centerLng,
                  `<div style="min-width:160px"><div style="font-weight:700;font-size:12px;margin-bottom:4px">${cluster.label}</div><div style="font-size:11px;color:#555">${cluster.pointCount} titik</div><div style="font-size:11px;color:#777">Densitas: ${(cluster.density * 100).toFixed(0)}%</div></div>`,
                  14
                );
              }}
            />

            {/* Map Legend */}
            <div className="absolute bottom-4 left-4 bg-white rounded-lg p-3 border border-gray-200 text-xs">
              <div className="font-bold mb-2">Legenda</div>
              <div className="space-y-1">
                {KDE_LEGEND.map(legend => (
                  <div key={legend.intensity} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: legend.color }}
                    ></div>
                    <span>{legend.label}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2 mt-2 pt-1 border-t border-gray-200">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>Kantor Polsek</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-80 min-w-[20rem] bg-white border-l border-gray-200 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="grid grid-cols-4 border-b border-gray-200">
            {(["kde", "stats", "kec", "nearby"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setRightTab(tab)}
                className={`px-1 py-2 text-[11px] leading-tight text-center border-b-2 transition-colors ${
                  rightTab === tab
                    ? "border-b-red-600 text-red-600 font-bold"
                    : "border-b-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab === "kde" ? "Analisis KDE" : tab === "stats" ? "Statistik" : tab === "kec" ? "Kecamatan" : "Fasilitas terdekat"}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {rightTab === "kde" && (
              <div className="space-y-3">
                <div>
                  <div className="text-xs font-bold text-gray-500 mb-2">Mode Visualisasi</div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="radio"
                        name="kde-view-mode"
                        checked={kdeViewMode === "heatmap"}
                        onChange={() => setKdeViewMode("heatmap")}
                      />
                      Heatmap Kerawanan
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="radio"
                        name="kde-view-mode"
                        checked={kdeViewMode === "zone"}
                        onChange={() => setKdeViewMode("zone")}
                      />
                      Zona Kerawanan
                    </label>
                  </div>
                </div>

                {kdeViewMode === "zone" && (
                <div>
                  <div className="text-xs font-bold text-gray-500 mb-2">⚠ Zona Kerawanan Terdeteksi</div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 space-y-2">
                    {kdeZones.slice(0, 4).map(z => (
                      <div
                        key={z.id}
                        onClick={() =>
                          showPopupAtLocation(
                            z.centerLat,
                            z.centerLng,
                            `<div style="min-width:160px"><div style="font-weight:700;font-size:12px;margin-bottom:4px">${z.label}</div><div style="font-size:11px;color:#555">${z.pointCount} titik</div><div style="font-size:11px;color:#777">Densitas: ${(z.density * 100).toFixed(0)}%</div></div>`,
                            15
                          )
                        }
                        className="flex items-center gap-2 cursor-pointer rounded p-1 transition-colors hover:bg-yellow-100"
                      >
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ background: z.color.replace(/0\.[0-9]+\)/, "1)") }}
                        ></div>
                        <div className="flex-1 text-xs">
                          <div className="font-bold">{z.pointCount} titik</div>
                          <div className="text-gray-600">{z.label}</div>
                        </div>
                        <Badge className={`text-xs ${z.density > 0.7 ? "bg-red-600" : z.density > 0.5 ? "bg-orange-600" : "bg-gray-500"}`}>
                          {(z.density * 100).toFixed(0)}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
                )}

                <div>
                  <div className="text-xs font-bold text-gray-500 mb-2">Parameter KDE</div>
                  <div className="space-y-2 text-xs">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span>Bandwidth (km): {bandwidth.toFixed(1)}</span>
                      </div>
                      <input type="range" min="0.5" max="3" step="0.1" value={bandwidth} onChange={(e) => setBandwidth(parseFloat(e.target.value))} className="w-full" />
                    </div>
                    <div className="bg-gray-100 p-2 rounded font-mono text-xs">
                      <div>f(x,y) = Σ K(d_i/h) / (n·h²)</div>
                      <div className="opacity-75">h (bandwidth) = {bandwidth.toFixed(1)} km</div>
                      <div className="opacity-75">n = {filteredIncidents.length} titik kejadian</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {rightTab === "stats" && (
              <div className="space-y-3">
                <div>
                  <div className="text-xs font-bold text-gray-500 mb-2">Jenis Kejahatan</div>
                  {crimeTypeStats.slice(0, 5).map(ct => (
                    <div key={ct.name} className="flex items-center gap-2 mb-2">
                      <span className="text-xs flex-1">{ct.name}</span>
                      <div className="flex-1 bg-gray-200 h-1 rounded overflow-hidden">
                        <div className="bg-red-600 h-full" style={{ width: `${ct.pct}%` }}></div>
                      </div>
                      <span className="text-xs font-bold w-8 text-right">{ct.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {rightTab === "kec" && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-gray-500 mb-3">Kejadian per Kecamatan</div>
                {kecamatanStats.slice(0, 8).map(k => (
                  <div key={k.name} className="flex justify-between items-center pb-2 border-b border-gray-100 last:border-0">
                    <span className="text-sm">{k.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 h-1 rounded overflow-hidden">
                        <div
                          className={`h-full ${k.count > 15 ? "bg-red-600" : k.count > 8 ? "bg-amber-500" : "bg-green-500"}`}
                          style={{ width: `${(k.count / Math.max(...kecamatanStats.map(x => x.count))) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-bold text-red-600 w-5 text-right">{k.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {rightTab === "nearby" && (
              <div className="space-y-4">
                {!userLocation ? (
                  <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-3">
                    Lokasi pengguna belum tersedia. Izinkan akses lokasi untuk melihat fasilitas terdekat.
                  </div>
                ) : (
                  <>
                    <div>
                      <div className="text-xs font-bold text-gray-500 mb-2">🏥 Rumah Sakit Terdekat</div>
                      <div className="space-y-2">
                        {nearestHospitals.map((contact) => (
                          <div
                            key={contact.id}
                            onClick={() =>
                              showPopupAtLocation(
                                contact.lat,
                                contact.lng,
                                `<div style="min-width:180px"><div style="font-weight:700;font-size:12px;margin-bottom:4px">🏥 ${contact.name}</div><div style="font-size:11px;color:#555;margin-bottom:2px">${contact.address}</div><div style="font-size:11px;color:#777">📞 ${contact.phone}</div><div style="font-size:11px;color:#777">Jarak: ${contact.distance.toFixed(2)} km</div></div>`,
                                15
                              )
                            }
                            className="bg-green-50 border border-green-200 rounded-lg p-2 cursor-pointer transition-colors hover:bg-green-100"
                          >
                            <div className="text-xs font-semibold text-gray-900">{contact.name}</div>
                            <div className="text-[11px] text-gray-600 line-clamp-2">{contact.address}</div>
                            <div className="text-[11px] text-green-700 font-semibold mt-1">{contact.distance.toFixed(2)} km</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-gray-500 mb-2">🚓 Polsek Terdekat</div>
                      <div className="space-y-2">
                        {nearestPolice.map((contact) => (
                          <div
                            key={contact.id}
                            onClick={() =>
                              showPopupAtLocation(
                                contact.lat,
                                contact.lng,
                                `<div style="min-width:180px"><div style="font-weight:700;font-size:12px;margin-bottom:4px">🚓 ${contact.name}</div><div style="font-size:11px;color:#555;margin-bottom:2px">${contact.address}</div><div style="font-size:11px;color:#777">📞 ${contact.phone}</div><div style="font-size:11px;color:#777">Jarak: ${contact.distance.toFixed(2)} km</div></div>`,
                                15
                              )
                            }
                            className="bg-blue-50 border border-blue-200 rounded-lg p-2 cursor-pointer transition-colors hover:bg-blue-100"
                          >
                            <div className="text-xs font-semibold text-gray-900">{contact.name}</div>
                            <div className="text-[11px] text-gray-600 line-clamp-2">{contact.address}</div>
                            <div className="text-[11px] text-blue-700 font-semibold mt-1">{contact.distance.toFixed(2)} km</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Report Form */}
      {showReportForm && (
        <Dialog open={showReportForm} onOpenChange={setShowReportForm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" /> Laporkan Kejadian
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold">Jenis Kejahatan</label>
                <select className="w-full mt-1 p-2 border rounded text-sm">
                  <option>Pencurian Kendaraan</option>
                  <option>Penganiayaan</option>
                  <option>Perampokan</option>
                  <option>Klitih</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold">Lokasi</label>
                <input type="text" placeholder="Alamat" className="w-full mt-1 p-2 border rounded text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold">Latitude</label>
                  <input type="text" placeholder="Lat" className="w-full mt-1 p-2 border rounded text-sm" />
                </div>
                <div>
                  <label className="text-xs font-bold">Longitude</label>
                  <input type="text" placeholder="Lng" className="w-full mt-1 p-2 border rounded text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold">Keterangan</label>
                <textarea placeholder="Deskripsi kejadian" className="w-full mt-1 p-2 border rounded text-sm h-20" />
              </div>
              <Button className="w-full bg-red-600 text-white">Kirim Laporan</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
