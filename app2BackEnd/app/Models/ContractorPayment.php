<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\HasFrenchDates;

class ContractorPayment extends Model
{
    use HasFrenchDates;
    protected $fillable = [
        'payable_id',
        'payable_type',
        'amount',
        'payment_date',
        'method',
        'reference_no',
        'bank_name',
        'scan_path',
        'notes',
    ];

    public function payable()
    {
        return $this->morphTo();
    }
}
