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
            $table->string('table_identifiant')->nullable();
            $table->string('table_description')->nullable();
            $table->string('table_date')->nullable();
            $table->decimal('table_montant', 10, 2)->nullable();
            $table->decimal('frais_timbre', 10, 2)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('provider_invoices', function (Illuminate\Database\Schema\Blueprint $table) {
            $table->dropColumn(['table_identifiant', 'table_description', 'table_date', 'table_montant', 'frais_timbre']);
        });
    }
};
