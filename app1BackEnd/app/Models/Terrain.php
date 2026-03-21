<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\HasFrenchDates;

class Terrain extends Model
{
    use HasFrenchDates;
    protected $fillable = [
        'nom_terrain',
        'nom_projet',
        'numero_TF',
        'cout_global',
        'frais_enregistrement',
        'frais_immatriculation',
        'honoraires_notaire',
        'autorisation_construction',
        'autorisation_equipement',
        'frais_pompier',
        'frais_autorisation_intermediaire',
        'total',
    ];

    protected $casts = [
        'autorisation_construction' => 'float',
        'autorisation_equipement'  => 'float',
        'frais_pompier'             => 'float',
        'frais_autorisation_intermediaire' => 'float',
        'nom_terrain'               => 'string',
        'nom_projet'                => 'string',
        'numero_TF'                 => 'string',
        'cout_global'               => 'float',
        'frais_enregistrement'      => 'float',
        'frais_immatriculation'     => 'float',
        'honoraires_notaire'        => 'float',
        'total'                     => 'float',
    ];

    public function biens()
    {
        return $this->hasMany(Bien::class);
    }

    public function intervenants()
    {
        return $this->hasMany(Intervenant::class);
    }

    public function contractors()
    {
        return $this->hasMany(Contractor::class);
    }

    public function charges()
    {
        return $this->hasMany(Charge::class);
    }
}
