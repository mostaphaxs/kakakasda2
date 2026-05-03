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
        Schema::table('contentieuxes', function (Blueprint $table) {
            $table->string('commissaire_nom')->nullable();
            $table->decimal('commissaire_fees', 15, 2)->default(0);
            $table->string('commissaire_scan_path')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('contentieuxes', function (Blueprint $table) {
            $table->dropColumn(['commissaire_nom', 'commissaire_fees', 'commissaire_scan_path']);
        });
    }
};
