<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Supplier extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'contact_person',
        'email',
        'phone',
        'address',
        'city',
        'notes',
    ];

    public function devices()
    {
        return $this->hasMany(Device::class);
    }

    public function purchases()
    {
        return $this->hasMany(Purchase::class);
    }
}
