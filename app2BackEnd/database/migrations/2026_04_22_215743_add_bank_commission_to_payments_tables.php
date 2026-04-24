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
            $table->decimal('bank_commission', 15, 2)->default(0)->after('amount');
        });

        Schema::table('contractor_payments', function (Blueprint $table) {
            $table->decimal('bank_commission', 15, 2)->default(0)->after('amount');
        });

        Schema::table('facture_paiements', function (Blueprint $table) {
            $table->decimal('bank_commission', 15, 2)->default(0)->after('amount');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn('bank_commission');
        });

        Schema::table('contractor_payments', function (Blueprint $table) {
            $table->dropColumn('bank_commission');
        });

        Schema::table('facture_paiements', function (Blueprint $table) {
            $table->dropColumn('bank_commission');
        });
    }
};
