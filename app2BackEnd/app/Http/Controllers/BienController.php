<?php

namespace App\Http\Controllers;

use App\Models\Bien;
use App\Models\SuiviFinition;
use Illuminate\Validation\Rule;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class BienController extends Controller
{
    /**
     * Display a listing of all biens.
     */
    public function index(): JsonResponse
    {
        $biens = Bien::with(['terrain', 'clients', 'suiviFinition'])->latest()->get();
        return response()->json($biens);
    }

    /**
     * Store a newly created bien in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'terrain_id'        => 'required|integer|exists:terrains,id',
            'nom'               => 'nullable|string|max:255',
            'type_bien'         => 'required|string|max:100',
            'groupe_habitation' => 'nullable|string|max:100',
            'immeuble'          => 'nullable|string|max:100',
            'etage'             => 'nullable|integer|min:-5|max:100',
            'num_appartement'   => [
                'nullable',
                'string',
                'max:20',
                Rule::unique('biens')->where('terrain_id', $request->terrain_id)
            ],
            'surface_m2'        => 'required|numeric|min:1|max:999999',
            'description'       => 'nullable|string|max:1000',
            'statut'            => 'nullable|in:Libre,Reserve,Vendu',
            'prix_par_m2_finition'       => 'nullable|numeric|min:0',
            'prix_global_finition'       => 'nullable|numeric|min:0',
            'prix_par_m2_non_finition'   => 'nullable|numeric|min:0',
            'prix_global_non_finition'   => 'nullable|numeric|min:0',
            'document_path'     => 'nullable|string|max:500',
            'gros_oeuvre_pourcentage'    => 'nullable|integer|min:0|max:100',
            'suivi_finition'             => 'nullable|array',
            'suivi_finition.*.element'   => 'required|string|max:100',
            'suivi_finition.*.label_custom' => 'nullable|string|max:255',
            'suivi_finition.*.checked'   => 'required|boolean',
        ]);

        $settingsFile = 'settings.json';
        $allSettings = \Illuminate\Support\Facades\Storage::exists($settingsFile)
            ? json_decode(\Illuminate\Support\Facades\Storage::get($settingsFile), true)
            : [];

        $terrainId = (string)$validated['terrain_id'];
        $projectCfg     = $allSettings['projects'][$terrainId] ?? null;
        $defaultFin     = $projectCfg['finition']    ?? $allSettings['default']['finition']    ?? 9000;
        $defaultGros    = $projectCfg['gros_oeuvre'] ?? $allSettings['default']['gros_oeuvre'] ?? 7000;

        $validated['prix_par_m2_finition']    = $validated['prix_par_m2_finition']    ?? $defaultFin;
        $validated['prix_global_finition']    = $validated['surface_m2'] * $validated['prix_par_m2_finition'];
        $validated['prix_par_m2_non_finition'] = $validated['prix_par_m2_non_finition'] ?? $defaultGros;
        $validated['prix_global_non_finition'] = $validated['surface_m2'] * $validated['prix_par_m2_non_finition'];
        
        $validated['statut'] = $validated['statut'] ?? 'Libre';

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
        return response()->json($bien->load(['terrain', 'suiviFinition']));
    }

    /**
     * Update the specified bien in storage.
     */
    public function update(Request $request, Bien $bien): JsonResponse
    {
        $validated = $request->validate([
            'terrain_id'        => 'sometimes|required|integer|exists:terrains,id',
            'nom'               => 'nullable|string|max:255',
            'type_bien'         => 'sometimes|required|string|max:100',
            'groupe_habitation' => 'nullable|string|max:100',
            'immeuble'          => 'nullable|string|max:100',
            'etage'             => 'nullable|integer|min:-5|max:100',
            'num_appartement'   => [
                'nullable',
                'string',
                'max:20',
                Rule::unique('biens')
                    ->where('terrain_id', $request->terrain_id ?? $bien->terrain_id)
                    ->ignore($bien->id)
            ],
            'surface_m2'        => 'sometimes|required|numeric|min:1|max:999999',
            'description'       => 'nullable|string|max:1000',
            'statut'            => 'nullable|in:Libre,Reserve,Vendu',
            'prix_par_m2_finition'       => 'sometimes|nullable|numeric|min:0',
            'prix_global_finition'       => 'sometimes|nullable|numeric|min:0',
            'prix_par_m2_non_finition'   => 'sometimes|nullable|numeric|min:0',
            'prix_global_non_finition'   => 'sometimes|nullable|numeric|min:0',
            'document_path'     => 'nullable|string|max:500',
            'gros_oeuvre_pourcentage'    => 'nullable|integer|min:0|max:100',
            'suivi_finition'             => 'nullable|array',
            'suivi_finition.*.element'   => 'required|string|max:100',
            'suivi_finition.*.label_custom' => 'nullable|string|max:255',
            'suivi_finition.*.checked'   => 'sometimes|boolean',
        ]);

        $surface = $validated['surface_m2'] ?? $bien->surface_m2;
        if (isset($validated['prix_par_m2_finition'])) {
            $validated['prix_global_finition'] = $surface * $validated['prix_par_m2_finition'];
        }
        if (isset($validated['prix_par_m2_non_finition'])) {
            $validated['prix_global_non_finition'] = $surface * $validated['prix_par_m2_non_finition'];
        }

        // Extract suivi_finition before passing validated data to model update
        $suiviFinitionItems = $validated['suivi_finition'] ?? null;
        unset($validated['suivi_finition']);

        $bien->update($validated);

        // Sync suivi_finition: wipe and recreate for idempotency
        if (!is_null($suiviFinitionItems)) {
            SuiviFinition::where('bien_id', $bien->id)->delete();
            foreach ($suiviFinitionItems as $item) {
                SuiviFinition::create([
                    'bien_id'      => $bien->id,
                    'element'      => $item['element'],
                    'label_custom' => $item['label_custom'] ?? null,
                    'checked'      => !empty($item['checked']) ? 1 : 0,
                ]);
            }
        }

        return response()->json([
            'message' => 'Bien mis à jour avec succès.',
            'bien'    => $bien->load('suiviFinition'),
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
