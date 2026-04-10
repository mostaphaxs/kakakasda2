<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Create purchase_invoice_items table safely
        if (!Schema::hasTable('purchase_invoice_items')) {
            Schema::create('purchase_invoice_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('purchase_invoice_id')->constrained('purchase_invoices')->onDelete('cascade');
                $table->foreignId('article_id')->constrained('articles');
                $table->decimal('qty', 10, 2);
                $table->decimal('unit_price', 10, 2);
                $table->decimal('vat_rate', 5, 2)->default(0)->nullable();
                $table->timestamps();
            });
        }

        // 2. Add total_ht and total_ttc to purchase_invoices
        if (!Schema::hasColumn('purchase_invoices', 'total_ht')) {
            Schema::table('purchase_invoices', function (Blueprint $table) {
                $table->decimal('total_ht', 15, 2)->default(0)->after('supplier_id');
                $table->decimal('total_ttc', 15, 2)->default(0)->after('total_ht');
            });
        }

        // 3. Migrate data
        $invoices = DB::table('purchase_invoices')->get();
        foreach ($invoices as $invoice) {
            // Check if qty/unit_price exist in case they somehow got dropped
            if (!isset($invoice->qty) || !isset($invoice->unit_price)) continue;
            if (!isset($invoice->article_id)) continue;
            
            // Check if already migrated to avoid duplicates
            $exists = DB::table('purchase_invoice_items')
                ->where('purchase_invoice_id', $invoice->id)
                ->where('article_id', $invoice->article_id)
                ->exists();
                
            if (!$exists) {
                $ht = $invoice->qty * $invoice->unit_price;
                $ttc = $ht * (1 + (($invoice->vat_rate ?? 0) / 100));

                DB::table('purchase_invoice_items')->insert([
                    'purchase_invoice_id' => $invoice->id,
                    'article_id' => $invoice->article_id,
                    'qty' => $invoice->qty,
                    'unit_price' => $invoice->unit_price,
                    'vat_rate' => $invoice->vat_rate ?? 0,
                    'created_at' => $invoice->created_at,
                    'updated_at' => $invoice->updated_at,
                ]);

                DB::table('purchase_invoices')
                    ->where('id', $invoice->id)
                    ->update([
                        'total_ht' => $ht,
                        'total_ttc' => $ttc,
                    ]);
            }
        }

        // 4. Intentionally disable dropping old columns to prevent SQLite DDL locks
        // Schema::table('purchase_invoices', function (Blueprint $table) {
        //     $table->dropColumn(['article_id', 'qty', 'unit_price', 'vat_rate']);
        // });
    }

    public function down(): void
    {
        Schema::dropIfExists('purchase_invoice_items');
        // Schema::table('purchase_invoices', function (Blueprint $table) {
        //     $table->dropColumn(['total_ht', 'total_ttc']);
        // });
    }
};
