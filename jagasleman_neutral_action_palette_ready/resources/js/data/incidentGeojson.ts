// Import GeoJSON data as raw text and parse as JSON
import dataKejadianGeojsonRaw from './points/data_kejadian.geojson?raw';

export type StreetCrimeType =
  | 'PENGEROYOKAN'
  | 'PENGRUSAKAN'
  | 'PENGANIAYAAN'
  | 'PENYALAHGUNAAN SENJATA TAJAM'
  | 'PENCURIAN DENGAN KEKERASAN (CURAS)'
  | 'PEMERASAN DAN PENGANCAMAN';

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
 * Menyamakan kategori mentah dari GeoJSON menjadi 6 jenis kejahatan jalanan utama.
 */
export function normalizeStreetCrimeType(category: string): StreetCrimeType {
  const value = String(category || '').toLowerCase();

  if (value.includes('keroyok') || value.includes('pengeroyok')) {
    return 'PENGEROYOKAN';
  }

  if (value.includes('pengrusakan') || value.includes('rusak') || value.includes('vandalisme')) {
    return 'PENGRUSAKAN';
  }

  if (value.includes('aniaya') || value.includes('penganiayaan')) {
    return 'PENGANIAYAAN';
  }

  if (value.includes('sajam') || value.includes('darurat') || value.includes('senjata') || value.includes('tumpul')) {
    return 'PENYALAHGUNAAN SENJATA TAJAM';
  }

  if (value.includes('curas') || value.includes('kekerasan')) {
    return 'PENCURIAN DENGAN KEKERASAN (CURAS)';
  }

  if (value.includes('pemerasan') || value.includes('ancaman') || value.includes('pengancaman')) {
    return 'PEMERASAN DAN PENGANCAMAN';
  }

  return 'PENGEROYOKAN';
}

/**
 * Parse date string in various formats.
 */
function parseDate(dateStr: string): string {
  if (!dateStr || dateStr === '-' || dateStr === '(tidak tercantum)') {
    return new Date().toISOString().split('T')[0];
  }

  try {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const first = parseInt(parts[0], 10);
      const second = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);

      // Data lapangan umumnya D/M/YYYY; fallback tetap aman untuk nilai M/D/YYYY.
      const day = first > 12 ? first : second;
      const month = first > 12 ? second : first;

      return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    }

    const dateObj = new Date(dateStr);
    if (!Number.isNaN(dateObj.getTime())) {
      return dateObj.toISOString().split('T')[0];
    }
  } catch {
    // ignore and fallback
  }

  return new Date().toISOString().split('T')[0];
}

/**
 * Parse time string and extract kecamatan from address.
 */
function parseTimeAndKecamatan(timeStr: string, address: string): { time: string; kecamatan: string } {
  let time = '12:00';
  const rawTime = String(timeStr || '');

  if (rawTime && rawTime !== '-' && rawTime !== '(tidak tercantum)') {
    const match = rawTime.match(/(\d{1,2})[.:]?(\d{2})/);
    if (match) {
      time = `${match[1].padStart(2, '0')}:${match[2]}`;
    }
  }

  const addressLower = String(address || '').toLowerCase();
  const kecamatanList = [
    'depok', 'mlati', 'ngaglik', 'gamping', 'kalasan', 'godean',
    'sleman', 'pakem', 'turi', 'minggir', 'ngemplak', 'prambanan', 'berbah',
    'cangkringan', 'tempel', 'seyegan', 'moyudan'
  ];

  for (const kec of kecamatanList) {
    if (addressLower.includes(kec)) {
      return {
        time,
        kecamatan: kec.charAt(0).toUpperCase() + kec.slice(1),
      };
    }
  }

  return { time, kecamatan: 'Sleman' };
}

/**
 * Extract incidents from GeoJSON.
 */
export function getIncidentsFromGeojson() {
  const data = JSON.parse(dataKejadianGeojsonRaw) as IncidentData;
  return data.features || [];
}

/**
 * Convert incident GeoJSON features to Incident format.
 */
export function convertIncidentsToFormat(features: IncidentFeature[]) {
  return features.map((feature, index) => {
    const props = feature.properties;
    const { time, kecamatan } = parseTimeAndKecamatan(props['Waktu Kejadian'], props['Alamat Fix']);
    const date = parseDate(props['Tanggal Kejadian']);
    const type = normalizeStreetCrimeType(props['Kategori']);

    return {
      id: `incident_${index + 1}`,
      date,
      time,
      type,
      description: props['Deskripsi Singkat Web'],
      lat: Number(props['Latitude']),
      lng: Number(props['Longitude']),
      location: props['Alamat Fix'],
      status: 'Aktif' as const,
      kecamatan,
      kategori: type,
      rawKategori: props['Kategori'],
    };
  }).filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng));
}
