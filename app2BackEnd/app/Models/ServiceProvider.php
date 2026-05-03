<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ServiceProvider extends Model
{
    protected $fillable = ['nom', 'categorie', 'tel', 'adresse', 'ice', 'if', 'rc', 'rib'];

    public function invoices()
    {
        return $this->hasMany(ProviderInvoice::class, 'service_provider_id');
    }
}
