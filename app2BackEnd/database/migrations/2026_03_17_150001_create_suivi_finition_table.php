<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('suivi_finition', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bien_id')->constrained('biens')->onDelete('cascade');
            $table->string('element', 100); // e.g. carrelage, peinture, autre
            $table->string('label_custom', 200)->nullable(); // only when element = 'autre'
            $table->boolean('checked')->default(false);
            $table->timestamps();

            // No unique on element: allows multiple 'autre' custom rows per bien
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('suivi_finition');
    }
};
