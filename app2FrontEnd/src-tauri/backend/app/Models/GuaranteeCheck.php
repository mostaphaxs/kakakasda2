<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GuaranteeCheck extends Model
{
    protected $fillable = [
        'supplier_id',
        'check_number',
        'amount',
        'bank_name',
        'scan_path',
        'status',
        'notes'
    ];

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    protected $appends = ['scan_url'];

    public function getScanUrlAttribute()
    {
        return $this->scan_path ? '/storage/' . $this->scan_path : null;
    }
}
