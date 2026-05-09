<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('articles', function (Blueprint $table) {
            if (!Schema::hasColumn('articles', 'brand')) {
                $table->string('brand')->nullable();
            }
            if (!Schema::hasColumn('articles', 'model')) {
                $table->string('model')->nullable();
            }
            if (!Schema::hasColumn('articles', 'category')) {
                $table->string('category')->nullable();
            }
            if (!Schema::hasColumn('articles', 'condition')) {
                $table->string('condition')->nullable()->default('New');
            }
            if (!Schema::hasColumn('articles', 'storage_capacity')) {
                $table->string('storage_capacity')->nullable();
            }
            if (!Schema::hasColumn('articles', 'color')) {
                $table->string('color')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('articles', function (Blueprint $table) {
            $table->dropColumn(['brand', 'model', 'category', 'condition', 'storage_capacity', 'color']);
        });
    }
};
