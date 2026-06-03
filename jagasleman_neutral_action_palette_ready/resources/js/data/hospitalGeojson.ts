// Import GeoJSON data as raw text and parse as JSON
import rumahSakitGeojsonRaw from './points/rumah_sakit.geojson?raw';

const rumahSakitGeojson = JSON.parse(rumahSakitGeojsonRaw);

export interface HospitalFeature {
  type: string;
  properties: {
    'Nama RS': string;
    'Latitude': number;
    'Longitude': number;
    'Jenis RS': string;
    'Alamat': string;
    'Jam Operasional': string;
    'Kontak': string;
    'Website': string | null;
    'Link Gmaps': string;
  };
  geometry: {
    type: string;
    coordinates: [number, number];
  };
}

export interface HospitalData {
  type: string;
  name: string;
  features: HospitalFeature[];
}

/**
 * Extract hospital data from GeoJSON
 */
export function getHospitalsFromGeojson(): HospitalFeature[] {
  const data = rumahSakitGeojson as HospitalData;
  return data.features || [];
}

/**
 * Convert hospital GeoJSON features to EmergencyContact format
 */
export function convertHospitalsToContactsFormat(features: HospitalFeature[]) {
  return features
    .filter(feature => {
      // Filter out closed hospitals and clinics
      const operatingHours = feature.properties['Jam Operasional'] || '';
      return operatingHours.toLowerCase() !== 'closed' && 
             operatingHours.toLowerCase() !== 'closes soon';
    })
    .map((feature, index) => ({
      id: `hospital_${index + 1}`,
      name: feature.properties['Nama RS'],
      type: 'Rumah Sakit' as const,
      address: feature.properties['Alamat'],
      phone: feature.properties['Kontak'],
      lat: feature.properties['Latitude'],
      lng: feature.properties['Longitude'],
      website: feature.properties['Website'],
      jenis: feature.properties['Jenis RS'],
    }));
}
