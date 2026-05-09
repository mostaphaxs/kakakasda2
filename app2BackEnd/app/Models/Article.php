<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Article extends Model
{
    protected $fillable = [
        'designation',
        'description',
        'prix_unitaire_defaut',
        'tva_defaut',
        'brand',
        'model',
        'category',
        'condition',
        'storage_capacity',
        'color',
    ];
}
