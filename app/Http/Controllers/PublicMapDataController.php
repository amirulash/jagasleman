<?php

namespace App\Http\Controllers;

use App\Models\IncidentReport;
use Illuminate\Http\Request;

class PublicMapDataController extends Controller
{
    public function approvedIncidents(Request $request)
    {
        $query = IncidentReport::query()
            ->with('photos')
            ->where('status', 'approved')
            ->whereNotNull('latitude')
            ->whereNotNull('longitude');

        if ($request->filled('incident_type')) {
            $query->where('incident_type', $request->incident_type);
        }

        if ($request->filled('keyword')) {
            $keyword = $request->keyword;

            $query->where(function ($q) use ($keyword) {
                $q->where('incident_type', 'like', "%{$keyword}%")
                    ->orWhere('location', 'like', "%{$keyword}%")
                    ->orWhere('description', 'like', "%{$keyword}%");
            });
        }

        $reports = $query
            ->orderByDesc('created_at')
            ->get();

        $features = $reports->map(function ($report) {
            return [
                'type' => 'Feature',
                'properties' => [
                    'id' => $report->id,
                    'report_code' => 'LAP-' . str_pad($report->id, 4, '0', STR_PAD_LEFT),
                    'title' => $report->title ?? 'Laporan Kejahatan Jalanan',
                    'incident_type' => $report->incident_type,
                    'description' => $report->description,
                    'location' => $report->location,
                    'district' => $report->district,
                    'village' => $report->village,
                    'incident_at' => optional($report->incident_at)->toDateTimeString(),
                    'date' => optional($report->incident_at)->format('Y-m-d'),
                    'time' => optional($report->incident_at)->format('H:i'),
                    'status' => $report->status,
                    'source' => 'report',
                    'photo_url' => $report->photo_url,
                    'photo_urls' => $report->photo_urls,
                    'is_public_report' => true,
                ],
                'geometry' => [
                    'type' => 'Point',
                    'coordinates' => [
                        (float) $report->longitude,
                        (float) $report->latitude,
                    ],
                ],
            ];
        });

        return response()->json([
            'type' => 'FeatureCollection',
            'total' => $features->count(),
            'features' => $features,
        ]);
    }
}
