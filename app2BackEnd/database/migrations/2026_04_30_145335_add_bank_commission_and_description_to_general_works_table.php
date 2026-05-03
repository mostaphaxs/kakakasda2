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
            $table->decimal('bank_commission', 15, 2)->default(0)->after('paid_amount')->nullable();
            $table->text('description')->nullable()->after('rib');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('general_works', function (Blueprint $table) {
            $table->dropColumn(['bank_commission', 'description']);
        });
    }
};
