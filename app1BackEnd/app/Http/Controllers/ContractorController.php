<?php

namespace App\Http\Controllers;

use App\Models\Contractor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ContractorController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return response()->json(Contractor::with(['payments', 'terrain'])->get());
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'categorie' => 'required|string',
            'nom_societe' => 'required|string|unique:contractors,nom_societe',
            'nom_gerant' => 'required|string',
            'adresse' => 'required|string',
            'tel' => 'required|string',
            'if' => 'nullable|string',
            'ice' => 'nullable|string|unique:contractors,ice',
            'rc' => 'nullable|string',
            'montant_global' => 'required|numeric',
            'scan_contrat' => 'nullable|file|mimes:pdf,jpg,png|max:5120',
            'description' => 'nullable|string',
            'terrain_id' => 'nullable|exists:terrains,id',
        ]);

        if ($request->hasFile('scan_contrat')) {
            $path = $request->file('scan_contrat')->store('contracts', 'public');
            $validated['scan_contrat'] = $path;
        }

        $contractor = Contractor::create($validated);
        return response()->json($contractor, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Contractor $contractor)
    {
        return response()->json($contractor->load('payments'));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Contractor $contractor)
    {
        $validated = $request->validate([
            'categorie' => 'required|string',
            'nom_societe' => 'required|string|unique:contractors,nom_societe,' . $contractor->id,
            'nom_gerant' => 'required|string',
            'adresse' => 'required|string',
            'tel' => 'required|string',
            'if' => 'nullable|string',
            'ice' => 'nullable|string|unique:contractors,ice,' . $contractor->id,
            'rc' => 'nullable|string',
            'montant_global' => 'required|numeric',
            'scan_contrat' => 'nullable|file|mimes:pdf,jpg,png|max:5120',
            'description' => 'nullable|string',
            'terrain_id' => 'nullable|exists:terrains,id',
        ]);

        if ($request->hasFile('scan_contrat')) {
            // Delete old file if exists
            if ($contractor->scan_contrat) {
                Storage::disk('public')->delete($contractor->scan_contrat);
            }
            $path = $request->file('scan_contrat')->store('contracts', 'public');
            $validated['scan_contrat'] = $path;
        }

        $contractor->update($validated);
        return response()->json($contractor);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Contractor $contractor)
    {
        if ($contractor->scan_contrat) {
            Storage::disk('public')->delete($contractor->scan_contrat);
        }
        $contractor->delete();
        return response()->json(null, 204);
    }
}
