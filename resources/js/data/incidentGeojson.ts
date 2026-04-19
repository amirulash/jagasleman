// Import GeoJSON data as raw text and parse as JSON
import dataKejadianGeojsonRaw from './points/data_kejadian.geojson?raw';

export interface IncidentFeature {
  type: string;
  properties: {
    'No': number;
    'Tanggal Kejadian': string;
    'Waktu Kejadian': string;
    'Kategori': string;
    'Deskripsi Singkat Web': string;
    'Alamat Fix': string;
    'Latitude': number;
    'Longitude': number;
    'Validasi Lokasi': boolean;
  };
  geometry: {
    type: string;
    coordinates: [number, number];
  };
}

export interface IncidentData {
  type: string;
  name: string;
  features: IncidentFeature[];
}

/**
 * Map category from GeoJSON to incident type
 */
function mapCategoryToType(category: string): 'Pencurian' | 'Perampokan' | 'Kecelakaan' | 'Kebakaran' | 'Tawuran' | 'Vandalisme' {
  const categoryLower = category.toLowerCase();
  
  if (categoryLower.includes('keroyok') || categoryLower.includes('pengeroyok')) {
    return 'Tawuran';
  }
  if (categoryLower.includes('aniaya') || categoryLower.includes('penganiayaan')) {
    return 'Tawuran';
  }
  if (categoryLower.includes('sajam') || categoryLower.includes('darurat')) {
    return 'Tawuran';
  }
  if (categoryLower.includes('pengrusakan') || categoryLower.includes('vandalisme')) {
    return 'Vandalisme';
  }
  
  return 'Tawuran'; // default
}

/**
 * Parse date string in various formats
 */
function parseDate(dateStr: string): string {
  if (!dateStr || dateStr === '-' || dateStr === '(tidak tercantum)') {
    return new Date().toISOString().split('T')[0];
  }
  
  try {
    // Try parsing DD/MM/YYYY or M/DD/YYYY format
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parts[0];
      const month = parts[1];
      const year = parts[2];
      
      // Check if it's DD/MM/YYYY or M/DD/YYYY
      let d = parseInt(day);
      let m = parseInt(month);
      const y = parseInt(year);
      
      // If day > 12, it's DD/MM/YYYY
      if (d > 12) {
        return `${y}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      } else {
        // Assume M/DD/YYYY
        return `${y}-${d.toString().padStart(2, '0')}-${m.toString().padStart(2, '0')}`;
      }
    }
    
    // Try DD-MMM-YY format (e.g., "6-Dec-20")
    const dateObj = new Date(dateStr);
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toISOString().split('T')[0];
    }
    
    return new Date().toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Parse time string and extract kecamatan from address
 */
function parseTimeAndKecamatan(timeStr: string, address: string): { time: string; kecamatan: string } {
  let time = '12:00';
  if (timeStr && timeStr !== '-' && timeStr !== '(tidak tercantum)') {
    const match = timeStr.match(/(\d{1,2}):?(\d{2})/);
    if (match) {
      time = `${match[1].padStart(2, '0')}:${match[2]}`;
    }
  }
  
  // Extract kecamatan from address
  // Common kecamatan in Sleman: Depok, Mlati, Ngaglik, Gamping, Kalasan, Godean, Sleman, Pakem, Turi, Minggir, Ngemplak, Prambanan, Berbah
  const addressLower = address.toLowerCase();
  
  const kecamatanList = [
    'depok', 'mlati', 'ngaglik', 'gamping', 'kalasan', 'godean', 
    'sleman', 'pakem', 'turi', 'minggir', 'ngemplak', 'prambanan', 'berbah'
  ];
  
  for (const kec of kecamatanList) {
    if (addressLower.includes(kec)) {
      return { 
        time, 
        kecamatan: kec.charAt(0).toUpperCase() + kec.slice(1) 
      };
    }
  }
  
  return { time, kecamatan: 'Sleman' };
}

/**
 * Extract incidents from GeoJSON
 */
export function getIncidentsFromGeojson() {
  const data = JSON.parse(dataKejadianGeojsonRaw) as IncidentData;
  return data.features || [];
}

/**
 * Convert incident GeoJSON features to Incident format
 */
export function convertIncidentsToFormat(features: IncidentFeature[]) {
  return features.map((feature, index) => {
    const props = feature.properties;
    const { time, kecamatan } = parseTimeAndKecamatan(props['Waktu Kejadian'], props['Alamat Fix']);
    const date = parseDate(props['Tanggal Kejadian']);
    
    return {
      id: `incident_${index + 1}`,
      date,
      time,
      type: mapCategoryToType(props['Kategori']),
      description: props['Deskripsi Singkat Web'],
      lat: props['Latitude'],
      lng: props['Longitude'],
      location: props['Alamat Fix'],
      status: 'Aktif' as const,
      kecamatan,
      kategori: props['Kategori'],
    };
  });
}
