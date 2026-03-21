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
            $table->decimal('autorisation_construction', 15, 2)->nullable()->default(0)->change();
            $table->decimal('autorisation_lotissement', 15, 2)->nullable()->default(0)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('terrains', function (Blueprint $table) {
            $table->boolean('autorisation_construction')->default(false)->change();
            $table->boolean('autorisation_lotissement')->default(false)->change();
        });
    }
};
