<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('salaries', function (Blueprint $table) {
            // Cotisations - Base
            $table->decimal('salaire_base', 12, 2)->nullable()->after('monthly_salary');
            $table->integer('anciennete_jours')->nullable()->after('salaire_base');
            $table->decimal('salaire_brut', 12, 2)->nullable()->after('anciennete_jours');

            // Retenues
            $table->decimal('taux_cnss', 5, 2)->nullable()->default(4.48)->after('salaire_brut');
            $table->decimal('taux_amo', 5, 2)->nullable()->default(2.26)->after('taux_cnss');
            $table->decimal('taux_ir', 5, 2)->nullable()->default(10.00)->after('taux_amo');

            // Primes et Indemnités
            $table->decimal('indemnite_transport', 12, 2)->nullable()->after('taux_ir');
            $table->decimal('prime_panier', 12, 2)->nullable()->after('indemnite_transport');
            $table->decimal('prime_rendement', 12, 2)->nullable()->after('prime_panier');
            $table->decimal('arrondis', 12, 2)->nullable()->after('prime_rendement');

            // Net
            $table->decimal('net_a_payer', 12, 2)->nullable()->after('arrondis');
            $table->string('rib')->nullable()->after('net_a_payer');
        });
    }

    public function down(): void
    {
        Schema::table('salaries', function (Blueprint $table) {
            $table->dropColumn([
                'salaire_base', 'anciennete_jours', 'salaire_brut',
                'taux_cnss', 'taux_amo', 'taux_ir',
                'indemnite_transport', 'prime_panier', 'prime_rendement', 'arrondis',
                'net_a_payer', 'rib'
            ]);
        });
    }
};
