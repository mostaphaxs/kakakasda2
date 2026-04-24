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
        Schema::table('salaries', function (Blueprint $table) {
            $table->string('cnss_number')->nullable();
            $table->date('birth_date')->nullable();
            $table->string('matricule')->nullable();
            $table->string('fonction')->nullable();
            $table->string('marital_status')->nullable();
            $table->text('address')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('salaries', function (Blueprint $table) {
            $table->dropColumn([
                'cnss_number',
                'birth_date',
                'matricule',
                'fonction',
                'marital_status',
                'address'
            ]);
        });
    }
};
