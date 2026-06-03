<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('incident_reports', function (Blueprint $table) {
            if (!Schema::hasColumn('incident_reports', 'report_code')) {
                $table->string('report_code')->nullable()->unique()->after('id');
            }

            if (!Schema::hasColumn('incident_reports', 'district')) {
                $table->string('district')->nullable()->after('location');
            }

            if (!Schema::hasColumn('incident_reports', 'village')) {
                $table->string('village')->nullable()->after('district');
            }

            if (!Schema::hasColumn('incident_reports', 'admin_note')) {
                $table->text('admin_note')->nullable()->after('rejection_reason');
            }
        });
    }

    public function down(): void
    {
        Schema::table('incident_reports', function (Blueprint $table) {
            if (Schema::hasColumn('incident_reports', 'admin_note')) {
                $table->dropColumn('admin_note');
            }

            if (Schema::hasColumn('incident_reports', 'village')) {
                $table->dropColumn('village');
            }

            if (Schema::hasColumn('incident_reports', 'district')) {
                $table->dropColumn('district');
            }

            if (Schema::hasColumn('incident_reports', 'report_code')) {
                $table->dropUnique(['report_code']);
                $table->dropColumn('report_code');
            }
        });
    }
};
