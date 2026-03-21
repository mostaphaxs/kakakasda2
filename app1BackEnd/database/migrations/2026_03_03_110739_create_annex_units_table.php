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
        Schema::create('annex_units', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bien_id')->constrained('biens')->onDelete('cascade');
            $table->string('name'); // e.g., "Parking No. 5"
            $table->decimal('surface', 8, 2)->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('annex_units');
    }
};
