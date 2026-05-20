<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ContentieuxMouvement extends Model
{
    use HasFactory;

    protected $table = 'contentieux_mouvements';

    protected $fillable = [
        'contentieux_id',
        'stage',
        'date',
        'description',
        'next_date'
    ];

    public function contentieux()
    {
        return $this->belongsTo(Contentieux::class);
    }
}
