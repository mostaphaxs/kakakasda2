<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockTracking extends Model
{
    protected $table = 'stock_tracking';
    protected $fillable = ['article_id', 'initial_stock', 'consumed_qty', 'destination_id', 'remaining_stock'];

    public function article()
    {
        return $this->belongsTo(Article::class);
    }

    public function destination()
    {
        return $this->belongsTo(Bien::class, 'destination_id');
    }
}
