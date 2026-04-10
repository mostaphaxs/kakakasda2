<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\HasFrenchDates;

class Charge extends Model
{
    use HasFrenchDates;
    protected $fillable = [
        'frais_tel',
        'internet',
        'loyer_bureau',
        'fournitures_bureau',
        'employes_bureau',
        'impots',
        'gasoil',
        'periode',
        'terrain_id',
    ];

    protected $casts = [
        'periode' => 'date',
    ];

    public function terrain()
    {
        return $this->belongsTo(Terrain::class);
    }
}
