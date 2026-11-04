<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\HasFrenchDates;

class payments extends Model
{
    use HasFrenchDates;
    protected $fillable = [
        'client_id',
        'bien_id',
        'amount',
        'payment_date',
        'type',
        'method',
        'reference_no',
        'bank_name',
        'receipt_path',
        'bank_commission',
        'notes',
        'status',
        'refund_amount',
        'cheque_status',
        'cheque_deposited_at',
        'cheque_cashed_at',
        'cheque_rejected_at',
        'cheque_reject_reason',
    ];

    protected $casts = [
        'payment_date' => 'date',
        'amount' => 'decimal:2',
    ];

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function bien()
    {
        return $this->belongsTo(Bien::class);
    }
}
