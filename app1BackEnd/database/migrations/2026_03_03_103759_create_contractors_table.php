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
            Schema::create('contractors', function (Blueprint $table) {

            $table->id();
            // id terrain
            $table->string('categorie'); 
            $table->string('nom_societe');
            $table->string('nom_gerant');
            $table->text('adresse');
            $table->string('tel');
            $table->string('if'); 
            $table->string('ice'); 
            $table->string('rc');  
            $table->decimal('montant_global', 15, 2);
            $table->json('payment_history')->nullable(); 
            $table->string('scan_contrat')->nullable();
            $table->timestamps();

        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('contractors');
    }
};
