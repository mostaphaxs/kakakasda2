<?php

namespace App\Http\Controllers;

use App\Models\milestones;
use Illuminate\Http\Request;

class MilestonesController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = milestones::query();
        
        if ($request->has('terrain_id')) {
            $query->where('terrain_id', $request->terrain_id);
        }

        return response()->json($query->get());
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'terrain_id' => 'required|exists:terrains,id',
            'label' => 'required|string',
            'due_date' => 'nullable|date',
            'is_completed' => 'boolean',
        ]);

        $milestone = milestones::create($validated);
        return response()->json($milestone, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(milestones $milestone)
    {
        return response()->json($milestone);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, milestones $milestone)
    {
        $validated = $request->validate([
            'label' => 'required|string',
            'due_date' => 'nullable|date',
            'is_completed' => 'boolean',
        ]);

        $milestone->update($validated);
        return response()->json($milestone);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(milestones $milestone)
    {
        $milestone->delete();
        return response()->json(null, 204);
    }
}
