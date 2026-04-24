<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Salarie extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 'cin', 'phone', 'speciality', 'grade', 'education',
        'monthly_salary', 'bank_info', 'hiring_date', 'scan_contrat', 'active',
        // Bulletin de Paie Fields
        'cnss_number', 'birth_date', 'matricule', 'fonction', 'marital_status', 'address',
        // Cotisations Detailed
        'jours_travail', 'salaire_base', 
        'taux_anciennete', 'montant_anciennete', 'anciennete_jours', 
        'salaire_brut',
        'taux_cnss', 'retenue_cnss', 
        'taux_amo', 'retenue_amo', 
        'taux_ir', 'retenue_ir',
        // Primes
        'indemnite_transport', 'prime_panier', 'prime_rendement', 'arrondis',
        // Totals & Net
        'total_gains', 'total_retenues', 'net_a_payer', 
        'payment_method', 'payment_date', 'rib',
    ];

    protected $casts = [
        'monthly_salary' => 'decimal:2',
        'jours_travail' => 'decimal:2',
        'salaire_base' => 'decimal:2',
        'taux_anciennete' => 'decimal:2',
        'montant_anciennete' => 'decimal:2',
        'salaire_brut' => 'decimal:2',
        'taux_cnss' => 'decimal:2',
        'retenue_cnss' => 'decimal:2',
        'taux_amo' => 'decimal:2',
        'retenue_amo' => 'decimal:2',
        'taux_ir' => 'decimal:2',
        'retenue_ir' => 'decimal:2',
        'indemnite_transport' => 'decimal:2',
        'prime_panier' => 'decimal:2',
        'prime_rendement' => 'decimal:2',
        'arrondis' => 'decimal:2',
        'total_gains' => 'decimal:2',
        'total_retenues' => 'decimal:2',
        'net_a_payer' => 'decimal:2',
        'hiring_date' => 'date',
        'birth_date' => 'date',
        'payment_date' => 'date',
        'active' => 'boolean',
    ];
}
