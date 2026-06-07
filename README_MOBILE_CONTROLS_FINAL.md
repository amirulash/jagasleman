# JagaSleman WebGIS — Mobile Controls Final

Perubahan utama:

- Kontrol **Keterangan Peta**, **Layer Peta**, dan **Basemap** menjadi dock tiga tombol di bagian bawah peta pada layar ponsel.
- Hanya satu panel dapat terbuka pada satu waktu.
- Panel terbuka menjadi bottom sheet lebar penuh, bukan kolom sempit di kanan.
- Bottom sheet dapat digulir dan tidak bertumpuk dengan zoom, geolocation, fullscreen, atau panel lain.
- Menekan area peta yang digelapkan akan menutup panel.
- Layer data dibuat lebih ringkas dan mudah disentuh.
- Pilihan basemap menjadi tiga kartu sejajar.
- Atribusi Leaflet dipindahkan ke atas dock agar tetap terlihat.
- Desktop tetap memakai panel kanan seperti sebelumnya.

## Pemasangan tanpa npm

Salin dan timpa folder `resources` serta `public/build` dari paket ke root proyek lama. Setelah itu:

```powershell
Remove-Item ".\public\hot" -Force -ErrorAction SilentlyContinue
php artisan optimize:clear
php artisan serve
```

Build produksi telah disertakan sehingga `npm run dev` dan `npm run build` tidak wajib untuk pemasangan patch ini.
