<?php

namespace App\Http\Controllers;

use App\Models\MessageTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MessageTemplateController extends Controller
{
    private const RULES = [
        'name' => 'required|string|max:120',
        'category' => 'nullable|in:bienvenue,paiement,chantier,signature,evenement,autre',
        'body_fr' => 'required|string',
        'body_ar' => 'nullable|string',
    ];

    public function index(): JsonResponse
    {
        return response()->json(MessageTemplate::orderBy('id')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $v = $request->validate(self::RULES);
        $v['category'] = $v['category'] ?? 'autre';
        return response()->json(MessageTemplate::create($v), 201);
    }

    public function update(Request $request, MessageTemplate $messageTemplate): JsonResponse
    {
        $messageTemplate->update($request->validate(self::RULES));
        return response()->json($messageTemplate);
    }

    public function destroy(MessageTemplate $messageTemplate): JsonResponse
    {
        $messageTemplate->delete();
        return response()->json(['message' => 'Modèle supprimé.']);
    }
}
