# JagaSleman WebGIS — Final Responsive Build

Paket ini berisi revisi final halaman `/webgis` dan navbar responsif. Tata letak kontrol muka peta dibuat berzona agar kontrol tidak saling menutupi pada desktop, tablet, maupun perangkat mobile.

## Perubahan utama

1. **Muka peta tanpa tumpang tindih**
   - Pencarian kecamatan berada pada lajur atas.
   - Zoom, tampilan seluruh Sleman, geolocation, dan fullscreen berada pada lajur kiri.
   - Keterangan Peta, Layer Peta, dan Basemap berada pada stack kanan yang dapat digulir.
   - Seluruh panel tertutup secara default dan isi panel memiliki batas tinggi serta scroll internal.
   - Informasi risiko dan pesan kegagalan API dipindahkan ke bawah muka peta.
   - Filter data dipindahkan ke luar muka peta.

2. **Responsif**
   - Desktop: kontrol kiri, pencarian tengah atas, panel kanan.
   - Tablet: pencarian memenuhi lajur atas; kontrol dan panel dimulai di bawahnya.
   - Mobile: lajur kiri 42 px untuk navigasi dan lajur kanan untuk panel; tidak saling menimpa.
   - Tinggi peta disesuaikan per breakpoint.

3. **Navbar mobile**
   - Tombol Menu terlihat jelas.
   - Drawer menggunakan latar solid, bukan transparan.
   - Nama menu, ikon, status aktif, tombol masuk/dashboard, dan tombol tutup terlihat utuh.
   - Nama aplikasi membaca `VITE_APP_NAME`.

4. **Build dan performa**
   - Ditambahkan `postcss.config.js` agar Tailwind diproses saat `npm run build`.
   - `public/hot` dihapus agar produksi tidak mencoba membaca Vite development server.
   - GeoJSON batas kalurahan sekitar 4 MB dipindahkan ke `public/geojson/batas_desa.geojson` dan dimuat hanya saat layer tersebut diaktifkan.
   - Ukuran chunk awal `MapView` turun dari sekitar 6,2 MB menjadi sekitar 2,1 MB sebelum gzip.
   - Basemap satelit menggunakan Esri World Imagery.
   - Ditambahkan nama file logo huruf kecil untuk hosting Linux yang case-sensitive.

## Hasil pengujian tata letak

| Viewport | Kontrol kiri vs pencarian | Kontrol kiri vs panel kanan | Pencarian vs panel kanan | Seluruh kontrol di dalam peta |
|---|---:|---:|---:|---:|
| 390 × 844 | Tidak bertumpuk | Tidak bertumpuk | Tidak bertumpuk | Ya |
| 768 × 900 | Tidak bertumpuk | Tidak bertumpuk | Tidak bertumpuk | Ya |
| 1440 × 1000 | Tidak bertumpuk | Tidak bertumpuk | Tidak bertumpuk | Ya |

Panel kanan memiliki `overflow-y: auto`, sehingga isi panel tetap dapat diakses tanpa menutupi kontrol kiri atau pencarian.

## Pemasangan

Paket sumber berasal dari arsip yang tidak memuat file `artisan`. Karena itu, gabungkan isi ZIP ke **root proyek Laravel asli di server**, bukan menjalankan folder ini sebagai proyek Laravel baru.

```bash
cd /lokasi/root-proyek-laravel

# Sangat penting: jangan biarkan mode Vite development aktif di produksi
rm -f public/hot

# Instal dependensi yang terkunci dan bangun aset produksi
npm ci
rm -rf public/build
npm run build

# Bersihkan cache Laravel
php artisan optimize:clear
```

Untuk perubahan nama aplikasi, isi `.env`:

```env
APP_NAME="Nama Aplikasi"
VITE_APP_NAME="Nama Aplikasi"
```

Setelah mengubah `VITE_APP_NAME`, jalankan kembali:

```bash
rm -f public/hot
npm run build
php artisan optimize:clear
```

## Hosting dengan `public_html` terpisah

Pastikan hasil berikut benar-benar berada di document root yang dibaca domain:

```text
public/build/
public/geojson/batas_desa.geojson
public/images/logo_jagasleman.png
```

Jika aplikasi berada di folder lain dan `public_html` adalah document root, salin ketiga lokasi tersebut ke folder publik yang aktif.

## Cache

Setelah deploy:

1. Hapus cache Cloudflare/CDN bila digunakan.
2. Buka situs dengan `Ctrl + Shift + R` atau mode Incognito.
3. Pastikan `public/hot` tidak muncul kembali di server produksi.

## Berkas utama yang direvisi

```text
resources/js/Pages/AnalysisDashboard.tsx
resources/js/Components/MapView.tsx
resources/js/Components/Safekey/TopNavbar.jsx
resources/css/app.css
postcss.config.js
public/geojson/batas_desa.geojson
public/images/logo_jagasleman.png
public/build/
```
