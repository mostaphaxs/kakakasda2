<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PurchaseInvoice extends Model
{
    protected $fillable = ['invoice_no', 'supplier_id', 'article_id', 'qty', 'unit_price', 'vat_rate'];

    protected $appends = ['price_ht', 'price_ttc'];

    public function getPriceHtAttribute()
    {
        return $this->qty * $this->unit_price;
    }

    public function getPriceTtcAttribute()
    {
        return $this->price_ht * (1 + $this->vat_rate / 100);
    }

    protected static function booted()
    {
        static::created(function ($invoice) {
            $stock = StockTracking::firstOrNew(['article_id' => $invoice->article_id]);
            $stock->initial_stock += $invoice->qty;
            $stock->remaining_stock = $stock->initial_stock - $stock->consumed_qty;
            $stock->save();
        });
    }

    public function article()
    {
        return $this->belongsTo(Article::class);
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }
}
