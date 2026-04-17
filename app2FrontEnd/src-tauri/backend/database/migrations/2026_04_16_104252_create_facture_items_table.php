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
        Schema::create('facture_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('facture_id')->constrained()->onDelete('cascade');
            $table->string('designation');
            $table->decimal('qty', 10, 2)->default(1);
            $table->decimal('unit_price', 15, 2);
            $table->decimal('vat_rate', 5, 2)->default(20);
            $table->decimal('total_ht', 15, 2)->default(0);
            $table->decimal('total_ttc', 15, 2)->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('facture_items');
    }
};
