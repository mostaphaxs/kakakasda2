<?php

namespace App\Http\Controllers;

use App\Models\Charge;
use Illuminate\Http\Request;

class ChargeController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return response()->json(Charge::with('terrain')->orderBy('periode', 'desc')->get());
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'frais_tel' => 'nullable|numeric',
            'internet' => 'nullable|numeric',
            'loyer_bureau' => 'nullable|numeric',
            'fournitures_bureau' => 'nullable|numeric',
            'employes_bureau' => 'nullable|numeric',
            'impots' => 'nullable|numeric',
            'gasoil' => 'nullable|numeric',
            'periode' => 'required|date',
            'terrain_id' => 'nullable|exists:terrains,id',
        ]);

        $charge = Charge::create($validated);
        return response()->json($charge, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Charge $charge)
    {
        return response()->json($charge);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Charge $charge)
    {
        $validated = $request->validate([
            'frais_tel' => 'nullable|numeric',
            'internet' => 'nullable|numeric',
            'loyer_bureau' => 'nullable|numeric',
            'fournitures_bureau' => 'nullable|numeric',
            'employes_bureau' => 'nullable|numeric',
            'impots' => 'nullable|numeric',
            'gasoil' => 'nullable|numeric',
            'periode' => 'required|date',
        ]);

        $charge->update($validated);
        return response()->json($charge);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Charge $charge)
    {
        $charge->delete();
        return response()->json(null, 204);
    }
}
