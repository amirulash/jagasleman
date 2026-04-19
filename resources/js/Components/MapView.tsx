import { useEffect, forwardRef, Fragment } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";
import "leaflet/dist/leaflet.css";
import { Incident, EmergencyContact } from "@/data/dummy";
import { KDEZone } from "@/lib/kdeAnalysis";
import { UserLocation } from "@/lib/geolocation";

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const typeColors: Record<string, string> = {
  Pencurian: "#2563eb",
  Perampokan: "#dc2626",
  Kecelakaan: "#f59e0b",
  Kebakaran: "#ea580c",
  Tawuran: "#9333ea",
  Vandalisme: "#059669",
};

const statusBadge: Record<string, string> = {
  Aktif: "bg-emergency text-emergency-foreground",
  Ditangani: "bg-warning text-warning-foreground",
  Selesai: "bg-success text-success-foreground",
};

function createColorIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="font-size:20px;line-height:20px;color:${color};filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35));">📍</div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 20],
  });
}

function createContactIcon(type: "Polsek" | "Rumah Sakit") {
  const color = type === "Polsek" ? "#2563eb" : "#16a34a";
  const symbol = type === "Polsek" ? "🏛" : "🏥";
  return L.divIcon({
    className: "",
    html: `<div style="width:28px;height:28px;border-radius:6px;background:${color};border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:14px;">${symbol}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

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

    let heatLayer: L.HeatLayer | null = null;

    const buildHeatmap = () => {
      if (heatLayer) {
        map.removeLayer(heatLayer);
      }

      const center = map.getCenter();
      const sampleDeltaLng = 0.01;
      const pointA = L.latLng(center.lat, center.lng);
      const pointB = L.latLng(center.lat, center.lng + sampleDeltaLng);
      const meters = map.distance(pointA, pointB);
      const pxA = map.latLngToContainerPoint(pointA).x;
      const pxB = map.latLngToContainerPoint(pointB).x;
      const pxPerMeter = Math.abs(pxB - pxA) / Math.max(meters, 1);

      const radiusPx = Math.max(15, Math.min(80, bandwidthKm * 1000 * pxPerMeter));
      const heatPoints: Array<[number, number, number]> = incidents.map((inc) => [inc.lat, inc.lng, 1]);

      heatLayer = L.heatLayer(heatPoints, {
        radius: radiusPx,
        blur: Math.max(12, Math.round(radiusPx * 0.7)),
        minOpacity: 0.35,
        maxZoom: 17,
        gradient: {
          0.1: "#52b788",
          0.3: "#f4e76e",
          0.5: "#e07b27",
          0.7: "#c1121f",
          1.0: "#1a0a00",
        },
      }).addTo(map);
    };

    buildHeatmap();
    map.on("zoomend", buildHeatmap);

    return () => {
      map.off("zoomend", buildHeatmap);
      if (heatLayer) {
        map.removeLayer(heatLayer);
      }
    };
  }, [map, incidents, bandwidthKm]);

  return null;
}

function ClickHandler({ onClick }: { onClick?: (lat: number, lng: number) => void }) {
  const map = useMap();
  useEffect(() => {
    if (!onClick) return;
    const handler = (e: L.LeafletMouseEvent) => {
      onClick(e.latlng.lat, e.latlng.lng);
    };
    map.on("click", handler);
    return () => { map.off("click", handler); };
  }, [map, onClick]);
  return null;
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
}: Omit<MapViewProps, "center" | "zoom">) {
  const map = useMap();
  
  return (
    <>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onClick={onClick} />

      {/* User Location Marker */}
      {userLocation && (
        <>
          {/* Accuracy Circle */}
          <CircleMarker
            center={[userLocation.lat, userLocation.lng]}
            radius={(userLocation.accuracy / 1000) * 10} // Convert km to pixels approximately
            pathOptions={{
              color: "#3b82f6",
              weight: 1,
              opacity: 0.3,
              fillColor: "#3b82f6",
              fillOpacity: 0.1,
            }}
          />
          {/* User Marker */}
          <Marker
            position={[userLocation.lat, userLocation.lng]}
            icon={L.icon({
              iconUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%233b82f6' stroke-width='2'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Ccircle cx='12' cy='12' r='4' fill='%233b82f6'/%3E%3C/svg%3E",
              iconSize: [24, 24],
              iconAnchor: [12, 12],
              popupAnchor: [0, -12],
            })}
          >
            <Popup>
              <div className="p-2">
                <p className="font-semibold text-sm">📍 Lokasi Anda</p>
                <p className="text-xs text-gray-600">
                  {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                </p>
                <p className="text-xs text-gray-600">Akurasi: ±{Math.round(userLocation.accuracy)}m</p>
              </div>
            </Popup>
          </Marker>
        </>
      )}

      {showHeatmap && incidents.length > 0 && (
        <ContinuousHeatmapLayer incidents={incidents} bandwidthKm={heatmapBandwidthKm} />
      )}

      {/* Render Hotspot Clusters */}
      {!showHeatmap && hotspotClusters.map((cluster) => {
        const center: [number, number] = [cluster.centerLat, cluster.centerLng];
        const baseRadius = cluster.radius * 1000;

        return (
          <Fragment key={cluster.id}>
            <Circle
              center={center}
              radius={baseRadius * 1.5}
              pathOptions={{
                color: "transparent",
                weight: 0,
                fillColor: cluster.color,
                fillOpacity: 0.08,
              }}
            />
            <Circle
              center={center}
              radius={baseRadius * 1.2}
              pathOptions={{
                color: "transparent",
                weight: 0,
                fillColor: cluster.color,
                fillOpacity: 0.16,
              }}
            />
            <Circle
              center={center}
              radius={baseRadius}
              pathOptions={{
                color: cluster.color,
                weight: 16,
                opacity: 1,
                fillColor: cluster.color,
                fillOpacity: 0.2,
              }}
              eventHandlers={{
                click: () => onClusterClick?.(cluster),
              }}
            >
              <Popup>
                <div className="p-2">
                  <p className="font-semibold text-sm">{cluster.label}</p>
                  <p className="text-xs text-gray-600">Intensitas: {cluster.intensity.replace("-", " ")}</p>
                  <p className="text-xs text-gray-600">Densitas: {(cluster.density * 100).toFixed(1)}%</p>
                  <p className="text-xs text-gray-600">Titik: {cluster.pointCount}</p>
                  <p className="text-xs text-gray-600">Diameter: {(cluster.radius * 2).toFixed(1)} km</p>
                  <p className="text-xs text-gray-600">
                    Pusat: {cluster.centerLat.toFixed(4)}, {cluster.centerLng.toFixed(4)}
                  </p>
                </div>
              </Popup>
            </Circle>
          </Fragment>
        );
      })}

      {incidents.map((inc) => (
        <Marker key={inc.id} position={[inc.lat, inc.lng]} icon={createColorIcon(typeColors[inc.type] || "#666")}>
          <Popup className="incident-popup">
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold" style={{ color: typeColors[inc.type] }}>{inc.type}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusBadge[inc.status]}`}>{inc.status}</span>
              </div>
              <p className="text-sm font-semibold mb-1">{inc.description}</p>
              <p className="text-xs text-gray-500">📍 {inc.location}</p>
              <p className="text-xs text-gray-500">🕐 {inc.date} {inc.time}</p>
            </div>
          </Popup>
        </Marker>
      ))}

      {contacts.map((c) => (
        <Marker key={c.id} position={[c.lat, c.lng]} icon={createContactIcon(c.type)}>
          <Popup>
            <div className="p-3">
              <p className="font-semibold text-sm">{c.name}</p>
              <p className="text-xs text-gray-500">{c.address}</p>
              <p className="text-xs font-medium mt-1">📞 {c.phone}</p>
            </div>
          </Popup>
        </Marker>
      ))}

      {clickMarker && (
        <Marker position={[clickMarker.lat, clickMarker.lng]}>
          <Popup>Lokasi laporan Anda</Popup>
        </Marker>
      )}
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
    },
    ref
  ) => {
    return (
      <MapContainer
        ref={ref}
        center={center}
        zoom={zoom}
        className="h-full w-full"
        scrollWheelZoom
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
        />
      </MapContainer>
    );
  }
);
MapView.displayName = "MapView";
