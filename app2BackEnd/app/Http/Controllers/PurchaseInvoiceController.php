<?php

namespace App\Http\Controllers;

use App\Models\PurchaseInvoice;
use Illuminate\Http\Request;

class PurchaseInvoiceController extends Controller
{
    public function index()
    {
        return PurchaseInvoice::with(['article', 'supplier'])->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'invoice_no' => 'required|string',
            'supplier_id' => 'required|exists:suppliers,id',
            'article_id' => 'required|exists:articles,id',
            'qty' => 'required|numeric',
            'unit_price' => 'required|numeric',
            'vat_rate' => 'nullable|numeric',
        ]);

        return PurchaseInvoice::create($validated);
    }

    public function show(PurchaseInvoice $purchaseInvoice)
    {
        return $purchaseInvoice->load(['article', 'supplier']);
    }

    public function update(Request $request, PurchaseInvoice $purchaseInvoice)
    {
        $purchaseInvoice->update($request->all());
        return $purchaseInvoice;
    }

    public function destroy(PurchaseInvoice $purchaseInvoice)
    {
        $purchaseInvoice->delete();
        return response()->noContent();
    }
}
