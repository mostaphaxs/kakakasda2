<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ouvrier_missions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ouvrier_id')->constrained('ouvriers')->onDelete('cascade');
            $table->foreignId('terrain_id')->nullable()->constrained('terrains')->onDelete('set null');
            $table->enum('type', ['journalier', 'periode', 'm2', 'ml', 'forfait']);
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->decimal('quantity', 15, 2)->default(1);
            $table->decimal('unit_price', 15, 2)->default(0);
            $table->decimal('total_amount', 15, 2)->default(0);
            $table->text('description')->nullable();
            $table->enum('status', ['pending', 'completed'])->default('pending');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ouvrier_missions');
    }
};
