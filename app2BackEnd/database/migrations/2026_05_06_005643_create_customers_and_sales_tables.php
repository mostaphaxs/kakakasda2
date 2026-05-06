<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->nullable()->unique();
            $table->string('phone')->nullable();
            $table->text('address')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('sales', function (Blueprint $table) {
            $table->id();
            $table->foreignId('device_id')->constrained()->cascadeOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('sale_price', 15, 2);
            $table->enum('payment_method', ['cash', 'card', 'transfer'])->default('cash');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        // Add sold_at to devices
        Schema::table('devices', function (Blueprint $table) {
            $table->timestamp('sold_at')->nullable()->after('notes');
        });
    }

    public function down(): void {
        Schema::dropIfExists('sales');
        Schema::dropIfExists('customers');
        Schema::table('devices', fn($t) => $t->dropColumn('sold_at'));
    }
};
