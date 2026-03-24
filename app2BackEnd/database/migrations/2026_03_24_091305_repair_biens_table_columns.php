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
            if (!Schema::hasColumn('biens', 'prix_par_m2_finition')) {
                $table->decimal('prix_par_m2_finition', 12, 2)->nullable();
            }
            if (!Schema::hasColumn('biens', 'prix_global_finition')) {
                $table->decimal('prix_global_finition', 15, 2)->nullable();
            }
            if (!Schema::hasColumn('biens', 'prix_par_m2_non_finition')) {
                $table->decimal('prix_par_m2_non_finition', 12, 2)->nullable();
            }
            if (!Schema::hasColumn('biens', 'prix_global_non_finition')) {
                $table->decimal('prix_global_non_finition', 15, 2)->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('biens', function (Blueprint $table) {
            // No rollback logic needed for repair migration
        });
    }
};
