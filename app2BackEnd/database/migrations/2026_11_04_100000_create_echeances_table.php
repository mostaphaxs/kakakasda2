<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Payment schedule (échéancier): planned instalments per client.
     * Paid status is derived from the client's real payments (FIFO), so
     * nothing has to be ticked by hand.
     */
    public function up(): void
    {
        Schema::create('echeances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained()->onDelete('cascade');
            $table->foreignId('bien_id')->nullable()->constrained('biens')->nullOnDelete();
            $table->date('due_date');
            $table->decimal('amount', 15, 2);
            $table->string('label')->nullable();
            // Amount the client had already paid when the plan was created;
            // those payments are not allocated to this plan's instalments.
            $table->decimal('paid_before', 15, 2)->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['client_id', 'due_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('echeances');
    }
};
