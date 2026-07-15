import { Incident } from "@/data/dummy";

// ─────────────────────────────────────────────
// Interface — tetap kompatibel dengan kode lama
// ─────────────────────────────────────────────
export interface KDEZone {
  id: string;
  centerLat: number;
  centerLng: number;
  radius: number;       // radius dalam kilometer
  density: number;      // 0–1 nilai densitas ternormalisasi
  color: string;
  intensity: "sangat-tinggi" | "tinggi" | "sedang" | "rendah" | "aman";
  pointCount: number;
  label: string;
  // field tambahan untuk popup yang lebih informatif
  densityPct?: number;  // persentase densitas (0–100)
  description?: string; // keterangan ramah orang awam
}

// ─────────────────────────────────────────────
// Batas wilayah Kabupaten Sleman
// ─────────────────────────────────────────────
const SLEMAN_BOUNDS = {
  south: -7.824968,
  north: -7.598439714,
  west:  110.243691,
  east:  110.4831528,
};

// ─────────────────────────────────────────────
// Haversine — jarak geografis nyata dalam km
// Ini yang menggantikan perhitungan persen lama
// ─────────────────────────────────────────────
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─────────────────────────────────────────────
// Gaussian kernel — sama seperti sebelumnya
// tapi sekarang distance dalam satuan km nyata
// ─────────────────────────────────────────────
function gaussianKernel(distanceKm: number, bandwidthKm: number): number {
  const u = distanceKm / bandwidthKm;
  return Math.exp(-(u * u) / 2);
}

// ─────────────────────────────────────────────
// Hitung densitas KDE di satu titik grid
// menggunakan semua titik kejadian
// ─────────────────────────────────────────────
function calculateDensityAtPoint(
  gridLat: number,
  gridLng: number,
  incidents: Incident[],
  bandwidthKm: number
): number {
  if (incidents.length === 0) return 0;
  let density = 0;
  for (const inc of incidents) {
    const distKm = haversineKm(gridLat, gridLng, inc.lat, inc.lng);
    density += gaussianKernel(distKm, bandwidthKm);
  }
  // Normalisasi per jumlah kejadian
  return density / incidents.length;
}

// ─────────────────────────────────────────────
// Tentukan warna, label intensitas, deskripsi
// ramah orang awam berdasarkan level densitas
// ─────────────────────────────────────────────
function getZoneStyle(level: number): {
  intensity: KDEZone["intensity"];
  color: string;
  label: string;
  description: string;
} {
  if (level > 0.75) {
    return {
      intensity: "sangat-tinggi",
      color: "rgba(185, 28, 28, 0.55)",
      label: "⚠️ Sangat Rawan",
      description: "Wilayah ini memiliki konsentrasi kejahatan tertinggi. Harap tingkatkan kewaspadaan.",
    };
  }
  if (level > 0.55) {
    return {
      intensity: "tinggi",
      color: "rgba(234, 88, 12, 0.50)",
      label: "🔶 Rawan",
      description: "Wilayah ini tergolong rawan. Disarankan berhati-hati saat beraktivitas.",
    };
  }
  if (level > 0.35) {
    return {
      intensity: "sedang",
      color: "rgba(234, 179, 8, 0.45)",
      label: "🟡 Perlu Diwaspadai",
      description: "Wilayah ini memiliki tingkat kerawanan sedang. Tetap waspada.",
    };
  }
  if (level > 0.18) {
    return {
      intensity: "rendah",
      color: "rgba(34, 197, 94, 0.40)",
      label: "🟢 Relatif Aman",
      description: "Wilayah ini memiliki konsentrasi kejahatan yang relatif rendah.",
    };
  }
  return {
    intensity: "aman",
    color: "rgba(16, 185, 129, 0.30)",
    label: "✅ Aman",
    description: "Wilayah ini tergolong aman berdasarkan data kejadian yang tersedia.",
  };
}

// ─────────────────────────────────────────────
// FUNGSI UTAMA — analyzeKDE yang di-upgrade
//
// Perubahan dari versi lama:
// 1. Grid 50×50 (2500 titik) vs lama 8×8 (64 titik)
//    → resolusi 39× lebih detail
// 2. Jarak pakai Haversine (km nyata) vs lama persen koordinat
//    → posisi zona akurat di peta
// 3. Radius zona proporsional terhadap sebaran data
//    → zona tidak seragam ukurannya
// 4. Label + deskripsi ramah orang awam
// 5. Tetap kompatibel dengan interface KDEZone lama
// ─────────────────────────────────────────────
export function analyzeKDE(
  incidents: Incident[],
  bandwidthKm: number = 1.65
): KDEZone[] {
  if (incidents.length === 0) return [];

  // ── 1. Bangun grid 50×50 di seluruh wilayah Sleman ──
  const GRID_SIZE = 50;
  const latStep = (SLEMAN_BOUNDS.north - SLEMAN_BOUNDS.south) / GRID_SIZE;
  const lngStep = (SLEMAN_BOUNDS.east  - SLEMAN_BOUNDS.west)  / GRID_SIZE;

  type GridPoint = { lat: number; lng: number; density: number; index: number };
  const gridPoints: GridPoint[] = [];

  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      const lat = SLEMAN_BOUNDS.north - (i + 0.5) * latStep;
      const lng = SLEMAN_BOUNDS.west  + (j + 0.5) * lngStep;
      const density = calculateDensityAtPoint(lat, lng, incidents, bandwidthKm);
      gridPoints.push({ lat, lng, density, index: i * GRID_SIZE + j });
    }
  }

  // ── 2. Normalisasi densitas terhadap nilai maksimum ──
  const maxDensity = Math.max(...gridPoints.map(p => p.density), 1e-10);
  const normalizedPoints = gridPoints.map(p => ({
    ...p,
    normalizedDensity: p.density / maxDensity,
  }));

  // ── 3. Ambil titik-titik puncak (local maxima) ──
  //    Titik yang lebih tinggi dari semua tetangganya
  //    → ini menjadi pusat zona
  const processed = new Set<number>();
  const zones: KDEZone[] = [];
  let zoneId = 1;

  // Urutkan dari densitas tertinggi ke terendah
  const sorted = [...normalizedPoints]
    .filter(p => p.normalizedDensity >= 0.15)
    .sort((a, b) => b.normalizedDensity - a.normalizedDensity);

  // Jarak minimum antar zona (dalam km) agar tidak tumpang tindih
  const MIN_ZONE_SPACING_KM = bandwidthKm * 1.2;

  for (const peak of sorted) {
    if (processed.has(peak.index)) continue;

    // ── 4. Kumpulkan titik-titik di sekitar puncak ini ──
    const clusterPoints = normalizedPoints.filter(p => {
      if (p.normalizedDensity < 0.12) return false;
      const distKm = haversineKm(peak.lat, peak.lng, p.lat, p.lng);
      return distKm <= bandwidthKm;
    });

    // Tandai semua titik klaster sebagai sudah diproses
    clusterPoints.forEach(p => processed.add(p.index));

    // ── 5. Hitung pusat zona berbobot densitas ──
    const totalWeight = clusterPoints.reduce((s, p) => s + p.normalizedDensity, 0);
    const centerLat   = clusterPoints.reduce((s, p) => s + p.lat * p.normalizedDensity, 0) / totalWeight;
    const centerLng   = clusterPoints.reduce((s, p) => s + p.lng * p.normalizedDensity, 0) / totalWeight;

    // ── 6. Cek jarak dengan zona yang sudah ada ──
    const tooClose = zones.some(z => {
      const d = haversineKm(centerLat, centerLng, z.centerLat, z.centerLng);
      return d < MIN_ZONE_SPACING_KM;
    });
    if (tooClose) continue;

    // ── 7. Hitung radius proporsional dari sebaran data ──
    //    Radius = jarak rata-rata kejadian terdekat dari pusat zona
    const nearIncidents = incidents.filter(inc =>
      haversineKm(centerLat, centerLng, inc.lat, inc.lng) <= bandwidthKm * 1.5
    );

    let radiusKm = bandwidthKm * 0.6; // default fallback
    if (nearIncidents.length > 0) {
      const avgDist = nearIncidents.reduce(
        (sum, inc) => sum + haversineKm(centerLat, centerLng, inc.lat, inc.lng),
        0
      ) / nearIncidents.length;
      // Radius = rata-rata jarak, diklem antara 0.3–2.5 km
      radiusKm = Math.max(0.3, Math.min(2.5, avgDist * 1.2));
    }

    // ── 8. Level intensitas dari densitas puncak ──
    const style = getZoneStyle(peak.normalizedDensity);
    const densityPct = Math.round(peak.normalizedDensity * 100);

    zones.push({
      id: `kde_${zoneId}`,
      centerLat,
      centerLng,
      radius: radiusKm,
      density: peak.normalizedDensity,
      color: style.color,
      intensity: style.intensity,
      pointCount: nearIncidents.length,
      label: style.label,
      densityPct,
      description: style.description,
    });

    zoneId++;

    // Batasi maksimum 12 zona agar peta tidak penuh
    if (zones.length >= 12) break;
  }

  return zones.sort((a, b) => b.density - a.density);
}

// ─────────────────────────────────────────────
// Legend — dipakai di panel legenda peta
// ─────────────────────────────────────────────
export const KDE_LEGEND = [
  { intensity: "sangat-tinggi", label: "⚠️ Sangat Rawan",      color: "#b91c1c", range: "> 75%" },
  { intensity: "tinggi",        label: "🔶 Rawan",              color: "#ea580c", range: "55–75%" },
  { intensity: "sedang",        label: "🟡 Perlu Diwaspadai",   color: "#eab308", range: "35–55%" },
  { intensity: "rendah",        label: "🟢 Relatif Aman",       color: "#22c55e", range: "18–35%" },
  { intensity: "aman",          label: "✅ Aman",               color: "#10b981", range: "< 18%" },
];

// ─────────────────────────────────────────────
// Info parameter KDE — untuk popup & dokumentasi
// ─────────────────────────────────────────────
export const KDE_INFO = {
  method:      "Kernel Density Estimation (KDE)",
  kernel:      "Gaussian/Normal Distribution",
  formula:     "f(x,y) = Σ K((d_i)/h) / (n·h²)",
  description: "Mengestimasi densitas kejadian melalui kernel weighting dengan bandwidth adaptif",
};
