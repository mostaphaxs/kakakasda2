<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\HasFrenchDates;

class Client extends Model
{
    use HasFrenchDates;
    protected $fillable = [
        'nom',
        'prenom',
        'cin',
        'tel',
        'tel_2',
        'email',
        'adresse',
        'date_reservation',
        'scanned_docs',
        'avec_finition',
        'avec_contrat',
        'scan_contrat',
        'observation',
        'statut',
        'statut_choix',
    ];



    protected $casts = [
        'scanned_docs' => 'array',
        'date_reservation' => 'date',
        'statut' => 'string',
    ];


    public function biens()
    {
        return $this->belongsToMany(Bien::class);
    }

    public function payments()
    {
        return $this->hasMany(payments::class, 'client_id');
    }
}
