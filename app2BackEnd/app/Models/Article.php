<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Article extends Model
{
    protected $fillable = ['category', 'code', 'name', 'unit'];

    protected static function booted()
    {
        static::creating(function ($article) {
            if (empty($article->code)) {
                $prefix = strtoupper(substr($article->category, 0, 1));
                $lastArticle = self::where('category', $article->category)
                    ->orderBy('id', 'desc')
                    ->first();
                
                $nextNumber = 1;
                if ($lastArticle && preg_match('/[A-Z](\d{4})/', $lastArticle->code, $matches)) {
                    $nextNumber = (int)$matches[1] + 1;
                }
                
                $article->code = $prefix . str_pad($nextNumber, 4, '0', STR_PAD_LEFT);
            }
        });
    }

    public function purchaseInvoices()
    {
        return $this->hasMany(PurchaseInvoice::class);
    }

    public function stockTracking()
    {
        return $this->hasOne(StockTracking::class);
    }
}
