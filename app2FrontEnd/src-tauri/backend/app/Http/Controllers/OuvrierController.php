<?php

namespace App\Http\Controllers;

use App\Models\Ouvrier;
use App\Models\OuvrierMission;
use App\Rules\UniqueReference;
use Illuminate\Http\Request;

class OuvrierController extends Controller
{
    public function index()
    {
        return Ouvrier::with(['missions', 'payments'])->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'cin' => 'nullable|string',
            'speciality' => 'required|string',
            'phone' => 'nullable|string',
            'phone' => 'nullable|string',
            'scan_cin' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120',
            'rib' => 'nullable|string|max:255',
        ]);

        if ($request->hasFile('scan_cin')) {
            $validated['scan_cin'] = $request->file('scan_cin')->store('ouvriers/scans', 'public');
        }

        return Ouvrier::create($validated);
    }

    public function show($id)
    {
        return Ouvrier::with(['missions.terrain', 'payments'])->findOrFail($id);
    }

    public function update(Request $request, $id)
    {
        $ouvrier = Ouvrier::findOrFail($id);
        $validated = $request->validate([
            'name' => 'required|string',
            'cin' => 'nullable|string',
            'speciality' => 'required|string',
            'phone' => 'nullable|string',
            'phone' => 'nullable|string',
            'scan_cin' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120',
            'rib' => 'nullable|string|max:255',
        ]);

        if ($request->hasFile('scan_cin')) {
            $validated['scan_cin'] = $request->file('scan_cin')->store('ouvriers/scans', 'public');
        }

        $ouvrier->update($validated);
        return $ouvrier;
    }

    public function storeMission(Request $request, $id)
    {
        $ouvrier = Ouvrier::findOrFail($id);
        $validated = $request->validate([
            'terrain_id' => 'nullable|exists:terrains,id',
            'type' => 'required|in:journalier,periode,m2,ml,forfait',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date',
            'quantity' => 'required|numeric',
            'unit_price' => 'required|numeric',
            'description' => 'nullable|string',
        ]);

        return $ouvrier->missions()->create($validated);
    }

    public function updateMission(Request $request, $id)
    {
        $mission = OuvrierMission::findOrFail($id);
        $validated = $request->validate([
            'terrain_id' => 'nullable|exists:terrains,id',
            'type' => 'required|in:journalier,periode,m2,ml,forfait',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date',
            'quantity' => 'required|numeric',
            'unit_price' => 'required|numeric',
            'description' => 'nullable|string',
            'status' => 'required|in:pending,completed',
        ]);

        $mission->update($validated);
        return $mission;
    }

    public function storePayment(Request $request, $id)
    {
        $ouvrier = Ouvrier::findOrFail($id);
        $validated = $request->validate([
            'amount' => 'required|numeric',
            'payment_date' => 'required|date',
            'method' => 'required|string',
            'reference_no' => ['nullable', 'string', new UniqueReference()],
            'bank_name' => 'nullable|string',
            'bank_commission' => 'nullable|numeric',
            'notes' => 'nullable|string',
        ]);

        if ($request->hasFile('scan_path')) {
            $validated['scan_path'] = $request->file('scan_path')->store('payments', 'public');
        }

        return $ouvrier->payments()->create($validated);
    }

    public function destroy($id)
    {
        Ouvrier::findOrFail($id)->delete();
        return response()->json(['message' => 'Ouvrier supprimé']);
    }

    public function destroyMission($id)
    {
        OuvrierMission::findOrFail($id)->delete();
        return response()->json(['message' => 'Mission supprimée']);
    }

    public function destroyPayment($id)
    {
        \App\Models\ContractorPayment::findOrFail($id)->delete();
        return response()->json(['message' => 'Paiement supprimé']);
    }
}
