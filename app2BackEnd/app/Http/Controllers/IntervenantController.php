<?php

namespace App\Http\Controllers;

use App\Models\Intervenant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class IntervenantController extends Controller
{
    public function index()
    {
        return response()->json(Intervenant::with(['payments', 'terrain'])->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'categorie' => 'required|string',
            'nom_societe' => 'required|string|unique:intervenants,nom_societe',
            'nom_gerant' => 'required|string',
            'adresse' => 'required|string',
            'tel' => 'required|string',
            'if' => 'nullable|string',
            'ice' => 'nullable|string|unique:intervenants,ice',
            'rc' => 'nullable|string',
            'montant_global' => 'required|numeric',
            'scan_contrat' => 'nullable|file|mimes:pdf,jpg,png|max:5120',
            'description' => 'nullable|string',
        ]);

        if ($request->hasFile('scan_contrat')) {
            $path = $request->file('scan_contrat')->store('contracts', 'public');
            $validated['scan_contrat'] = $path;
        }

        $intervenant = Intervenant::create($validated);
        return response()->json($intervenant, 201);
    }

    public function show(Intervenant $intervenant)
    {
        return response()->json($intervenant->load('payments'));
    }

    public function update(Request $request, Intervenant $intervenant)
    {
        $validated = $request->validate([
            'categorie' => 'required|string',
            'nom_societe' => 'required|string|unique:intervenants,nom_societe,' . $intervenant->id,
            'nom_gerant' => 'required|string',
            'adresse' => 'required|string',
            'tel' => 'required|string',
            'if' => 'nullable|string',
            'ice' => 'nullable|string|unique:intervenants,ice,' . $intervenant->id,
            'rc' => 'nullable|string',
            'montant_global' => 'required|numeric',
            'scan_contrat' => 'nullable|file|mimes:pdf,jpg,png|max:5120',
            'description' => 'nullable|string',
            'terrain_id' => 'nullable|exists:terrains,id',
        ]);

        if ($request->hasFile('scan_contrat')) {
            if ($intervenant->scan_contrat) {
                Storage::disk('public')->delete($intervenant->scan_contrat);
            }
            $path = $request->file('scan_contrat')->store('contracts', 'public');
            $validated['scan_contrat'] = $path;
        }

        $intervenant->update($validated);
        return response()->json($intervenant);
    }

    public function destroy(Intervenant $intervenant)
    {
        if ($intervenant->scan_contrat) {
            Storage::disk('public')->delete($intervenant->scan_contrat);
        }
        $intervenant->delete();
        return response()->json(null, 204);
    }
}
