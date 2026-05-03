<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\HasFrenchDates;

class Charge extends Model
{
    use HasFrenchDates;

    protected $fillable = [
        'loyer_bureau', 'loyer_bureau_ref', 'loyer_bureau_scan',
        'fournitures_bureau', 'fournitures_bureau_ref', 'fournitures_bureau_scan',
        'employes_bureau', 'employes_bureau_ref', 'employes_bureau_scan',
        'impots', 'impots_ref', 'impots_scan',
        'gasoil', 'gasoil_ref', 'gasoil_scan',
        'periode',
        'terrain_id',
        'rib',
    ];

    protected $casts = [
        'periode' => 'date',
    ];

    public function terrain()
    {
        return $this->belongsTo(Terrain::class);
    }
}
