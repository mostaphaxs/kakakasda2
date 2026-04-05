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

    protected static function booted()
    {
        static::saved(function ($payment) {
            $payment->syncPayablePaidAmount();
        });

        static::deleted(function ($payment) {
            $payment->syncPayablePaidAmount();
        });
    }

    public function syncPayablePaidAmount()
    {
        $payable = $this->payable;
        if ($payable && (method_exists($payable, 'payments'))) {
            // Recalculate total paid from all related payments
            $totalPaid = $payable->payments()->sum('amount');
            
            // Only update if the model has a paid_amount column
            if (\Schema::hasColumn($payable->getTable(), 'paid_amount')) {
                $payable->update(['paid_amount' => $totalPaid]);
            }
        }
    }
}
