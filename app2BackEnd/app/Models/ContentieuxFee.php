<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ContentieuxFee extends Model
{
    use HasFactory;

    protected $fillable = [
        'contentieux_id',
        'type',
        'category',
        'amount',
        'notes',
        'date'
    ];

    public function contentieux()
    {
        return $this->belongsTo(Contentieux::class);
    }
}
