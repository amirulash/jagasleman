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
        $selectedYear = (string) $request->query('year', '2025');

        $model = new IncidentReport();
        $table = $model->getTable();

        $query = IncidentReport::query();

        if (Schema::hasColumn($table, 'created_at')) {
            $query->orderByDesc('created_at');
        } elseif (Schema::hasColumn($table, 'id')) {
            $query->orderByDesc('id');
        }

        $communityReports = $query
            ->get()
            ->map(fn ($report) => $this->normalizeCommunityReport($report));

        $policeReports = collect($this->loadPoliceReports());
        $allReports = $policeReports->concat($communityReports)->values();

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
                ->filter(fn ($report) => (string) $this->extractYear($report) === $selectedYear)
                ->values();

        $monthly = collect(range(1, 12))->map(function ($month) use ($reports) {
            return [
                'month_number' => $month,
                'month' => Carbon::create(null, $month, 1)->locale('id')->translatedFormat('M'),
                'total' => $reports->filter(fn ($report) => $this->extractMonth($report) === $month)->count(),
            ];
        })->values();

        $annual = collect(range(2020, 2025))->map(function ($year) use ($allReports) {
            return [
                'year' => (string) $year,
                'total' => $allReports->filter(fn ($report) => $this->extractYear($report) === $year)->count(),
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
            ->groupBy(fn ($report) => $this->normalizeStatus($this->value($report, ['status'])))
            ->map(fn ($items) => $items->count());

        $recentReports = $this->recentReports($reports, 10);
        $recentPoliceReports = $this->recentReports($reports->where('source', 'police'), 8);
        $recentCommunityReports = $this->recentReports($reports->where('source', 'community'), 8);

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
            'annual' => $annual,
            'categories' => $categories,
            'districts' => $districts,
            'recent_reports' => $recentReports,
            'recent_community_reports' => $recentCommunityReports,
            'recent_police_reports' => $recentPoliceReports,
            'export_reports' => $this->exportReports($reports),
            'available_years' => $availableYears->count() ? $availableYears : collect(['2025', '2024', '2023', '2022', '2021', '2020']),
            'updated_at' => now()->toIso8601String(),
            'source' => 'database',
        ]);
    }

    private function normalizeCommunityReport($report): array
    {
        return [
            'id' => $report->id,
            'report_code' => $report->report_code ?? ('LAP-' . str_pad((string) $report->id, 4, '0', STR_PAD_LEFT)),
            'title' => $report->title ?? $this->extractType($report),
            'type' => $this->extractType($report),
            'district' => $this->extractDistrict($report),
            'village' => $report->village ?? $report->desa ?? '-',
            'location' => $report->location ?? null,
            'date' => optional($this->extractDate($report))->toDateString(),
            'latitude' => $report->latitude,
            'longitude' => $report->longitude,
            'description' => $report->description ?? null,
            'reporter_name' => $report->reporter_name ?? null,
            'admin_note' => $report->admin_note ?? null,
            'reviewer_name' => optional($report->reviewer)->name,
            'updated_at' => optional($report->updated_at)->toDateTimeString(),
            'status' => $this->normalizeStatus($report->status ?? null),
            'source' => 'community',
        ];
    }

    private function loadPoliceReports(): array
    {
        $path = resource_path('js/data/points/data_kejadian.geojson');

        if (! is_file($path)) {
            return [];
        }

        $content = json_decode((string) file_get_contents($path), true);
        $features = $content['features'] ?? [];

        return collect($features)
            ->map(function (array $feature, int $index) {
                $properties = $feature['properties'] ?? [];
                $coordinates = $feature['geometry']['coordinates'] ?? [];
                $address = (string) ($properties['Alamat Fix'] ?? '');
                [$village, $district] = $this->extractVillageAndDistrictFromAddress($address);

                return [
                    'id' => 'police-' . ($properties['No'] ?? $index + 1),
                    'report_code' => 'POL-' . str_pad((string) ($properties['No'] ?? $index + 1), 4, '0', STR_PAD_LEFT),
                    'title' => $properties['Kategori'] ?? 'Data Kepolisian',
                    'type' => $this->normalizePoliceCategory((string) ($properties['Kategori'] ?? '')),
                    'district' => $district,
                    'village' => $village,
                    'location' => $address,
                    'latitude' => $properties['Latitude'] ?? ($coordinates[1] ?? null),
                    'longitude' => $properties['Longitude'] ?? ($coordinates[0] ?? null),
                    'date' => optional($this->parsePoliceDate($properties['Tanggal Kejadian'] ?? null))->toDateString(),
                    'time' => $properties['Waktu Kejadian'] ?? null,
                    'description' => $properties['Keterangan'] ?? $properties['Deskripsi'] ?? $properties['Kategori'] ?? null,
                    'reporter_name' => 'Data Kepolisian',
                    'admin_note' => 'Data historis kepolisian',
                    'reviewer_name' => 'Sistem',
                    'updated_at' => optional($this->parsePoliceDate($properties['Tanggal Kejadian'] ?? null))->toDateString(),
                    'status' => 'approved',
                    'source' => 'police',
                ];
            })
            ->filter(fn ($item) => $this->extractDate($item) !== null)
            ->values()
            ->all();
    }

    private function recentReports($reports, int $limit)
    {
        return $this->exportReports($reports)
            ->take($limit)
            ->values();
    }

    private function exportReports($reports)
    {
        return collect($reports)
            ->sortByDesc(fn ($report) => $this->extractDate($report)?->timestamp ?? 0)
            ->map(fn ($report) => [
                'id' => $this->value($report, ['id']),
                'report_code' => $this->value($report, ['report_code']) ?? '-',
                'title' => $this->value($report, ['title']) ?? $this->extractType($report),
                'type' => $this->extractType($report),
                'description' => $this->value($report, ['description']) ?? '-',
                'location' => $this->value($report, ['location', 'address']) ?? '-',
                'district' => $this->extractDistrict($report),
                'village' => $this->value($report, ['village', 'desa']) ?? '-',
                'latitude' => $this->value($report, ['latitude', 'lat']) ?? '-',
                'longitude' => $this->value($report, ['longitude', 'lng']) ?? '-',
                'date' => optional($this->extractDate($report))->toDateString(),
                'updated_at' => $this->value($report, ['updated_at', 'reviewed_at', 'created_at']) ?? optional($this->extractDate($report))->toDateString(),
                'reporter_name' => $this->value($report, ['reporter_name']) ?? null,
                'admin_note' => $this->value($report, ['admin_note']) ?? null,
                'reviewer_name' => $this->value($report, ['reviewer_name']) ?? null,
                'status' => $this->normalizeStatus($this->value($report, ['status'])),
                'source' => $this->value($report, ['source']) ?? 'community',
            ])
            ->values();
    }

    private function extractDate($report): ?Carbon
    {
        $value = $this->value($report, [
            'incident_at',
            'incident_date',
            'date',
            'created_at',
            'Tanggal Kejadian',
        ]);

        if (!$value) {
            return null;
        }

        if ($value instanceof Carbon) {
            return $value;
        }

        return $this->parsePoliceDate($value);
    }

    private function parsePoliceDate($value): ?Carbon
    {
        if (!$value) {
            return null;
        }

        $text = trim((string) $value);
        $formats = ['Y-m-d', 'd/m/Y', 'j/n/Y', 'm/d/Y', 'n/j/Y', 'd-m-Y', 'Y/m/d'];

        foreach ($formats as $format) {
            try {
                $date = Carbon::createFromFormat($format, $text);

                if ($date !== false) {
                    return $date->startOfDay();
                }
            } catch (\Throwable $th) {
                // Continue with the next format.
            }
        }

        try {
            return Carbon::parse($text)->startOfDay();
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
        return trim((string) ($this->value($report, [
            'incident_type',
            'crime_type',
            'type',
            'kategori',
            'Kategori',
            'category',
        ]) ?? 'Tidak diketahui'));
    }

    private function extractDistrict($report): string
    {
        return trim((string) ($this->value($report, [
            'district',
            'kecamatan',
            'Kecamatan',
        ]) ?? 'Belum terdeteksi'));
    }

    private function normalizePoliceCategory(string $category): string
    {
        $value = strtolower($category);

        if (str_contains($value, 'keroyok')) {
            return 'PENGEROYOKAN';
        }

        if (str_contains($value, 'rusak')) {
            return 'PENGRUSAKAN';
        }

        if (str_contains($value, 'aniaya')) {
            return 'PENGANIAYAAN';
        }

        if (str_contains($value, 'sajam') || str_contains($value, 'senjata')) {
            return 'PENYALAHGUNAAN SENJATA TAJAM';
        }

        if (str_contains($value, 'curas') || str_contains($value, 'kekerasan')) {
            return 'PENCURIAN DENGAN KEKERASAN (CURAS)';
        }

        if (str_contains($value, 'pemerasan') || str_contains($value, 'ancaman')) {
            return 'PEMERASAN DAN PENGANCAMAN';
        }

        return $category ?: 'Tidak diketahui';
    }

    private function extractVillageAndDistrictFromAddress(string $address): array
    {
        $parts = collect(explode(',', $address))
            ->map(fn ($item) => trim($item))
            ->filter()
            ->values();

        $slemanIndex = $parts->search(fn ($item) => strcasecmp($item, 'Sleman') === 0 || str_contains(strtolower($item), 'sleman'));

        if ($slemanIndex !== false) {
            $district = $parts->get($slemanIndex - 1) ?: 'Sleman';
            $village = $parts->get($slemanIndex - 2) ?: '-';

            return [$village, $district];
        }

        return ['-', 'Sleman'];
    }

    private function value($report, array $keys)
    {
        foreach ($keys as $key) {
            $value = is_array($report) ? ($report[$key] ?? null) : ($report->{$key} ?? null);

            if ($value !== null && $value !== '') {
                return $value;
            }
        }

        return null;
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
