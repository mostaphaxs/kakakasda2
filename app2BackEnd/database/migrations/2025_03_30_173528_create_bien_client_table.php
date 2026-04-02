<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('bien_client')) {
            Schema::create('bien_client', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('bien_id');
                $table->unsignedBigInteger('client_id');
                $table->timestamps();

                $table->foreign('bien_id')->references('id')->on('biens')->onDelete('cascade');
                $table->foreign('client_id')->references('id')->on('clients')->onDelete('cascade');
            });
        }

        // Copy existing data from clients table if bien_id column exists
        if (Schema::hasColumn('clients', 'bien_id')) {
            $clients = DB::table('clients')->whereNotNull('bien_id')->get();
            foreach ($clients as $client) {
                DB::table('bien_client')->insert([
                    'bien_id' => $client->bien_id,
                    'client_id' => $client->id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            // Disable FK checks so SQLite allows dropping a column with FK reference
            DB::statement('PRAGMA foreign_keys = OFF');

            Schema::table('clients', function (Blueprint $table) {
                $table->dropColumn('bien_id');
            });

            DB::statement('PRAGMA foreign_keys = ON');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasColumn('clients', 'bien_id')) {
            Schema::table('clients', function (Blueprint $table) {
                $table->unsignedBigInteger('bien_id')->nullable();
            });
        }

        // Copy data back
        if (Schema::hasTable('bien_client')) {
            $pivotData = DB::table('bien_client')->get();
            foreach ($pivotData as $row) {
                DB::table('clients')
                    ->where('id', $row->client_id)
                    ->update(['bien_id' => $row->bien_id]);
            }
        }

        Schema::dropIfExists('bien_client');
    }
};
