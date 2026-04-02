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
            static::updateStock($invoice->qty, $invoice->article_id);
        });

        static::updated(function ($invoice) {
            if ($invoice->wasChanged('qty') || $invoice->wasChanged('article_id')) {
                // Undo old values
                static::updateStock(-$invoice->getOriginal('qty'), $invoice->getOriginal('article_id'));
                // Apply new values
                static::updateStock($invoice->qty, $invoice->article_id);
            }
        });

        static::deleted(function ($invoice) {
            static::updateStock(-$invoice->qty, $invoice->article_id);
        });
    }

    protected static function updateStock($adjustment, $articleId)
    {
        $stock = StockTracking::firstOrNew(['article_id' => $articleId]);
        $stock->initial_stock += $adjustment;
        $stock->remaining_stock = $stock->initial_stock - $stock->consumed_qty;
        $stock->save();
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
