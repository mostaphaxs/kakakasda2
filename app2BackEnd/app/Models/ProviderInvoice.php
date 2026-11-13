<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProviderInvoice extends Model
{
    protected $fillable = ['service_provider_id', 'amount', 'reference', 'scan_path', 'invoice_date', 'notes', 'terrain_id'];

    public function provider()
    {
        return $this->belongsTo(ServiceProvider::class, 'service_provider_id');
    }

    public function terrain()
    {
        return $this->belongsTo(Terrain::class, 'terrain_id');
    }
}
