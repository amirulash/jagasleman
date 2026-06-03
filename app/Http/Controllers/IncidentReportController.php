<?php

namespace App\Http\Controllers;

use App\Models\IncidentReport;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class IncidentReportController extends Controller
{
    public function mapData()
    {
        try {
            $reports = IncidentReport::query()
                ->with('photos')
                ->select([
                    'id',
                    'report_code',
                    'title',
                    'incident_type',
                    'description',
                    'photo_path',
                    'location',
                    'district',
                    'village',
                    'latitude',
                    'longitude',
                    'incident_at',
                    'status',
                    'created_at',
                ])
                ->whereNotNull('latitude')
                ->whereNotNull('longitude')
                ->whereIn('status', ['approved', 'diterima', 'valid', 'selesai'])
                ->latest()
                ->get()
                ->map(function ($report) {
                    return [
                        'id' => $report->id,
                        'report_code' => $report->report_code ?: 'LAP-' . str_pad((string) $report->id, 4, '0', STR_PAD_LEFT),
                        'title' => $report->title ?? ('Laporan ' . ($report->incident_type ?? 'Kejadian')),
                        'category' => $report->incident_type ?? 'Lainnya',
                        'type' => $report->incident_type ?? 'Lainnya',
                        'description' => $report->description ?? '-',
                        'address' => $report->location ?? '-',
                        'location' => $report->location ?? '-',
                        'kecamatan' => $report->district ?? '-',
                        'desa' => $report->village ?? '-',
                        'district' => $report->district ?? '-',
                        'village' => $report->village ?? '-',
                        'latitude' => (float) $report->latitude,
                        'longitude' => (float) $report->longitude,
                        'lat' => (float) $report->latitude,
                        'lng' => (float) $report->longitude,
                        'incident_at' => optional($report->incident_at)->toDateTimeString(),
                        'incident_date' => optional($report->incident_at)->format('Y-m-d'),
                        'incident_time' => optional($report->incident_at)->format('H:i'),
                        'date' => optional($report->incident_at)->format('Y-m-d'),
                        'time' => optional($report->incident_at)->format('H:i'),
                        'status' => $report->status ?? '-',
                        'source' => 'report',
                        'photo_url' => $report->photo_url,
                        'photo_urls' => $report->photo_urls,
                        'created_at' => $report->created_at,
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $reports,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal memuat data laporan untuk peta.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function store(Request $request): RedirectResponse
    {
        $isAuthenticated = $request->user() !== null;

        $validated = $request->validate([
            'name' => [$isAuthenticated ? 'nullable' : 'required', 'string', 'max:255'],
            'email' => [$isAuthenticated ? 'nullable' : 'required', 'email', 'max:255'],
            'phone' => [$isAuthenticated ? 'nullable' : 'required', 'string', 'max:30'],
            'type' => ['required', 'string', 'max:100'],
            'time' => ['required', 'date'],
            'description' => ['required', 'string', 'max:3000'],
            'photo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'photos' => ['nullable', 'array', 'max:4'],
            'photos.*' => ['image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
        ]);

        if (! $this->isInsideSlemanBounds((float) $validated['latitude'], (float) $validated['longitude'])) {
            return back()
                ->withErrors(['latitude' => 'Lokasi yang Anda pilih berada di luar Kabupaten Sleman. Silakan pilih titik kejadian di dalam wilayah Kabupaten Sleman.'])
                ->withInput();
        }

        $reporterName = $isAuthenticated ? $request->user()->name : $validated['name'];
        $reporterEmail = $isAuthenticated ? $request->user()->email : $validated['email'];

        $report = IncidentReport::create([
            'user_id' => $request->user()?->id,
            'reporter_name' => $reporterName,
            'reporter_email' => $reporterEmail,
            'reporter_phone' => $validated['phone'] ?? null,
            'title' => 'Laporan ' . $validated['type'] . ' oleh ' . $reporterName,
            'incident_type' => $validated['type'],
            'description' => $validated['description'],
            'photo_path' => null,
            'location' => number_format((float) $validated['latitude'], 5, '.', '') . ', ' . number_format((float) $validated['longitude'], 5, '.', ''),
            'latitude' => $validated['latitude'],
            'longitude' => $validated['longitude'],
            'incident_at' => $validated['time'],
            'status' => 'pending',
        ]);

        $storedPaths = $this->storeReportPhotos($request, $report);

        if (!empty($storedPaths)) {
            $report->update([
                'photo_path' => $storedPaths[0],
            ]);
        }

        return back()->with('success', 'Laporan berhasil dikirim dan menunggu persetujuan admin.');
    }

    private function isInsideSlemanBounds(float $latitude, float $longitude): bool
    {
        return $latitude >= -7.88
            && $latitude <= -7.50
            && $longitude >= 110.18
            && $longitude <= 110.62;
    }

    private function storeReportPhotos(Request $request, IncidentReport $report): array
    {
        $files = [];

        if ($request->hasFile('photos')) {
            $uploadedPhotos = $request->file('photos');
            $files = is_array($uploadedPhotos) ? $uploadedPhotos : [$uploadedPhotos];
        } elseif ($request->hasFile('photo')) {
            $files = [$request->file('photo')];
        }

        $storedPaths = [];

        foreach (array_slice($files, 0, 4) as $index => $file) {
            if (!$file || !$file->isValid()) {
                continue;
            }

            $path = $file->store('incident-reports/' . $report->id, 'public');
            $storedPaths[] = $path;

            $report->photos()->create([
                'photo_path' => $path,
                'original_name' => $file->getClientOriginalName(),
                'sort_order' => $index,
            ]);
        }

        return $storedPaths;
    }
}
