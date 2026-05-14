    <?php

namespace App\Http\Controllers;

use App\Models\Bien;
use App\Models\Client;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ClientController extends Controller
{
    /**
     * List all clients.
     */
    public function index(): JsonResponse
    {
        $clients = Client::with(['biens', 'payments'])->latest()->get();
        return response()->json($clients);
    }

    /**
     * Store a new client.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'bien_id'          => 'nullable|integer|exists:biens,id',
            'nom'              => 'required|string|max:100',
            'prenom'           => 'required|string|max:100',
            'cin'              => 'required|string|max:20',
            'tel'              => 'required|string|max:20',
            'tel_2'            => 'nullable|string|max:20',
            'email'            => 'nullable|email|max:100',
            'adresse'          => 'nullable|string|max:255',
            'date_reservation' => 'nullable|date',
            'avec_finition'    => 'nullable|boolean',
            'avec_contrat'     => 'nullable|boolean',
            'statut_choix'     => 'nullable|string|in:SANS_CHOIX,CHOIX_FAIT,CONTRAT_SIGNE',
            'scan_contrat'     => 'nullable|file|mimes:pdf,jpeg,png,jpg|max:5120',
            'observation'      => 'nullable|string',
        ]);


        if ($request->hasFile('scan_contrat')) {
            $validated['scan_contrat'] = $request->file('scan_contrat')->store('clients/contracts', 'public');
        } else {
            unset($validated['scan_contrat']);
        }

        return DB::transaction(function () use ($validated) {
            $client = Client::create($validated);

            if (!empty($validated['bien_id'])) {
                $client->biens()->sync([$validated['bien_id']]);
                Bien::where('id', $validated['bien_id'])->update(['statut' => 'Reserve']);
            }

            return response()->json([
                'message' => 'Client ajouté avec succès.',
                'client'  => $client->fresh('biens'),
            ], 201);
        });
    }

    /**
     * Show a client.
     */
    public function show(Client $client): JsonResponse
    {
        return response()->json($client->load('biens'));
    }

    /**
     * Update a client.
     */
    public function update(Request $request, Client $client): JsonResponse
    {
        $validated = $request->validate([
            'bien_id'          => 'nullable|integer|exists:biens,id',
            'nom'              => 'required|string|max:100',
            'prenom'           => 'required|string|max:100',
            'cin'              => 'required|string|max:20',
            'tel'              => 'required|string|max:20',
            'tel_2'            => 'nullable|string|max:20',
            'email'            => 'nullable|email|max:100',
            'adresse'          => 'nullable|string|max:255',
            'date_reservation' => 'nullable|date',
            'avec_finition'    => 'nullable|boolean',
            'avec_contrat'     => 'nullable|boolean',
            'statut_choix'     => 'nullable|string|in:SANS_CHOIX,CHOIX_FAIT,CONTRAT_SIGNE',
            'scan_contrat'     => 'nullable|file|mimes:pdf,jpeg,png,jpg|max:5120',
            'observation'      => 'nullable|string',
            'statut'           => 'nullable|string|in:Actif,Annulé',
        ]);

        if ($request->hasFile('scan_contrat')) {
            $validated['scan_contrat'] = $request->file('scan_contrat')->store('clients/contracts', 'public');
        } else {
            unset($validated['scan_contrat']);
        }

        return DB::transaction(function () use ($validated, $client) {
            $oldBienIds = $client->biens()->pluck('biens.id')->toArray();
            $newBienId = $validated['bien_id'] ?? null;
            $oldStatus = $client->statut;
            $newStatus = $validated['statut'] ?? $client->statut;

            $client->update($validated);
            
            if ($newStatus === 'Annulé' && $oldStatus !== 'Annulé') {
                $client->biens()->detach();
                if (!empty($oldBienIds)) {
                    Bien::whereIn('id', $oldBienIds)->update(['statut' => 'Libre']);
                }
            } else {
                $client->biens()->sync($newBienId ? [$newBienId] : []);

                // Free removed biens
                $removed = array_diff($oldBienIds, $newBienId ? [$newBienId] : []);
                if (!empty($removed)) {
                    Bien::whereIn('id', $removed)->update(['statut' => 'Libre']);
                }

                // Reserve new one IF client is Actif
                if ($newBienId && $newStatus === 'Actif') {
                    Bien::where('id', $newBienId)->update(['statut' => 'Reserve']);
                    
                    // Retroactively associate any unassociated payments
                    $client->payments()
                        ->whereNull('bien_id')
                        ->update(['bien_id' => $newBienId]);
                }
            }

            return response()->json([
                'message' => 'Client mis à jour avec succès.',
                'client'  => $client->fresh('biens'),
            ]);
        });
    }

    /**
     * Delete a client.
     */
    public function destroy(Client $client): JsonResponse
    {
        return DB::transaction(function () use ($client) {
            $bienIds = $client->biens()->pluck('biens.id')->toArray();
            
            // Free the biens
            if (!empty($bienIds)) {
                Bien::whereIn('id', $bienIds)->update(['statut' => 'Libre']);
            }

            $client->biens()->detach();

            // Remove client document directory
            Storage::disk('public')->deleteDirectory("clients/{$client->id}");

            $client->delete();
            return response()->json(['message' => 'Client supprimé.']);
        });
    }

    /**
     * Cancel a client deal.
     */
    public function cancel(Request $request, Client $client): JsonResponse
    {
        $validated = $request->validate([
            'refund_amount' => 'nullable|numeric|min:0',
            'notes'         => 'nullable|string',
        ]);

        return DB::transaction(function () use ($validated, $client) {
            // 1. Update status and save motif to observation
            $client->update([
                'statut' => 'Annulé',
                'observation' => $validated['notes'] ?? $client->observation
            ]);

            // 2. Free and detach associated biens
            $bienIds = $client->biens()->pluck('biens.id')->toArray();
            if (!empty($bienIds)) {
                Bien::whereIn('id', $bienIds)->update(['statut' => 'Libre']);
                $client->biens()->detach();
            }

            // 3. Handle refund if provided
            if (!empty($validated['refund_amount'])) {
                $lastPayment = $client->payments()->latest()->first();
                if ($lastPayment) {
                    $lastPayment->update([
                        'refund_amount' => $validated['refund_amount'],
                        'notes' => ($lastPayment->notes ? $lastPayment->notes . "\n" : "") . "REFUND ON CANCELLATION: " . ($validated['notes'] ?? '')
                    ]);
                }
            }

            return response()->json([
                'message' => 'Contrat annulé avec succès.',
                'client'  => $client->fresh('biens'),
            ]);
        });
    }

    /**
     * Upload a document for the client.
     */
    public function uploadDocument(Request $request, Client $client): JsonResponse
    {
        $request->validate([
            'document' => 'required|file|max:10240', // 10MB max
            'title'    => 'nullable|string|max:255',
        ]);

        $file = $request->file('document');
        $fileName = time() . '_' . $file->getClientOriginalName();
        $path = $file->storeAs("clients/{$client->id}", $fileName, 'public');

        $docData = [
            'name'       => $request->input('title', $file->getClientOriginalName()),
            'file_name'  => $fileName,
            'path'       => $path,
            'size'       => $file->getSize(),
            'mime_type'  => $file->getMimeType(),
            'created_at' => now()->toIso8601String(),
        ];

        $docs = $client->scanned_docs ?? [];
        $docs[] = $docData;
        $client->update(['scanned_docs' => $docs]);

        return response()->json([
            'message'  => 'Document ajouté avec succès.',
            'document' => $docData,
            'client'   => $client->fresh('biens'),
        ], 201);
    }

    /**
     * Delete a document for the client.
     */
    public function deleteDocument(Request $request, Client $client, int $documentIndex): JsonResponse
    {
        $docs = $client->scanned_docs ?? [];
        
        if (!isset($docs[$documentIndex])) {
            return response()->json(['message' => 'Document introuvable.'], 404);
        }

        $docToDelete = $docs[$documentIndex];
        
        // Delete from physical storage
        if (Storage::disk('public')->exists($docToDelete['path'])) {
            Storage::disk('public')->delete($docToDelete['path']);
        }

        // Remove from array and update DB
        array_splice($docs, $documentIndex, 1);
        $client->update(['scanned_docs' => $docs]);

        return response()->json([
            'message' => 'Document supprimé.',
            'client'  => $client->fresh('biens'),
        ]);
    }
    /**
     * Search for a client by CIN.
     */
    public function searchByCin(string $cin): JsonResponse
    {
        $cleanInput = trim(strtoupper($cin));
        
        // 1. Try exact match (but normalized)
        $client = Client::whereRaw('UPPER(TRIM(cin)) = ?', [$cleanInput])
            ->with(['biens.terrain', 'payments'])
            ->first();
            
        // 2. Try match without any spaces if not found
        if (!$client) {
            $client = Client::where('cin', 'like', "%{$cleanInput}%")
                ->with(['biens.terrain', 'payments'])
                ->first();
        }

        if (!$client) {
            // Very safe suggestion logic
            $suggestions = \DB::table('clients')->limit(5)->pluck('cin')->toArray();
            
            return response()->json([
                'message' => "CIN \"{$cin}\" introuvable.",
                'suggestions' => $suggestions
            ], 404);
        }
        return response()->json($client);
    }
}
