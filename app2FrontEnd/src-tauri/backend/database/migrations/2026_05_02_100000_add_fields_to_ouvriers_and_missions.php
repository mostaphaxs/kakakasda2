<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ouvriers', function (Blueprint $table) {
            $table->string('phone_whatsapp')->nullable()->after('phone');
        });

        Schema::table('ouvrier_missions', function (Blueprint $table) {
            $table->string('partner_name')->nullable()->after('description');
        });
    }

    public function down(): void
    {
        Schema::table('ouvriers', function (Blueprint $table) {
            $table->dropColumn('phone_whatsapp');
        });

        Schema::table('ouvrier_missions', function (Blueprint $table) {
            $table->dropColumn('partner_name');
        });
    }
};
