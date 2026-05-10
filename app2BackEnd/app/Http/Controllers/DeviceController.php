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
        $query = Device::with('supplier');

        if ($request->filled('condition')) {
            $query->where('condition', $request->condition);
        }

        if ($request->filled('brand')) {
            $query->where('brand', 'like', "%{$request->brand}%");
        }

        // Full-text search across key fields and technical specs
        if ($request->filled('q')) {
            $q = $request->q;
            $query->where(function ($sub) use ($q) {
                $sub->where('imei', 'like', "%{$q}%")
                    ->orWhere('serial_number', 'like', "%{$q}%")
                    ->orWhere('model', 'like', "%{$q}%")
                    ->orWhere('brand', 'like', "%{$q}%")
                    ->orWhere('technical_specs', 'like', "%{$q}%");
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
            'category'          => 'nullable|string',
            'color'             => 'nullable|string',
            'storage_capacity'  => 'nullable|string',
            'purchase_price'    => 'required|numeric|min:0',
            'suggested_price'   => 'nullable|numeric|min:0',
            'technical_specs'   => 'nullable|array',
            'notes'             => 'nullable|string',
            'supplier_id'       => 'nullable|exists:suppliers,id',
            'quantity'          => 'nullable|integer|min:1',
        ], [
            'brand.required' => 'La marque est obligatoire.',
            'model.required' => 'Le modèle est obligatoire.',
            'imei.unique'    => 'Cet IMEI est déjà enregistré.',
            'serial_number.unique' => 'Ce numéro de série est déjà enregistré.',
            'condition.required' => 'La condition est obligatoire.',
            'condition.in'       => 'Condition invalide (Neuf, Occasion, Reconditionné).',
            'purchase_price.required' => 'Le prix d\'achat est obligatoire.',
            'supplier_id.exists' => 'Le fournisseur sélectionné n\'existe pas.',
        ]);

        $device = Device::create($data);

        // Auto-suggest price if not provided
        if (!$device->suggested_price) {
            $suggested = $this->pricingService->suggestPrice($device);
            if ($suggested) {
                $device->update(['suggested_price' => $suggested]);
            }
        }

        return response()->json($device->load('supplier'), 201);
    }

    /**
     * GET /api/devices/{id}
     */
    public function show(Device $device)
    {
        return $device->load('supplier');
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
            'category'          => 'nullable|string',
            'color'             => 'nullable|string',
            'storage_capacity'  => 'nullable|string',
            'purchase_price'    => 'sometimes|numeric|min:0',
            'suggested_price'   => 'nullable|numeric|min:0',
            'technical_specs'   => 'nullable|array',
            'notes'             => 'nullable|string',
            'supplier_id'       => 'nullable|exists:suppliers,id',
            'quantity'          => 'nullable|integer|min:1',
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

    /**
     * POST /api/devices/fetch-specs
     * Auto-fill specs based on brand and model.
     */
    public function fetchSpecs(Request $request)
    {
        $request->validate([
            'q' => 'required|string',
        ]);

        $specs = $this->pricingService->fetchTechnicalSpecs($request->q);

        if (!$specs) {
            return response()->json(['error' => 'Impossible de récupérer les specs via IA.'], 503);
        }

        return response()->json($specs);
    }

    public function scanDocument(Request $request)
    {
        $request->validate([
            'image' => 'required|file|mimes:jpeg,png,jpg,pdf|max:20480', // Support PDF & images, max 20MB
        ]);

        try {
            $file = $request->file('image');
            $base64 = base64_encode(file_get_contents($file->getRealPath()));
            $mime = $file->getClientMimeType();

            $specs = $this->pricingService->analyzeDocument($base64, $mime);

            if (!$specs) {
                return response()->json(['error' => 'L\'IA n\'a pas pu extraire de données.'], 503);
            }

            return response()->json($specs);
        } catch (\Exception $e) {
            \Log::error('ScanDocument Error: ' . $e->getMessage());
            return response()->json(['error' => 'Erreur technique lors du scan.'], 500);
        }
    }
}
