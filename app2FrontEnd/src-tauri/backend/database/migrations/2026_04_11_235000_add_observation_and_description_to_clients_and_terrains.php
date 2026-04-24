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
        if (Schema::hasTable('clients')) {
            Schema::table('clients', function (Blueprint $table) {
                if (!Schema::hasColumn('clients', 'observation')) {
                    $table->text('observation')->nullable()->after('avec_finition');
                }
            });
        }

        if (Schema::hasTable('terrains')) {
            Schema::table('terrains', function (Blueprint $table) {
                if (!Schema::hasColumn('terrains', 'description')) {
                    $table->text('description')->nullable()->after('total');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('clients')) {
            Schema::table('clients', function (Blueprint $table) {
                if (Schema::hasColumn('clients', 'observation')) {
                    $table->dropColumn('observation');
                }
            });
        }

        if (Schema::hasTable('terrains')) {
            Schema::table('terrains', function (Blueprint $table) {
                if (Schema::hasColumn('terrains', 'description')) {
                    $table->dropColumn('description');
                }
            });
        }
    }
};
