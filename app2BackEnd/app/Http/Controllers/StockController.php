<?php

namespace App\Http\Controllers;

use App\Models\StockTracking;
use Illuminate\Http\Request;

class StockController extends Controller
{
    public function index()
    {
        return StockTracking::with(['article', 'destination'])->get();
    }

    public function lowStock()
    {
        return StockTracking::with('article')
            ->where('remaining_stock', '<', 10)
            ->get();
    }

    public function exitStock(Request $request)
    {
        $validated = $request->validate([
            'article_id' => 'required|exists:articles,id',
            'qty' => 'required|numeric|min:0.01',
            'destination_id' => 'required|exists:biens,id',
        ]);

        $stock = StockTracking::where('article_id', $validated['article_id'])->first();

        if (!$stock) {
            return response()->json(['message' => 'Aucun stock trouvé pour cet article. Veuillez d\'abord enregistrer une entrée de stock.'], 404);
        }

        if ($stock->remaining_stock < $validated['qty']) {
            return response()->json(['message' => 'Insufficient stock'], 400);
        }

        $stock->consumed_qty += $validated['qty'];
        $stock->destination_id = $validated['destination_id'];
        $stock->remaining_stock = $stock->initial_stock - $stock->consumed_qty;
        $stock->save();

        return response()->json([
            'message' => 'Stock exit recorded successfully',
            'stock' => $stock->load(['article', 'destination'])
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
    }
}
