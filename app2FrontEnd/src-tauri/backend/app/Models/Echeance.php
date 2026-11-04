<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Echeance extends Model
{
    protected $fillable = [
        'client_id',
        'bien_id',
        'due_date',
        'amount',
        'label',
        'paid_before',
        'notes',
    ];

    protected $casts = [
        'due_date' => 'date:Y-m-d',
        'amount' => 'float',
        'paid_before' => 'float',
    ];

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function bien()
    {
        return $this->belongsTo(Bien::class);
    }
}
