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
        Schema::table('charges', function (Blueprint $table) {
            $table->string('frais_tel_ref')->nullable();
            $table->string('frais_tel_scan')->nullable();
            $table->string('internet_ref')->nullable();
            $table->string('internet_scan')->nullable();
            $table->string('loyer_bureau_ref')->nullable();
            $table->string('loyer_bureau_scan')->nullable();
            $table->string('fournitures_bureau_ref')->nullable();
            $table->string('fournitures_bureau_scan')->nullable();
            $table->string('employes_bureau_ref')->nullable();
            $table->string('employes_bureau_scan')->nullable();
            $table->string('impots_ref')->nullable();
            $table->string('impots_scan')->nullable();
            $table->string('gasoil_ref')->nullable();
            $table->string('gasoil_scan')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('charges', function (Blueprint $table) {
            $table->dropColumn([
                'frais_tel_ref', 'frais_tel_scan',
                'internet_ref', 'internet_scan',
                'loyer_bureau_ref', 'loyer_bureau_scan',
                'fournitures_bureau_ref', 'fournitures_bureau_scan',
                'employes_bureau_ref', 'employes_bureau_scan',
                'impots_ref', 'impots_scan',
                'gasoil_ref', 'gasoil_scan'
            ]);
        });
    }
};
