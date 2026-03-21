<?php

namespace App\Http\Controllers;

use App\Models\Bien;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class BienController extends Controller
{
    /**
     * Display a listing of all biens.
     */
    public function index(): JsonResponse
    {
        $biens = Bien::with(['terrain', 'client', 'suiviFinition'])->latest()->get();
        return response()->json($biens);
    }

    /**
     * Store a newly created bien in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'terrain_id'        => 'required|integer|exists:terrains,id',
            'type_bien'         => 'required|string|max:100',
            'groupe_habitation' => 'nullable|string|max:100',
            'immeuble'          => 'nullable|string|max:100',
            'etage'             => 'nullable|integer|min:-5|max:100',
            'num_appartement'   => 'nullable|string|max:20',
            'surface_m2'        => 'required|numeric|min:1|max:999999',
            'description'       => 'nullable|string|max:1000',
            'statut'            => 'required|in:Libre,Reserve,Vendu',
            'prix_par_m2_finition'       => 'required|numeric|min:0',
            'prix_global_finition'       => 'required|numeric|min:0',
            'prix_par_m2_non_finition'   => 'required|numeric|min:0',
            'prix_global_non_finition'   => 'required|numeric|min:0',
            'document_path'     => 'nullable|string|max:500',
            'gros_oeuvre_pourcentage'    => 'nullable|integer|min:0|max:100',
            'suivi_finition'             => 'nullable|array',
            'suivi_finition.*.element'   => 'required|string|max:100',
            'suivi_finition.*.label_custom' => 'nullable|string|max:255',
            'suivi_finition.*.checked'   => 'required|boolean',
        ]);

        $bien = Bien::create($validated);

        // Initialize suivi finition if provided
        if ($request->has('suivi_finition') && is_array($request->suivi_finition)) {
            foreach ($request->suivi_finition as $item) {
                $bien->suiviFinition()->create([
                    'element'      => $item['element'],
                    'label_custom' => $item['label_custom'] ?? null,
                    'checked'      => $item['checked'] ? 1 : 0,
                ]);
            }
        }

        return response()->json([
            'message' => 'Bien ajouté avec succès.',
            'bien'    => $bien->load('suiviFinition'),
        ], 201);
    }

    /**
     * Display the specified bien.
     */
    public function show(Bien $bien): JsonResponse
    {
        return response()->json($bien->load('terrain'));
    }

    /**
     * Update the specified bien in storage.
     */
    public function update(Request $request, Bien $bien): JsonResponse
    {
        $validated = $request->validate([
            'terrain_id'        => 'sometimes|required|integer|exists:terrains,id',
            'type_bien'         => 'sometimes|required|string|max:100',
            'groupe_habitation' => 'nullable|string|max:100',
            'immeuble'          => 'nullable|string|max:100',
            'etage'             => 'nullable|integer|min:-5|max:100',
            'num_appartement'   => 'nullable|string|max:20',
            'surface_m2'        => 'sometimes|required|numeric|min:1|max:999999',
            'description'       => 'nullable|string|max:1000',
            'statut'            => 'sometimes|required|in:Libre,Reserve,Vendu',
            'prix_par_m2_finition'       => 'sometimes|required|numeric|min:0',
            'prix_global_finition'       => 'sometimes|required|numeric|min:0',
            'prix_par_m2_non_finition'   => 'sometimes|required|numeric|min:0',
            'prix_global_non_finition'   => 'sometimes|required|numeric|min:0',
            'document_path'     => 'nullable|string|max:500',
        ]);

        $bien->update($validated);

        return response()->json([
            'message' => 'Bien mis à jour avec succès.',
            'bien'    => $bien,
        ]);
    }

    /**
     * Remove the specified bien from storage.
     */
   public function destroy($bienId): JsonResponse
{
    Bien::destroy($bienId);
    
    // Returns 200 OK. The message will actually be sent.
    return response()->json(['message' => 'Bien supprimé.'], 200);
}
}
