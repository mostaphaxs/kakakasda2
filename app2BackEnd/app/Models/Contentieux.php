<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Contentieux extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_name',
        'courtType',
        'subject',
        'procedural_type',
        'fileNumber',
        'fileNumber_appel',
        'fileNumber_cassation',
        'decision_appel',
        'decision_cassation',
        'date',
        'decision',
        'stage',
        'plaintiff',
        'defendant',
        'lawyerName',
        'lawyer_subject',
        'lawyerPhone',
        'lawyerAddress',
        'lawyerFees',
        'judicialFees',
        'document_path',
        'judicial_fees_scan_path',
        'commissaire_nom',
        'commissaire_fees',
        'commissaire_scan_path',
        'is_final_decision',
        'final_decision_date'
    ];

    public function mouvements()
    {
        return $this->hasMany(ContentieuxMouvement::class, 'contentieux_id');
    }

    public function fees()
    {
        return $this->hasMany(ContentieuxFee::class, 'contentieux_id');
    }
}
