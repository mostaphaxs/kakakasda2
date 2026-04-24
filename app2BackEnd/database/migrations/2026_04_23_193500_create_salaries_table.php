<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('salaries', function (Blueprint $create) {
            $create->id();
            $create->string('name');
            $create->string('cin')->nullable();
            $create->string('phone')->nullable();
            $create->string('speciality');
            $create->string('grade')->nullable();
            $create->string('education')->nullable();
            $create->decimal('monthly_salary', 15, 2)->default(0);
            $create->string('bank_info')->nullable();
            $create->date('hiring_date')->nullable();
            $create->boolean('active')->default(true);
            $create->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('salaries');
    }
};
