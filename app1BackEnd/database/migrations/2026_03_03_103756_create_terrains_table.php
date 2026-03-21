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

        Schema::create('terrains', function (Blueprint $table) {
            $table->id();
            $table->decimal('cout_global', 15, 2);
         
            $table->decimal('frais_enregistrement', 15, 2);
            $table->decimal('frais_immatriculation', 15, 2);
            $table->decimal('honoraires_notaire', 15, 2);
            $table->boolean('autorisation_construction')->default(false);
            $table->boolean('autorisation_lotissement')->default(false);
            $table->decimal('total', 15, 2);
            $table->timestamps();
        });

    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('terrains');
    }
};
