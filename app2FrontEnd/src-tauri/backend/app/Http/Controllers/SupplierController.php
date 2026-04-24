<?php

namespace App\Http\Controllers;

use App\Models\Supplier;
use App\Models\GuaranteeCheck;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SupplierController extends Controller
{
    public function index()
    {
        return Supplier::with('guaranteeChecks')->get();
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
            'type_entreprise' => 'nullable|string',
            'nom_gerant' => 'nullable|string',
            'adresse' => 'nullable|string',
            'tel' => 'nullable|string',
            'ice' => 'nullable|string',
            'if' => 'nullable|string',
            'rc' => 'nullable|string',
            'description' => 'nullable|string',
            'scan_contrat' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
            'rib' => 'nullable|string',
        ]);

        if ($request->hasFile('scan_contrat')) {
            $path = $request->file('scan_contrat')->store('suppliers/contracts', 'public');
            $validated['scan_contrat'] = $path;
        }

        $supplier = Supplier::create($validated);

        if ($request->has('guarantee_checks')) {
            foreach ($request->input('guarantee_checks') as $index => $checkData) {
                $checkValidated = [
                    'check_number' => $checkData['check_number'],
                    'amount' => $checkData['amount'],
                    'bank_name' => $checkData['bank_name'] ?? null,
                    'notes' => $checkData['notes'] ?? null,
                ];

                if ($request->hasFile("guarantee_checks.{$index}.scan_path")) {
                    $path = $request->file("guarantee_checks.{$index}.scan_path")->store('suppliers/guarantee_checks', 'public');
                    $checkValidated['scan_path'] = $path;
                }

                $supplier->guaranteeChecks()->create($checkValidated);
            }
        }

        return response()->json($supplier->load('guaranteeChecks'), 201);
    }

    public function show(Supplier $supplier)
    {
        return $supplier->load('guaranteeChecks');
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
            'type_entreprise' => 'nullable|string',
            'nom_gerant' => 'nullable|string',
            'adresse' => 'nullable|string',
            'tel' => 'nullable|string',
            'ice' => 'nullable|string',
            'if' => 'nullable|string',
            'rc' => 'nullable|string',
            'description' => 'nullable|string',
            'scan_contrat' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
            'rib' => 'nullable|string',
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

    public function addGuaranteeCheck(Request $request, Supplier $supplier)
    {
        $validated = $request->validate([
            'check_number' => 'required|string',
            'amount' => 'required|numeric',
            'bank_name' => 'nullable|string',
            'scan_path' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
            'notes' => 'nullable|string',
        ]);

        if ($request->hasFile('scan_path')) {
            $path = $request->file('scan_path')->store('suppliers/guarantee_checks', 'public');
            $validated['scan_path'] = $path;
        }

        $check = $supplier->guaranteeChecks()->create($validated);
        return response()->json($check, 201);
    }

    public function deleteGuaranteeCheck(GuaranteeCheck $check)
    {
        if ($check->scan_path) {
            \Storage::disk('public')->delete($check->scan_path);
        }
        $check->delete();
        return response()->noContent();
    }
}
