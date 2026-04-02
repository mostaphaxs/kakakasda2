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
        Schema::create('bien_client', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bien_id')->constrained('biens')->onDelete('cascade');
            $table->foreignId('client_id')->constrained('clients')->onDelete('cascade');
            $table->timestamps();
        });

        // Copy existing data from clients table to bien_client pivot table
        $clients = DB::table('clients')->whereNotNull('bien_id')->get();
        foreach ($clients as $client) {
            DB::table('bien_client')->insert([
                'bien_id' => $client->bien_id,
                'client_id' => $client->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // Drop bien_id from clients table
        Schema::table('clients', function (Blueprint $table) {
            $table->dropForeign(['bien_id']);
            $table->dropColumn('bien_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->foreignId('bien_id')->nullable()->constrained('biens')->onDelete('set null');
        });

        // Copy data back (optional but recommended for complete rollback)
        $pivotData = DB::table('bien_client')->get();
        foreach ($pivotData as $row) {
            DB::table('clients')
                ->where('id', $row->client_id)
                ->update(['bien_id' => $row->bien_id]);
        }

        Schema::dropIfExists('bien_client');
    }
};
