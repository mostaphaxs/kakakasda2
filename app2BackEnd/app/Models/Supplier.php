<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Supplier extends Model
{
    protected $fillable = [
        'nom_societe',
        'type_entreprise',
        'nom_gerant',
        'adresse',
        'tel',
        'ice',
        'if',
        'rc',
        'scan_contrat',
        'description'
    ];

    public function guaranteeChecks()
    {
        return $this->hasMany(GuaranteeCheck::class);
    }

    public function purchaseInvoices()
    {
        return $this->hasMany(PurchaseInvoice::class);
    }

    public function generalWorks()
    {
        return $this->hasMany(GeneralWork::class);
    }
}
