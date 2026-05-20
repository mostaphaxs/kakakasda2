<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contentieuxes', function (Blueprint $table) {
            $table->string('subject')->nullable()->after('courtType'); // الموضوع
            $table->string('procedural_type')->default('FOND')->after('subject'); // Fond / Référé
            
            // Special numbers for different stages
            $table->string('fileNumber_appel')->nullable()->after('fileNumber');
            $table->string('fileNumber_cassation')->nullable()->after('fileNumber_appel');
            
            // Final decision flag
            $table->boolean('is_final_decision')->default(false);
            $table->date('final_decision_date')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('contentieuxes', function (Blueprint $table) {
            $table->dropColumn(['subject', 'procedural_type', 'fileNumber_appel', 'fileNumber_cassation', 'is_final_decision', 'final_decision_date']);
        });
    }
};
