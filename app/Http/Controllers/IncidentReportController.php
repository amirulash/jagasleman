<?php

namespace App\Http\Controllers;

use App\Models\IncidentReport;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class IncidentReportController extends Controller
{
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
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
        ]);

        $reporterName = $isAuthenticated ? $request->user()->name : $validated['name'];
        $reporterEmail = $isAuthenticated ? $request->user()->email : $validated['email'];

        IncidentReport::create([
            'user_id' => $request->user()?->id,
            'reporter_name' => $reporterName,
            'reporter_email' => $reporterEmail,
            'reporter_phone' => $validated['phone'] ?? null,
            'title' => 'Laporan ' . $validated['type'] . ' oleh ' . $reporterName,
            'incident_type' => $validated['type'],
            'description' => $validated['description'],
            'location' => number_format((float) $validated['latitude'], 5, '.', '') . ', ' . number_format((float) $validated['longitude'], 5, '.', ''),
            'latitude' => $validated['latitude'],
            'longitude' => $validated['longitude'],
            'incident_at' => $validated['time'],
            'status' => 'pending',
        ]);

        return back()->with('success', 'Laporan berhasil dikirim dan menunggu persetujuan admin.');
    }
}
