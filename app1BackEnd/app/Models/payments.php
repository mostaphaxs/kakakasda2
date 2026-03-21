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
        'notes',
        'status',
        'refund_amount',
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
