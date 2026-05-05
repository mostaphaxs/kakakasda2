<?php

namespace App\Http\Controllers;

use App\Models\Terrain;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class TerrainController extends Controller
{
    /**
     * Return all terrains.
     */
    public function index(): JsonResponse
    {
        $terrains = Terrain::orderBy('id', 'desc')->get();
        return response()->json($terrains);
    }

    /**
     * Store a newly created terrain.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nom_terrain'             => 'nullable|string|max:255',
            'nom_projet'              => 'required|string|max:255',
            'numero_TF'               => 'nullable|string|max:255',
            'date_acquisition'        => 'nullable|string|max:20',
            'cout_global'             => 'nullable|numeric|min:0',
            'frais_enregistrement'    => 'nullable|numeric|min:0',
            'frais_immatriculation'   => 'nullable|numeric|min:0',
            'honoraires_notaire'      => 'nullable|numeric|min:0',
            'autorisation_construction' => 'nullable|numeric|min:0',
            'autorisation_equipement'  => 'nullable|numeric|min:0',
            'frais_pompier'             => 'nullable|numeric|min:0',
            'frais_autorisation_intermediaire' => 'nullable|numeric|min:0',
            'total'                   => 'nullable|numeric|min:0',
            'description'             => 'nullable|string',
        ]);

        $validated['cout_global'] = $validated['cout_global'] ?? 0;
        $validated['frais_enregistrement'] = $validated['frais_enregistrement'] ?? 0;
        $validated['frais_immatriculation'] = $validated['frais_immatriculation'] ?? 0;
        $validated['honoraires_notaire'] = $validated['honoraires_notaire'] ?? 0;
        $validated['autorisation_construction'] = $validated['autorisation_construction'] ?? 0;
        $validated['autorisation_equipement'] = $validated['autorisation_equipement'] ?? 0;
        $validated['frais_pompier'] = $validated['frais_pompier'] ?? 0;
        $validated['frais_autorisation_intermediaire'] = $validated['frais_autorisation_intermediaire'] ?? 0;
        $validated['total'] = $validated['total'] ?? 0;

        $terrain = Terrain::create($validated);

        return response()->json([
            'message' => 'Terrain ajouté avec succès.',
            'id'      => $terrain->id,
            'terrain' => $terrain,
        ], 201);
    }

    /**
     * Display the specified terrain.
     */
    public function show(Terrain $terrain): JsonResponse
    {
        return response()->json($terrain);
    }

    /**
     * Update the specified terrain in storage.
     */
    public function update(Request $request, Terrain $terrain): JsonResponse
    {
        $validated = $request->validate([
            'nom_terrain'             => 'nullable|string|max:255',
            'nom_projet'              => 'required|string|max:255',
            'numero_TF'               => 'nullable|string|max:255',
            'date_acquisition'        => 'nullable|string|max:20',
            'cout_global'             => 'nullable|numeric|min:0',
            'frais_enregistrement'    => 'nullable|numeric|min:0',
            'frais_immatriculation'   => 'nullable|numeric|min:0',
            'honoraires_notaire'      => 'nullable|numeric|min:0',
            'autorisation_construction' => 'nullable|numeric|min:0',
            'autorisation_equipement'  => 'nullable|numeric|min:0',
            'frais_pompier'             => 'nullable|numeric|min:0',
            'frais_autorisation_intermediaire' => 'nullable|numeric|min:0',
            'total'                   => 'nullable|numeric|min:0',
            'description'             => 'nullable|string',
        ]);

        $validated['cout_global'] = $validated['cout_global'] ?? 0;
        $validated['frais_enregistrement'] = $validated['frais_enregistrement'] ?? 0;
        $validated['frais_immatriculation'] = $validated['frais_immatriculation'] ?? 0;
        $validated['honoraires_notaire'] = $validated['honoraires_notaire'] ?? 0;
        $validated['autorisation_construction'] = $validated['autorisation_construction'] ?? 0;
        $validated['autorisation_equipement'] = $validated['autorisation_equipement'] ?? 0;
        $validated['frais_pompier'] = $validated['frais_pompier'] ?? 0;
        $validated['frais_autorisation_intermediaire'] = $validated['frais_autorisation_intermediaire'] ?? 0;
        $validated['total'] = $validated['total'] ?? 0;

        $terrain->update($validated);

        return response()->json([
            'message' => 'Terrain mis à jour avec succès.',
            'terrain' => $terrain,
        ]);
    }

    /**
     * Remove the specified terrain.
     */
    public function destroy(Terrain $terrain): JsonResponse
    {
        $terrain->delete();
        return response()->json(['message' => 'Terrain supprimé.']);
    }
}
