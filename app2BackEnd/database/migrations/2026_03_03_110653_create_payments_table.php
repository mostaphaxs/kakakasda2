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
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained()->onDelete('cascade');
            $table->foreignId('bien_id')->constrained('biens'); 
            $table->decimal('amount', 15, 2);
            $table->date('payment_date');
            $table->enum('type', ['Avance', 'Tranche','Solde', 'Reliquat', 'Caution']);
            $table->string('method'); 
            $table->string('reference_no')->nullable(); 
            $table->string('bank_name')->nullable();
            $table->string('receipt_path')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
