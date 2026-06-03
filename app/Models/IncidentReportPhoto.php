<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IncidentReportPhoto extends Model
{
    use HasFactory;

    protected $fillable = [
        'incident_report_id',
        'photo_path',
        'original_name',
        'sort_order',
    ];

    protected $casts = [
        'sort_order' => 'integer',
    ];

    protected $appends = [
        'photo_url',
    ];

    public function incidentReport(): BelongsTo
    {
        return $this->belongsTo(IncidentReport::class);
    }

    public function getPhotoUrlAttribute(): ?string
    {
        if (!$this->photo_path) {
            return null;
        }

        if (str_starts_with($this->photo_path, 'http://') || str_starts_with($this->photo_path, 'https://')) {
            return $this->photo_path;
        }

        return asset('storage/' . ltrim($this->photo_path, '/'));
    }
}
