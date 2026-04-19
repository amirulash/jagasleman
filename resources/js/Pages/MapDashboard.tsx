import { useMemo, useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { MapView } from "@/components/MapView";
import { incidents, emergencyContacts } from "@/data/dummy";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { FileWarning, Filter, Flame, ChevronRight, ChevronLeft, MapPin, Navigation, Copy, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { analyzeKDE, KDE_LEGEND, KDEZone } from "@/lib/kdeAnalysis";
import { getUserLocation, findNearestByType, UserLocation, NearestContact } from "@/lib/geolocation";

type LayerType = "incident" | "hospital" | "police";

export default function MapDashboard() {
  const [activeLayers, setActiveLayers] = useState<LayerType[]>(["incident", "hospital", "police"]);
  const [bandwidth, setBandwidth] = useState(2.5);
  const [selectedIncident, setSelectedIncident] = useState<typeof incidents[0] | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [nearestHospitals, setNearestHospitals] = useState<NearestContact[]>([]);
  const [nearestPolicies, setNearestPolicies] = useState<NearestContact[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showLocationDetail, setShowLocationDetail] = useState(false);
  const [copiedCoord, setCopiedCoord] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const mapRef = useRef<any>(null);

  // Get user location on mount
  useEffect(() => {
    setLocationLoading(true);
    getUserLocation()
      .then((location) => {
        setUserLocation(location);
        setNearestHospitals(findNearestByType(location, emergencyContacts, "Rumah Sakit", 3));
        setNearestPolicies(findNearestByType(location, emergencyContacts, "Polsek", 3));
      })
      .catch((error) => {
        console.error("Gagal mendapat lokasi:", error);
      })
      .finally(() => {
        setLocationLoading(false);
      });
  }, []);

  const handleCenterToUser = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.setView([userLocation.lat, userLocation.lng], 14);
    }
  };

  const handleCopyCoordinates = () => {
    if (userLocation) {
      const coordText = `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`;
      navigator.clipboard.writeText(coordText);
      setCopiedCoord(true);
      setTimeout(() => setCopiedCoord(false), 2000);
    }
  };

  const handleClusterClick = (cluster: KDEZone) => {
    if (mapRef.current) {
      mapRef.current.setView([cluster.centerLat, cluster.centerLng], 14);
    }
  };

  const toggleLayer = (layer: LayerType, checked: boolean) => {
    setActiveLayers((currentLayers) => {
      if (checked) {
        if (currentLayers.includes(layer)) return currentLayers;
        return [...currentLayers, layer];
      }

      return currentLayers.filter((currentLayer) => currentLayer !== layer);
    });
  };

  const filteredIncidents = useMemo(() => {
    return activeLayers.includes("incident") ? incidents : [];
  }, [activeLayers]);

  const filteredContacts = useMemo(() => {
    return emergencyContacts.filter((contact) => {
      const isHospital = contact.type === "Rumah Sakit" && activeLayers.includes("hospital");
      const isPolice = contact.type === "Polsek" && activeLayers.includes("police");
      return isHospital || isPolice;
    });
  }, [activeLayers]);

  const filters: { label: string; value: LayerType }[] = [
    { label: "🔴 Titik Kejadian", value: "incident" },
    { label: "🏥 RS", value: "hospital" },
    { label: "🏛 Polsek", value: "police" },
  ];

  const hotspotClusters = useMemo(() => {
    return analyzeKDE(filteredIncidents, 2.5);
  }, [filteredIncidents]);

  const hotspotStats = useMemo(() => {
    const stats = {
      sangat_tinggi: hotspotClusters.filter((c) => c.intensity === "sangat-tinggi"),
      tinggi: hotspotClusters.filter((c) => c.intensity === "tinggi"),
      sedang: hotspotClusters.filter((c) => c.intensity === "sedang"),
    };
    return stats;
  }, [hotspotClusters]);

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 border-b bg-card flex-wrap">
        <span className="text-sm font-semibold">Zona: </span>
        <Button variant="default" size="sm" className="text-xs">
          <MapPin className="w-4 h-4 mr-1" /> Titik Kejadian
        </Button>
        <Button variant="outline" size="sm" className="text-xs">
          <Flame className="w-4 h-4 mr-1" /> Hotspot KDE
        </Button>
        <Button variant="outline" size="sm" className="text-xs">
          <Filter className="w-4 h-4 mr-1" /> Cluster
        </Button>
        <div className="flex-1" />
        <span className="text-xs text-gray-500">
          Zoom: <span className="font-bold">13</span> | Sleman: 7°34'–7°47' LS, 110°12'–110°32' BT
        </span>
      </div>

      {/* Main Layout: Sidebar + Map + Right Panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        {showSidebar && (
          <div className="w-80 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
            {/* Stat Cards */}
            <div className="p-3 border-b border-gray-200">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Ringkasan</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 p-2 rounded text-center border border-gray-200">
                  <div className="text-lg font-bold text-red-600">{incidents.length}</div>
                  <div className="text-xs text-gray-500">Total Kejadian</div>
                </div>
                <div className="bg-gray-50 p-2 rounded text-center border border-gray-200">
                  <div className="text-lg font-bold text-amber-600">{hotspotClusters.length}</div>
                  <div className="text-xs text-gray-500">Zona KDE</div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="p-3 border-b border-gray-200 space-y-3">
              <div>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Layer Peta</div>
                <div className="space-y-2">
                  {filters.map((f) => (
                    <label key={f.value} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={activeLayers.includes(f.value)}
                        onCheckedChange={(checked) => toggleLayer(f.value, !!checked)}
                      />
                      <span className="text-sm">{f.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* KDE Panel */}
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
                    <span className="font-bold">{incidents.length} titik</span>
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
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wide px-3 pt-2">Kejadian Terbaru</div>
            <div className="flex-1 overflow-y-auto">
              {incidents.slice(0, 15).map(inc => (
                <div
                  key={inc.id}
                  onClick={() => setSelectedIncident(selectedIncident?.id === inc.id ? null : inc)}
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
        )}
        {/* Map */}
        <div className="flex-1">          <MapView
            ref={mapRef}
            incidents={filteredIncidents}
            contacts={filteredContacts}
            hotspotClusters={hotspotClusters}
            onClusterClick={handleClusterClick}
            userLocation={userLocation}
          />
        </div>

        {/* Analysis Sidebar */}
        {showSidebar && (
          <div className="w-96 border-l bg-card overflow-y-auto">
            <div className="p-3 space-y-3">
              {/* Legend */}
              <div className="rounded-md border bg-muted/30 p-3">
                <p className="text-sm font-semibold mb-2">Legend KDE (Kernel Density Estimation)</p>
                <div className="grid grid-cols-2 gap-2">
                  {KDE_LEGEND.map((item) => (
                    <div key={item.label} className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full border border-gray-300"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* KDE Zones - Sangat Tinggi */}
              <div className="rounded-md border bg-muted/30 p-3">
                <p className="text-sm font-semibold mb-2">Zona Sangat Tinggi</p>
                {hotspotStats.sangat_tinggi.length > 0 ? (
                  <div className="space-y-2">
                    {hotspotStats.sangat_tinggi.map((cluster) => (
                      <div
                        key={cluster.id}
                        onClick={() => handleClusterClick(cluster)}
                        className="flex items-start justify-between gap-2 text-xs p-2 rounded cursor-pointer hover:bg-accent transition-colors"
                      >
                        <div>
                          <p className="font-medium text-foreground">
                            {cluster.label}
                          </p>
                          <p className="text-muted-foreground text-[10px]">
                            ({cluster.centerLat.toFixed(4)}, {cluster.centerLng.toFixed(4)})
                          </p>
                        </div>
                        <Badge
                          style={{ backgroundColor: cluster.color.replace(/0\.[0-9]+\)/, "1)") }}
                          className="text-white whitespace-nowrap"
                        >
                          {cluster.pointCount} titik
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Tidak ada zona sangat tinggi terdeteksi.</p>
                )}
              </div>

              {/* KDE Zones - Tinggi */}
              <div className="rounded-md border bg-muted/30 p-3">
                <p className="text-sm font-semibold mb-2">Zona Tinggi</p>
                {hotspotStats.tinggi.length > 0 ? (
                  <div className="space-y-2">
                    {hotspotStats.tinggi.map((cluster) => (
                      <div
                        key={cluster.id}
                        onClick={() => handleClusterClick(cluster)}
                        className="flex items-start justify-between gap-2 text-xs p-2 rounded cursor-pointer hover:bg-accent transition-colors"
                      >
                        <div>
                          <p className="font-medium text-foreground">
                            {cluster.label}
                          </p>
                          <p className="text-muted-foreground text-[10px]">
                            ({cluster.centerLat.toFixed(4)}, {cluster.centerLng.toFixed(4)})
                          </p>
                        </div>
                        <Badge
                          style={{ backgroundColor: cluster.color.replace(/0\.[0-9]+\)/, "1)") }}
                          className="text-white whitespace-nowrap"
                        >
                          {cluster.pointCount} titik
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Tidak ada zona tinggi terdeteksi.</p>
                )}
              </div>

              {/* KDE Zones - Sedang */}
              <div className="rounded-md border bg-muted/30 p-3">
                <p className="text-sm font-semibold mb-2">Zona Sedang</p>
                {hotspotStats.sedang.length > 0 ? (
                  <div className="space-y-2">
                    {hotspotStats.sedang.map((cluster) => (
                      <div
                        key={cluster.id}
                        onClick={() => handleClusterClick(cluster)}
                        className="flex items-start justify-between gap-2 text-xs p-2 rounded cursor-pointer hover:bg-accent transition-colors"
                      >
                        <div>
                          <p className="font-medium text-foreground">
                            {cluster.label}
                          </p>
                          <p className="text-muted-foreground text-[10px]">
                            ({cluster.centerLat.toFixed(4)}, {cluster.centerLng.toFixed(4)})
                          </p>
                        </div>
                        <Badge
                          style={{ backgroundColor: cluster.color.replace(/0\.[0-9]+\)/, "1)") }}
                          className="text-white whitespace-nowrap"
                        >
                          {cluster.pointCount} titik
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Tidak ada zona sedang terdeteksi.</p>
                )}
              </div>

              {/* Statistics */}
              <div className="rounded-md border bg-muted/30 p-3">
                <p className="text-sm font-semibold mb-2">Statistik Analisis KDE</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>Total Zones: {hotspotClusters.length}</p>
                  <p>Sangat Tinggi: {hotspotStats.sangat_tinggi.length}</p>
                  <p>Tinggi: {hotspotStats.tinggi.length}</p>
                  <p>Sedang: {hotspotStats.sedang.length}</p>
                  <p>Total Titik: {filteredIncidents.length}</p>
                </div>
              </div>

              {/* Nearest Contacts */}
              {userLocation && (
                <>
                  <div className="rounded-md border bg-muted/30 p-3">
                    <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <MapPin className="w-4 h-4" /> 🏥 Rumah Sakit Terdekat
                    </p>
                    {nearestHospitals.length > 0 ? (
                      <div className="space-y-2">
                        {nearestHospitals.map((hospital) => (
                          <div
                            key={hospital.id}
                            onClick={() => mapRef.current?.setView([hospital.lat, hospital.lng], 13)}
                            className="flex items-start justify-between gap-2 text-xs p-2 rounded cursor-pointer hover:bg-accent transition-colors"
                          >
                            <div>
                              <p className="font-medium text-foreground">{hospital.name}</p>
                              <p className="text-muted-foreground text-[10px]">{hospital.address}</p>
                            </div>
                            <Badge variant="secondary" className="whitespace-nowrap">
                              {hospital.distance.toFixed(1)} km
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Tidak ada data RS.</p>
                    )}
                  </div>

                  <div className="rounded-md border bg-muted/30 p-3">
                    <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <MapPin className="w-4 h-4" /> 🏛 Polsek Terdekat
                    </p>
                    {nearestPolicies.length > 0 ? (
                      <div className="space-y-2">
                        {nearestPolicies.map((police) => (
                          <div
                            key={police.id}
                            onClick={() => mapRef.current?.setView([police.lat, police.lng], 13)}
                            className="flex items-start justify-between gap-2 text-xs p-2 rounded cursor-pointer hover:bg-accent transition-colors"
                          >
                            <div>
                              <p className="font-medium text-foreground">{police.name}</p>
                              <p className="text-muted-foreground text-[10px]">{police.address}</p>
                            </div>
                            <Badge variant="secondary" className="whitespace-nowrap">
                              {police.distance.toFixed(1)} km
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Tidak ada data Polsek.</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Location Detail Dialog */}
      <Dialog open={showLocationDetail} onOpenChange={setShowLocationDetail}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" /> Lokasi Anda Saat Ini
            </DialogTitle>
            <DialogDescription>
              Detail lengkap koordinat dan akurasi lokasi Anda
            </DialogDescription>
          </DialogHeader>

          {userLocation && (
            <div className="space-y-4">
              {/* Coordinates Card */}
              <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Koordinat</p>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-mono">
                    {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCopyCoordinates}
                    className="h-8 w-8 p-0"
                  >
                    {copiedCoord ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                {copiedCoord && (
                  <p className="text-xs text-green-600">Koordinat disalin ke clipboard!</p>
                )}
              </div>

              {/* Accuracy Card */}
              <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Akurasi GPS</p>
                <div className="space-y-1">
                  <p className="text-sm font-mono">±{Math.round(userLocation.accuracy)} meter</p>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{
                        width: `${Math.min(100, (50 / userLocation.accuracy) * 100)}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {userLocation.accuracy < 10
                      ? "Sangat presisi"
                      : userLocation.accuracy < 50
                        ? "Presisi tinggi"
                        : userLocation.accuracy < 100
                          ? "Presisi sedang"
                          : "Presisi rendah"}
                  </p>
                </div>
              </div>

              {/* Latitude Card */}
              <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Latitude</p>
                <p className="text-sm font-mono">{userLocation.lat.toFixed(8)}°</p>
              </div>

              {/* Longitude Card */}
              <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Longitude</p>
                <p className="text-sm font-mono">{userLocation.lng.toFixed(8)}°</p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowLocationDetail(false)}
                >
                  Tutup
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    handleCenterToUser();
                    setShowLocationDetail(false);
                  }}
                >
                  <Navigation className="w-4 h-4 mr-2" /> Center Map
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
