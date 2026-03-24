<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;

Schema::table('biens', function (Blueprint $table) {
    try {
        $table->decimal('prix_par_m2_finition', 12, 2)->nullable();
        echo "Added prix_par_m2_finition\n";
    } catch (\Exception $e) { echo "prix_par_m2_finition already exists or error: " . $e->getMessage() . "\n"; }
    
    try {
        $table->decimal('prix_global_finition', 15, 2)->nullable();
        echo "Added prix_global_finition\n";
    } catch (\Exception $e) { echo "prix_global_finition already exists or error: " . $e->getMessage() . "\n"; }
    
    try {
        $table->decimal('prix_par_m2_non_finition', 12, 2)->nullable();
        echo "Added prix_par_m2_non_finition\n";
    } catch (\Exception $e) { echo "prix_par_m2_non_finition already exists or error: " . $e->getMessage() . "\n"; }
    
    try {
        $table->decimal('prix_global_non_finition', 15, 2)->nullable();
        echo "Added prix_global_non_finition\n";
    } catch (\Exception $e) { echo "prix_global_non_finition already exists or error: " . $e->getMessage() . "\n"; }
});
