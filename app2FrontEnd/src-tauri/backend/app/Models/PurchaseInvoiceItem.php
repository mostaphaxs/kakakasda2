<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PurchaseInvoiceItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'purchase_invoice_id', 'article_id', 'qty', 'unit_price', 'vat_rate'
    ];

    protected $appends = ['price_ht', 'price_ttc'];

    public function invoice()
    {
        return $this->belongsTo(PurchaseInvoice::class, 'purchase_invoice_id');
    }

    public function article()
    {
        return $this->belongsTo(Article::class);
    }

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
        static::created(function ($item) {
            static::updateStock($item->qty, $item->article_id);
        });

        static::updated(function ($item) {
            if ($item->wasChanged('qty') || $item->wasChanged('article_id')) {
                // Undo old values
                static::updateStock(-$item->getOriginal('qty'), $item->getOriginal('article_id'));
                // Apply new values
                static::updateStock($item->qty, $item->article_id);
            }
        });

        static::deleted(function ($item) {
            static::updateStock(-$item->qty, $item->article_id);
        });
    }

    protected static function updateStock($adjustment, $articleId)
    {
        $stock = clone StockTracking::firstOrNew(['article_id' => $articleId]);
        // Wait, `clone` is bad if we are saving the actual instance.
        // I will use standard firstOrNew logic.
        $stock = StockTracking::firstOrNew(['article_id' => $articleId]);
        
        $currentInitial = $stock->initial_stock ?? 0;
        $currentConsumed = $stock->consumed_qty ?? 0;

        $stock->initial_stock = $currentInitial + $adjustment;
        $stock->consumed_qty = $currentConsumed;
        $stock->remaining_stock = $stock->initial_stock - $stock->consumed_qty;
        
        $stock->save();
    }
}
