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
        Schema::table('ouvrier_missions', function (Blueprint $table) {
            $table->foreignId('bien_id')->nullable()->constrained('biens')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ouvrier_missions', function (Blueprint $table) {
            $table->dropForeign(['bien_id']);
            $table->dropColumn('bien_id');
        });
    }
};
