import {
  getHospitalsFromGeojson,
  convertHospitalsToContactsFormat,
} from './hospitalGeojson';

import {
  getPoliceFromGeojson,
  convertPoliceToContactsFormat,
} from './policeGeojson';

import {
  getIncidentsFromGeojson,
  convertIncidentsToFormat,
  StreetCrimeType,
} from './incidentGeojson';

export interface Incident {
  id: string;
  date: string;
  time: string;
  type: StreetCrimeType;
  description: string;
  lat: number;
  lng: number;
  location: string;
  status: 'Aktif' | 'Ditangani' | 'Selesai';
  kecamatan: string;
  kategori?: StreetCrimeType;
  rawKategori?: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  type: 'Polsek' | 'Rumah Sakit';
  address: string;
  phone: string;
  lat: number;
  lng: number;
  website?: string | null;
  jenis?: string;
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: 'Keamanan' | 'Kejahatan' | 'Himbauan';
  date: string;
  image: string;
}

export const streetCrimeTypes: StreetCrimeType[] = [
  'PENGEROYOKAN',
  'PENGRUSAKAN',
  'PENGANIAYAAN',
  'PENYALAHGUNAAN SENJATA TAJAM',
  'PENCURIAN DENGAN KEKERASAN (CURAS)',
  'PEMERASAN DAN PENGANCAMAN',
];

export const incidents: Incident[] = convertIncidentsToFormat(
  getIncidentsFromGeojson()
);

const policeStations: EmergencyContact[] = convertPoliceToContactsFormat(
  getPoliceFromGeojson()
);

const hospitals: EmergencyContact[] = convertHospitalsToContactsFormat(
  getHospitalsFromGeojson()
);

export const emergencyContacts: EmergencyContact[] = [
  ...policeStations,
  ...hospitals,
];

export const newsItems: NewsItem[] = [
  {
    id: '1',
    title: 'Polres Sleman Tingkatkan Patroli Malam',
    summary:
      'Polres Sleman menambah jumlah patroli malam hari menyusul meningkatnya kasus kejahatan jalanan.',
    content:
      'Polres Sleman menambah jumlah patroli malam hari untuk meningkatkan rasa aman masyarakat di kawasan rawan.',
    category: 'Keamanan',
    date: '2026-03-22',
    image: '',
  },
  {
    id: '2',
    title: 'Imbauan Keamanan Berkendara Malam',
    summary:
      'Masyarakat diimbau menghindari rute sepi dan segera melapor ketika melihat tindakan mencurigakan.',
    content:
      'Kepolisian mengimbau warga untuk memperhatikan keamanan perjalanan malam, terutama di ruas jalan yang minim penerangan.',
    category: 'Himbauan',
    date: '2026-03-21',
    image: '',
  },
  {
    id: '3',
    title: 'Pencegahan Kejahatan Jalanan Melalui Pelaporan Cepat',
    summary:
      'Pelaporan lokasi kejadian secara cepat membantu proses respons dan pemetaan wilayah rawan.',
    content:
      'Pemetaan digital membantu masyarakat dan petugas memahami sebaran kejadian dan fasilitas darurat terdekat.',
    category: 'Keamanan',
    date: '2026-03-20',
    image: '',
  },
  {
    id: '4',
    title: 'Waspada Pengeroyokan dan Penganiayaan di Jalan',
    summary:
      'Pengguna jalan diminta mengutamakan keselamatan diri dan tidak melakukan pengejaran pelaku.',
    content:
      'Jika mengalami atau melihat kejadian, segera menjauh ke tempat aman dan hubungi kepolisian.',
    category: 'Kejahatan',
    date: '2026-03-19',
    image: '',
  },
  {
    id: '5',
    title: 'Panduan Menyimpan Bukti Kejadian',
    summary:
      'Bukti foto, waktu, dan lokasi membantu verifikasi laporan tanpa membahayakan korban.',
    content:
      'Dokumentasikan bukti hanya jika situasi aman. Jangan menyebarkan identitas korban di media sosial.',
    category: 'Himbauan',
    date: '2026-03-18',
    image: '',
  },
  {
    id: '6',
    title: 'Kolaborasi Masyarakat dalam Pemantauan Keamanan',
    summary:
      'Partisipasi warga menjadi kunci dalam membangun pemetaan keamanan jalanan yang lebih akurat.',
    content:
      'Laporan warga dapat menjadi data awal untuk memahami pola kejadian di tiap kecamatan.',
    category: 'Keamanan',
    date: '2026-03-17',
    image: '',
  },
];

export const monthlyStats = [
  { month: 'Okt', total: 12 },
  { month: 'Nov', total: 18 },
  { month: 'Des', total: 15 },
  { month: 'Jan', total: 22 },
  { month: 'Feb', total: 19 },
  { month: 'Mar', total: 10 },
];

export const categoryStats = streetCrimeTypes.map((name) => ({
  name,
  value: incidents.filter((item) => item.type === name).length,
  fill: 'hsl(146, 48%, 32%)',
}));

export const kecamatanStats = Array.from(
  incidents
    .reduce((map, item) => {
      map.set(item.kecamatan, (map.get(item.kecamatan) || 0) + 1);
      return map;
    }, new Map<string, number>())
    .entries()
)
  .map(([name, total]) => ({ name, total }))
  .sort((a, b) => b.total - a.total);
