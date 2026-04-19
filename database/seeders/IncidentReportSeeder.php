<?php

namespace Database\Seeders;

use App\Models\IncidentReport;
use App\Models\User;
use Illuminate\Database\Seeder;

class IncidentReportSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $admin = User::where('email', 'admin@jagasleman.test')->first();

        IncidentReport::query()->delete();

        IncidentReport::create([
            'title' => 'Pencurian kendaraan di parkiran minimarket',
            'incident_type' => 'Pencurian',
            'description' => 'Terjadi pencurian motor sekitar pukul 22.00 WIB.',
            'location' => 'Depok, Sleman',
            'incident_at' => now()->subDay(),
            'status' => 'pending',
        ]);

        IncidentReport::create([
            'title' => 'Tawuran antar kelompok pemuda',
            'incident_type' => 'Tawuran',
            'description' => 'Terjadi keributan di jalan kampung dan sudah ditangani.',
            'location' => 'Mlati, Sleman',
            'incident_at' => now()->subDays(2),
            'status' => 'approved',
            'reviewed_by' => $admin?->id,
            'reviewed_at' => now()->subDay(),
        ]);

        IncidentReport::create([
            'title' => 'Laporan tidak valid tanpa bukti',
            'incident_type' => 'Lainnya',
            'description' => 'Laporan tidak menyertakan informasi kejadian yang cukup.',
            'location' => 'Ngaglik, Sleman',
            'incident_at' => now()->subDays(3),
            'status' => 'rejected',
            'reviewed_by' => $admin?->id,
            'reviewed_at' => now()->subDays(2),
            'rejection_reason' => 'Data laporan tidak lengkap dan tidak dapat diverifikasi.',
        ]);
    }
}
