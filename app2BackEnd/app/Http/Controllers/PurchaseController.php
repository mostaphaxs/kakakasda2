<?php

namespace App\Http\Controllers;

use App\Models\Purchase;
use Illuminate\Http\Request;

class PurchaseController extends Controller
{
    public function index(Request $request)
    {
        $query = Purchase::with('supplier');
        if ($request->supplier_id) {
            $query->where('supplier_id', $request->supplier_id);
        }
        return $query->latest('purchase_date')->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'supplier_id' => 'required|exists:suppliers,id',
            'reference' => 'nullable|string',
            'designation' => 'nullable|string',
            'paid_amount' => 'required|numeric|min:0',
            'purchase_date' => 'required|date',
            'notes' => 'nullable|string',
            'lines' => 'required|array|min:1',
            'lines.*.article_id' => 'nullable|exists:articles,id',
            'lines.*.designation' => 'required|string',
            'lines.*.quantite' => 'required|numeric|min:1',
            'lines.*.prix_unitaire' => 'required|numeric|min:0',
            'lines.*.tva' => 'required|numeric|min:0',
        ]);

        $total_amount = 0;
        foreach ($validated['lines'] as &$line) {
            $line['total_ht'] = $line['quantite'] * $line['prix_unitaire'];
            $line['total_ttc'] = $line['total_ht'] * (1 + ($line['tva'] / 100));
            $total_amount += $line['total_ttc'];
        }
        $validated['total_amount'] = $total_amount;

        // Auto calculate status
        if ($validated['paid_amount'] >= $validated['total_amount']) {
            $validated['status'] = 'paid';
        } elseif ($validated['paid_amount'] > 0) {
            $validated['status'] = 'partial';
        } else {
            $validated['status'] = 'unpaid';
        }

        $purchase = Purchase::create(collect($validated)->except('lines')->toArray());
        
        foreach ($validated['lines'] as $lineData) {
            $purchase->lines()->create($lineData);
        }

        return $purchase->load('lines');
    }

    public function show(Purchase $purchase)
    {
        return $purchase->load('supplier');
    }

    public function update(Request $request, Purchase $purchase)
    {
        $validated = $request->validate([
            'reference' => 'nullable|string',
            'designation' => 'sometimes|required|string',
            'total_amount' => 'sometimes|required|numeric|min:0',
            'paid_amount' => 'sometimes|required|numeric|min:0',
            'purchase_date' => 'sometimes|required|date',
            'notes' => 'nullable|string',
        ]);

        if (isset($validated['paid_amount']) || isset($validated['total_amount'])) {
            $total = $validated['total_amount'] ?? $purchase->total_amount;
            $paid = $validated['paid_amount'] ?? $purchase->paid_amount;
            
            if ($paid >= $total) {
                $validated['status'] = 'paid';
            } elseif ($paid > 0) {
                $validated['status'] = 'partial';
            } else {
                $validated['status'] = 'unpaid';
            }
        }

        $purchase->update($validated);
        return $purchase;
    }

    public function destroy(Purchase $purchase)
    {
        $purchase->delete();
        return response()->noContent();
    }
}
