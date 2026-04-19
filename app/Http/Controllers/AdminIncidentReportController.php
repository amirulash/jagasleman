<?php

namespace App\Http\Controllers;

use App\Models\IncidentReport;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminIncidentReportController extends Controller
{
    public function index(Request $request): Response
    {
        abort_unless($request->user()?->isAdmin(), 403);

        $reports = IncidentReport::query()
            ->with(['user:id,name,email', 'reviewer:id,name,email'])
            ->latest()
            ->get();

        return Inertia::render('Admin/Reports', [
            'reports' => $reports,
        ]);
    }

    public function updateStatus(Request $request, IncidentReport $incidentReport): RedirectResponse
    {
        abort_unless($request->user()?->isAdmin(), 403);

        $validated = $request->validate([
            'status' => ['required', 'in:approved,rejected'],
            'rejection_reason' => ['nullable', 'string', 'max:1000'],
        ]);

        if ($validated['status'] === 'rejected' && blank($validated['rejection_reason'] ?? null)) {
            return back()->withErrors([
                'rejection_reason' => 'Alasan penolakan wajib diisi saat menolak laporan.',
            ]);
        }

        $incidentReport->update([
            'status' => $validated['status'],
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
            'rejection_reason' => $validated['status'] === 'rejected' ? $validated['rejection_reason'] : null,
        ]);

        return back()->with('success', 'Status laporan berhasil diperbarui.');
    }
}
