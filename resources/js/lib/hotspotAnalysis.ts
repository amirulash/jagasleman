import { Incident } from "@/data/dummy";

export interface HotspotCluster {
  id: string;
  centerLat: number;
  centerLng: number;
  radius: number;
  pointCount: number;
  giScore: number;
  zScore: number;
  type: "hotspot" | "coldspot" | "neutral";
  color: string;
  incidentIds: string[];
}

/**
 * Calculate Euclidean distance between two points in kilometers
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate spatial weight based on inverse distance
 */
function calculateWeight(distance: number, bandwidth: number): number {
  if (distance === 0) return 1;
  if (distance > bandwidth) return 0;
  // Gaussian kernel weight
  return Math.exp(-((distance * distance) / (2 * (bandwidth * bandwidth))));
}

/**
 * Perform Getis-Ord Gi* analysis on incident points
 * Returns clustered hotspots with statistical significance
 */
export function analyzeHotspots(
  incidents: Incident[],
  bandwidth: number = 2 // 2km radius for neighbor search
): HotspotCluster[] {
  if (incidents.length === 0) return [];

  const n = incidents.length;

  // Calculate Gi* for each incident
  const giScores = incidents.map((incident, idx) => {
    let sumWeightedValues = 0;
    let sumWeights = 0;
    const neighborIds: string[] = [];

    for (let j = 0; j < n; j++) {
      if (idx === j) {
        sumWeightedValues += 1;
        sumWeights += 1;
        neighborIds.push(incident.id);
      } else {
        const distance = calculateDistance(
          incident.lat,
          incident.lng,
          incidents[j].lat,
          incidents[j].lng
        );
        const weight = calculateWeight(distance, bandwidth);

        if (weight > 0) {
          sumWeightedValues += weight * 1; // value is 1
          sumWeights += weight;
          neighborIds.push(incidents[j].id);
        }
      }
    }

    // Calculate local mean (neighbor average)
    const localMean = sumWeights > 0 ? sumWeightedValues / sumWeights : 0;

    // Global mean
    const globalMean = 1;

    // Calculate variance for weights
    let variance = 0;
    for (let j = 0; j < n; j++) {
      const distance =
        idx === j
          ? 0
          : calculateDistance(
              incident.lat,
              incident.lng,
              incidents[j].lat,
              incidents[j].lng
            );
      const weight = idx === j ? 1 : calculateWeight(distance, bandwidth);
      if (weight > 0) {
        variance += weight * weight * (1 - globalMean) ** 2;
      }
    }

    const stdDev = Math.sqrt(variance);

    // Gi* calculation: (local mean - global mean) normalized by std error
    let giStar = 0;
    if (stdDev > 0) {
      giStar = (localMean - globalMean) / (stdDev / Math.sqrt(sumWeights + 1));
    }

    return {
      incidentId: incident.id,
      lat: incident.lat,
      lng: incident.lng,
      giScore: giStar,
      zScore: giStar,
      neighborCount: neighborIds.length,
      neighborIds,
    };
  });

  // Calculate z-score mean and std for normalization
  const zScores = giScores.map((g) => g.zScore);
  const zMean = zScores.reduce((a, b) => a + b, 0) / zScores.length;
  const zVariance =
    zScores.reduce((sum, z) => sum + (z - zMean) ** 2, 0) / zScores.length;
  const zStdDev = Math.sqrt(zVariance);

  // Sort by Gi* score to rank clusters
  const sortedByScore = [...giScores].sort((a, b) => b.giScore - a.giScore);
  const topThird = Math.ceil(sortedByScore.length / 3);
  const bottomThird = sortedByScore.length - Math.ceil(sortedByScore.length / 3);
  
  // Create set for hotspot and coldspot indices
  const hotspotIndices = new Set(sortedByScore.slice(0, topThird).map((g) => g.incidentId));
  const coldspotIndices = new Set(sortedByScore.slice(bottomThird).map((g) => g.incidentId));

  // Classify and cluster using DBSCAN-like approach
  const clusters: HotspotCluster[] = [];
  const processed = new Set<string>();

  for (const giScore of giScores) {
    if (processed.has(giScore.incidentId)) continue;

    // Classify point based on ranking
    const normalizedZScore =
      zStdDev > 0 ? (giScore.zScore - zMean) / zStdDev : 0;
    let clusterType: "hotspot" | "coldspot" | "neutral" = "neutral";
    
    if (hotspotIndices.has(giScore.incidentId)) {
      clusterType = "hotspot";
    } else if (coldspotIndices.has(giScore.incidentId)) {
      clusterType = "coldspot";
    }

    // Find connected neighbors with similar classification
    const cluster = findConectedCluster(
      giScore,
      giScores,
      processed,
      incidents,
      bandwidth,
      clusterType
    );

    if (cluster && cluster.incidentIds.length > 0) {
      // Calculate cluster centroid
      let sumLat = 0;
      let sumLng = 0;

      for (const id of cluster.incidentIds) {
        const incident = incidents.find((i) => i.id === id);
        if (incident) {
          sumLat += incident.lat;
          sumLng += incident.lng;
          processed.add(id);
        }
      }

      const centerLat = sumLat / cluster.incidentIds.length;
      const centerLng = sumLng / cluster.incidentIds.length;

      // Calculate cluster radius
      let maxDistance = 0;
      for (const id of cluster.incidentIds) {
        const incident = incidents.find((i) => i.id === id);
        if (incident) {
          const dist = calculateDistance(centerLat, centerLng, incident.lat, incident.lng);
          maxDistance = Math.max(maxDistance, dist);
        }
      }

      const color = getHotspotColor(clusterType, normalizedZScore);

      clusters.push({
        id: `cluster-${clusters.length}`,
        centerLat,
        centerLng,
        radius: Math.max(maxDistance, 0.5),
        pointCount: cluster.incidentIds.length,
        giScore: giScore.giScore,
        zScore: normalizedZScore,
        type: clusterType,
        color,
        incidentIds: cluster.incidentIds,
      });
    }
  }

  // Sort by point count descending
  return clusters.sort((a, b) => b.pointCount - a.pointCount);
}

/**
 * Find connected cluster of similar classification
 */
function findConectedCluster(
  startPoint: any,
  giScores: any[],
  processed: Set<string>,
  incidents: Incident[],
  bandwidth: number,
  clusterType: string
): { incidentIds: string[] } {
  const cluster = new Set<string>();
  const queue = [startPoint];

  while (queue.length > 0) {
    const point = queue.shift();
    if (!point || processed.has(point.incidentId)) continue;

    cluster.add(point.incidentId);

    // Find neighbors
    for (const other of giScores) {
      if (processed.has(other.incidentId) || cluster.has(other.incidentId))
        continue;

      const incident1 = incidents.find((i) => i.id === point.incidentId);
      const incident2 = incidents.find((i) => i.id === other.incidentId);

      if (!incident1 || !incident2) continue;

      const distance = calculateDistance(
        incident1.lat,
        incident1.lng,
        incident2.lat,
        incident2.lng
      );

      // If neighbor is within bandwidth
      if (distance <= bandwidth) {
        queue.push(other);
      }
    }
  }

  return { incidentIds: Array.from(cluster) };
}

/**
 * Get color based on hotspot type and intensity
 */
export function getHotspotColor(
  type: "hotspot" | "coldspot" | "neutral",
  zScore: number
): string {
  if (type === "hotspot") {
    // Red gradient: stronger red for higher z-score
    if (zScore > 3) return "#991b1b"; // Dark red
    if (zScore > 2.5) return "#F47B52"; // Red
    if (zScore > 2) return "#F47B52"; // Light red
    return "#F47B52"; // Very light red
  } else if (type === "coldspot") {
    // Blue gradient
    if (zScore < -3) return "#1e3a8a"; // Dark blue
    if (zScore < -2.5) return "#F47B52"; // Blue
    if (zScore < -2) return "#60a5fa"; // Light blue
    return "#93c5fd"; // Very light blue
  }
  // Neutral - yellow/neutral
  return "#F2A20B"; // Amber
}

/**
 * Get legend categories
 */
export const HOTSPOT_LEGEND = [
  { color: "#991b1b", label: "Hotspot Sangat Tinggi (Z > 3)", type: "hotspot" },
  { color: "#F47B52", label: "Hotspot Tinggi (Z > 2.5)", type: "hotspot" },
  { color: "#F47B52", label: "Hotspot Sedang (Z > 2)", type: "hotspot" },
  { color: "#F47B52", label: "Hotspot Rendah (1.96 < Z < 2)", type: "hotspot" },
  { color: "#F2A20B", label: "Normal/Neutral", type: "neutral" },
  { color: "#93c5fd", label: "Coldspot Rendah (-2 < Z < -1.96)", type: "coldspot" },
  { color: "#60a5fa", label: "Coldspot Sedang (Z < -2)", type: "coldspot" },
  { color: "#F47B52", label: "Coldspot Tinggi (Z < -2.5)", type: "coldspot" },
  { color: "#1e3a8a", label: "Coldspot Sangat Tinggi (Z < -3)", type: "coldspot" },
];
