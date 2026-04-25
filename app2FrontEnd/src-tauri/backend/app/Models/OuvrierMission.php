<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\HasFrenchDates;

class OuvrierMission extends Model
{
    use HasFrenchDates;

    protected $fillable = [
        'ouvrier_id',
        'terrain_id',
        'bien_id',
        'type',
        'start_date',
        'end_date',
        'quantity',
        'unit_price',
        'total_amount',
        'description',
        'status',
    ];

    public function ouvrier()
    {
        return $this->belongsTo(Ouvrier::class);
    }

    public function terrain()
    {
        return $this->belongsTo(Terrain::class);
    }

    public function bien()
    {
        return $this->belongsTo(Bien::class);
    }

    protected static function booted()
    {
        static::saving(function ($mission) {
            $mission->total_amount = $mission->quantity * $mission->unit_price;
        });

        static::saved(function ($mission) {
            $mission->ouvrier?->update([
                'total_earned' => $mission->ouvrier->missions()->sum('total_amount')
            ]);
        });

        static::deleted(function ($mission) {
            $mission->ouvrier?->update([
                'total_earned' => $mission->ouvrier->missions()->sum('total_amount')
            ]);
        });
    }
}
