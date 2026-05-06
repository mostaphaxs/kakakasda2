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
        Schema::create('devices', function (Blueprint $table) {
            $table->id();
            $table->string('brand');
            $table->string('model');
            $table->string('imei')->unique()->nullable();
            $table->string('serial_number')->unique()->nullable();
            $table->enum('condition', ['New', 'Used', 'Refurbished'])->default('New');
            $table->string('color')->nullable();
            $table->string('storage_capacity')->nullable();
            $table->decimal('purchase_price', 15, 2)->default(0);
            $table->decimal('suggested_price', 15, 2)->default(0);
            $table->json('technical_specs')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('devices');
    }
};
