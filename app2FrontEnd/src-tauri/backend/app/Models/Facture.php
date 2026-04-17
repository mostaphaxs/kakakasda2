<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Facture extends Model
{
    protected $fillable = [
        'invoice_no',
        'date',
        'client_name',
        'client_address',
        'client_ice',
        'client_if',
        'client_rc',
        'supplier_name',
        'supplier_address',
        'supplier_ice',
        'supplier_if',
        'supplier_rc',
        'bank_name',
        'bank_account',
        'payment_method',
        'cheque_number',
        'cheque_bank',
        'description',
        'total_ht',
        'total_tva',
        'total_ttc',
    ];

    public function items()
    {
        return $this->hasMany(FactureItem::class);
    }
}
