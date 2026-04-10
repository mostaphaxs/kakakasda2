<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Adds a unique constraint on bien_id so that no two clients
     * can be assigned the same bien (apartment, terrain, etc.).
     */
    public function up(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->unique('bien_id', 'clients_bien_id_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->dropUnique('clients_bien_id_unique');
        });
    }
};
