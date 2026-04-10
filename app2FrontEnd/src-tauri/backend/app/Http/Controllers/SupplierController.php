<?php

namespace App\Http\Controllers;

use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SupplierController extends Controller
{
    public function index()
    {
        return Supplier::all();
    }

    public function store(Request $request)
    {
        Log::info('Supplier Store Request:', $request->all());
        if ($request->hasFile('scan_contrat')) {
            Log::info('Scan Contrat File Detected:', [
                'name' => $request->file('scan_contrat')->getClientOriginalName(),
                'size' => $request->file('scan_contrat')->getSize()
            ]);
        }
        $validated = $request->validate([
            'nom_societe' => 'required|string',
            'nom_gerant' => 'nullable|string',
            'adresse' => 'nullable|string',
            'tel' => 'nullable|string',
            'ice' => 'nullable|string',
            'if' => 'nullable|string',
            'rc' => 'nullable|string',
            'description' => 'nullable|string',
            'scan_contrat' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
        ]);

        if ($request->hasFile('scan_contrat')) {
            $path = $request->file('scan_contrat')->store('suppliers/contracts', 'public');
            $validated['scan_contrat'] = $path;
        }

        $supplier = Supplier::create($validated);
        return response()->json($supplier, 201);
    }

    public function show(Supplier $supplier)
    {
        return $supplier;
    }

    public function update(Request $request, Supplier $supplier)
    {
        Log::info('Supplier Update Request (ID '.$supplier->id.'):', $request->all());
        if ($request->hasFile('scan_contrat')) {
            Log::info('Scan Contrat File Detected for Update:', [
                'name' => $request->file('scan_contrat')->getClientOriginalName(),
                'size' => $request->file('scan_contrat')->getSize()
            ]);
        }
        $validated = $request->validate([
            'nom_societe' => 'sometimes|required|string',
            'nom_gerant' => 'nullable|string',
            'adresse' => 'nullable|string',
            'tel' => 'nullable|string',
            'ice' => 'nullable|string',
            'if' => 'nullable|string',
            'rc' => 'nullable|string',
            'description' => 'nullable|string',
            'scan_contrat' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
        ]);

        if ($request->hasFile('scan_contrat')) {
            // Delete old if exists (optional but recommended)
            if ($supplier->scan_contrat) {
                \Storage::disk('public')->delete($supplier->scan_contrat);
            }
            $path = $request->file('scan_contrat')->store('suppliers/contracts', 'public');
            $validated['scan_contrat'] = $path;
        }

        $supplier->update($validated);
        return response()->json($supplier);
    }

    public function destroy(Supplier $supplier)
    {
        $supplier->delete();
        return response()->noContent();
    }
}
