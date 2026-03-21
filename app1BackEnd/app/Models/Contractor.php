<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Contractor extends Model
{
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

    protected $casts = [
        'montant_global' => 'decimal:2',
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
