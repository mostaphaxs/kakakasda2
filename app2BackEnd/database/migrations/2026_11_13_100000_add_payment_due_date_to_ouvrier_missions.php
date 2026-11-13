<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Date on which the worker is to be paid for the mission (end of mission, +15 days, +1 month, or any date). */
    public function up(): void
    {
        Schema::table('ouvrier_missions', function (Blueprint $table) {
            $table->date('payment_due_date')->nullable()->after('end_date');
        });
    }

    public function down(): void
    {
        Schema::table('ouvrier_missions', function (Blueprint $table) {
            $table->dropColumn('payment_due_date');
        });
    }
};
