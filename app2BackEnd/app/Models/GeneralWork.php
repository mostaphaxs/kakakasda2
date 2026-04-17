<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GeneralWork extends Model
{
    protected $fillable = ['supplier_id', 'work_type', 'total_amount', 'paid_amount', 'balance', 'terrain_id'];

    public function terrain()
    {
        return $this->belongsTo(Terrain::class);
    }

    protected $appends = ['calculated_balance'];

    public function getCalculatedBalanceAttribute()
    {
        return $this->total_amount - $this->paid_amount;
    }

    protected static function booted()
    {
        static::saving(function ($work) {
            $work->balance = $work->total_amount - $work->paid_amount;
        });
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }
}
