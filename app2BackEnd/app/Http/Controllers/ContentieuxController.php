<?php

namespace App\Http\Controllers;

use App\Models\Contentieux;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ContentieuxController extends Controller
{
    public function index()
    {
        return response()->json(Contentieux::with(['mouvements', 'fees'])->orderBy('created_at', 'desc')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'project_name' => 'nullable|string',
            'courtType' => 'required|string',
            'subject' => 'nullable|string',
            'procedural_type' => 'nullable|string',
            'fileNumber' => 'required|string',
            'fileNumber_appel' => 'nullable|string',
            'fileNumber_cassation' => 'nullable|string',
            'decision_appel' => 'nullable|string',
            'decision_cassation' => 'nullable|string',
            'date' => 'required|date',
            'decision' => 'nullable|string',
            'stage' => 'required|string',
            'is_final_decision' => 'nullable',
            'final_decision_date' => 'nullable|date',
            'plaintiff' => 'required|string',
            'defendant' => 'required|string',
            'lawyerName' => 'nullable|string',
            'lawyer_subject' => 'nullable|string',
            'lawyerPhone' => 'nullable|string',
            'lawyerAddress' => 'nullable|string',
            'lawyerFees' => 'numeric|nullable',
            'judicialFees' => 'numeric|nullable',
            'commissaire_nom' => 'nullable|string',
            'commissaire_fees' => 'numeric|nullable',
            'document' => 'nullable|file|mimes:pdf,jpg,jpeg,png',
            'judicial_fees_scan' => 'nullable|file|mimes:pdf,jpg,jpeg,png',
            'commissaire_scan' => 'nullable|file|mimes:pdf,jpg,jpeg,png',
        ]);

        if ($request->hasFile('document')) {
            $path = $request->file('document')->store('contentieux_docs', 'public');
            $validated['document_path'] = $path;
        }

        if ($request->hasFile('judicial_fees_scan')) {
            $path = $request->file('judicial_fees_scan')->store('contentieux_scans', 'public');
            $validated['judicial_fees_scan_path'] = $path;
        }
        
        if ($request->hasFile('commissaire_scan')) {
            $path = $request->file('commissaire_scan')->store('commissaire_scans', 'public');
            $validated['commissaire_scan_path'] = $path;
        }

        $contentieux = Contentieux::create($validated);
        return response()->json($contentieux, 201);
    }

    public function show($id)
    {
        $contentieux = Contentieux::with(['mouvements', 'fees'])->findOrFail($id);
        return response()->json($contentieux);
    }

    public function update(Request $request, $id)
    {
        $contentieux = Contentieux::findOrFail($id);

        $validated = $request->validate([
            'project_name' => 'nullable|string',
            'courtType' => 'sometimes|string',
            'subject' => 'nullable|string',
            'procedural_type' => 'nullable|string',
            'fileNumber' => 'sometimes|string',
            'fileNumber_appel' => 'nullable|string',
            'fileNumber_cassation' => 'nullable|string',
            'decision_appel' => 'nullable|string',
            'decision_cassation' => 'nullable|string',
            'date' => 'sometimes|date',
            'decision' => 'nullable|string',
            'stage' => 'sometimes|string',
            'is_final_decision' => 'nullable',
            'final_decision_date' => 'nullable|date',
            'plaintiff' => 'sometimes|string',
            'defendant' => 'sometimes|string',
            'lawyerName' => 'nullable|string',
            'lawyer_subject' => 'nullable|string',
            'lawyerPhone' => 'nullable|string',
            'lawyerAddress' => 'nullable|string',
            'lawyerFees' => 'numeric|nullable',
            'judicialFees' => 'numeric|nullable',
            'commissaire_nom' => 'nullable|string',
            'commissaire_fees' => 'numeric|nullable',
            'document' => 'nullable|file|mimes:pdf,jpg,jpeg,png',
            'judicial_fees_scan' => 'nullable|file|mimes:pdf,jpg,jpeg,png',
            'commissaire_scan' => 'nullable|file|mimes:pdf,jpg,jpeg,png',
        ]);

        if ($request->hasFile('document')) {
            // Delete old file if exists
            if ($contentieux->document_path && Storage::disk('public')->exists($contentieux->document_path)) {
                Storage::disk('public')->delete($contentieux->document_path);
            }
            $path = $request->file('document')->store('contentieux_docs', 'public');
            $validated['document_path'] = $path;
        }

        if ($request->hasFile('judicial_fees_scan')) {
            if ($contentieux->judicial_fees_scan_path && Storage::disk('public')->exists($contentieux->judicial_fees_scan_path)) {
                Storage::disk('public')->delete($contentieux->judicial_fees_scan_path);
            }
            $path = $request->file('judicial_fees_scan')->store('contentieux_scans', 'public');
            $validated['judicial_fees_scan_path'] = $path;
        }

        if ($request->hasFile('commissaire_scan')) {
            if ($contentieux->commissaire_scan_path && Storage::disk('public')->exists($contentieux->commissaire_scan_path)) {
                Storage::disk('public')->delete($contentieux->commissaire_scan_path);
            }
            $path = $request->file('commissaire_scan')->store('commissaire_scans', 'public');
            $validated['commissaire_scan_path'] = $path;
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
        if ($contentieux->judicial_fees_scan_path && Storage::disk('public')->exists($contentieux->judicial_fees_scan_path)) {
            Storage::disk('public')->delete($contentieux->judicial_fees_scan_path);
        }
        if ($contentieux->commissaire_scan_path && Storage::disk('public')->exists($contentieux->commissaire_scan_path)) {
            Storage::disk('public')->delete($contentieux->commissaire_scan_path);
        }
        $contentieux->delete();
        return response()->json(['message' => 'Deleted successfully']);
    }

    public function addMouvement(Request $request, $id)
    {
        $validated = $request->validate([
            'stage' => 'required|string',
            'date' => 'required|date',
            'description' => 'required|string',
            'next_date' => 'nullable|string'
        ]);

        $contentieux = Contentieux::findOrFail($id);
        $mouvement = $contentieux->mouvements()->create($validated);

        return response()->json($mouvement, 201);
    }

    public function deleteMouvement($id)
    {
        \App\Models\ContentieuxMouvement::findOrFail($id)->delete();
        return response()->json(['message' => 'Mouvement supprimé']);
    }

    public function addFee(Request $request, $id)
    {
        $validated = $request->validate([
            'type' => 'required|string', // JUDICIAL, BAILIFF, OTHER
            'category' => 'nullable|string',
            'amount' => 'required|numeric',
            'notes' => 'nullable|string',
            'date' => 'nullable|date'
        ]);

        $contentieux = Contentieux::findOrFail($id);
        $fee = $contentieux->fees()->create($validated);

        return response()->json($fee, 201);
    }

    public function deleteFee($id)
    {
        \App\Models\ContentieuxFee::findOrFail($id)->delete();
        return response()->json(['message' => 'Frais supprimé']);
    }
}
