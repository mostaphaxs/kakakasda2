<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PurchaseInvoice extends Model
{
    protected $fillable = ['invoice_no', 'reference_bon', 'supplier_id', 'total_ht', 'total_ttc', 'paid_amount', 'scan_contract', 'terrain_id'];

    public function terrain()
    {
        return $this->belongsTo(Terrain::class);
    }

    public function payments()
    {
        return $this->morphMany(ContractorPayment::class, 'payable');
    }

    protected $appends = ['scan_contract_url', 'balance'];

    public function getBalanceAttribute()
    {
        return $this->total_ttc - $this->paid_amount;
    }

    public function getScanContractUrlAttribute()
    {
        return $this->scan_contract ? '/storage/' . $this->scan_contract : null;
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function items()
    {
        return $this->hasMany(PurchaseInvoiceItem::class);
    }
}
