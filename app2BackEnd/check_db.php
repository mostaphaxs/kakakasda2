<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

$columns = Schema::getColumnListing('salaries');
echo "Columns in 'salaries' table:\n";
print_r($columns);

$sample = DB::table('salaries')->first();
echo "\nSample record:\n";
print_r($sample);
