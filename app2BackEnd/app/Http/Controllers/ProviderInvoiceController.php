<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Models\ProviderInvoice;
use Illuminate\Support\Facades\Storage;

class ProviderInvoiceController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'service_provider_id' => 'required|exists:service_providers,id',
            'amount' => 'required|numeric',
            'reference' => 'nullable|string|max:255',
            'scan_path' => 'nullable|file|mimes:jpeg,png,jpg,gif,svg,pdf|max:2048',
            'invoice_date' => 'required|date',
            'notes' => 'nullable|string',
            'terrain_id' => 'nullable|exists:terrains,id',
        ]);

        if ($request->hasFile('scan_path')) {
            $path = $request->file('scan_path')->store('scans/service_invoices', 'public');
            $validated['scan_path'] = $path;
        }

        return ProviderInvoice::create($validated);
    }

    public function update(Request $request, string $id)
    {
        $invoice = ProviderInvoice::findOrFail($id);
        $validated = $request->validate([
            'amount' => 'required|numeric',
            'reference' => 'nullable|string|max:255',
            'scan_path' => 'nullable|file|mimes:jpeg,png,jpg,gif,svg,pdf|max:2048',
            'invoice_date' => 'required|date',
            'notes' => 'nullable|string',
            'terrain_id' => 'nullable|exists:terrains,id',
        ]);

        if ($request->hasFile('scan_path')) {
            if ($invoice->scan_path) {
                Storage::disk('public')->delete($invoice->scan_path);
            }
            $path = $request->file('scan_path')->store('scans/service_invoices', 'public');
            $validated['scan_path'] = $path;
        }

        $invoice->update($validated);
        return $invoice;
    }

    public function destroy(string $id)
    {
        $invoice = ProviderInvoice::findOrFail($id);
        if ($invoice->scan_path) {
            Storage::disk('public')->delete($invoice->scan_path);
        }
        $invoice->delete();
        return response()->noContent();
    }
}
