<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The purchase_invoices table still has old legacy columns (article_id, qty,
     * unit_price, vat_rate) with NOT NULL constraints left over from before the
     * refactor to purchase_invoice_items. SQLite cannot ALTER COLUMN directly.
     *
     * Strategy: create a corrected table → copy data → drop original → rename.
     * We NEVER rename the original, so SQLite 3.26+ does NOT auto-rewrite the FK
     * in purchase_invoice_items (which would break it when the backup is dropped).
     */
    public function up(): void
    {
        // Only run if legacy columns still exist (fresh installs won't have them)
        if (!Schema::hasColumn('purchase_invoices', 'qty')) {
            return;
        }

        DB::statement('PRAGMA foreign_keys=off;');

        // Get the current CREATE TABLE sql from sqlite_master
        $result = DB::select("SELECT sql FROM sqlite_master WHERE type='table' AND name='purchase_invoices'");
        $createSql = $result[0]->sql ?? null;

        if (!$createSql) {
            DB::statement('PRAGMA foreign_keys=on;');
            return;
        }

        // Strip NOT NULL from all four legacy columns
        $legacyColumns = ['article_id', 'qty', 'unit_price', 'vat_rate'];
        $newSql = $createSql;
        foreach ($legacyColumns as $col) {
            $newSql = preg_replace(
                '/("' . $col . '"\s+\w+(?:\([^)]*\))?[^,)]*)\s+NOT NULL/i',
                '$1',
                $newSql
            );
        }

        // Rename the new table target in sql (purchase_invoices → purchase_invoices_new)
        $newSql = preg_replace(
            '/CREATE TABLE\s+"purchase_invoices"/i',
            'CREATE TABLE "purchase_invoices_new"',
            $newSql,
            1
        );

        // Clean up any leftover from a previous failed run
        Schema::dropIfExists('purchase_invoices_new');

        // Create the corrected table under a temporary name
        DB::statement($newSql);

        // Copy all data from original into the new table
        $cols = collect(DB::select("PRAGMA table_info('purchase_invoices')"))
            ->pluck('name')
            ->implode(', ');
        DB::statement("INSERT INTO purchase_invoices_new ({$cols}) SELECT {$cols} FROM purchase_invoices");

        // Drop the original (FK in purchase_invoice_items still points here — OK since FK is off)
        Schema::dropIfExists('purchase_invoices');

        // Rename the fixed table to the canonical name
        DB::statement('ALTER TABLE "purchase_invoices_new" RENAME TO "purchase_invoices"');

        DB::statement('PRAGMA foreign_keys=on;');
    }

    public function down(): void
    {
        // Irreversible — data is preserved, constraints are simply loosened
    }
};
