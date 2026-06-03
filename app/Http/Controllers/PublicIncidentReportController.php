<?php

namespace App\Http\Controllers;

use App\Models\IncidentReport;
use App\Services\IncidentReportNotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class PublicIncidentReportController extends Controller
{
    public function store(Request $request)
    {
        $request->merge([
            'incident_type' => $request->input('incident_type', $request->input('crime_type')),
            'location' => $request->input('location', $request->input('address')),
        ]);

        if (!$request->filled('incident_at')) {
            $date = $request->input('incident_date');
            $time = $request->input('incident_time', '00:00');

            if ($date) {
                $request->merge([
                    'incident_at' => $date . ' ' . $time,
                ]);
            }
        }

        $validator = Validator::make($request->all(), [
            'reporter_name' => ['nullable', 'string', 'max:150'],
            'reporter_email' => ['nullable', 'email', 'max:150'],
            'reporter_phone' => ['nullable', 'string', 'max:50'],
            'title' => ['nullable', 'string', 'max:255'],
            'incident_type' => [
                'required',
                'string',
                'in:PENGEROYOKAN,PENGRUSAKAN,PENGANIAYAAN,PENYALAHGUNAAN SENJATA TAJAM,PENCURIAN DENGAN KEKERASAN (CURAS),PEMERASAN DAN PENGANCAMAN',
            ],
            'description' => ['nullable', 'string', 'max:3000'],
            'location' => ['required', 'string', 'max:1000'],
            'district' => ['nullable', 'string', 'max:100'],
            'village' => ['nullable', 'string', 'max:100'],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'incident_at' => ['required', 'date'],
            'photo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'photos' => ['nullable', 'array', 'max:4'],
            'photos.*' => ['image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ], [
            'incident_type.required' => 'Jenis kejadian wajib dipilih.',
            'incident_type.in' => 'Jenis kejadian tidak sesuai dengan kategori kejahatan jalanan.',
            'location.required' => 'Lokasi atau alamat kejadian wajib diisi.',
            'latitude.required' => 'Titik lokasi kejadian wajib dipilih pada peta.',
            'longitude.required' => 'Titik lokasi kejadian wajib dipilih pada peta.',
            'incident_at.required' => 'Waktu kejadian wajib diisi.',
            'photo.image' => 'Foto bukti harus berupa gambar.',
            'photos.max' => 'Maksimal 4 foto bukti yang dapat dikirim.',
            'photos.*.image' => 'Semua foto bukti harus berupa gambar.',
            'photos.*.mimes' => 'Foto bukti hanya boleh JPG, JPEG, PNG, atau WEBP.',
            'photos.*.max' => 'Ukuran setiap foto maksimal 5 MB.',
        ]);

        $validator->after(function ($validator) use ($request) {
            if ($request->filled(['latitude', 'longitude']) && ! $this->isInsideSlemanBounds((float) $request->input('latitude'), (float) $request->input('longitude'))) {
                $validator->errors()->add('latitude', 'Lokasi yang Anda pilih berada di luar Kabupaten Sleman. Silakan pilih titik kejadian di dalam wilayah Kabupaten Sleman.');
                $validator->errors()->add('longitude', 'Lokasi yang Anda pilih berada di luar Kabupaten Sleman. Silakan pilih titik kejadian di dalam wilayah Kabupaten Sleman.');
            }
        });

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Data laporan belum lengkap atau tidak valid.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();

        $report = IncidentReport::create([
            'user_id' => Auth::id(),
            'reporter_name' => $validated['reporter_name'] ?? null,
            'reporter_email' => $validated['reporter_email'] ?? null,
            'reporter_phone' => $validated['reporter_phone'] ?? null,
            'title' => $validated['title'] ?? 'Laporan ' . $validated['incident_type'],
            'incident_type' => $validated['incident_type'],
            'description' => $validated['description'] ?? null,
            'photo_path' => null,
            'location' => $validated['location'],
            'district' => $validated['district'] ?? null,
            'village' => $validated['village'] ?? null,
            'latitude' => $validated['latitude'],
            'longitude' => $validated['longitude'],
            'incident_at' => $validated['incident_at'],
            'status' => IncidentReport::STATUS_PENDING,
        ]);

        $storedPaths = $this->storeReportPhotos($request, $report);

        if (!empty($storedPaths)) {
            $report->update([
                'photo_path' => $storedPaths[0],
            ]);
        }

        $report->load('photos');

        app(IncidentReportNotificationService::class)->sendReceived($report);

        return response()->json([
            'message' => 'Laporan berhasil dikirim dan sedang menunggu verifikasi admin.',
            'data' => [
                'id' => $report->id,
                'report_code' => $report->report_code ?: 'LAP-' . str_pad((string) $report->id, 4, '0', STR_PAD_LEFT),
                'incident_type' => $report->incident_type,
                'location' => $report->location,
                'status' => $report->status,
                'photo_url' => $report->photo_url,
                'photo_urls' => $report->photo_urls,
                'created_at' => $report->created_at,
            ],
        ], 201);
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
