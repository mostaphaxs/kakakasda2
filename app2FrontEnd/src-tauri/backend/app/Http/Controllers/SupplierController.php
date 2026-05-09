<?php

namespace App\Http\Controllers;

use App\Models\Supplier;
use Illuminate\Http\Request;

class SupplierController extends Controller
{
    public function index(Request $request)
    {
        $query = Supplier::query();

        if ($q = $request->query('q')) {
            $query->where(function ($w) use ($q) {
                $w->where('name', 'like', "%{$q}%")
                  ->orWhere('contact_person', 'like', "%{$q}%")
                  ->orWhere('phone', 'like', "%{$q}%")
                  ->orWhere('city', 'like', "%{$q}%");
            });
        }

        return $query->withCount('devices')->latest()->paginate(30);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'            => 'required|string|max:255',
            'contact_person'  => 'nullable|string|max:255',
            'email'           => 'nullable|email|max:255',
            'phone'           => 'nullable|string|max:50',
            'address'         => 'nullable|string|max:500',
            'city'            => 'nullable|string|max:100',
            'notes'           => 'nullable|string',
        ], [
            'name.required' => 'Le nom du fournisseur est obligatoire.',
            'email.email'   => 'L\'adresse email n\'est pas valide.',
        ]);

        $supplier = Supplier::create($data);
        return response()->json($supplier, 201);
    }

    public function show(Supplier $supplier)
    {
        return $supplier->loadCount('devices');
    }

    public function update(Request $request, Supplier $supplier)
    {
        $data = $request->validate([
            'name'            => 'required|string|max:255',
            'contact_person'  => 'nullable|string|max:255',
            'email'           => 'nullable|email|max:255',
            'phone'           => 'nullable|string|max:50',
            'address'         => 'nullable|string|max:500',
            'city'            => 'nullable|string|max:100',
            'notes'           => 'nullable|string',
        ]);

        $supplier->update($data);
        return response()->json($supplier);
    }

    public function destroy(Supplier $supplier)
    {
        $supplier->delete();
        return response()->noContent();
    }
}
