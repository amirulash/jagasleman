<?php

use App\Http\Controllers\AdminIncidentReportController;
use App\Http\Controllers\AdminUserApprovalController;
use App\Http\Controllers\ExternalNewsController;
use App\Http\Controllers\IncidentReportController;
use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Halaman publik JagaSleman
|--------------------------------------------------------------------------
*/
Route::get('/', fn () => Inertia::render('Safekey/Index'));

Route::get('/webgis', fn () => Inertia::render('Safekey/AnalysisDashboard'));

Route::get('/report', fn () => Inertia::render('Safekey/IncidentReport'));
Route::post('/report', [IncidentReportController::class, 'store'])->name('report.store');

Route::get('/statistics', fn () => Inertia::render('Safekey/Statistics'));
Route::get('/news', fn () => Inertia::render('Safekey/News'));
Route::get('/api/external-news', [ExternalNewsController::class, 'index'])->name('external-news.index');
Route::get('/emergency', fn () => Inertia::render('Safekey/Emergency'));
Route::get('/map-dashboard', fn () => Inertia::render('Safekey/MapDashboard'));
Route::get('/street-crime-analysis', fn () => Inertia::render('Safekey/StreetCrimeAnalysis'));

/*
|--------------------------------------------------------------------------
| Login dan Register Safekey
|--------------------------------------------------------------------------
*/
Route::get('/safekey/login', function () {
    if (auth()->check()) {
        return redirect()->route('admin.dashboard');
    }

    return Inertia::render('Safekey/Login');
})->name('safekey.login');

Route::get('/safekey/register', function () {
    if (auth()->check()) {
        return redirect()->route('admin.dashboard');
    }

    return Inertia::render('Safekey/Register');
})->name('safekey.register');

/*
|--------------------------------------------------------------------------
| Area login/admin
|--------------------------------------------------------------------------
*/
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', fn () => redirect()->route('admin.dashboard'))->name('dashboard');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::prefix('admin')->name('admin.')->group(function () {
        Route::get('/dashboard', fn () => Inertia::render('AdminPages/AdminDashboard'))->name('dashboard');
        Route::get('/laporan', fn () => Inertia::render('AdminPages/AdminReports'))->name('laporan');
        Route::get('/peta', fn () => Inertia::render('AdminPages/AdminMap'))->name('peta');
        Route::get('/points', fn () => Inertia::render('AdminPages/AdminPoints'))->name('points');

        /* Route lama tetap disediakan jika masih ada halaman yang memanggilnya. */
        Route::get('/reports', [AdminIncidentReportController::class, 'index'])->name('reports.index');
        Route::patch('/reports/{incidentReport}/status', [AdminIncidentReportController::class, 'updateStatus'])->name('reports.update-status');
        Route::get('/kelola-admin', [AdminUserApprovalController::class, 'index'])->name('users.manage');
        Route::get('/users-approval', [AdminUserApprovalController::class, 'index'])->name('users.index');
        Route::patch('/users-approval/{user}/status', [AdminUserApprovalController::class, 'updateStatus'])->name('users.update-status');
    });
});

require __DIR__.'/auth.php';

Route::fallback(fn () => Inertia::render('Safekey/NotFound'));
