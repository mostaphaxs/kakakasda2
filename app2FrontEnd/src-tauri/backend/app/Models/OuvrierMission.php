<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\HasFrenchDates;

class OuvrierMission extends Model
{
    use HasFrenchDates;

    protected $fillable = [
        'ouvrier_id',
        'partner_id',
        'terrain_id',
        'bien_id',
        'type',
        'start_date',
        'end_date',
        'quantity',
        'unit_price',
        'total_amount',
        'description',
        'partner_name',
        'partner_share',
        'status',
    ];

    public function ouvrier()
    {
        return $this->belongsTo(Ouvrier::class);
    }

    public function partner()
    {
        return $this->belongsTo(Ouvrier::class, 'partner_id');
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
            static::updateBalances($mission);
        });

        static::deleted(function ($mission) {
            static::updateBalances($mission);
        });
    }

    public static function updateBalances($mission)
    {
        if ($mission->ouvrier_id) {
            static::calculateOuvrierEarned($mission->ouvrier_id);
        }
        if ($mission->partner_id) {
            static::calculateOuvrierEarned($mission->partner_id);
        }
    }

    public static function calculateOuvrierEarned($ouvrierId)
    {
        $ouvrier = \App\Models\Ouvrier::find($ouvrierId);
        if (!$ouvrier) return;

        $asMain = static::where('ouvrier_id', $ouvrierId)->get()->sum(function($m) {
            return $m->total_amount - $m->partner_share;
        });
        
        $asPartner = static::where('partner_id', $ouvrierId)->sum('partner_share');

        $ouvrier->update([
            'total_earned' => $asMain + $asPartner
        ]);
    }
}
