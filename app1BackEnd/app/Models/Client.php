<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\HasFrenchDates;

class Client extends Model
{
    use HasFrenchDates;
    protected $fillable = [
        'bien_id',
        'nom',
        'prenom',
        'cin',
        'tel',
        'date_reservation',
        'scanned_docs',
        'avec_finition',
    ];

    protected $casts = [
        'scanned_docs' => 'array',
        'date_reservation' => 'date',
    ];

    public function bien()
    {
        return $this->belongsTo(Bien::class);
    }

    public function payments()
    {
        return $this->hasMany(payments::class, 'client_id');
    }
}
