<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\IncidentReport;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class IncidentReportAdminController extends Controller
{
    public function index(Request $request)
    {
        $this->authorizeAdmin($request);

        $query = IncidentReport::query()
            ->with('photos')
            ->orderByDesc('created_at');

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('incident_type') && $request->incident_type !== 'all') {
            $query->where('incident_type', $request->incident_type);
        }

        if ($request->filled('keyword')) {
            $keyword = $request->keyword;

            $query->where(function ($q) use ($keyword) {
                $q->where('reporter_name', 'like', "%{$keyword}%")
                    ->orWhere('reporter_email', 'like', "%{$keyword}%")
                    ->orWhere('reporter_phone', 'like', "%{$keyword}%")
                    ->orWhere('title', 'like', "%{$keyword}%")
                    ->orWhere('incident_type', 'like', "%{$keyword}%")
                    ->orWhere('description', 'like', "%{$keyword}%")
                    ->orWhere('location', 'like', "%{$keyword}%");
            });
        }

        $reports = $query->paginate(
            perPage: (int) $request->get('per_page', 10)
        );

        return response()->json([
            'message' => 'Daftar laporan berhasil dimuat.',
            'data' => collect($reports->items())->map(fn (IncidentReport $report) => $this->formatReport($report))->values(),
            'meta' => [
                'current_page' => $reports->currentPage(),
                'last_page' => $reports->lastPage(),
                'per_page' => $reports->perPage(),
                'total' => $reports->total(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'reporter_name' => ['nullable', 'string', 'max:150'],
            'reporter_email' => ['nullable', 'email', 'max:150'],
            'reporter_phone' => ['nullable', 'string', 'max:50'],
            'title' => ['nullable', 'string', 'max:255'],
            'incident_type' => [
                'required',
                'string',
                Rule::in([
                    'PENGEROYOKAN',
                    'PENGRUSAKAN',
                    'PENGANIAYAAN',
                    'PENYALAHGUNAAN SENJATA TAJAM',
                    'PENCURIAN DENGAN KEKERASAN (CURAS)',
                    'PEMERASAN DAN PENGANCAMAN',
                ]),
            ],
            'description' => ['required', 'string', 'max:3000'],
            'location' => ['required', 'string', 'max:1000'],
            'district' => ['nullable', 'string', 'max:100'],
            'village' => ['nullable', 'string', 'max:100'],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'incident_at' => ['required', 'date'],
            'status' => ['required', Rule::in([
                IncidentReport::STATUS_PENDING,
                IncidentReport::STATUS_APPROVED,
                IncidentReport::STATUS_REJECTED,
            ])],
            'admin_note' => ['nullable', 'string', 'max:1000'],
        ]);

        $status = $validated['status'];

        $report = IncidentReport::create([
            'user_id' => $request->user()?->id,
            'reporter_name' => $validated['reporter_name'] ?? 'Admin JagaSleman',
            'reporter_email' => $validated['reporter_email'] ?? null,
            'reporter_phone' => $validated['reporter_phone'] ?? null,
            'title' => $validated['title'] ?: 'Laporan ' . $validated['incident_type'],
            'incident_type' => $validated['incident_type'],
            'description' => $validated['description'],
            'location' => $validated['location'],
            'district' => $validated['district'] ?? null,
            'village' => $validated['village'] ?? null,
            'latitude' => $validated['latitude'],
            'longitude' => $validated['longitude'],
            'incident_at' => $validated['incident_at'],
            'status' => $status,
            'reviewed_by' => $status === IncidentReport::STATUS_PENDING ? null : $request->user()?->id,
            'reviewed_at' => $status === IncidentReport::STATUS_PENDING ? null : now(),
            'rejection_reason' => $status === IncidentReport::STATUS_REJECTED ? ($validated['admin_note'] ?? 'Ditolak oleh admin.') : null,
            'admin_note' => $validated['admin_note'] ?? null,
        ]);

        return response()->json([
            'message' => 'Laporan dari admin berhasil dibuat.',
            'data' => $report->fresh(['photos']),
        ], 201);
    }

    public function show(Request $request, IncidentReport $incidentReport)
    {
        $this->authorizeAdmin($request);

        return response()->json([
            'message' => 'Detail laporan berhasil dimuat.',
            'data' => $this->formatReport($incidentReport->load('photos')),
        ]);
    }

    public function approve(Request $request, IncidentReport $incidentReport)
    {
        $this->authorizeAdmin($request);

        $incidentReport->update([
            'status' => 'approved',
            'reviewed_by' => Auth::id(),
            'reviewed_at' => now(),
            'rejection_reason' => null,
        ]);

        return response()->json([
            'message' => 'Laporan berhasil disetujui dan akan tampil di peta publik.',
            'data' => $this->formatReport($incidentReport->fresh()->load('photos')),
        ]);
    }

    public function reject(Request $request, IncidentReport $incidentReport)
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'rejection_reason' => ['required', 'string', 'max:1000'],
        ], [
            'rejection_reason.required' => 'Alasan penolakan wajib diisi.',
        ]);

        $incidentReport->update([
            'status' => 'rejected',
            'reviewed_by' => Auth::id(),
            'reviewed_at' => now(),
            'rejection_reason' => $validated['rejection_reason'],
        ]);

        return response()->json([
            'message' => 'Laporan berhasil ditolak dan tidak tampil di peta publik.',
            'data' => $this->formatReport($incidentReport->fresh()->load('photos')),
        ]);
    }

    public function updateStatus(Request $request, IncidentReport $incidentReport)
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'status' => ['required', Rule::in(['pending', 'approved', 'rejected'])],
            'rejection_reason' => ['nullable', 'string', 'max:1000'],
        ]);

        if ($validated['status'] === 'rejected' && empty($validated['rejection_reason'])) {
            return response()->json([
                'message' => 'Alasan penolakan wajib diisi jika laporan ditolak.',
                'errors' => [
                    'rejection_reason' => ['Alasan penolakan wajib diisi.'],
                ],
            ], 422);
        }

        $incidentReport->update([
            'status' => $validated['status'],
            'reviewed_by' => Auth::id(),
            'reviewed_at' => now(),
            'rejection_reason' => $validated['status'] === 'rejected'
                ? $validated['rejection_reason']
                : null,
        ]);

        return response()->json([
            'message' => 'Status laporan berhasil diperbarui.',
            'data' => $this->formatReport($incidentReport->fresh()->load('photos')),
        ]);
    }


    public function update(Request $request, IncidentReport $incidentReport)
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'title' => ['nullable', 'string', 'max:255'],
            'incident_type' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'location' => ['required', 'string', 'max:500'],
            'district' => ['nullable', 'string', 'max:255'],
            'village' => ['nullable', 'string', 'max:255'],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'incident_at' => ['nullable', 'date'],
            'status' => ['nullable', Rule::in(['pending', 'approved', 'rejected'])],
            'admin_note' => ['nullable', 'string', 'max:2000'],
        ]);

        $newStatus = $validated['status'] ?? $incidentReport->status;

        if ($newStatus === 'rejected' && empty($incidentReport->rejection_reason)) {
            return response()->json([
                'message' => 'Data tidak bisa diubah ke status ditolak tanpa alasan penolakan.',
            ], 422);
        }

        $incidentReport->update([
            'title' => $validated['title'] ?? $incidentReport->title,
            'incident_type' => $validated['incident_type'],
            'description' => $validated['description'] ?? null,
            'location' => $validated['location'],
            'district' => $validated['district'] ?? null,
            'village' => $validated['village'] ?? null,
            'latitude' => $validated['latitude'],
            'longitude' => $validated['longitude'],
            'incident_at' => $validated['incident_at'] ?? null,
            'status' => $newStatus,
            'reviewed_by' => Auth::id(),
            'reviewed_at' => now(),
            'admin_note' => $validated['admin_note'] ?? $incidentReport->admin_note,
            'rejection_reason' => $newStatus === 'rejected'
                ? $incidentReport->rejection_reason
                : null,
        ]);

        return response()->json([
            'message' => 'Data titik laporan berhasil diperbarui.',
            'data' => $this->formatReport($incidentReport->fresh()->load('photos')),
        ]);
    }
    public function destroy(Request $request, IncidentReport $incidentReport)
    {
        $this->authorizeAdmin($request);

        $incidentReport->load('photos');

        $paths = $incidentReport->photos
            ->pluck('photo_path')
            ->filter()
            ->values()
            ->all();

        if ($incidentReport->photo_path) {
            $paths[] = $incidentReport->photo_path;
        }

        $paths = array_values(array_unique(array_filter($paths)));
        $reportCode = $incidentReport->report_code ?: 'LAP-' . str_pad((string) $incidentReport->id, 4, '0', STR_PAD_LEFT);

        DB::transaction(function () use ($incidentReport) {
            $incidentReport->delete();
        });

        if (!empty($paths)) {
            Storage::disk('public')->delete($paths);
        }

        return response()->json([
            'message' => "Laporan {$reportCode} berhasil dihapus permanen dan otomatis hilang dari peta.",
        ]);
    }

    private function authorizeAdmin(Request $request): void
    {
        abort_unless($request->user()?->isAdmin(), 403, 'Akses hanya untuk admin.');
    }

    private function formatReport(IncidentReport $report): array
    {
        $report->loadMissing('photos');

        return [
            'id' => $report->id,
            'user_id' => $report->user_id,
            'report_code' => $report->report_code ?: 'LAP-' . str_pad((string) $report->id, 4, '0', STR_PAD_LEFT),
            'reporter_name' => $report->reporter_name,
            'reporter_email' => $report->reporter_email,
            'reporter_phone' => $report->reporter_phone,
            'title' => $report->title,
            'incident_type' => $report->incident_type,
            'description' => $report->description,
            'photo_path' => $report->photo_path,
            'photo_url' => $report->photo_url,
            'photo_urls' => $report->photo_urls,
            'photos' => $report->photos->map(fn ($photo) => [
                'id' => $photo->id,
                'photo_path' => $photo->photo_path,
                'photo_url' => $photo->photo_url,
                'original_name' => $photo->original_name,
                'sort_order' => $photo->sort_order,
            ])->values(),
            'location' => $report->location,
            'district' => $report->district,
            'village' => $report->village,
            'latitude' => $report->latitude,
            'longitude' => $report->longitude,
            'incident_at' => optional($report->incident_at)->toDateTimeString(),
            'status' => $report->status,
            'reviewed_by' => $report->reviewed_by,
            'reviewed_at' => optional($report->reviewed_at)->toDateTimeString(),
            'rejection_reason' => $report->rejection_reason,
            'admin_note' => $report->admin_note,
            'created_at' => optional($report->created_at)->toDateTimeString(),
            'updated_at' => optional($report->updated_at)->toDateTimeString(),
        ];
    }
}
