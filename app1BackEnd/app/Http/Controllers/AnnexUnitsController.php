<?php

namespace App\Http\Controllers;

use App\Models\annex_units;
use App\Models\Bien;
use Illuminate\Http\Request;

class AnnexUnitsController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = annex_units::query();
        
        if ($request->has('bien_id')) {
            $query->where('bien_id', $request->bien_id);
        }

        return response()->json($query->get());
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'bien_id' => 'required|exists:biens,id',
            'type' => 'required|string',
            'prix' => 'required|numeric',
        ]);

        $annex = annex_units::create($validated);
        
        // Update Bien prices
        $bien = Bien::findOrFail($validated['bien_id']);
        $bien->increment('prix_global_finition', $validated['prix']);
        $bien->increment('prix_global_non_finition', $validated['prix']);

        return response()->json($annex, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(annex_units $annex_unit)
    {
        return response()->json($annex_unit);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, annex_units $annex_unit)
    {
        $validated = $request->validate([
            'type' => 'required|string',
            'prix' => 'required|numeric',
        ]);

        $oldPrix = $annex_unit->prix;
        $annex_unit->update($validated);
        
        // Update Bien prices with difference
        $diff = $validated['prix'] - $oldPrix;
        if ($diff != 0) {
            $bien = $annex_unit->bien;
            $bien->increment('prix_global_finition', $diff);
            $bien->increment('prix_global_non_finition', $diff);
        }

        return response()->json($annex_unit);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(annex_units $annex_unit)
    {
        $bien = $annex_unit->bien;
        $prix = $annex_unit->prix;
        
        $annex_unit->delete();
        
        // Update Bien prices
        if ($bien) {
            $bien->decrement('prix_global_finition', $prix);
            $bien->decrement('prix_global_non_finition', $prix);
        }

        return response()->json(null, 204);
    }
}
