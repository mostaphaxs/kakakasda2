<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Task extends Model
{
    protected $fillable = ['title', 'notes', 'due_date', 'due_time', 'priority', 'client_id', 'contact_name', 'contact_phone', 'done_at'];

    protected $casts = [
        'due_date' => 'date:Y-m-d',
        'done_at' => 'datetime:Y-m-d H:i',
    ];

    public function client()
    {
        return $this->belongsTo(Client::class);
    }
}
