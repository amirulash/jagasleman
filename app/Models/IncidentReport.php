<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class IncidentReport extends Model
{
    use HasFactory;

    public const STATUS_PENDING = 'pending';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_REJECTED = 'rejected';

    protected $fillable = [
        'user_id',
        'report_code',
        'reporter_name',
        'reporter_email',
        'reporter_phone',
        'title',
        'incident_type',
        'description',
        'photo_path',
        'location',
        'district',
        'village',
        'latitude',
        'longitude',
        'incident_at',
        'status',
        'reviewed_by',
        'reviewed_at',
        'rejection_reason',
        'admin_note',
    ];

    protected $casts = [
        'incident_at' => 'datetime',
        'reviewed_at' => 'datetime',
        'latitude' => 'decimal:7',
        'longitude' => 'decimal:7',
    ];

    protected $appends = [
        'photo_url',
        'photo_urls',
        'public_code',
        'status_label',
    ];

    protected static function booted(): void
    {
        static::created(function (IncidentReport $report) {
            if (!$report->report_code) {
                $report->forceFill([
                    'report_code' => 'LAP-' . str_pad((string) $report->id, 4, '0', STR_PAD_LEFT),
                ])->saveQuietly();
            }
        });
    }

    public function getPublicCodeAttribute(): string
    {
        return $this->report_code ?: 'LAP-' . str_pad((string) $this->id, 4, '0', STR_PAD_LEFT);
    }

    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            self::STATUS_APPROVED => 'Disetujui',
            self::STATUS_REJECTED => 'Ditolak',
            default => 'Menunggu Verifikasi',
        };
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function photos(): HasMany
    {
        return $this->hasMany(IncidentReportPhoto::class)->orderBy('sort_order')->orderBy('id');
    }

    public function getPhotoUrlAttribute(): ?string
    {
        $urls = $this->getPhotoUrlsAttribute();

        return $urls[0] ?? null;
    }

    public function getPhotoUrlsAttribute(): array
    {
        $urls = [];

        $photos = $this->relationLoaded('photos')
            ? $this->photos
            : $this->photos()->get();

        foreach ($photos as $photo) {
            if ($photo->photo_url) {
                $urls[] = $photo->photo_url;
            }
        }

        if ($this->photo_path) {
            $urls[] = $this->makePhotoUrl($this->photo_path);
        }

        return array_values(array_unique(array_filter($urls)));
    }

    private function makePhotoUrl(string $path): string
    {
        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }

        return asset('storage/' . ltrim($path, '/'));
    }
}
