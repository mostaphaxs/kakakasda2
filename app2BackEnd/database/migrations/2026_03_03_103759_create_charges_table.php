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
            Schema::create('charges', function (Blueprint $table) {
            $table->id();
            $table->decimal('frais_tel', 10, 2)->default(0); 
            // id terrain
            $table->decimal('internet', 10, 2)->default(0);
            $table->decimal('loyer_bureau', 12, 2)->default(0);
            $table->decimal('fournitures_bureau', 10, 2)->default(0);
            $table->decimal('employes_bureau', 15, 2)->default(0);
            $table->decimal('impots', 15, 2)->default(0);
            $table->decimal('gasoil', 10, 2)->default(0);
            $table->date('periode'); 
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('charges');
    }
};
