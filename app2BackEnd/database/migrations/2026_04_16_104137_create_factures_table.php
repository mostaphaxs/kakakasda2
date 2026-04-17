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
        Schema::create('factures', function (Blueprint $table) {
            $table->id();
            $table->string('invoice_no')->unique();
            $table->date('date');
            $table->string('client_name');
            $table->string('client_address')->nullable();
            $table->string('client_ice')->nullable();
            $table->string('client_if')->nullable();
            $table->string('client_rc')->nullable();
            $table->text('description')->nullable();
            $table->decimal('total_ht', 15, 2)->default(0);
            $table->decimal('total_tva', 15, 2)->default(0);
            $table->decimal('total_ttc', 15, 2)->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('factures');
    }
};
