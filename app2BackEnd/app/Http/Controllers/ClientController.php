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
        $clients = Client::with(['bien', 'payments'])->latest()->get();
        return response()->json($clients);
    }

    /**
     * Store a new client.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'bien_id'          => 'nullable|integer|exists:biens,id|unique:clients,bien_id',
            'nom'              => 'required|string|max:100',
            'prenom'           => 'required|string|max:100',
            'cin'              => 'required|string|max:20|unique:clients,cin',
            'tel'              => 'required|string|max:20',
            'date_reservation' => 'nullable|date',
            'avec_finition'    => 'nullable|boolean',
        ]);

        return DB::transaction(function () use ($validated) {
            $client = Client::create($validated);

            // Mark bien as Reserved when assigned
            if (!empty($validated['bien_id'])) {
                Bien::where('id', $validated['bien_id'])
                    ->update(['statut' => 'Reserve']);
            }

            return response()->json([
                'message' => 'Client ajouté avec succès.',
                'client'  => $client->fresh('bien'),
            ], 201);
        });
    }

    /**
     * Show a client.
     */
    public function show(Client $client): JsonResponse
    {
        return response()->json($client->load('bien'));
    }

    /**
     * Update a client.
     */
    public function update(Request $request, Client $client): JsonResponse
    {
        $validated = $request->validate([
            // Ignore the current client's bien_id when checking uniqueness
            'bien_id'          => 'nullable|integer|exists:biens,id|unique:clients,bien_id,' . $client->id,
            'nom'              => 'required|string|max:100',
            'prenom'           => 'required|string|max:100',
            'cin'              => 'required|string|max:20|unique:clients,cin,' . $client->id,
            'tel'              => 'required|string|max:20',
            'date_reservation' => 'nullable|date',
            'avec_finition'    => 'nullable|boolean',
        ]);

        return DB::transaction(function () use ($validated, $client) {
            $oldBienId = $client->bien_id;
            $newBienId = $validated['bien_id'] ?? null;

            $client->update($validated);

            // If bien changed, update statuts accordingly
            if ($oldBienId !== $newBienId) {
                if ($oldBienId) {
                    Bien::where('id', $oldBienId)->update(['statut' => 'Libre']);
                }
                if ($newBienId) {
                    Bien::where('id', $newBienId)->update(['statut' => 'Reserve']);
                    
                    // Retroactively associate any unassociated payments this client made
                    $client->payments()
                        ->whereNull('bien_id')
                        ->update(['bien_id' => $newBienId]);
                }
            }

            return response()->json([
                'message' => 'Client mis à jour avec succès.',
                'client'  => $client->fresh('bien'),
            ]);
        });
    }

    /**
     * Delete a client.
     */
    public function destroy(Client $client): JsonResponse
    {
        return DB::transaction(function () use ($client) {
            // Free the bien when client is deleted
            if ($client->bien_id) {
                Bien::where('id', $client->bien_id)->update(['statut' => 'Libre']);
            }

            // Remove client document directory
            Storage::disk('public')->deleteDirectory("clients/{$client->id}");

            $client->delete();
            return response()->json(['message' => 'Client supprimé.']);
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
            'client'   => $client->fresh('bien'),
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
            'client'  => $client->fresh('bien'),
        ]);
    }
}
