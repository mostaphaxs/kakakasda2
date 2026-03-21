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
        Illuminate\Support\Facades\DB::table('biens')
            ->where('type_bien', 'Villa')
            ->update(['type_bien' => 'Lot Villa']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Illuminate\Support\Facades\DB::table('biens')
            ->where('type_bien', 'Lot Villa')
            ->update(['type_bien' => 'Villa']);
    }
};
