<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\HasFrenchDates;

class Ouvrier extends Model
{
    use HasFrenchDates;

    protected $fillable = [
        'name',
        'cin',
        'speciality',
        'phone',
        'scan_cin',
        'total_earned',
        'paid_amount',
        'rib',
    ];

    public function missions()
    {
        return $this->hasMany(OuvrierMission::class);
    }

    public function payments()
    {
        return $this->morphMany(ContractorPayment::class, 'payable');
    }
}
