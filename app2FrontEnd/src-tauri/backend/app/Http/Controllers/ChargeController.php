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
        $categories = ['loyer_bureau', 'fournitures_bureau', 'employes_bureau', 'impots', 'gasoil'];
        $rules = [
            'periode' => 'required|date',
            'terrain_id' => 'nullable|exists:terrains,id',
            'rib' => 'nullable|string|max:255',
        ];

        foreach ($categories as $cat) {
            $rules[$cat] = 'nullable|numeric';
            $rules["{$cat}_ref"] = 'nullable|string|max:255';
            $rules["{$cat}_scan"] = 'nullable|file|mimes:jpeg,png,jpg,pdf|max:2048';
        }

        $validated = $request->validate($rules);

        foreach ($categories as $cat) {
            if ($request->hasFile("{$cat}_scan")) {
                $path = $request->file("{$cat}_scan")->store('scans/charges', 'public');
                $validated["{$cat}_scan"] = $path;
            }
        }

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
        $categories = ['loyer_bureau', 'fournitures_bureau', 'employes_bureau', 'impots', 'gasoil'];
        $rules = [
            'periode' => 'required|date',
            'rib' => 'nullable|string|max:255',
        ];

        foreach ($categories as $cat) {
            $rules[$cat] = 'nullable|numeric';
            $rules["{$cat}_ref"] = 'nullable|string|max:255';
            $rules["{$cat}_scan"] = 'nullable|file|mimes:jpeg,png,jpg,pdf|max:2048';
        }

        $validated = $request->validate($rules);

        foreach ($categories as $cat) {
            if ($request->hasFile("{$cat}_scan")) {
                // Delete old file if exists
                if ($charge->{"{$cat}_scan"}) {
                    \Illuminate\Support\Facades\Storage::disk('public')->delete($charge->{"{$cat}_scan"});
                }
                $path = $request->file("{$cat}_scan")->store('scans/charges', 'public');
                $validated["{$cat}_scan"] = $path;
            }
        }

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
