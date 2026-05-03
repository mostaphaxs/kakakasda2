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
            $table->dropColumn([
                'frais_tel', 'internet',
                'frais_tel_scan', 'frais_tel_ref',
                'internet_scan', 'internet_ref'
            ]);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('charges', function (Blueprint $table) {
            $table->decimal('frais_tel', 10, 2)->default(0); 
            $table->decimal('internet', 10, 2)->default(0);
            $table->string('frais_tel_ref')->nullable();
            $table->string('frais_tel_scan')->nullable();
            $table->string('internet_ref')->nullable();
            $table->string('internet_scan')->nullable();
        });
    }
};
