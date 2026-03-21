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
        Schema::table('suppliers', function (Blueprint $table) {
            if (Schema::hasColumn('suppliers', 'name')) {
                $table->renameColumn('name', 'nom_societe');
            } else if (!Schema::hasColumn('suppliers', 'nom_societe')) {
                $table->string('nom_societe')->after('id');
            }
            
            $table->string('nom_gerant')->nullable()->after('nom_societe');
            $table->string('adresse')->nullable()->after('nom_gerant');
            $table->string('tel')->nullable()->after('adresse');
            $table->string('rc')->nullable()->after('if');
            $table->string('scan_contrat')->nullable()->after('rc');
            $table->text('description')->nullable()->after('scan_contrat');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('suppliers', function (Blueprint $table) {
            $table->dropColumn(['nom_societe', 'nom_gerant', 'adresse', 'tel', 'rc', 'scan_contrat', 'description']);
        });
    }
};
