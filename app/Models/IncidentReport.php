<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'user_id',
    'title',
    'incident_type',
    'description',
    'location',
    'incident_at',
    'status',
    'reviewed_by',
    'reviewed_at',
    'rejection_reason',
])]
class IncidentReport extends Model
{
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    protected function casts(): array
    {
        return [
            'incident_at' => 'datetime',
            'reviewed_at' => 'datetime',
        ];
    }
}
