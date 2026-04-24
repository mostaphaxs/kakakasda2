<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class annex_units extends Model
{
    protected $fillable = [
        'bien_id',
        'type',
        'prix',
    ];

    public function bien()
    {
        return $this->belongsTo(Bien::class);
    }
}
