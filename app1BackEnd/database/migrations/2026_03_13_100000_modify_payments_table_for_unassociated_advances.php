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
        Schema::table('payments', function (Blueprint $table) {
            $table->foreignId('bien_id')->nullable()->change();
            $table->string('status', 20)->default('Active')->after('notes'); // Active, Cancelled, Refunded, Used
            $table->decimal('refund_amount', 15, 2)->nullable()->after('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->foreignId('bien_id')->nullable(false)->change();
            $table->dropColumn(['status', 'refund_amount']);
        });
    }
};
