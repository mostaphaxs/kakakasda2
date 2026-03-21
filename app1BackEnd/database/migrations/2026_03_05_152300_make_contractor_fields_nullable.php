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
        Schema::table('contractors', function (Blueprint $table) {
            $table->string('if')->nullable()->change();
            $table->string('ice')->nullable()->change();
            $table->string('rc')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('contractors', function (Blueprint $table) {
            $table->string('if')->nullable(false)->change();
            $table->string('ice')->nullable(false)->change();
            $table->string('rc')->nullable(false)->change();
        });
    }
};
