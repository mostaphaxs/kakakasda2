<?php

namespace App\Http\Controllers;

use App\Models\Contentieux;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ContentieuxController extends Controller
{
    public function index()
    {
        return response()->json(Contentieux::orderBy('created_at', 'desc')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'courtType' => 'required|string',
            'fileNumber' => 'required|string',
            'date' => 'required|date',
            'decision' => 'nullable|string',
            'stage' => 'required|string',
            'plaintiff' => 'required|string',
            'defendant' => 'required|string',
            'lawyerName' => 'nullable|string',
            'lawyerPhone' => 'nullable|string',
            'lawyerAddress' => 'nullable|string',
            'lawyerFees' => 'numeric|nullable',
            'judicialFees' => 'numeric|nullable',
            'document' => 'nullable|file|mimes:pdf,jpg,jpeg,png',
        ]);

        if ($request->hasFile('document')) {
            $path = $request->file('document')->store('contentieux_docs', 'public');
            $validated['document_path'] = $path;
        }

        $contentieux = Contentieux::create($validated);
        return response()->json($contentieux, 201);
    }

    public function show($id)
    {
        $contentieux = Contentieux::findOrFail($id);
        return response()->json($contentieux);
    }

    public function update(Request $request, $id)
    {
        $contentieux = Contentieux::findOrFail($id);

        $validated = $request->validate([
            'courtType' => 'sometimes|string',
            'fileNumber' => 'sometimes|string',
            'date' => 'sometimes|date',
            'decision' => 'nullable|string',
            'stage' => 'sometimes|string',
            'plaintiff' => 'sometimes|string',
            'defendant' => 'sometimes|string',
            'lawyerName' => 'nullable|string',
            'lawyerPhone' => 'nullable|string',
            'lawyerAddress' => 'nullable|string',
            'lawyerFees' => 'numeric|nullable',
            'judicialFees' => 'numeric|nullable',
            'document' => 'nullable|file|mimes:pdf,jpg,jpeg,png',
        ]);

        if ($request->hasFile('document')) {
            // Delete old file if exists
            if ($contentieux->document_path && Storage::disk('public')->exists($contentieux->document_path)) {
                Storage::disk('public')->delete($contentieux->document_path);
            }
            $path = $request->file('document')->store('contentieux_docs', 'public');
            $validated['document_path'] = $path;
        }

        $contentieux->update($validated);
        return response()->json($contentieux);
    }

    public function destroy($id)
    {
        $contentieux = Contentieux::findOrFail($id);
        if ($contentieux->document_path && Storage::disk('public')->exists($contentieux->document_path)) {
            Storage::disk('public')->delete($contentieux->document_path);
        }
        $contentieux->delete();
        return response()->json(['message' => 'Deleted successfully']);
    }
}
