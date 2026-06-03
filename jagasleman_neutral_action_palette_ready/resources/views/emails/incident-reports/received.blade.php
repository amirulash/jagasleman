<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Laporan JagaSleman Berhasil Dikirim</title>
</head>
<body style="margin:0;padding:0;background:#f3f6f8;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <div style="max-width:620px;margin:0 auto;padding:24px;">
        <div style="background:#0f1f2e;border-radius:22px 22px 0 0;padding:24px;color:#ffffff;">
            <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#9ee6c1;font-weight:700;">JagaSleman</div>
            <h1 style="margin:10px 0 0;font-size:24px;line-height:1.25;">Laporan berhasil dikirim</h1>
            <p style="margin:10px 0 0;color:#dbeafe;font-size:14px;line-height:1.6;">Terima kasih. Laporan Anda sudah masuk ke sistem dan sedang menunggu verifikasi admin.</p>
        </div>

        <div style="background:#ffffff;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 22px 22px;padding:24px;">
            <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:16px;padding:16px;margin-bottom:18px;">
                <div style="font-size:12px;color:#047857;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Kode Laporan</div>
                <div style="font-size:22px;font-weight:800;color:#065f46;margin-top:4px;">{{ $report->public_code }}</div>
            </div>

            <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.6;">
                <tr><td style="padding:6px 0;color:#64748b;width:150px;">Status</td><td style="padding:6px 0;font-weight:700;color:#b45309;">{{ $report->status_label }}</td></tr>
                <tr><td style="padding:6px 0;color:#64748b;">Jenis Kejadian</td><td style="padding:6px 0;font-weight:700;">{{ $report->incident_type ?? '-' }}</td></tr>
                <tr><td style="padding:6px 0;color:#64748b;">Tanggal Kejadian</td><td style="padding:6px 0;">{{ optional($report->incident_at)->format('d M Y H:i') ?? '-' }}</td></tr>
                <tr><td style="padding:6px 0;color:#64748b;">Lokasi</td><td style="padding:6px 0;">{{ $report->location ?? '-' }}</td></tr>
                <tr><td style="padding:6px 0;color:#64748b;">Kecamatan/Desa</td><td style="padding:6px 0;">{{ $report->district ?? '-' }} / {{ $report->village ?? '-' }}</td></tr>
            </table>

            <p style="margin:20px 0 0;color:#475569;font-size:14px;line-height:1.7;">Laporan akan diperiksa oleh admin. Jika laporan disetujui, data kejadian dapat tampil pada peta publik tanpa menampilkan identitas pelapor.</p>

            <div style="margin-top:22px;text-align:center;">
                <a href="{{ $statusUrl }}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;border-radius:999px;padding:12px 20px;font-weight:700;font-size:14px;">Cek Status Laporan</a>
            </div>

            <p style="margin:22px 0 0;color:#94a3b8;font-size:12px;line-height:1.6;">Email ini dikirim otomatis oleh sistem JagaSleman. Simpan kode laporan untuk mengecek perkembangan status laporan Anda.</p>
        </div>
    </div>
</body>
</html>
