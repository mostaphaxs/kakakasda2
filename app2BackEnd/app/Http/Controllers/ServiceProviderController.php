<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Models\ServiceProvider;

class ServiceProviderController extends Controller
{
    public function index()
    {
        return ServiceProvider::with('invoices')->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nom' => 'required|string|max:255',
            'categorie' => 'nullable|string|max:255',
            'tel' => 'nullable|string|max:255',
            'adresse' => 'nullable|string',
            'ice' => 'nullable|string|max:255',
            'if' => 'nullable|string|max:255',
            'rc' => 'nullable|string|max:255',
            'rib' => 'nullable|string|max:255',
        ]);

        return ServiceProvider::create($validated);
    }

    public function show(string $id)
    {
        return ServiceProvider::with('invoices.terrain')->findOrFail($id);
    }

    public function update(Request $request, string $id)
    {
        $provider = ServiceProvider::findOrFail($id);
        $validated = $request->validate([
            'nom' => 'required|string|max:255',
            'categorie' => 'nullable|string|max:255',
            'tel' => 'nullable|string|max:255',
            'adresse' => 'nullable|string',
            'ice' => 'nullable|string|max:255',
            'if' => 'nullable|string|max:255',
            'rc' => 'nullable|string|max:255',
            'rib' => 'nullable|string|max:255',
        ]);

        $provider->update($validated);
        return $provider;
    }

    public function destroy(string $id)
    {
        $provider = ServiceProvider::findOrFail($id);
        $provider->delete();
        return response()->noContent();
    }
}
