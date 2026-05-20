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
        Schema::table('payments', function (Blueprint $table) {
            $table->string('source_bank')->nullable()->after('bank_name');
            $table->string('destination_bank')->nullable()->after('source_bank');
            $table->string('virement_type')->nullable()->after('destination_bank'); // Transfert vs Versement
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn(['source_bank', 'destination_bank', 'virement_type']);
        });
    }
};
