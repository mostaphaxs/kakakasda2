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
         Schema::create('biens', function (Blueprint $table) {
                $table->id();
                $table->foreignId('terrain_id')->constrained()->onDelete('cascade');
                $table->string('type_bien'); 
                $table->string('groupe_habitation')->nullable();
                $table->string('immeuble')->nullable();
                $table->integer('etage')->nullable();
                $table->string('num_appartement')->nullable();
                $table->decimal('surface_m2', 10, 2);
                $table->text('description')->nullable();
                $table->enum('statut', ['Libre', 'Reserve', 'Vendu'])->default('Libre');
                $table->decimal('prix_par_m2', 12, 2);
                $table->decimal('prix_global', 15, 2);
                $table->string('document_path')->nullable();
                $table->timestamps();
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('biens');
    }
};
