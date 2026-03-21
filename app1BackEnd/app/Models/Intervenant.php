<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\HasFrenchDates;

class Intervenant extends Model
{
    use HasFrenchDates;
    protected $fillable = [
        'categorie',
        'nom_societe',
        'nom_gerant',
        'adresse',
        'tel',
        'if',
        'ice',
        'rc',
        'montant_global',
        'scan_contrat',
        'description',
        'terrain_id',
    ];

    public function payments()
    {
        return $this->morphMany(ContractorPayment::class, 'payable');
    }

    public function terrain()
    {
        return $this->belongsTo(Terrain::class);
    }
}
