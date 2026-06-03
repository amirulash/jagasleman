# Catatan Perubahan Revisi Final JagaSleman

Perubahan utama yang diterapkan:

1. Beranda
   - Menghapus blok Jam Operasional pada footer.
   - Menghapus tautan footer kosong/tidak aktif seperti Kebijakan Privasi, Syarat Penggunaan, dan Aksesibilitas.
   - Merapikan grid footer menjadi tiga kolom agar lebih proporsional.

2. Peta/WebGIS
   - Sumber data awal diarahkan ke Data Kepolisian agar data tidak langsung bercampur dengan laporan masyarakat.
   - Kontrol peta diringkas: Zoom In, Zoom Out, Zoom to Extent, Lokasi Saya, dan Layar Penuh.
   - Panel basemap dibuat bisa dibuka/tutup agar tidak memenuhi area peta.

3. Street Crime Analysis
   - Tombol Layer di panel kontrol atas dihapus.
   - Kontrol peta dipisahkan menjadi: Zoom In, Zoom Out, Extent, Lokasi, dan Layar.
   - Panel Keterangan Peta dibuat tertutup secara default dan bisa dibuka melalui tombol khusus.
   - Tabel Data Kepolisian dan Laporan Masyarakat tetap dipisahkan secara tegas.

4. Form Laporan Kejadian
   - Menambahkan validasi frontend berbasis batas administrasi desa Kabupaten Sleman.
   - Jika titik yang dipilih berada di luar Kabupaten Sleman, sistem menampilkan alert dan menolak pengisian titik tersebut.
   - Menambahkan validasi backend berbasis bounding box Kabupaten Sleman sebagai pengaman dasar server-side.

5. Statistik
   - Menambahkan grafik Statistik Tahunan 2020–2025.
   - Endpoint statistik kini menggabungkan Data Kepolisian 2020–2025 dan Data Pelaporan Masyarakat.
   - Data statistik dipisahkan menjadi laporan terbaru, laporan kepolisian, dan laporan masyarakat.

Catatan pengujian:
- Syntax PHP sudah dicek dengan `php -l` untuk controller yang diubah.
- Build Vite belum bisa dijalankan di environment ini karena dependency Node belum terpasang (`vite: not found`). Jalankan `npm install` lalu `npm run build` di komputer/server proyek.
