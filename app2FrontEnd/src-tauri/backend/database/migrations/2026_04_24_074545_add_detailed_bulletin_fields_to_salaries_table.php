<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('salaries', function (Blueprint $table) {
            $table->decimal('jours_travail', 8, 2)->default(26)->nullable();
            $table->decimal('taux_anciennete', 8, 2)->default(0)->nullable();
            $table->decimal('montant_anciennete', 15, 2)->default(0)->nullable();
            $table->decimal('retenue_cnss', 15, 2)->default(0)->nullable();
            $table->decimal('retenue_amo', 15, 2)->default(0)->nullable();
            $table->decimal('retenue_ir', 15, 2)->default(0)->nullable();
            $table->decimal('total_gains', 15, 2)->default(0)->nullable();
            $table->decimal('total_retenues', 15, 2)->default(0)->nullable();
            $table->string('payment_method')->nullable();
            $table->date('payment_date')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('salaries', function (Blueprint $table) {
            $table->dropColumn([
                'jours_travail',
                'taux_anciennete',
                'montant_anciennete',
                'retenue_cnss',
                'retenue_amo',
                'retenue_ir',
                'total_gains',
                'total_retenues',
                'payment_method',
                'payment_date'
            ]);
        });
    }
};
