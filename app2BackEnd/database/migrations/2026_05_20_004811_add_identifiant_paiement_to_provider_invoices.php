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
        Schema::table('provider_invoices', function (Illuminate\Database\Schema\Blueprint $table) {
            $table->string('identifiant_paiement')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('provider_invoices', function (Illuminate\Database\Schema\Blueprint $table) {
            $table->dropColumn('identifiant_paiement');
        });
    }
};
