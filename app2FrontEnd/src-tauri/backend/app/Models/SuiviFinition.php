<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SuiviFinition extends Model
{
    protected $table = 'suivi_finition';

    protected $fillable = [
        'bien_id',
        'element',
        'label_custom',
        'checked',
    ];

    protected $casts = [
        'checked' => 'boolean',
    ];

    public function bien()
    {
        return $this->belongsTo(Bien::class);
    }
}
