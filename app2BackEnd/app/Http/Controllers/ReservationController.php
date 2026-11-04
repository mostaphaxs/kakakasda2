<?php

namespace App\Http\Controllers;

use App\Models\Bien;
use App\Models\Client;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Reserve a free unit for an existing client in one click (availability grid).
 * Same rules as ClientController@update: one unit per client, unit becomes
 * "Reserve", unassigned payments of the client are linked to it.
 */
class ReservationController extends Controller
{
    public function reserve(Request $request, Bien $bien): JsonResponse
    {
        $v = $request->validate(['client_id' => 'required|exists:clients,id']);
        $client = Client::with('biens')->findOrFail($v['client_id']);

        if ($bien->statut !== 'Libre' || $bien->clients()->exists()) {
            return response()->json(['message' => "Ce bien n'est plus disponible."], 422);
        }
        if ($client->statut === 'Annulé') {
            return response()->json(['message' => 'Ce client est annulé.'], 422);
        }
        if ($client->biens->isNotEmpty()) {
            return response()->json(['message' => 'Ce client a déjà un bien réservé.'], 422);
        }

        DB::transaction(function () use ($client, $bien) {
            $client->biens()->sync([$bien->id]);
            $bien->update(['statut' => 'Reserve']);
            if (!$client->date_reservation) {
                $client->update(['date_reservation' => now()->toDateString()]);
            }
            $client->payments()->whereNull('bien_id')->update(['bien_id' => $bien->id]);
        });

        return response()->json([
            'message' => 'Bien réservé pour ' . trim("{$client->prenom} {$client->nom}") . '.',
            'client' => $client->fresh('biens'),
        ]);
    }
}
