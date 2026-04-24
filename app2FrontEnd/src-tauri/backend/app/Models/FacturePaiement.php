<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FacturePaiement extends Model
{
    protected $fillable = ['facture_id', 'amount', 'bank_commission', 'payment_date', 'method', 'reference_no', 'bank_name', 'notes'];
}
