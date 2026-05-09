<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    public function index(Request $request)
    {
        $query = Customer::query();
        if ($request->filled('q')) {
            $q = $request->q;
            $query->where(fn($s) => $s->where('name', 'like', "%$q%")
                ->orWhere('phone', 'like', "%$q%")
                ->orWhere('email', 'like', "%$q%"));
        }
        return $query->withCount('sales as total_purchases')->latest()->paginate(50);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'    => 'required|string',
            'email'   => 'nullable|email|unique:customers,email',
            'phone'   => 'nullable|string',
            'address' => 'nullable|string',
            'notes'   => 'nullable|string',
        ], [
            'name.required' => 'Le nom du client est obligatoire.',
            'email.email'   => 'L\'adresse email n\'est pas valide.',
            'email.unique'  => 'Cette adresse email est déjà utilisée.',
        ]);
        return response()->json(Customer::create($data), 201);
    }

    public function show(Customer $customer)
    {
        return $customer->load('sales.device');
    }

    public function update(Request $request, Customer $customer)
    {
        $data = $request->validate([
            'name'    => 'sometimes|string',
            'email'   => "nullable|email|unique:customers,email,{$customer->id}",
            'phone'   => 'nullable|string',
            'address' => 'nullable|string',
            'notes'   => 'nullable|string',
        ]);
        $customer->update($data);
        return $customer;
    }

    public function destroy(Customer $customer)
    {
        $customer->delete();
        return response()->noContent();
    }
}
