<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PurchaseInvoice extends Model
{
    protected $fillable = ['invoice_no', 'reference_bon', 'supplier_id', 'total_ht', 'total_ttc', 'scan_contract'];

    protected $appends = ['scan_contract_url'];

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
