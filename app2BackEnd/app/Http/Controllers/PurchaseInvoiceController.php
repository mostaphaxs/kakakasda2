<?php

namespace App\Http\Controllers;

use App\Models\PurchaseInvoice;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PurchaseInvoiceController extends Controller
{
    public function index()
    {
        return PurchaseInvoice::with(['supplier', 'terrain', 'items.article', 'payments'])->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'invoice_no' => 'nullable|string|unique:purchase_invoices,invoice_no',
            'reference_bon' => 'nullable|string|unique:purchase_invoices,reference_bon',
            'supplier_id' => 'required|exists:suppliers,id',
            'terrain_id' => 'nullable|exists:terrains,id',
            'scan_contract' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
            'items' => 'required|array|min:1',
            'items.*.article_id' => 'required|exists:articles,id',
            'items.*.qty' => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.vat_rate' => 'nullable|numeric|min:0',
        ]);

        $total_ht = 0;
        $total_ttc = 0;

        foreach ($validated['items'] as $item) {
            $ht = $item['qty'] * $item['unit_price'];
            $ttc = $ht * (1 + (($item['vat_rate'] ?? 0) / 100));
            $total_ht += $ht;
            $total_ttc += $ttc;
        }

        $scanPath = null;
        if ($request->hasFile('scan_contract')) {
            $scanPath = $request->file('scan_contract')->store('scans', 'public');
        }

        $purchaseInvoice = DB::transaction(function () use ($validated, $total_ht, $total_ttc, $scanPath) {
            $invoice = PurchaseInvoice::create([
                'invoice_no' => $validated['invoice_no'] ?? null,
                'reference_bon' => $validated['reference_bon'] ?? null,
                'supplier_id' => $validated['supplier_id'],
                'terrain_id' => $validated['terrain_id'] ?? null,
                'total_ht' => $total_ht,
                'total_ttc' => $total_ttc,
                'scan_contract' => $scanPath,
            ]);

            foreach ($validated['items'] as $item) {
                $invoice->items()->create([
                    'article_id' => $item['article_id'],
                    'qty' => $item['qty'],
                    'unit_price' => $item['unit_price'],
                    'vat_rate' => $item['vat_rate'] ?? 0,
                ]);
            }

            return $invoice;
        });

        return response()->json($purchaseInvoice->load(['supplier', 'terrain', 'items.article', 'payments']), 201);
    }

    public function update(Request $request, PurchaseInvoice $purchase_invoice)
    {
        $validated = $request->validate([
            'invoice_no' => 'nullable|string|unique:purchase_invoices,invoice_no,' . $purchase_invoice->id,
            'reference_bon' => 'nullable|string|unique:purchase_invoices,reference_bon,' . $purchase_invoice->id,
            'supplier_id' => 'required|exists:suppliers,id',
            'terrain_id' => 'nullable|exists:terrains,id',
            'scan_contract' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
            'items' => 'required|array|min:1',
            'items.*.id' => 'nullable|exists:purchase_invoice_items,id',
            'items.*.article_id' => 'required|exists:articles,id',
            'items.*.qty' => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.vat_rate' => 'nullable|numeric|min:0',
        ]);

        $total_ht = 0;
        $total_ttc = 0;

        foreach ($validated['items'] as $item) {
            $ht = $item['qty'] * $item['unit_price'];
            $ttc = $ht * (1 + (($item['vat_rate'] ?? 0) / 100));
            $total_ht += $ht;
            $total_ttc += $ttc;
        }

        $scanPath = $purchase_invoice->scan_contract;
        if ($request->hasFile('scan_contract')) {
            if ($scanPath) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($scanPath);
            }
            $scanPath = $request->file('scan_contract')->store('scans', 'public');
        }

        DB::transaction(function () use ($validated, $purchase_invoice, $total_ht, $total_ttc, $scanPath) {
            $purchase_invoice->update([
                'invoice_no' => $validated['invoice_no'] ?? null,
                'reference_bon' => $validated['reference_bon'] ?? null,
                'supplier_id' => $validated['supplier_id'],
                'terrain_id' => $validated['terrain_id'] ?? null,
                'total_ht' => $total_ht,
                'total_ttc' => $total_ttc,
                'scan_contract' => $scanPath,
            ]);

            // Track item IDs provided to know which ones to delete
            $providedItemIds = collect($validated['items'])->pluck('id')->filter()->toArray();

            // Delete removed items individually so Model Events trigger (stock fixes)
            $itemsToDelete = $purchase_invoice->items()->whereNotIn('id', $providedItemIds)->get();
            foreach ($itemsToDelete as $item) {
                $item->delete();
            }

            // Sync provided items
            foreach ($validated['items'] as $itemData) {
                if (isset($itemData['id'])) {
                    $item = $purchase_invoice->items()->find($itemData['id']);
                    if ($item) {
                        $item->update([
                            'article_id' => $itemData['article_id'],
                            'qty' => $itemData['qty'],
                            'unit_price' => $itemData['unit_price'],
                            'vat_rate' => $itemData['vat_rate'] ?? 0,
                        ]);
                    }
                } else {
                    $purchase_invoice->items()->create([
                        'article_id' => $itemData['article_id'],
                        'qty' => $itemData['qty'],
                        'unit_price' => $itemData['unit_price'],
                        'vat_rate' => $itemData['vat_rate'] ?? 0,
                    ]);
                }
            }
        });

        return response()->json($purchase_invoice->load(['supplier', 'terrain', 'items.article', 'payments']));
    }

    public function destroy(PurchaseInvoice $purchase_invoice)
    {
        DB::transaction(function () use ($purchase_invoice) {
            // Delete items manually so model events fire (updating stock)
            foreach($purchase_invoice->items as $item) {
                $item->delete();
            }
            $purchase_invoice->delete();
        });
        
        return response()->json(['message' => 'Deleted successfully']);
    }

    public function addPayment(Request $request, PurchaseInvoice $purchase_invoice)
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'payment_date' => 'required|date',
            'method' => 'required|string',
            'reference_no' => 'nullable|string',
            'bank_name' => 'nullable|string',
            'notes' => 'nullable|string',
            'scan_path' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120',
        ]);

        if ($request->hasFile('scan_path')) {
            $path = $request->file('scan_path')->store('payments', 'public');
            $validated['scan_path'] = $path;
        }

        $purchase_invoice->payments()->create($validated);
        
        return response()->json($purchase_invoice->fresh(['supplier', 'terrain', 'items.article', 'payments']));
    }
}
