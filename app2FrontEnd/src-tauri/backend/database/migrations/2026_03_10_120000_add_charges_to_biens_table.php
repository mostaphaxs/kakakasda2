<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('biens', function (Blueprint $table) {
            $table->decimal('charges_syndic', 10, 2)->nullable()->after('prix_global_non_finition');
            $table->decimal('frais_branchement_eau', 10, 2)->nullable()->after('charges_syndic');
            $table->decimal('frais_branchement_electricite', 10, 2)->nullable()->after('frais_branchement_eau');
            $table->decimal('tva', 5, 2)->nullable()->after('frais_branchement_electricite');
        });
    }

    public function down(): void
    {
        Schema::table('biens', function (Blueprint $table) {
            $table->dropColumn(['charges_syndic', 'frais_branchement_eau', 'frais_branchement_electricite', 'tva']);
        });
    }
};
