import { Incident } from "@/data/dummy";

export interface KDEZone {
  id: string;
  centerLat: number; // geographic latitude
  centerLng: number; // geographic longitude
  radius: number; // radius in kilometers
  density: number; // 0-1 normalized density value
  color: string;
  intensity: "sangat-tinggi" | "tinggi" | "sedang" | "rendah" | "aman";
  pointCount: number;
  label: string;
}

const SLEMAN_BOUNDS = {
  south: -7.824968,
  north: -7.598439714,
  west: 110.243691,
  east: 110.4831528,
};

/**
 * Convert geographic coordinates to percentage position on map
 */
function coordToPercent(lat: number, lng: number): { x: number; y: number } {
  const x = ((lng - SLEMAN_BOUNDS.west) / (SLEMAN_BOUNDS.east - SLEMAN_BOUNDS.west)) * 100;
  const y = ((SLEMAN_BOUNDS.north - lat) / (SLEMAN_BOUNDS.north - SLEMAN_BOUNDS.south)) * 100;
  return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
}

/**
 * Convert percentage position back to geographic coordinates
 */
function percentToCoord(x: number, y: number): { lat: number; lng: number } {
  const lng = SLEMAN_BOUNDS.west + (x / 100) * (SLEMAN_BOUNDS.east - SLEMAN_BOUNDS.west);
  const lat = SLEMAN_BOUNDS.north - (y / 100) * (SLEMAN_BOUNDS.north - SLEMAN_BOUNDS.south);
  return { lat, lng };
}

/**
 * Gaussian/Normal kernel function for KDE
 */
function gaussianKernel(distance: number, bandwidth: number): number {
  const u = distance / bandwidth;
  return Math.exp(-(u * u) / 2);
}

/**
 * Calculate density at a point using Kernel Density Estimation
 */
function calculateDensity(
  point: { x: number; y: number },
  incidents: { x: number; y: number }[],
  bandwidth: number
): number {
  let density = 0;

  for (const incident of incidents) {
    // Calculate distance in percentage coordinates
    const dx = point.x - incident.x;
    const dy = point.y - incident.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Weight by gaussian kernel
    density += gaussianKernel(distance, bandwidth);
  }

  // Normalize by number of points
  return density / incidents.length;
}

/**
 * Perform KDE analysis and generate density zones
 */
export function analyzeKDE(incidents: Incident[], bandwidth: number = 2.5): KDEZone[] {
  if (incidents.length === 0) return [];

  // Convert incident coordinates to percentage positions
  const incidentPoints = incidents.map(inc => coordToPercent(inc.lat, inc.lng));

  // Sample grid points to calculate density
  const gridSize = 8; // 8x8 grid for zone detection
  const gridPoints: { x: number; y: number; density: number }[] = [];

  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const x = (i / gridSize) * 100 + 5;
      const y = (j / gridSize) * 100 + 5;
      const density = calculateDensity({ x, y }, incidentPoints, bandwidth);
      gridPoints.push({ x, y, density });
    }
  }

  // Find clusters of high-density regions
  const maxDensity = Math.max(...gridPoints.map(p => p.density));
  const zones: KDEZone[] = [];
  const processed = new Set<number>();

  // Sort by density descending
  const sortedPoints = gridPoints
    .map((p, i) => ({ ...p, index: i }))
    .sort((a, b) => b.density - a.density);

  let zoneId = 1;

  for (const point of sortedPoints) {
    if (processed.has(point.index)) continue;

    const normalizedDensity = point.density / maxDensity;
    if (normalizedDensity < 0.15) continue; // Skip very low density

    // Find neighboring points to merge zones
    const cluster = [point];
    const minDistForCluster = 15; // percentage

    for (const other of sortedPoints) {
      if (processed.has(other.index)) continue;
      if (other.index === point.index) continue;

      const dx = point.x - other.x;
      const dy = point.y - other.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < minDistForCluster && other.density / maxDensity > 0.1) {
        cluster.push(other);
      }
    }

    // Mark as processed
    cluster.forEach(p => processed.add(p.index));

    // Calculate zone center and stats
    const centerX = cluster.reduce((sum, p) => sum + p.x, 0) / cluster.length;
    const centerY = cluster.reduce((sum, p) => sum + p.y, 0) / cluster.length;
    const avgDensity = cluster.reduce((sum, p) => sum + p.density, 0) / cluster.length;

    // Count near incidents
    const nearIncidents = incidents.filter(inc => {
      const { x, y } = coordToPercent(inc.lat, inc.lng);
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      return dist < 5; // within 5% area
    });

    // Determine intensity and color
    const zoneDensity = avgDensity / maxDensity;
    let intensity: KDEZone["intensity"];
    let color: string;

    if (zoneDensity > 0.7) {
      intensity = "sangat-tinggi";
      color = "rgba(26,10,0,0.35)"; // Dark brown
    } else if (zoneDensity > 0.5) {
      intensity = "tinggi";
      color = "rgba(193,18,31,0.35)"; // Red
    } else if (zoneDensity > 0.3) {
      intensity = "sedang";
      color = "rgba(224,123,39,0.35)"; // Orange
    } else if (zoneDensity > 0.15) {
      intensity = "rendah";
      color = "rgba(244,230,110,0.35)"; // Yellow
    } else {
      intensity = "aman";
      color = "rgba(82,183,136,0.2)"; // Green
    }

    // Convert center coordinates back to geographic
    const { lat: centerLat, lng: centerLng } = percentToCoord(centerX, centerY);

    // Zona kerawanan mengikuti bandwidth KDE:
    // diameter zona = bandwidth (km) -> radius = bandwidth / 2
    const radiusKm = Math.max(0.25, bandwidth / 2);

    const zone: KDEZone = {
      id: `kde_${zoneId}`,
      centerLat,
      centerLng,
      radius: radiusKm,
      density: zoneDensity,
      color,
      intensity,
      pointCount: nearIncidents.length,
      label: `Zona ${intensity.replace("-", " ")}`,
    };

    zones.push(zone);
    zoneId++;
  }

  // Sort by density
  return zones.sort((a, b) => b.density - a.density);
}

/**
 * Get KDE legend/scale information
 */
export const KDE_LEGEND = [
  { intensity: "sangat-tinggi", label: "Sangat Tinggi", color: "#1a0a00", range: "> 70%" },
  { intensity: "tinggi", label: "Tinggi", color: "#c1121f", range: "50-70%" },
  { intensity: "sedang", label: "Sedang", color: "#e07b27", range: "30-50%" },
  { intensity: "rendah", label: "Rendah", color: "#f4e76e", range: "15-30%" },
  { intensity: "aman", label: "Aman", color: "#52b788", range: "< 15%" },
];

/**
 * KDE Parameters and formulas for reference
 */
export const KDE_INFO = {
  method: "Kernel Density Estimation (KDE)",
  kernel: "Gaussian/Normal Distribution",
  formula: "f(x,y) = Σ K((d_i)/h) / (n·h²)",
  description: "Mengestimasi densitas kejadian melalui kernel weighting dengan bandwidth adaptif",
};
