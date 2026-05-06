<?php

namespace App\Http\Controllers;

use App\Models\Sale;
use App\Models\Device;
use Illuminate\Http\Request;

class SaleController extends Controller
{
    public function index(Request $request)
    {
        return Sale::with(['device', 'customer'])->latest()->paginate(30);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'device_id'   => 'required|exists:devices,id',
            'customer_id' => 'nullable|exists:customers,id',
            'sale_price'  => 'required|numeric|min:0',
            'payment_method' => 'required|in:cash,card,transfer',
            'notes'       => 'nullable|string',
        ], [
            'device_id.required' => 'L\'appareil est obligatoire.',
            'device_id.exists'   => 'L\'appareil sélectionné n\'existe pas.',
            'sale_price.required' => 'Le prix de vente est obligatoire.',
            'payment_method.required' => 'Le mode de paiement est obligatoire.',
            'payment_method.in'       => 'Mode de paiement invalide (Espèces, Carte, Virement).',
        ]);

        $sale = Sale::create($data);
        // Mark device as sold
        Device::findOrFail($data['device_id'])->update(['sold_at' => now()]);

        return response()->json($sale->load(['device', 'customer']), 201);
    }

    public function show(Sale $sale)
    {
        return $sale->load(['device', 'customer']);
    }

    public function destroy(Sale $sale)
    {
        // Restore device availability
        $sale->device?->update(['sold_at' => null]);
        $sale->delete();
        return response()->noContent();
    }
}
