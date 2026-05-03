<?php

namespace App\Http\Controllers;

use App\Models\Bien;
use App\Models\Terrain;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class TerrainMapController extends Controller
{
    public function show($terrainId): JsonResponse
    {
        $terrain = Terrain::findOrFail($terrainId);

        $biens = Bien::where('terrain_id', $terrainId)
            ->with(['clients']) // Eager load clients
            ->get()
            ->map(function (Bien $b) {
                // Calculate total cost from missions linked to this bien
                $missionCost = \DB::table('ouvrier_missions')
                    ->where('bien_id', $b->id)
                    ->sum('total_amount') ?? 0;

                // Calculate total payments received for this bien
                $totalPaid = \DB::table('payments')
                    ->where('bien_id', $b->id)
                    ->where('status', '!=', 'cancelled')
                    ->sum('amount') ?? 0;

                $client = $b->clients->first();
                $clientName = $client ? "{$client->nom} {$client->prenom}" : null;
                
                // Determine Sale Price based on client's finishing choice or default to non-finition
                $salePrice = 0;
                if ($client) {
                    $salePrice = $client->avec_finition 
                        ? (float) $b->prix_global_finition 
                        : (float) $b->prix_global_non_finition;
                }

                return [
                    'id'          => $b->id,
                    'nom'         => $b->nom ?? $b->type_bien ?? "Bien #{$b->id}",
                    'type_bien'   => $b->type_bien,
                    'surface_m2'  => $b->surface_m2,
                    'map_x'       => $b->map_x,
                    'map_y'       => $b->map_y,
                    'map_w'       => $b->map_w,
                    'map_h'       => $b->map_h,
                    'total_cost'  => (float) $missionCost,
                    'total_paid'  => (float) $totalPaid,
                    'sale_price'  => (float) $salePrice,
                    'client_name' => $clientName,
                    'client_id'   => $client ? $client->id : null,
                    'progress'    => $b->finition_pourcentage, // 0 to 100
                    'statut'      => $b->statut, // Libre, Reserve, Vendu
                ];
            });

        return response()->json($biens);
    }

    /**
     * PUT /terrain-map/{terrain_id}
     * Saves positions (map_x, map_y, map_w, map_h) for all biens.
     */
    public function update(Request $request, $terrainId): JsonResponse
    {
        $validated = $request->validate([
            'biens'           => 'required|array',
            'biens.*.id'      => 'required|integer|exists:biens,id',
            'biens.*.map_x'   => 'required|numeric|min:0',
            'biens.*.map_y'   => 'required|numeric|min:0',
            'biens.*.map_w'   => 'required|numeric|min:20',
            'biens.*.map_h'   => 'required|numeric|min:20',
        ]);

        foreach ($validated['biens'] as $bienData) {
            Bien::where('id', $bienData['id'])
                ->where('terrain_id', $terrainId)
                ->update([
                    'map_x' => $bienData['map_x'],
                    'map_y' => $bienData['map_y'],
                    'map_w' => $bienData['map_w'],
                    'map_h' => $bienData['map_h'],
                ]);
        }

        return response()->json(['message' => 'Positions sauvegardées avec succès.']);
    }
}
