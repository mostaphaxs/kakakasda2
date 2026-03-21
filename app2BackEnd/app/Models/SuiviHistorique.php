<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SuiviHistorique extends Model
{
    use HasFactory;

    protected $table = 'suivi_historique';

    protected $fillable = [
        'bien_id',
        'type',
        'description',
        'date_realisation',
    ];

    /**
     * Get the bien associated with the history entry.
     */
    public function bien(): BelongsTo
    {
        return $this->belongsTo(Bien::class);
    }
}
