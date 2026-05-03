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
            $table->string('judicial_fees_scan_path')->nullable()->after('judicialFees');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('contentieuxes', function (Blueprint $table) {
            $table->dropColumn('judicial_fees_scan_path');
        });
    }
};
