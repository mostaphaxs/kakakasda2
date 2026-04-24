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
            $table->decimal('frais_autorisation_intermediaire', 15, 2)->nullable()->after('autorisation_lotissement');
        });

        Schema::table('biens', function (Blueprint $table) {
            $table->dropColumn([
                'charges_syndic',
                'frais_branchement_eau',
                'frais_branchement_electricite',
                'tva',
                'frais_autorisation_intermediaire'
            ]);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('biens', function (Blueprint $table) {
            $table->decimal('charges_syndic', 15, 2)->nullable();
            $table->decimal('frais_branchement_eau', 15, 2)->nullable();
            $table->decimal('frais_branchement_electricite', 15, 2)->nullable();
            $table->decimal('tva', 5, 2)->nullable();
            $table->decimal('frais_autorisation_intermediaire', 15, 2)->nullable();
        });

        Schema::table('terrains', function (Blueprint $table) {
            $table->dropColumn('frais_autorisation_intermediaire');
        });
    }
};
