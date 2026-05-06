<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add composite indexes for fast SQLite inventory search
        Schema::table('devices', function (Blueprint $table) {
            $table->index('brand');
            $table->index('condition');
            $table->index('imei');
            $table->index('serial_number');
            $table->index(['brand', 'model']); // Common combined search
        });
    }

    public function down(): void
    {
        Schema::table('devices', function (Blueprint $table) {
            $table->dropIndex(['brand']);
            $table->dropIndex(['condition']);
            $table->dropIndex(['imei']);
            $table->dropIndex(['serial_number']);
            $table->dropIndex(['brand', 'model']);
        });
    }
};
