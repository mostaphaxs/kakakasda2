<?php

namespace App\Http\Controllers;

use App\Models\Supplier;
use Illuminate\Http\Request;

class SupplierController extends Controller
{
    public function index()
    {
        return Supplier::all();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nom_societe' => 'required|string',
            'nom_gerant' => 'nullable|string',
            'adresse' => 'nullable|string',
            'tel' => 'nullable|string',
            'ice' => 'nullable|string',
            'if' => 'nullable|string',
            'rc' => 'nullable|string',
            'description' => 'nullable|string',
        ]);

        return Supplier::create($validated);
    }

    public function show(Supplier $supplier)
    {
        return $supplier;
    }

    public function update(Request $request, Supplier $supplier)
    {
        $supplier->update($request->all());
        return $supplier;
    }

    public function destroy(Supplier $supplier)
    {
        $supplier->delete();
        return response()->noContent();
    }
}
