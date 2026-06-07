# Checklist Aman Push JagaSleman ke GitHub

## 1. Pastikan file rahasia tidak sedang dilacak

Jalankan dari root proyek dengan PowerShell:

```powershell
git status --short
git ls-files | Select-String -Pattern '(^|/)\.env($|\.)|storage/logs|database/.*\.(sqlite|sql|dump|bak)$|\.(pem|p12|pfx|key)$|id_rsa|id_ed25519'
```

Perintah kedua idealnya tidak menghasilkan file rahasia apa pun.

## 2. Periksa pola kredensial sebelum commit

```powershell
git grep -n -I -E 'APP_KEY=|DB_PASSWORD=|MAIL_PASSWORD=|AWS_SECRET_ACCESS_KEY=|PRIVATE KEY|BEGIN RSA|API_KEY=|SECRET_KEY=|ACCESS_TOKEN='
```

Nilai placeholder di `.env.example` boleh ada, tetapi jangan memasukkan nilai produksi.

## 3. Jika `.env` pernah terlanjur dilacak

```powershell
git rm --cached .env
git add .gitignore
git commit -m "Remove environment file from tracking"
```

Jika kredensial pernah masuk ke commit yang sudah dipush, anggap kredensial bocor: rotasi `APP_KEY` hanya dengan perencanaan karena dapat memutus sesi/data terenkripsi; ganti password database, SMTP, token, dan kunci API terkait. Bersihkan riwayat dengan `git filter-repo` bila diperlukan.

## 4. Commit perubahan WebGIS

```powershell
git add resources/js/Components/MapView.tsx resources/css/app.css public/build .gitignore GITHUB_PUSH_CHECKLIST.md
git commit -m "Improve mobile WebGIS controls and responsive bottom sheet"
git push origin main
```

Sesuaikan nama branch apabila bukan `main`.

## 5. Setelah deploy di hosting

```bash
rm -f public/hot
php artisan optimize:clear
```

Lakukan hard refresh browser atau purge cache CDN.
