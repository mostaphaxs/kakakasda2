<?php

namespace App\Http\Controllers;

use App\Models\Bien;
use App\Models\SuiviFinition;
use App\Models\SuiviHistorique;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class SuiviController extends Controller
{
    /**
     * Get the full suivi data for a bien (gros oeuvre + finition checklist).
     */
    public function show(int $bienId): JsonResponse
    {
        $bien = Bien::with(['client', 'suiviFinition', 'suiviHistorique' => function($q) {
            $q->orderBy('date_realisation', 'desc');
        }])->findOrFail($bienId);

        return response()->json([
            'gros_oeuvre_pourcentage' => $bien->gros_oeuvre_pourcentage ?? 0,
            'avec_finition'           => $bien->client?->avec_finition ?? false,
            'suivi_finition'          => $bien->suiviFinition,
            'suivi_historique'        => $bien->suiviHistorique,
        ]);
    }

    /**
     * Update gros oeuvre percentage.
     */
    public function updateGrosOeuvre(Request $request, int $bienId): JsonResponse
    {
        $data = $request->validate([
            'pourcentage' => 'required|integer|min:0|max:100',
        ]);

        $bien = Bien::findOrFail($bienId);
        $bien->update(['gros_oeuvre_pourcentage' => $data['pourcentage']]);

        return response()->json(['message' => 'Gros Œuvre mis à jour.', 'pourcentage' => $bien->gros_oeuvre_pourcentage]);
    }

    /**
     * Sync the finition checklist for a bien.
     * Deletes all existing items and re-inserts, supporting multiple 'autre' rows.
     * Expects: [ { element, checked, label_custom? }, ... ]
     */
    public function updateFinition(Request $request, int $bienId): JsonResponse
    {
        $request->validate([
            'items'                  => 'required|array',
            'items.*.element'        => 'required|string|max:100',
            'items.*.checked'        => 'required|boolean',
            'items.*.label_custom'   => 'nullable|string|max:200',
        ]);

        Bien::findOrFail($bienId);

        // Wipe and re-insert for idempotency (handles multiple 'autre' rows)
        SuiviFinition::where('bien_id', $bienId)->delete();

        foreach ($request->items as $item) {
            SuiviFinition::create([
                'bien_id'      => $bienId,
                'element'      => $item['element'],
                'checked'      => $item['checked'],
                'label_custom' => $item['label_custom'] ?? null,
            ]);
        }

        $updated = SuiviFinition::where('bien_id', $bienId)->get();
        return response()->json(['message' => 'Finition mise à jour.', 'suivi_finition' => $updated]);
    }

    /**
     * Add an entry to the construction history.
     */
    public function addHistorique(Request $request, int $bienId): JsonResponse
    {
        $data = $request->validate([
            'type'             => 'required|in:gros_oeuvre,finition',
            'description'      => 'required|string',
            'date_realisation' => 'required|date',
        ]);

        Bien::findOrFail($bienId);

        $entry = SuiviHistorique::create([
            'bien_id'          => $bienId,
            'type'             => $data['type'],
            'description'      => $data['description'],
            'date_realisation' => $data['date_realisation'],
        ]);

        return response()->json(['message' => 'Événement ajouté à l\'historique.', 'entry' => $entry]);
    }

    /**
     * Delete an entry from the construction history.
     */
    public function deleteHistorique(int $bienId, int $historiqueId): JsonResponse
    {
        $entry = SuiviHistorique::where('bien_id', $bienId)->findOrFail($historiqueId);
        $entry->delete();

        return response()->json(['message' => 'Événement supprimé de l\'historique.']);
    }
}
