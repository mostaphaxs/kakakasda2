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
        Schema::create('stock_tracking', function (Blueprint $table) {
            $table->id();
            $table->foreignId('article_id')->constrained()->onDelete('cascade');
            $table->decimal('initial_stock', 15, 2)->default(0);
            $table->decimal('consumed_qty', 15, 2)->default(0);
            $table->foreignId('destination_id')->nullable()->constrained('biens')->onDelete('set null'); // Link to Villa/Appt ID
            $table->decimal('remaining_stock', 15, 2)->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stock_tracking');
    }
};
