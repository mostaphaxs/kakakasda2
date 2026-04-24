<?php

namespace App\Http\Controllers;

use App\Models\Salarie;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class SalarieController extends Controller
{
    private function payrollRules(bool $sometimes = false): array
    {
        $prefix = $sometimes ? 'sometimes|' : '';
        return [
            'name'               => $prefix . 'required|string|max:255',
            'cin'                => $prefix . 'nullable|string|max:255',
            'phone'              => $prefix . 'nullable|string|max:255',
            'speciality'         => $prefix . 'required|string|max:255',
            'grade'              => $prefix . 'nullable|string|max:255',
            'education'          => $prefix . 'nullable|string|max:255',
            'monthly_salary'     => $prefix . 'nullable|numeric|min:0',
            'bank_info'          => $prefix . 'nullable|string|max:255',
            'hiring_date'        => $prefix . 'nullable|date',
            'scan_contrat'       => $prefix . 'nullable|file|mimes:pdf,jpeg,png,jpg|max:5120',
            'active'             => $prefix . 'boolean',
            // Bulletin de Paie Fields
            'cnss_number'        => $prefix . 'nullable|string|max:255',
            'birth_date'         => $prefix . 'nullable|date',
            'matricule'          => $prefix . 'nullable|string|max:255',
            'fonction'           => $prefix . 'nullable|string|max:255',
            'marital_status'     => $prefix . 'nullable|string|max:255',
            'address'            => $prefix . 'nullable|string',
            // Cotisations Detailed
            'jours_travail'      => $prefix . 'nullable|numeric|min:0',
            'salaire_base'       => $prefix . 'nullable|numeric|min:0',
            'taux_anciennete'    => $prefix . 'nullable|numeric|min:0',
            'montant_anciennete' => $prefix . 'nullable|numeric|min:0',
            'anciennete_jours'   => $prefix . 'nullable|integer|min:0',
            'salaire_brut'       => $prefix . 'nullable|numeric|min:0',
            'taux_cnss'          => $prefix . 'nullable|numeric|min:0|max:100',
            'retenue_cnss'       => $prefix . 'nullable|numeric|min:0',
            'taux_amo'           => $prefix . 'nullable|numeric|min:0|max:100',
            'retenue_amo'        => $prefix . 'nullable|numeric|min:0',
            'taux_ir'            => $prefix . 'nullable|numeric|min:0|max:100',
            'retenue_ir'         => $prefix . 'nullable|numeric|min:0',
            // Primes
            'indemnite_transport'=> $prefix . 'nullable|numeric|min:0',
            'prime_panier'       => $prefix . 'nullable|numeric|min:0',
            'prime_rendement'    => $prefix . 'nullable|numeric|min:0',
            'arrondis'           => $prefix . 'nullable|numeric',
            // Totals & Net
            'total_gains'        => $prefix . 'nullable|numeric|min:0',
            'total_retenues'     => $prefix . 'nullable|numeric|min:0',
            'net_a_payer'        => $prefix . 'nullable|numeric|min:0',
            'rib'                => $prefix . 'nullable|string|max:255',
            'payment_method'     => $prefix . 'nullable|string|max:255',
            'payment_date'       => $prefix . 'nullable|date',
        ];
    }

    public function index()
    {
        return Salarie::orderBy('name')->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate($this->payrollRules());

        if ($request->hasFile('scan_contrat')) {
            $validated['scan_contrat'] = $request->file('scan_contrat')->store('salaries/contracts', 'public');
        }

        return Salarie::create($validated);
    }

    public function show(Salarie $salarie)
    {
        return $salarie;
    }

    public function update(Request $request, $id)
    {
        $salarie = Salarie::findOrFail($id);

        // 1. Validate using "sometimes" for all fields
        $validated = $request->validate($this->payrollRules(true));

        // 2. Handle file
        if ($request->hasFile('scan_contrat')) {
            if ($salarie->scan_contrat) {
                Storage::disk('public')->delete($salarie->scan_contrat);
            }
            $validated['scan_contrat'] = $request->file('scan_contrat')->store('salaries/contracts', 'public');
        }

        // 3. Specifically extract education from request to ensure it's not dropped
        // Laravel's validate() sometimes skips omitted nullable fields in PUT requests
        if ($request->has('education')) {
            $validated['education'] = $request->input('education');
        }

        // 4. Update
        $salarie->update($validated);
        
        return $salarie;
    }

    public function destroy(Salarie $salarie)
    {
        $salarie->delete();
        return response()->json(['message' => 'Salarié supprimé']);
    }
}
