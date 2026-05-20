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
        // We might have already migrated the previous fields. To handle this cleanly in sqlite,
        // we drop the old fields if they exist, or just rely on a fresh table.
        // But sqlite doesn't support dropping multiple columns easily in some older Laravel versions.
        // Let's just add the new fields if they don't exist.
        Schema::table('provider_invoices', function (Illuminate\Database\Schema\Blueprint $table) {
            // Drop old if we can, but since this is just getting fixed up:
            // $table->dropColumn(['frais_timbre', 'identifiant_client']); // Could fail if not migrated
            if (!Schema::hasColumn('provider_invoices', 'code_agence')) {
                $table->string('code_agence')->nullable();
                $table->string('id_transaction')->nullable();
                $table->string('reference_recu')->nullable();
                $table->string('reference_cmi')->nullable();
                $table->string('reference_creancier_new')->nullable();
                $table->dateTime('date_paiement')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('provider_invoices', function (Illuminate\Database\Schema\Blueprint $table) {
            $table->dropColumn([
                'code_agence', 
                'id_transaction', 
                'reference_recu', 
                'reference_cmi', 
                'reference_creancier_new', 
                'date_paiement'
            ]);
        });
    }
};
