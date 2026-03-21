<?php

namespace App\Http\Controllers;

use App\Models\ContractorPayment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ContractorPaymentController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'payable_id' => 'required|integer',
            'payable_type' => 'required|string',
            'amount' => 'required|numeric',
            'payment_date' => 'required|date',
            'method' => 'required|string',
            'reference_no' => 'nullable|string',
            'bank_name' => 'nullable|string',
            'notes' => 'nullable|string',
            'scan_path' => 'nullable|file|mimes:pdf,jpg,png|max:5120',
        ]);

        if ($request->hasFile('scan_path')) {
            $path = $request->file('scan_path')->store('payments', 'public');
            $validated['scan_path'] = $path;
        }

        $payment = ContractorPayment::create($validated);
        return response()->json($payment, 201);
    }

    public function update(Request $request, ContractorPayment $contractorPayment)
    {
        $validated = $request->validate([
            'amount' => 'nullable|numeric',
            'payment_date' => 'nullable|date',
            'method' => 'nullable|string',
            'reference_no' => 'nullable|string',
            'bank_name' => 'nullable|string',
            'notes' => 'nullable|string',
            'scan_path' => 'nullable|file|mimes:pdf,jpg,png|max:5120',
        ]);

        if ($request->hasFile('scan_path')) {
            if ($contractorPayment->scan_path) {
                Storage::disk('public')->delete($contractorPayment->scan_path);
            }
            $path = $request->file('scan_path')->store('payments', 'public');
            $validated['scan_path'] = $path;
        }

        $contractorPayment->update($validated);
        return response()->json($contractorPayment);
    }

    public function destroy(ContractorPayment $contractorPayment)
    {
        if ($contractorPayment->scan_path) {
            Storage::disk('public')->delete($contractorPayment->scan_path);
        }
        $contractorPayment->delete();
        return response()->json(null, 204);
    }
}
