<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Cheque life cycle for client payments: recu → depose → encaisse | rejete.
     * A rejected cheque cancels its payment (status = Cancelled, refund = amount),
     * so every total and the échéancier treat it as unpaid.
     */
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->string('cheque_status')->nullable()->after('method');
            $table->date('cheque_deposited_at')->nullable()->after('cheque_status');
            $table->date('cheque_cashed_at')->nullable()->after('cheque_deposited_at');
            $table->date('cheque_rejected_at')->nullable()->after('cheque_cashed_at');
            $table->string('cheque_reject_reason')->nullable()->after('cheque_rejected_at');
        });

        // Existing cheques: older than today are assumed cashed, today/future ones still to deposit.
        $today = now()->toDateString();
        DB::table('payments')->where('method', 'Chèque')->where('payment_date', '<', $today)
            ->update(['cheque_status' => 'encaisse', 'cheque_cashed_at' => DB::raw('payment_date')]);
        DB::table('payments')->where('method', 'Chèque')->where('payment_date', '>=', $today)
            ->update(['cheque_status' => 'recu']);
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn(['cheque_status', 'cheque_deposited_at', 'cheque_cashed_at', 'cheque_rejected_at', 'cheque_reject_reason']);
        });
    }
};
