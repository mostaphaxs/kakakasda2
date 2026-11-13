<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Follow-ups / to-dos, optionally tied to a client or to any other contact. */
    public function up(): void
    {
        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('notes')->nullable();
            $table->date('due_date')->nullable();
            $table->string('due_time', 5)->nullable();          // "HH:MM"
            $table->string('priority')->default('normale');      // normale | haute
            $table->foreignId('client_id')->nullable()->constrained()->nullOnDelete();
            $table->string('contact_name')->nullable();          // someone who is not a client
            $table->string('contact_phone')->nullable();
            $table->timestamp('done_at')->nullable();
            $table->timestamps();
            $table->index(['done_at', 'due_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tasks');
    }
};
