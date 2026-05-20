<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contentieux_fees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('contentieux_id')->constrained('contentieuxes')->onDelete('cascade');
            $table->string('type'); // JUDICIAL, BAILIFF, OTHER
            $table->string('category')->nullable(); // Ar-rosum, Autre, etc.
            $table->decimal('amount', 12, 2);
            $table->string('notes')->nullable();
            $table->date('date')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contentieux_fees');
    }
};
