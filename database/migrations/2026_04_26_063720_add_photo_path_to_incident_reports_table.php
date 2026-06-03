<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('incident_reports', function (Blueprint $table) {
            if (!Schema::hasColumn('incident_reports', 'photo_path')) {
                $table->string('photo_path')->nullable()->after('description');
            }
        });
    }

    public function down(): void
    {
        Schema::table('incident_reports', function (Blueprint $table) {
            if (Schema::hasColumn('incident_reports', 'photo_path')) {
                $table->dropColumn('photo_path');
            }
        });
    }
};
