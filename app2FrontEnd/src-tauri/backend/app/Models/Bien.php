<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Traits\HasFrenchDates;

class Bien extends Model
{
    use HasFrenchDates;

    protected $appends = ['finition_pourcentage'];
    protected $fillable = [
        'terrain_id',
        'nom',
        'type_bien',
        'groupe_habitation',
        'immeuble',
        'etage',
        'num_appartement',
        'surface_m2',
        'description',
        'statut',
        'prix_par_m2_finition',
        'prix_global_finition',
        'prix_par_m2_non_finition',
        'prix_global_non_finition',
        'document_path',
        'gros_oeuvre_pourcentage',
    ];

    public function terrain()
    {
        return $this->belongsTo(Terrain::class);
    }

    public function annexUnits()
    {
        return $this->hasMany(annex_units::class, 'bien_id');
    }

    public function suiviFinition()
    {
        return $this->hasMany(SuiviFinition::class, 'bien_id');
    }

    /**
     * Get the construction history entries.
     */
    public function suiviHistorique(): HasMany
    {
        return $this->hasMany(SuiviHistorique::class);
    }

    public function clients()
    {
        return $this->belongsToMany(Client::class);
    }

    /**
     * Accessor for finition percentage.
     */
    public function getFinitionPourcentageAttribute(): int
    {
        $items = $this->suiviFinition;
        if ($items->isEmpty()) {
            return 0;
        }
        $checked = $items->filter(fn($i) => $i->checked)->count();
        return (int) round(($checked / $items->count()) * 100);
    }
}
