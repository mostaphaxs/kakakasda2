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
            'cout_global'             => 'required|numeric|min:0',
            'frais_enregistrement'    => 'required|numeric|min:0',
            'frais_immatriculation'   => 'required|numeric|min:0',
            'honoraires_notaire'      => 'required|numeric|min:0',
            'autorisation_construction' => 'nullable|numeric|min:0',
            'autorisation_equipement'  => 'nullable|numeric|min:0',
            'frais_pompier'             => 'nullable|numeric|min:0',
            'frais_autorisation_intermediaire' => 'nullable|numeric|min:0',
            'total'                   => 'required|numeric|min:0',
        ]);

        $terrain = Terrain::create($validated);

        return response()->json([
            'message' => 'Terrain ajouté avec succès.',
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
            'cout_global'             => 'required|numeric|min:0',
            'frais_enregistrement'    => 'required|numeric|min:0',
            'frais_immatriculation'   => 'required|numeric|min:0',
            'honoraires_notaire'      => 'required|numeric|min:0',
            'autorisation_construction' => 'nullable|numeric|min:0',
            'autorisation_equipement'  => 'nullable|numeric|min:0',
            'frais_pompier'             => 'nullable|numeric|min:0',
            'frais_autorisation_intermediaire' => 'nullable|numeric|min:0',
            'total'                   => 'required|numeric|min:0',
        ]);

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
