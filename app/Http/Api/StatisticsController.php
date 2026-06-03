<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\IncidentReport;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class StatisticsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $selectedYear = $request->query('year', now()->year);

        $model = new IncidentReport();
        $table = $model->getTable();

        $query = IncidentReport::query();

        if (Schema::hasColumn($table, 'created_at')) {
            $query->orderByDesc('created_at');
        } elseif (Schema::hasColumn($table, 'id')) {
            $query->orderByDesc('id');
        }

        $allReports = $query->get();

        $availableYears = $allReports
            ->map(fn ($report) => $this->extractYear($report))
            ->filter()
            ->unique()
            ->sortDesc()
            ->values()
            ->map(fn ($year) => (string) $year);

        $reports = $selectedYear === 'all'
            ? $allReports
            : $allReports
                ->filter(fn ($report) => (string) $this->extractYear($report) === (string) $selectedYear)
                ->values();

        $monthly = collect(range(1, 12))->map(function ($month) use ($reports) {
            return [
                'month_number' => $month,
                'month' => Carbon::create(null, $month, 1)->locale('id')->translatedFormat('M'),
                'total' => $reports->filter(fn ($report) => $this->extractMonth($report) === $month)->count(),
            ];
        })->values();

        $categories = $reports
            ->groupBy(fn ($report) => $this->extractType($report))
            ->map(fn ($items, $name) => [
                'name' => $name ?: 'Tidak diketahui',
                'value' => $items->count(),
            ])
            ->sortByDesc('value')
            ->values();

        $districts = $reports
            ->groupBy(fn ($report) => $this->extractDistrict($report))
            ->map(fn ($items, $name) => [
                'name' => $name ?: 'Belum terdeteksi',
                'total' => $items->count(),
            ])
            ->sortByDesc('total')
            ->values();

        $statusCounts = $reports
            ->groupBy(fn ($report) => $this->normalizeStatus($report->status ?? null))
            ->map(fn ($items) => $items->count());

        $recentReports = $reports
            ->sortByDesc(fn ($report) => $this->extractDate($report)?->timestamp ?? 0)
            ->take(8)
            ->map(fn ($report) => [
                'id' => $report->id,
                'report_code' => $report->report_code ?? ('LAP-' . str_pad((string) $report->id, 4, '0', STR_PAD_LEFT)),
                'title' => $report->title ?? $this->extractType($report),
                'type' => $this->extractType($report),
                'district' => $this->extractDistrict($report),
                'village' => $report->village ?? $report->desa ?? '-',
                'date' => optional($this->extractDate($report))->toDateString(),
                'status' => $this->normalizeStatus($report->status ?? null),
            ])
            ->values();

        return response()->json([
            'summary' => [
                'total' => $reports->count(),
                'pending' => (int) ($statusCounts['pending'] ?? 0),
                'approved' => (int) ($statusCounts['approved'] ?? 0),
                'rejected' => (int) ($statusCounts['rejected'] ?? 0),
                'districts' => $districts->count(),
                'top_district' => $districts->first()['name'] ?? '-',
                'avg_per_month' => round($reports->count() / 12, 1),
            ],
            'monthly' => $monthly,
            'categories' => $categories,
            'districts' => $districts,
            'recent_reports' => $recentReports,
            'available_years' => $availableYears->count() ? $availableYears : [now()->year],
            'updated_at' => now()->toIso8601String(),
        ]);
    }

    private function extractDate($report): ?Carbon
    {
        $value = $report->incident_at
            ?? $report->incident_date
            ?? $report->date
            ?? $report->created_at
            ?? null;

        if (!$value) {
            return null;
        }

        try {
            return Carbon::parse($value);
        } catch (\Throwable $th) {
            return null;
        }
    }

    private function extractYear($report): ?int
    {
        return $this->extractDate($report)?->year;
    }

    private function extractMonth($report): ?int
    {
        return $this->extractDate($report)?->month;
    }

    private function extractType($report): string
    {
        return trim((string) (
            $report->incident_type
            ?? $report->crime_type
            ?? $report->type
            ?? $report->kategori
            ?? 'Tidak diketahui'
        ));
    }

    private function extractDistrict($report): string
    {
        return trim((string) (
            $report->district
            ?? $report->kecamatan
            ?? 'Belum terdeteksi'
        ));
    }

    private function normalizeStatus(?string $status): string
    {
        $text = strtolower(trim((string) $status));

        if (in_array($text, ['approved', 'approve', 'diterima', 'disetujui', 'verified', 'aktif', 'selesai'], true)) {
            return 'approved';
        }

        if (in_array($text, ['rejected', 'reject', 'ditolak', 'invalid'], true)) {
            return 'rejected';
        }

        return 'pending';
    }
}
