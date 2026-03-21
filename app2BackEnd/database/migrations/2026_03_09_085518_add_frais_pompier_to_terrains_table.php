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
            $table->decimal('frais_pompier', 15, 2)->default(0)->after('autorisation_lotissement');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('terrains', function (Blueprint $table) {
            $table->dropColumn('frais_pompier');
        });
    }
};
