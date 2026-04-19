<?php

use App\Http\Controllers\AdminIncidentReportController;
use App\Http\Controllers\AdminUserApprovalController;
use App\Http\Controllers\IncidentReportController;
use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Safekey/Index');
});

Route::get('/webgis', function () {
    return Inertia::render('Safekey/AnalysisDashboard');
});

Route::get('/report', function () {
    return Inertia::render('Safekey/IncidentReport');
});
Route::post('/report', [IncidentReportController::class, 'store'])->name('report.store');

Route::get('/statistics', function () {
    return Inertia::render('Safekey/Statistics');
});

Route::get('/news', function () {
    return Inertia::render('Safekey/News');
});

Route::get('/emergency', function () {
    return Inertia::render('Safekey/Emergency');
});

Route::get('/map-dashboard', function () {
    return Inertia::render('Safekey/MapDashboard');
});

Route::get('/street-crime-analysis', function () {
    return Inertia::render('Safekey/StreetCrimeAnalysis');
});

Route::get('/safekey/login', function () {
    if (auth()->check()) {
        return redirect()->route('dashboard');
    }

    return Inertia::render('Safekey/Login');
})->name('safekey.login');

Route::get('/safekey/register', function () {
    if (auth()->check()) {
        return redirect()->route('dashboard');
    }

    return Inertia::render('Safekey/Register');
})->name('safekey.register');

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::prefix('admin')->name('admin.')->group(function () {
        Route::get('/reports', [AdminIncidentReportController::class, 'index'])->name('reports.index');
        Route::patch('/reports/{incidentReport}/status', [AdminIncidentReportController::class, 'updateStatus'])->name('reports.update-status');
        Route::get('/users-approval', [AdminUserApprovalController::class, 'index'])->name('users.index');
        Route::patch('/users-approval/{user}/status', [AdminUserApprovalController::class, 'updateStatus'])->name('users.update-status');
    });
});

require __DIR__.'/auth.php';

Route::fallback(function () {
    return Inertia::render('Safekey/NotFound');
});
