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
        Schema::table('intervenants', function (Blueprint $table) {
            $table->foreignId('terrain_id')->nullable()->constrained('terrains')->onDelete('set null')->after('id');
        });

        Schema::table('contractors', function (Blueprint $table) {
            $table->foreignId('terrain_id')->nullable()->constrained('terrains')->onDelete('set null')->after('id');
        });

        Schema::table('charges', function (Blueprint $table) {
            $table->foreignId('terrain_id')->nullable()->constrained('terrains')->onDelete('set null')->after('id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('intervenants', function (Blueprint $table) {
            $table->dropConstrainedForeignId('terrain_id');
        });

        Schema::table('contractors', function (Blueprint $table) {
            $table->dropConstrainedForeignId('terrain_id');
        });

        Schema::table('charges', function (Blueprint $table) {
            $table->dropConstrainedForeignId('terrain_id');
        });
    }
};
