<?php

namespace App\Http\Controllers;

use App\Models\GeneralWork;
use App\Rules\UniqueReference;
use Illuminate\Http\Request;

class GeneralWorkController extends Controller
{
    public function index()
    {
        return GeneralWork::with(['supplier', 'terrain'])->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'supplier_id' => 'required|exists:suppliers,id',
            'terrain_id' => 'required|exists:terrains,id',
            'work_type' => 'required|string',
            'total_amount' => 'required|numeric',
            'paid_amount' => 'nullable|numeric',
            'bank_commission' => 'nullable|numeric|min:0',
            'method' => 'nullable|string',
            'reference_no' => ['nullable', 'string', new UniqueReference()],
            'bank_name' => 'nullable|string',
            'rib' => 'nullable|string',
            'description' => 'nullable|string',
        ]);

        return GeneralWork::create($validated);
    }

    public function show(GeneralWork $generalWork)
    {
        return $generalWork->load(['supplier', 'terrain']);
    }

    public function update(Request $request, GeneralWork $generalWork)
    {
        $validated = $request->validate([
            'supplier_id' => 'nullable|exists:suppliers,id',
            'terrain_id' => 'nullable|exists:terrains,id',
            'work_type' => 'nullable|string',
            'total_amount' => 'nullable|numeric',
            'paid_amount' => 'nullable|numeric',
            'bank_commission' => 'nullable|numeric|min:0',
            'method' => 'nullable|string',
            'reference_no' => ['nullable', 'string', new UniqueReference('general_works', $generalWork->id)],
            'bank_name' => 'nullable|string',
            'rib' => 'nullable|string',
            'description' => 'nullable|string',
        ]);

        $generalWork->update($validated);
        return $generalWork;
    }

    public function destroy(GeneralWork $generalWork)
    {
        $generalWork->delete();
        return response()->noContent();
    }
}
