<?php

namespace App\Http\Controllers;

use App\Models\Device;
use App\Services\SmartPricingService;
use Illuminate\Http\Request;

class DeviceController extends Controller
{
    public function __construct(protected SmartPricingService $pricingService) {}

    /**
     * GET /api/devices
     * Supports filtering by condition, brand, and a search query (IMEI/model/brand).
     */
    public function index(Request $request)
    {
        $query = Device::query();

        if ($request->filled('condition')) {
            $query->where('condition', $request->condition);
        }

        if ($request->filled('brand')) {
            $query->where('brand', 'like', "%{$request->brand}%");
        }

        // Full-text search across key fields (SQLite LIKE — fast with the right index)
        if ($request->filled('q')) {
            $q = $request->q;
            $query->where(function ($sub) use ($q) {
                $sub->where('imei', 'like', "%{$q}%")
                    ->orWhere('serial_number', 'like', "%{$q}%")
                    ->orWhere('model', 'like', "%{$q}%")
                    ->orWhere('brand', 'like', "%{$q}%");
            });
        }

        return $query->latest()->paginate(30);
    }

    /**
     * POST /api/devices
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'brand'             => 'required|string',
            'model'             => 'required|string',
            'imei'              => 'nullable|string|unique:devices,imei',
            'serial_number'     => 'nullable|string|unique:devices,serial_number',
            'condition'         => 'required|in:New,Used,Refurbished',
            'color'             => 'nullable|string',
            'storage_capacity'  => 'nullable|string',
            'purchase_price'    => 'required|numeric|min:0',
            'suggested_price'   => 'nullable|numeric|min:0',
            'technical_specs'   => 'nullable|array',
            'notes'             => 'nullable|string',
        ], [
            'brand.required' => 'La marque est obligatoire.',
            'model.required' => 'Le modèle est obligatoire.',
            'imei.unique'    => 'Cet IMEI est déjà enregistré.',
            'serial_number.unique' => 'Ce numéro de série est déjà enregistré.',
            'condition.required' => 'La condition est obligatoire.',
            'condition.in'       => 'Condition invalide (Neuf, Occasion, Reconditionné).',
            'purchase_price.required' => 'Le prix d\'achat est obligatoire.',
        ]);

        $device = Device::create($data);

        // Auto-suggest price if not provided
        if (!$device->suggested_price) {
            $suggested = $this->pricingService->suggestPrice($device);
            if ($suggested) {
                $device->update(['suggested_price' => $suggested]);
            }
        }

        return response()->json($device, 201);
    }

    /**
     * GET /api/devices/{id}
     */
    public function show(Device $device)
    {
        return $device;
    }

    /**
     * PUT /api/devices/{id}
     */
    public function update(Request $request, Device $device)
    {
        $data = $request->validate([
            'brand'             => 'sometimes|string',
            'model'             => 'sometimes|string',
            'imei'              => "nullable|string|unique:devices,imei,{$device->id}",
            'serial_number'     => "nullable|string|unique:devices,serial_number,{$device->id}",
            'condition'         => 'sometimes|in:New,Used,Refurbished',
            'color'             => 'nullable|string',
            'storage_capacity'  => 'nullable|string',
            'purchase_price'    => 'sometimes|numeric|min:0',
            'suggested_price'   => 'nullable|numeric|min:0',
            'technical_specs'   => 'nullable|array',
            'notes'             => 'nullable|string',
        ]);

        $device->update($data);
        return $device;
    }

    /**
     * DELETE /api/devices/{id}
     */
    public function destroy(Device $device)
    {
        $device->delete();
        return response()->noContent();
    }

    /**
     * POST /api/devices/{id}/suggest-price
     * Manually trigger AI price suggestion.
     */
    public function suggestPrice(Device $device)
    {
        $price = $this->pricingService->suggestPrice($device);

        if (!$price) {
            return response()->json(['error' => 'La tarification IA est indisponible pour le moment.'], 503);
        }

        $device->update(['suggested_price' => $price]);
        return response()->json([
            'suggested_price' => $price, 
            'device' => $device,
            'message' => 'Prix suggéré avec succès !'
        ]);
    }
}
