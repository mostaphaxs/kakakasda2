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
        Schema::table('terrains', function (Blueprint $table) {
            $table->string('nom_terrain')->nullable()->after('id');
            $table->integer('numero_TF')->nullable()->after('nom_terrain');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('terrains', function (Blueprint $table) {
            $table->dropColumn(['nom_terrain', 'numero_TF']);
        });
    }
};
