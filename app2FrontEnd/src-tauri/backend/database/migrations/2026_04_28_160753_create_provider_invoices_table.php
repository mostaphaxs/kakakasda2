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
        Schema::create('provider_invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('service_provider_id')->constrained('service_providers')->onDelete('cascade');
            $table->decimal('amount', 15, 2);
            $table->string('reference')->nullable();
            $table->string('scan_path')->nullable();
            $table->date('invoice_date');
            $table->text('notes')->nullable();
            $table->foreignId('terrain_id')->nullable()->constrained('terrains')->onDelete('set null');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('provider_invoices');
    }
};
