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
        Schema::table('biens', function (Blueprint $table) {
            $table->dropColumn(['prix_par_m2', 'prix_global']);
            $table->decimal('prix_par_m2_finition', 12, 2)->after('statut');
            $table->decimal('prix_global_finition', 15, 2)->after('prix_par_m2_finition');
            $table->decimal('prix_par_m2_non_finition', 12, 2)->after('prix_global_finition');
            $table->decimal('prix_global_non_finition', 15, 2)->after('prix_par_m2_non_finition');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('biens', function (Blueprint $table) {
            $table->dropColumn([
                'prix_par_m2_finition', 
                'prix_global_finition', 
                'prix_par_m2_non_finition', 
                'prix_global_non_finition'
            ]);
            $table->decimal('prix_par_m2', 12, 2)->after('statut');
            $table->decimal('prix_global', 15, 2)->after('prix_par_m2');
        });
    }
};
