<?php

namespace App\Http\Controllers;

use App\Models\GeneralWork;
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
        ]);

        return GeneralWork::create($validated);
    }

    public function show(GeneralWork $generalWork)
    {
        return $generalWork->load(['supplier', 'terrain']);
    }

    public function update(Request $request, GeneralWork $generalWork)
    {
        $generalWork->update($request->all());
        return $generalWork;
    }

    public function destroy(GeneralWork $generalWork)
    {
        $generalWork->delete();
        return response()->noContent();
    }
}
