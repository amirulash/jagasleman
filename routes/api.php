<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\PublicIncidentReportController;
use App\Http\Controllers\PublicIncidentReportStatusController;
use App\Http\Controllers\PublicMapDataController;
use App\Http\Controllers\Admin\IncidentReportAdminController;
use App\Http\Controllers\Api\StatisticsController;
use App\Http\Controllers\IncidentReportController;

Route::get('/statistics', [StatisticsController::class, 'index']);

Route::post('/incident-reports', [PublicIncidentReportController::class, 'store'])
    ->name('api.incident-reports.store');

Route::get('/incident-reports/status', [PublicIncidentReportStatusController::class, 'lookup'])
    ->name('api.incident-reports.status');

Route::get('/map/incidents', [PublicMapDataController::class, 'approvedIncidents'])
    ->name('api.map.incidents');

Route::get('/map/statistics', [PublicMapDataController::class, 'statistics'])
    ->name('api.map.statistics');

/*
|--------------------------------------------------------------------------
| Admin API
|--------------------------------------------------------------------------
| Endpoint admin diproteksi memakai session auth Laravel + verifikasi akun.
| Controller juga mengecek role admin, sehingga user biasa tidak bisa
| approve, reject, edit, atau menghapus data laporan masyarakat.
*/
Route::middleware(['web', 'auth', 'verified'])
    ->prefix('admin')
    ->group(function () {
        Route::post('/incident-reports', [IncidentReportAdminController::class, 'store']);
        Route::get('/incident-reports', [IncidentReportAdminController::class, 'index']);
        Route::get('/incident-reports/{incidentReport}', [IncidentReportAdminController::class, 'show']);
        Route::patch('/incident-reports/{incidentReport}', [IncidentReportAdminController::class, 'update']);
        Route::patch('/incident-reports/{incidentReport}/approve', [IncidentReportAdminController::class, 'approve']);
        Route::patch('/incident-reports/{incidentReport}/reject', [IncidentReportAdminController::class, 'reject']);
        Route::patch('/incident-reports/{incidentReport}/status', [IncidentReportAdminController::class, 'updateStatus']);
        Route::delete('/incident-reports/{incidentReport}', [IncidentReportAdminController::class, 'destroy']);
    });

Route::get('/report-incidents/map', [IncidentReportController::class, 'mapData']);
