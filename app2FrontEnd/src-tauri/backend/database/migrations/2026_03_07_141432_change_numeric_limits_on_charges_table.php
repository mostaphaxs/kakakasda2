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
        Schema::table('charges', function (Blueprint $table) {
            $table->decimal('frais_tel', 15, 2)->change();
            $table->decimal('internet', 15, 2)->change();
            $table->decimal('loyer_bureau', 15, 2)->change();
            $table->decimal('fournitures_bureau', 15, 2)->change();
            $table->decimal('employes_bureau', 15, 2)->change();
            $table->decimal('impots', 15, 2)->change();
            $table->decimal('gasoil', 15, 2)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('charges', function (Blueprint $table) {
            $table->decimal('frais_tel', 10, 2)->change();
            $table->decimal('internet', 10, 2)->change();
            $table->decimal('loyer_bureau', 12, 2)->change();
            $table->decimal('fournitures_bureau', 10, 2)->change();
            $table->decimal('employes_bureau', 15, 2)->change(); // This was already 15
            $table->decimal('impots', 15, 2)->change(); // This was already 15
            $table->decimal('gasoil', 10, 2)->change();
        });
    }
};
