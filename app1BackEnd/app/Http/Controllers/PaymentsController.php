<?php

namespace App\Http\Controllers;

use App\Models\payments;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class PaymentsController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        //
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'client_id'    => 'required|exists:clients,id',
            'bien_id'      => 'nullable|exists:biens,id',
            'amount'       => 'required|numeric|min:0.01',
            'payment_date' => 'required|date',
            'type'         => 'required|in:Avance,Tranche,Reliquat,Caution',
            'method'       => 'required|string',
            'reference_no' => 'nullable|string',
            'bank_name'    => 'nullable|string',
            'notes'        => 'nullable|string',
            'receipt'      => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:5120',
        ]);

        if ($request->hasFile('receipt')) {
            $path = $request->file('receipt')->store('receipts', 'public');
            $validated['receipt_path'] = $path;
        }

        $payment = payments::create($validated);

        return response()->json([
            'message' => 'Paiement enregistré avec succès.',
            'payment' => $payment->load('client', 'bien'),
        ], 201);
    }

    /**
     * Cancel a payment and record refund amount.
     */
    public function cancel(Request $request, payments $payment)
    {
        $validated = $request->validate([
            'refund_amount' => 'required|numeric|min:0|max:' . $payment->amount,
        ]);

        $payment->update([
            'status' => 'Cancelled',
            'refund_amount' => $validated['refund_amount'],
        ]);

        return response()->json([
            'message' => 'Paiement annulé avec succès.',
            'payment' => $payment,
        ]);
    }

    /**
     * Associate an unassociated payment with a property.
     */
    public function associate(Request $request, payments $payment)
    {
        $validated = $request->validate([
            'bien_id' => 'required|exists:biens,id',
        ]);

        if ($payment->bien_id) {
            return response()->json(['message' => 'Ce paiement est déjà associé à un bien.'], 422);
        }

        $payment->update([
            'bien_id' => $validated['bien_id'],
        ]);

        return response()->json([
            'message' => 'Paiement associé au bien avec succès.',
            'payment' => $payment->load('bien'),
        ]);
    }

    /**
     * Display the specified resource.
     */
    public function show(payments $payment)
    {
        return response()->json($payment->load('client', 'bien'));
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(payments $payments)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, payments $payment)
    {
        $validated = $request->validate([
            'amount'       => 'nullable|numeric|min:0.01',
            'payment_date' => 'nullable|date',
            'type'         => 'nullable|in:Avance,Tranche,Reliquat,Caution',
            'method'       => 'nullable|string',
            'reference_no' => 'nullable|string',
            'bank_name'    => 'nullable|string',
            'notes'        => 'nullable|string',
            'receipt'      => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:5120',
        ]);

        if ($request->hasFile('receipt')) {
            // Delete old receipt if exists
            if ($payment->receipt_path) {
                Storage::disk('public')->delete($payment->receipt_path);
            }
            $path = $request->file('receipt')->store('receipts', 'public');
            $validated['receipt_path'] = $path;
        }

        $payment->update($validated);

        return response()->json([
            'message' => 'Paiement mis à jour avec succès.',
            'payment' => $payment,
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(payments $payment)
    {
        if ($payment->receipt_path) {
            Storage::disk('public')->delete($payment->receipt_path);
        }
        $payment->delete();

        return response()->json([
            'message' => 'Paiement supprimé avec succès.'
        ], 200);
    }
}
