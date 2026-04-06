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
       Schema::create('clients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bien_id')->nullable()->constrained('biens')->onDelete('set null'); 
            $table->string('nom');
            $table->string('email', 100)->nullable();
            $table->string('prenom');
            $table->string('cin')->unique();
            $table->string('tel');
            $table->date('date_reservation')->nullable();
            $table->json('scanned_docs')->nullable(); 
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('clients');
    }
};
