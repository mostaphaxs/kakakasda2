<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProviderInvoice extends Model
{
    protected $fillable = [
        'service_provider_id', 'amount', 'reference', 'scan_path', 'invoice_date', 'notes', 'terrain_id',
        'code_agence', 'id_transaction', 'reference_recu', 'reference_cmi', 'reference_creancier_new', 'date_paiement', 'identifiant_paiement',
        'table_identifiant', 'table_description', 'table_date', 'table_montant', 'frais_timbre'
    ];

    public function provider()
    {
        return $this->belongsTo(ServiceProvider::class, 'service_provider_id');
    }

    public function terrain()
    {
        return $this->belongsTo(Terrain::class, 'terrain_id');
    }
}
