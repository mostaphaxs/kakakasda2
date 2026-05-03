<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('biens', function (Blueprint $table) {
            $table->float('map_x')->nullable()->default(10)->after('description');
            $table->float('map_y')->nullable()->default(10)->after('map_x');
            $table->float('map_w')->nullable()->default(120)->after('map_y');
            $table->float('map_h')->nullable()->default(80)->after('map_w');
        });
    }

    public function down(): void
    {
        Schema::table('biens', function (Blueprint $table) {
            $table->dropColumn(['map_x', 'map_y', 'map_w', 'map_h']);
        });
    }
};
