<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PurchaseLine extends Model
{
    protected $fillable = [
        'purchase_id',
        'article_id',
        'designation',
        'prix_unitaire',
        'quantite',
        'tva',
        'total_ht',
        'total_ttc',
    ];

    public function purchase()
    {
        return $this->belongsTo(Purchase::class);
    }

    public function article()
    {
        return $this->belongsTo(Article::class);
    }
}
