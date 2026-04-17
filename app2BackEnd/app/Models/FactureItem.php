<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FactureItem extends Model
{
    protected $fillable = [
        'facture_id',
        'designation',
        'qty',
        'unit_price',
        'vat_rate',
        'total_ht',
        'total_ttc',
    ];

    public function facture()
    {
        return $this->belongsTo(Facture::class);
    }
}
