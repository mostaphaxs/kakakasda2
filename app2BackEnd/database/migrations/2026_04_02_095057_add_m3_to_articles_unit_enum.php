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
        DB::statement("ALTER TABLE articles MODIFY COLUMN unit ENUM('m2', 'ML', 'U', 'Kg', 'M3')");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE articles MODIFY COLUMN unit ENUM('m2', 'ML', 'U', 'Kg')");
    }
};
