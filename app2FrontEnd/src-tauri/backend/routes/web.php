<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;

Route::get('/', function () {
    return view('welcome');
});

// 🛡️ THE FIX: Serve storage files manually for sidecars (since storage:link fails)
// 🛡️ THE FIX: Serve storage files manually for sidecars (guarantees AppData access)
Route::get('/storage/{path}', function ($path) {
    $storageBase = env('LARAVEL_STORAGE_PATH', storage_path());
    // Normalize path just in case
    $storageBase = str_replace('\\', '/', $storageBase);
    $fullPath = rtrim($storageBase, '/') . '/app/public/' . $path;

    if (!file_exists($fullPath)) {
        \Illuminate\Support\Facades\Log::error("Storage Sidecar 404: File not found", [
            'path' => $path,
            'attempted_abs_path' => $fullPath
        ]);
        abort(404, "File not found at " . $fullPath);
    }

    $mime = \Illuminate\Support\Facades\File::mimeType($fullPath);
    return response()->file($fullPath, [
        'Content-Type' => $mime,
        'Access-Control-Allow-Origin' => '*', // Force allow CORS for images
    ]);
})->where('path', '.*')->middleware([\Illuminate\Http\Middleware\HandleCors::class]);


