<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class milestones extends Model
{
    protected $fillable = [
        'terrain_id',
        'label',
        'due_date',
        'is_completed',
    ];

    protected $casts = [
        'is_completed' => 'boolean',
        'due_date' => 'date',
    ];

    public function terrain()
    {
        return $this->belongsTo(Terrain::class);
    }
}
