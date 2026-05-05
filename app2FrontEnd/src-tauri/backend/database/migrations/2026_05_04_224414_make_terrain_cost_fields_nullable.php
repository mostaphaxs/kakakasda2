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
        Schema::table('terrains', function (Blueprint $table) {
            $table->decimal('cout_global', 15, 2)->nullable()->change();
            $table->decimal('frais_enregistrement', 15, 2)->nullable()->change();
            $table->decimal('frais_immatriculation', 15, 2)->nullable()->change();
            $table->decimal('honoraires_notaire', 15, 2)->nullable()->change();
            $table->decimal('autorisation_construction', 15, 2)->nullable()->change();
            $table->decimal('autorisation_equipement', 15, 2)->nullable()->change();
            $table->decimal('frais_pompier', 15, 2)->nullable()->change();
            $table->decimal('frais_autorisation_intermediaire', 15, 2)->nullable()->change();
            $table->decimal('total', 15, 2)->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('terrains', function (Blueprint $table) {
            $table->decimal('cout_global', 15, 2)->nullable(false)->change();
            $table->decimal('frais_enregistrement', 15, 2)->nullable(false)->change();
            $table->decimal('frais_immatriculation', 15, 2)->nullable(false)->change();
            $table->decimal('honoraires_notaire', 15, 2)->nullable(false)->change();
            $table->decimal('autorisation_construction', 15, 2)->nullable(false)->change();
            $table->decimal('autorisation_equipement', 15, 2)->nullable(false)->change();
            $table->decimal('frais_pompier', 15, 2)->nullable(false)->change();
            $table->decimal('frais_autorisation_intermediaire', 15, 2)->nullable(false)->change();
            $table->decimal('total', 15, 2)->nullable(false)->change();
        });
    }
};
