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
        Schema::table('general_works', function (Blueprint $table) {
            $table->string('method')->default('Chèque')->after('paid_amount');
            $table->string('reference_no')->nullable()->after('method');
            $table->string('bank_name')->nullable()->after('reference_no');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('general_works', function (Blueprint $table) {
            $table->dropColumn(['method', 'reference_no', 'bank_name']);
        });
    }
};
