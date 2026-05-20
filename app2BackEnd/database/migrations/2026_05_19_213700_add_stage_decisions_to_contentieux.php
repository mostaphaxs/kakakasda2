<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contentieuxes', function (Blueprint $table) {
            $table->text('decision_appel')->nullable()->after('fileNumber_appel');
            $table->text('decision_cassation')->nullable()->after('fileNumber_cassation');
        });
    }

    public function down(): void
    {
        Schema::table('contentieuxes', function (Blueprint $table) {
            $table->dropColumn(['decision_appel', 'decision_cassation']);
        });
    }
};
