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
        Schema::table('annex_units', function (Blueprint $table) {
            $table->dropColumn(['name', 'surface']);
            $table->string('type')->after('bien_id');
            $table->decimal('prix', 12, 2)->after('type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('annex_units', function (Blueprint $table) {
            $table->dropColumn(['type', 'prix']);
            $table->string('name');
            $table->decimal('surface', 8, 2)->nullable();
        });
    }
};
