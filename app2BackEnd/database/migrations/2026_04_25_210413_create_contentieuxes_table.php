<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contentieuxes', function (Blueprint $table) {
            $table->id();
            $table->string('courtType')->default('CIVILE');
            $table->string('fileNumber')->nullable();
            $table->date('date')->nullable();
            $table->text('decision')->nullable();
            $table->string('stage')->default('PREMIERE_INSTANCE');
            
            $table->string('plaintiff')->nullable();
            $table->string('defendant')->nullable();
            
            $table->string('lawyerName')->nullable();
            $table->string('lawyerPhone')->nullable();
            $table->string('lawyerAddress')->nullable();
            
            $table->decimal('lawyerFees', 12, 2)->default(0);
            $table->decimal('judicialFees', 12, 2)->default(0);

            $table->string('document_path')->nullable();
            
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contentieuxes');
    }
};
