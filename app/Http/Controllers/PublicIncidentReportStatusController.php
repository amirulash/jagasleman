<?php

namespace App\Http\Controllers;

use App\Models\IncidentReport;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PublicIncidentReportStatusController extends Controller
{
    public function lookup(Request $request)
    {
        $validated = $request->validate([
            'reporter_email' => ['nullable', 'email', 'max:150'],
            'report_code' => ['nullable', 'string', 'max:80'],
            'status' => ['nullable', Rule::in(['all', 'pending', 'approved', 'rejected'])],
        ], [
            'reporter_email.email' => 'Format email belum valid.',
        ]);

        $email = strtolower(trim((string) ($validated['reporter_email'] ?? '')));
        $reportCode = trim((string) ($validated['report_code'] ?? ''));
        $status = $validated['status'] ?? 'all';

        if ($email === '' && $reportCode === '') {
            return response()->json([
                'message' => 'Masukkan kode laporan atau email pelapor untuk mengecek status.',
                'data' => [],
            ], 422);
        }

        $query = IncidentReport::query()->orderByDesc('created_at');

        if ($email !== '') {
            $query->whereRaw('LOWER(reporter_email) = ?', [$email]);
        }

        if ($reportCode !== '') {
            $query->where(function ($q) use ($reportCode) {
                $normalizedCode = strtoupper(str_replace([' ', '#'], ['', '-'], $reportCode));

                $q->where('report_code', $reportCode)
                    ->orWhere('report_code', $normalizedCode);

                if (preg_match('/(\d+)/', $reportCode, $matches)) {
                    $q->orWhere('id', (int) $matches[1]);
                }
            });
        }

        if ($status !== 'all') {
            $query->where('status', $status);
        }

        $reports = $query->limit(15)->get();

        if ($reports->isEmpty()) {
            return response()->json([
                'message' => 'Status laporan tidak ditemukan. Pastikan kode laporan atau email sesuai.',
                'data' => [],
            ], 404);
        }

        return response()->json([
            'message' => 'Status laporan berhasil dimuat.',
            'data' => $reports->map(fn (IncidentReport $report) => [
                'id' => $report->id,
                'report_code' => $report->public_code,
                'title' => $report->title,
                'incident_type' => $report->incident_type,
                'location' => $report->location,
                'district' => $report->district,
                'village' => $report->village,
                'incident_at' => optional($report->incident_at)->toDateTimeString(),
                'status' => $report->status,
                'status_label' => $report->status_label,
                'rejection_reason' => $report->status === IncidentReport::STATUS_REJECTED
                    ? $report->rejection_reason
                    : null,
                'reviewed_at' => optional($report->reviewed_at)->toDateTimeString(),
                'created_at' => optional($report->created_at)->toDateTimeString(),
            ])->values(),
        ]);
    }
}
