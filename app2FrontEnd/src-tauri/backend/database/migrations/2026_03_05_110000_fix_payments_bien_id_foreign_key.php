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
            // Drop the existing foreign key
            $table->dropForeign(['bien_id']);
            
            // Re-add it with onDelete('cascade')
            $table->foreign('bien_id')
                  ->references('id')
                  ->on('biens')
                  ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropForeign(['bien_id']);
            
            $table->foreign('bien_id')
                  ->references('id')
                  ->on('biens');
        });
    }
};
