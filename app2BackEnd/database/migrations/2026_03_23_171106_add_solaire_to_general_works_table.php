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
        Schema::table('general_works', function (Blueprint $table) {
            $table->enum('work_type', ['Décapage', 'Nettoyage', 'Atterrassement', 'Débarquement', 'Déplacement terre/sable', 'Solaire'])->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('general_works', function (Blueprint $table) {
            $table->enum('work_type', ['Décapage', 'Nettoyage', 'Atterrassement', 'Débarquement', 'Déplacement terre/sable'])->change();
        });
    }
};
