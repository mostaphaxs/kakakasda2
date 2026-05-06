<?php

namespace App\Http\Controllers;

use App\Models\Article;
use Illuminate\Http\Request;

class ArticleController extends Controller
{
    public function index(Request $request)
    {
        $query = Article::query();
        if ($request->q) {
            $query->where('designation', 'like', "%{$request->q}%");
        }
        return $query->latest()->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'designation' => 'required|string',
            'description' => 'nullable|string',
            'prix_unitaire_defaut' => 'numeric|min:0',
            'tva_defaut' => 'numeric|min:0',
        ]);

        return Article::create($validated);
    }

    public function show(Article $article)
    {
        return $article;
    }

    public function update(Request $request, Article $article)
    {
        $validated = $request->validate([
            'designation' => 'sometimes|required|string',
            'description' => 'nullable|string',
            'prix_unitaire_defaut' => 'numeric|min:0',
            'tva_defaut' => 'numeric|min:0',
        ]);

        $article->update($validated);
        return $article;
    }

    public function destroy(Article $article)
    {
        $article->delete();
        return response()->noContent();
    }
}
