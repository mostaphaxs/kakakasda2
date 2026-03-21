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
        Schema::create('intervenants', function (Blueprint $table) {
            $table->id();
            $table->string('categorie');
            $table->string('nom_societe');
            $table->string('nom_gerant');
            $table->text('adresse');
            $table->string('tel');
            $table->string('if')->nullable();
            $table->string('ice')->nullable();
            $table->string('rc')->nullable();
            $table->decimal('montant_global', 15, 2);
            $table->string('scan_contrat')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('intervenants');
    }
};
