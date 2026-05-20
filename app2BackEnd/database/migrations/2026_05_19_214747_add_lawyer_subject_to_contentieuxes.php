<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contentieuxes', function (Blueprint $table) {
            $table->string('lawyer_subject')->nullable()->after('lawyerName'); // الموضوع الذي يترافع فيه المحامي
        });
    }

    public function down(): void
    {
        Schema::table('contentieuxes', function (Blueprint $table) {
            $table->dropColumn('lawyer_subject');
        });
    }
};
