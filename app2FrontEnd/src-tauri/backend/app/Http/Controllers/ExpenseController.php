<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
    public function index()
    {
        return Expense::latest('expense_date')->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'category' => 'required|string',
            'amount' => 'required|numeric',
            'description' => 'nullable|string',
            'expense_date' => 'required|date',
        ]);

        return Expense::create($validated);
    }

    public function update(Request $request, Expense $expense)
    {
        $validated = $request->validate([
            'category' => 'sometimes|required|string',
            'amount' => 'sometimes|required|numeric',
            'description' => 'nullable|string',
            'expense_date' => 'sometimes|required|date',
        ]);

        $expense->update($validated);
        return $expense;
    }

    public function destroy(Expense $expense)
    {
        $expense->delete();
        return response()->noContent();
    }
}
