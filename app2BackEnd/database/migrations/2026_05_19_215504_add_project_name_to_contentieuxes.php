<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contentieuxes', function (Blueprint $table) {
            $table->string('project_name')->nullable()->after('id'); // e.g., Dar Bouazza, Sidi Moumen
        });
    }

    public function down(): void
    {
        Schema::table('contentieuxes', function (Blueprint $table) {
            $table->dropColumn('project_name');
        });
    }
};
