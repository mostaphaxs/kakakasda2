<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Sale extends Model
{
    use SoftDeletes;

    protected $fillable = ['device_id', 'customer_id', 'sale_price', 'payment_method', 'notes'];

    protected $casts = ['sale_price' => 'decimal:2'];

    public function device() { return $this->belongsTo(Device::class); }
    public function customer() { return $this->belongsTo(Customer::class); }
}
