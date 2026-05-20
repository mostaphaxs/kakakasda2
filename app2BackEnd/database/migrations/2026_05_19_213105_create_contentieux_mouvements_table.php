<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contentieux_mouvements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('contentieux_id')->constrained('contentieuxes')->onDelete('cascade');
            $table->string('stage')->default('PREMIERE_INSTANCE'); // To know which stage this movement belongs to
            $table->date('date');
            $table->text('description'); // taajil, mudawala, etc.
            $table->string('next_date')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contentieux_mouvements');
    }
};
