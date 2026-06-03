<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('incident_report_photos')) {
            return;
        }

        Schema::create('incident_report_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('incident_report_id')
                ->constrained('incident_reports')
                ->cascadeOnDelete();
            $table->string('photo_path');
            $table->string('original_name')->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['incident_report_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('incident_report_photos');
    }
};
