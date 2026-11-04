<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Optional caption (e.g. construction stage) for construction-progress photos. */
    public function up(): void
    {
        Schema::table('media', function (Blueprint $table) {
            $table->string('caption')->nullable()->after('category');
        });
    }

    public function down(): void
    {
        Schema::table('media', function (Blueprint $table) {
            $table->dropColumn('caption');
        });
    }
};
