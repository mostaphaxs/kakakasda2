<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Device extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'brand',
        'model',
        'imei',
        'serial_number',
        'condition',
        'category',
        'color',
        'storage_capacity',
        'purchase_price',
        'suggested_price',
        'technical_specs',
        'notes',
        'supplier_id',
        'quantity',
    ];

    protected $casts = [
        'technical_specs' => 'json',
        'purchase_price' => 'decimal:2',
        'suggested_price' => 'decimal:2',
        'quantity' => 'integer',
    ];

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }
}
