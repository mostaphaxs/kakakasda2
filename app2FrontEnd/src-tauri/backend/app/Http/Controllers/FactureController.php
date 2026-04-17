<?php

namespace App\Http\Controllers;

use App\Models\Facture;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FactureController extends Controller
{
    public function index()
    {
        return response()->json(Facture::with('items')->latest()->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'invoice_no' => 'required|string|unique:factures,invoice_no',
            'date' => 'required|date',
            'client_name' => 'required|string',
            'client_address' => 'nullable|string',
            'client_ice' => 'nullable|string',
            'client_if' => 'nullable|string',
            'client_rc' => 'nullable|string',
            'supplier_name' => 'nullable|string',
            'supplier_address' => 'nullable|string',
            'supplier_ice' => 'nullable|string',
            'supplier_if' => 'nullable|string',
            'supplier_rc' => 'nullable|string',
            'bank_name' => 'nullable|string',
            'bank_account' => 'nullable|string',
            'payment_method' => 'nullable|string',
            'cheque_number' => 'nullable|string',
            'cheque_bank' => 'nullable|string',
            'description' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.designation' => 'required|string',
            'items.*.qty' => 'required|numeric|min:0.01',
            'items.*.unitPrice' => 'required|numeric|min:0',
            'items.*.vatRate' => 'required|numeric|min:0',
        ], [
            'invoice_no.required' => 'Le numéro de facture est obligatoire.',
            'invoice_no.unique' => 'Ce numéro de facture existe déjà.',
            'date.required' => 'La date est obligatoire.',
            'client_name.required' => 'Le nom du client est obligatoire.',
            'items.required' => 'Au moins un article est requis.',
            'items.min' => 'Au moins un article est requis.',
            'items.*.designation.required' => 'La désignation de l\'article est obligatoire.',
            'items.*.qty.required' => 'La quantité est obligatoire.',
            'items.*.unitPrice.required' => 'Le prix unitaire est obligatoire.',
            'items.*.vatRate.required' => 'Le taux de TVA est obligatoire.',
        ]);

        try {
            DB::beginTransaction();

            $totalHt = 0;
            $totalTva = 0;
            $totalTtc = 0;

            foreach ($validated['items'] as $item) {
                $ht = $item['qty'] * $item['unitPrice'];
                $tva = $ht * ($item['vatRate'] / 100);
                $ttc = $ht + $tva;

                $totalHt += $ht;
                $totalTva += $tva;
                $totalTtc += $ttc;
            }

            $facture = Facture::create([
                'invoice_no' => $validated['invoice_no'],
                'date' => $validated['date'],
                'client_name' => $validated['client_name'],
                'client_address' => $validated['client_address'],
                'client_ice' => $validated['client_ice'],
                'client_if' => $validated['client_if'],
                'client_rc' => $validated['client_rc'],
                'supplier_name' => $validated['supplier_name'] ?? null,
                'supplier_address' => $validated['supplier_address'] ?? null,
                'supplier_ice' => $validated['supplier_ice'] ?? null,
                'bank_name' => $validated['bank_name'] ?? null,
                'bank_account' => $validated['bank_account'] ?? null,
                'payment_method' => $validated['payment_method'] ?? null,
                'cheque_number' => $validated['cheque_number'] ?? null,
                'cheque_bank' => $validated['cheque_bank'] ?? null,
                'description' => $validated['description'],
                'total_ht' => $totalHt,
                'total_tva' => $totalTva,
                'total_ttc' => $totalTtc,
            ]);

            foreach ($validated['items'] as $item) {
                $ht = $item['qty'] * $item['unitPrice'];
                $ttc = $ht * (1 + $item['vatRate'] / 100);

                $facture->items()->create([
                    'designation' => $item['designation'],
                    'qty' => $item['qty'],
                    'unit_price' => $item['unitPrice'],
                    'vat_rate' => $item['vatRate'],
                    'total_ht' => $ht,
                    'total_ttc' => $ttc,
                ]);
            }

            DB::commit();

            return response()->json($facture->load('items'), 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Erreur lors de la sauvegarde: ' . $e->getMessage()], 500);
        }
    }

    public function show(Facture $facture)
    {
        return response()->json($facture->load('items'));
    }

    public function update(Request $request, Facture $facture)
    {
        $validated = $request->validate([
            'invoice_no' => 'required|string|unique:factures,invoice_no,' . $facture->id,
            'date' => 'required|date',
            'client_name' => 'required|string',
            'client_address' => 'nullable|string',
            'client_ice' => 'nullable|string',
            'client_if' => 'nullable|string',
            'client_rc' => 'nullable|string',
            'supplier_name' => 'nullable|string',
            'supplier_address' => 'nullable|string',
            'supplier_ice' => 'nullable|string',
            'supplier_if' => 'nullable|string',
            'supplier_rc' => 'nullable|string',
            'bank_name' => 'nullable|string',
            'bank_account' => 'nullable|string',
            'payment_method' => 'nullable|string',
            'cheque_number' => 'nullable|string',
            'cheque_bank' => 'nullable|string',
            'description' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.designation' => 'required|string',
            'items.*.qty' => 'required|numeric|min:0.01',
            'items.*.unitPrice' => 'required|numeric|min:0',
            'items.*.vatRate' => 'required|numeric|min:0',
        ], [
            'invoice_no.required' => 'Le numéro de facture est obligatoire.',
            'invoice_no.unique' => 'Ce numéro de facture existe déjà.',
            'date.required' => 'La date est obligatoire.',
            'client_name.required' => 'Le nom du client est obligatoire.',
            'items.required' => 'Au moins un article est requis.',
            'items.min' => 'Au moins un article est requis.',
            'items.*.designation.required' => 'La désignation de l\'article est obligatoire.',
            'items.*.qty.required' => 'La quantité est obligatoire.',
            'items.*.unitPrice.required' => 'Le prix unitaire est obligatoire.',
            'items.*.vatRate.required' => 'Le taux de TVA est obligatoire.',
        ]);

        try {
            DB::beginTransaction();

            $totalHt = 0;
            $totalTva = 0;
            $totalTtc = 0;

            foreach ($validated['items'] as $item) {
                $ht = $item['qty'] * $item['unitPrice'];
                $tva = $ht * ($item['vatRate'] / 100);
                $ttc = $ht + $tva;

                $totalHt += $ht;
                $totalTva += $tva;
                $totalTtc += $ttc;
            }

            $facture->update([
                'invoice_no' => $validated['invoice_no'],
                'date' => $validated['date'],
                'client_name' => $validated['client_name'],
                'client_address' => $validated['client_address'],
                'client_ice' => $validated['client_ice'],
                'client_if' => $validated['client_if'],
                'client_rc' => $validated['client_rc'],
                'supplier_name' => $validated['supplier_name'] ?? null,
                'supplier_address' => $validated['supplier_address'] ?? null,
                'supplier_ice' => $validated['supplier_ice'] ?? null,
                'bank_name' => $validated['bank_name'] ?? null,
                'bank_account' => $validated['bank_account'] ?? null,
                'payment_method' => $validated['payment_method'] ?? null,
                'cheque_number' => $validated['cheque_number'] ?? null,
                'cheque_bank' => $validated['cheque_bank'] ?? null,
                'description' => $validated['description'],
                'total_ht' => $totalHt,
                'total_tva' => $totalTva,
                'total_ttc' => $totalTtc,
            ]);

            // Clear old items and insert the new ones
            $facture->items()->delete();

            foreach ($validated['items'] as $item) {
                $ht = $item['qty'] * $item['unitPrice'];
                $ttc = $ht * (1 + $item['vatRate'] / 100);

                $facture->items()->create([
                    'designation' => $item['designation'],
                    'qty' => $item['qty'],
                    'unit_price' => $item['unitPrice'],
                    'vat_rate' => $item['vatRate'],
                    'total_ht' => $ht,
                    'total_ttc' => $ttc,
                ]);
            }

            DB::commit();

            return response()->json($facture->load('items'), 200);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Erreur lors de la modification: ' . $e->getMessage()], 500);
        }
    }

    public function destroy(Facture $facture)
    {
        $facture->delete();
        return response()->json(null, 204);
    }
}
