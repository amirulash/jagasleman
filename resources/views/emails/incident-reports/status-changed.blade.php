<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Update Status Laporan JagaSleman</title>
</head>
<body style="margin:0;padding:0;background:#f3f6f8;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    @php
        $status = $report->status;
        $statusColor = $status === 'approved' ? '#047857' : ($status === 'rejected' ? '#be123c' : '#b45309');
        $statusBg = $status === 'approved' ? '#ecfdf5' : ($status === 'rejected' ? '#fff1f2' : '#fffbeb');
        $statusBorder = $status === 'approved' ? '#a7f3d0' : ($status === 'rejected' ? '#fecdd3' : '#fde68a');
    @endphp
    <div style="max-width:620px;margin:0 auto;padding:24px;">
        <div style="background:#0f1f2e;border-radius:22px 22px 0 0;padding:24px;color:#ffffff;">
            <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#9ee6c1;font-weight:700;">JagaSleman</div>
            <h1 style="margin:10px 0 0;font-size:24px;line-height:1.25;">Status laporan diperbarui</h1>
            <p style="margin:10px 0 0;color:#dbeafe;font-size:14px;line-height:1.6;">Berikut pembaruan terbaru untuk laporan Anda.</p>
        </div>

        <div style="background:#ffffff;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 22px 22px;padding:24px;">
            <div style="background:{{ $statusBg }};border:1px solid {{ $statusBorder }};border-radius:16px;padding:16px;margin-bottom:18px;">
                <div style="font-size:12px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Kode Laporan</div>
                <div style="font-size:22px;font-weight:800;color:#0f172a;margin-top:4px;">{{ $report->public_code }}</div>
                <div style="margin-top:8px;font-size:18px;font-weight:800;color:{{ $statusColor }};">{{ $report->status_label }}</div>
            </div>

            <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.6;">
                <tr><td style="padding:6px 0;color:#64748b;width:150px;">Jenis Kejadian</td><td style="padding:6px 0;font-weight:700;">{{ $report->incident_type ?? '-' }}</td></tr>
                <tr><td style="padding:6px 0;color:#64748b;">Tanggal Kejadian</td><td style="padding:6px 0;">{{ optional($report->incident_at)->format('d M Y H:i') ?? '-' }}</td></tr>
                <tr><td style="padding:6px 0;color:#64748b;">Lokasi</td><td style="padding:6px 0;">{{ $report->location ?? '-' }}</td></tr>
                <tr><td style="padding:6px 0;color:#64748b;">Waktu Review</td><td style="padding:6px 0;">{{ optional($report->reviewed_at)->format('d M Y H:i') ?? '-' }}</td></tr>
            </table>

            @if ($report->status === 'approved')
                <p style="margin:20px 0 0;color:#047857;font-size:14px;line-height:1.7;font-weight:700;">Laporan Anda sudah disetujui. Data kejadian dapat digunakan sebagai data publik pada peta tanpa menampilkan identitas pelapor.</p>
            @elseif ($report->status === 'rejected')
                <div style="margin-top:20px;background:#fff1f2;border:1px solid #fecdd3;border-radius:16px;padding:14px;">
                    <div style="font-size:12px;color:#be123c;font-weight:800;text-transform:uppercase;letter-spacing:1px;">Alasan Penolakan</div>
                    <p style="margin:6px 0 0;color:#7f1d1d;font-size:14px;line-height:1.6;">{{ $report->rejection_reason ?: 'Laporan belum memenuhi syarat validasi.' }}</p>
                </div>
            @else
                <p style="margin:20px 0 0;color:#b45309;font-size:14px;line-height:1.7;font-weight:700;">Laporan Anda masih menunggu proses verifikasi admin.</p>
            @endif

            <div style="margin-top:22px;text-align:center;">
                <a href="{{ $statusUrl }}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;border-radius:999px;padding:12px 20px;font-weight:700;font-size:14px;">Cek Status Laporan</a>
            </div>

            <p style="margin:22px 0 0;color:#94a3b8;font-size:12px;line-height:1.6;">Email ini dikirim otomatis oleh sistem JagaSleman.</p>
        </div>
    </div>
</body>
</html>
