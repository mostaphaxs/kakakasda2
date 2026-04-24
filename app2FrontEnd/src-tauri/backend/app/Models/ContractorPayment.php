<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
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
        'bank_commission',
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
            // Recalculate total paid from all related payments (Net: Amount - Commission)
            $totalPaid = $payable->payments()->selectRaw('SUM(amount - COALESCE(bank_commission, 0)) as total_net')->value('total_net') ?? 0;
            
            // Only update if the model has a paid_amount column
            if (\Schema::hasColumn($payable->getTable(), 'paid_amount')) {
                $payable->update(['paid_amount' => $totalPaid]);
            }
        }
    }
}
