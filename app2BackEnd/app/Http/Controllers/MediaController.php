<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class MediaController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'model_type' => 'required|string',
            'model_id'   => 'required|integer',
        ]);

        $modelType = 'App\\Models\\' . class_basename($request->model_type);

        $media = DB::table('media')
            ->where('model_type', $modelType)
            ->where('model_id', $request->model_id)
            ->orderBy('id', 'desc')
            ->get();

        return response()->json($media);
    }

    public function store(Request $request)
    {
        $request->validate([
            'file'       => 'required|file|max:51200', // max 50MB
            'model_type' => 'required|string',
            'model_id'   => 'required|integer',
            'category'   => 'required|string|in:photo,document',
        ]);

        if (!$request->hasFile('file')) {
            return response()->json(['message' => 'Aucun fichier reçu'], 400);
        }

        $file = $request->file('file');
        $modelTypeBasename = class_basename($request->model_type);
        $modelType  = 'App\\Models\\' . $modelTypeBasename;

        // Safe unique filename
        $ext      = $file->getClientOriginalExtension();
        $baseName = Str::slug(pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME));
        $fileName = time() . '_' . $baseName . '.' . $ext;

        // Store under storage/app/public/media/{ModelType}/{model_id}/
        $folder = "media/{$modelTypeBasename}/{$request->model_id}";
        $path   = $file->storeAs($folder, $fileName, 'public');

        if (!$path) {
            return response()->json(['message' => 'Erreur de stockage du fichier'], 500);
        }

        $mediaId = DB::table('media')->insertGetId([
            'model_type' => $modelType,
            'model_id'   => $request->model_id,
            'file_name'  => $file->getClientOriginalName(),
            'file_path'  => $path,
            'file_size'  => $file->getSize(),
            'file_type'  => $file->getMimeType(),
            'category'   => $request->category,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'message'  => 'Fichier uploadé avec succès',
            'media_id' => $mediaId,
            'path'     => $path,
        ], 201);
    }

    public function destroy($id)
    {
        $media = DB::table('media')->where('id', $id)->first();

        if (!$media) {
            return response()->json(['message' => 'Média introuvable'], 404);
        }

        Storage::disk('public')->delete($media->file_path);
        DB::table('media')->where('id', $id)->delete();

        return response()->json(['message' => 'Fichier supprimé']);
    }
}
