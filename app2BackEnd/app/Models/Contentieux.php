<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Contentieux extends Model
{
    use HasFactory;

    protected $fillable = [
        'courtType',
        'fileNumber',
        'date',
        'decision',
        'stage',
        'plaintiff',
        'defendant',
        'lawyerName',
        'lawyerPhone',
        'lawyerAddress',
        'lawyerFees',
        'judicialFees',
        'document_path',
        'judicial_fees_scan_path',
        'commissaire_nom',
        'commissaire_fees',
        'commissaire_scan_path'
    ];
}
