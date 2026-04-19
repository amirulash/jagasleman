export interface Incident {
  id: string;
  date: string;
  time: string;
  type: "Pencurian" | "Perampokan" | "Kecelakaan" | "Kebakaran" | "Tawuran" | "Vandalisme";
  description: string;
  lat: number;
  lng: number;
  location: string;
  status: "Aktif" | "Ditangani" | "Selesai";
  kecamatan: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  type: "Polsek" | "Rumah Sakit";
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
  category: "Keamanan" | "Kejahatan" | "Himbauan";
  date: string;
  image: string;
}

// Import hospital data from GeoJSON
import { getHospitalsFromGeojson, convertHospitalsToContactsFormat } from './hospitalGeojson';
// Import incident data from GeoJSON
import { getIncidentsFromGeojson, convertIncidentsToFormat } from './incidentGeojson';

// Sleman center ~-7.716, 110.355
// Load incidents from GeoJSON
export const incidents = convertIncidentsToFormat(getIncidentsFromGeojson());

// Police stations
const policeStations: EmergencyContact[] = [
  { id: "polsek_1", name: "Polsek Depok", type: "Polsek", address: "Jl. Laksda Adisucipto, Depok", phone: "(0274) 515500", lat: -7.7821, lng: 110.3892 },
  { id: "polsek_2", name: "Polsek Ngaglik", type: "Polsek", address: "Jl. Kaliurang Km 9, Ngaglik", phone: "(0274) 883000", lat: -7.7056, lng: 110.3987 },
  { id: "polsek_3", name: "Polsek Mlati", type: "Polsek", address: "Jl. Magelang Km 6, Mlati", phone: "(0274) 868500", lat: -7.7150, lng: 110.3550 },
  { id: "polsek_4", name: "Polsek Gamping", type: "Polsek", address: "Jl. Wates Km 5, Gamping", phone: "(0274) 617200", lat: -7.7890, lng: 110.3267 },
];

// Hospitals from GeoJSON
const hospitals = convertHospitalsToContactsFormat(getHospitalsFromGeojson());

// Combine all emergency contacts
export const emergencyContacts: EmergencyContact[] = [
  ...policeStations,
  ...hospitals,
];

export const newsItems: NewsItem[] = [
  { id: "1", title: "Polres Sleman Tingkatkan Patroli Malam", summary: "Polres Sleman menambah jumlah patroli malam hari menyusul meningkatnya kasus pencurian kendaraan bermotor.", content: "Polres Sleman menambah jumlah patroli malam hari menyusul meningkatnya kasus pencurian kendaraan bermotor di beberapa wilayah. Langkah ini dilakukan untuk meningkatkan rasa aman masyarakat.", category: "Keamanan", date: "2026-03-22", image: "" },
  { id: "2", title: "Pelaku Perampokan Toko Emas Ditangkap", summary: "Tim Reskrim Polres Sleman berhasil menangkap 3 pelaku perampokan toko emas yang terjadi pekan lalu.", content: "Tim Reskrim Polres Sleman berhasil menangkap 3 pelaku perampokan toko emas di pusat perbelanjaan Mlati. Barang bukti berupa perhiasan senilai Rp 500 juta berhasil diamankan.", category: "Kejahatan", date: "2026-03-21", image: "" },
  { id: "3", title: "Himbauan: Waspada Modus Penipuan Online", summary: "Kepolisian menghimbau warga Sleman untuk mewaspadai modus penipuan online yang marak terjadi.", content: "Kepolisian Sleman menghimbau warga untuk berhati-hati terhadap modus penipuan online seperti phishing dan penawaran investasi bodong. Segera laporkan jika menemukan hal mencurigakan.", category: "Himbauan", date: "2026-03-20", image: "" },
  { id: "4", title: "Razia Kendaraan di Ring Road Utara", summary: "Satlantas Polres Sleman gelar razia kendaraan bermotor di sepanjang Ring Road Utara.", content: "Satlantas Polres Sleman melaksanakan razia kendaraan bermotor di sepanjang Ring Road Utara untuk menekan angka kecelakaan dan pelanggaran lalu lintas.", category: "Keamanan", date: "2026-03-19", image: "" },
  { id: "5", title: "Kasus Vandalisme Meningkat di Area Kampus", summary: "Sejumlah kasus vandalisme dilaporkan di sekitar area kampus wilayah Depok, Sleman.", content: "Peningkatan kasus vandalisme tercatat di area sekitar kampus. Pelaku diduga dari kelompok pemuda yang tidak bertanggung jawab. Polsek Depok memperkuat pengawasan.", category: "Kejahatan", date: "2026-03-18", image: "" },
  { id: "6", title: "Himbauan: Kunci Ganda Kendaraan Anda", summary: "Polres Sleman menghimbau masyarakat untuk selalu menggunakan kunci ganda pada kendaraan bermotor.", content: "Himbauan penggunaan kunci ganda dan parkir di area yang aman untuk mencegah pencurian kendaraan bermotor yang masih marak terjadi di Sleman.", category: "Himbauan", date: "2026-03-17", image: "" },
];

export const monthlyStats = [
  { month: "Okt", total: 12 },
  { month: "Nov", total: 18 },
  { month: "Des", total: 15 },
  { month: "Jan", total: 22 },
  { month: "Feb", total: 19 },
  { month: "Mar", total: 10 },
];

export const categoryStats = [
  { name: "Pencurian", value: 35, fill: "hsl(215, 80%, 45%)" },
  { name: "Kecelakaan", value: 22, fill: "hsl(38, 92%, 50%)" },
  { name: "Perampokan", value: 12, fill: "hsl(0, 75%, 55%)" },
  { name: "Kebakaran", value: 10, fill: "hsl(25, 90%, 50%)" },
  { name: "Tawuran", value: 8, fill: "hsl(280, 60%, 50%)" },
  { name: "Vandalisme", value: 9, fill: "hsl(160, 60%, 40%)" },
];

export const kecamatanStats = [
  { name: "Depok", total: 25 },
  { name: "Mlati", total: 18 },
  { name: "Ngaglik", total: 15 },
  { name: "Gamping", total: 12 },
  { name: "Kalasan", total: 10 },
  { name: "Godean", total: 8 },
  { name: "Sleman", total: 5 },
  { name: "Pakem", total: 3 },
];
