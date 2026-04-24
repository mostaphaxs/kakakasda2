<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::table('biens')
            ->where('type_bien', 'Lot Villa')
            ->update(['type_bien' => 'Villa']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('biens')
            ->where('type_bien', 'Villa')
            ->update(['type_bien' => 'Lot Villa']);
    }
};
