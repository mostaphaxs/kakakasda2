<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;

Route::get('/', function () {
    return view('welcome');
});

// 🛡️ THE FIX: Serve storage files manually for sidecars (since storage:link fails)
// 🛡️ THE FIX: Exhaustive "Search and Serve" logic for sidecars
Route::get('/storage/{path}', function ($path) {
    $storageBase = env('LARAVEL_STORAGE_PATH', storage_path());
    $storageBase = str_replace('\\', '/', $storageBase);
    
    // We try multiple common patterns to find the file
    $candidates = [
        // 1. Direct AppData path (Standard)
        rtrim($storageBase, '/') . '/app/public/' . $path,
        // 2. Double public check (in case DB path includes "public/")
        rtrim($storageBase, '/') . '/app/' . $path,
        // 3. Fallback to local storage
        storage_path('app/public/' . $path),
        // 4. Case-insensitive attempt (less common but safe on Win)
        rtrim($storageBase, '/') . '/app/PUBLIC/' . $path,
    ];

    $foundPath = null;
    foreach ($candidates as $c) {
        if (file_exists($c) && !is_dir($c)) {
            $foundPath = $c;
            break;
        }
    }

    if (!$foundPath) {
        return response()->json([
            'error' => 'File not found at any location',
            'requested_path' => $path,
            'attempted_full_paths' => $candidates,
            'env_storage_path' => $storageBase,
            'real_storage_path' => storage_path(),
        ], 404);
    }

    $mime = \Illuminate\Support\Facades\File::mimeType($foundPath);
    return response()->file($foundPath, [
        'Content-Type' => $mime,
        'Access-Control-Allow-Origin' => '*',
        'X-Found-At' => basename($foundPath),
    ]);
})->where('path', '.*')->middleware([\Illuminate\Http\Middleware\HandleCors::class]);

// 🔍 DIAGNOSTIC ENDPOINT
Route::get('/api/debug-storage', function() {
    $storage = env('LARAVEL_STORAGE_PATH');
    $publicPath = rtrim($storage, '/') . '/app/public';
    return response()->json([
        'ENV_STORAGE' => $storage,
        'STORAGE_PATH_FUNC' => storage_path(),
        'PUBLIC_DIR' => $publicPath,
        'IS_DIR' => is_dir($publicPath),
        'SCAN' => is_dir($publicPath) ? array_diff(scandir($publicPath), ['.', '..']) : 'N/A',
        'RECEIPTS_SCAN' => is_dir($publicPath.'/receipts') ? array_diff(scandir($publicPath.'/receipts'), ['.', '..']) : 'N/A',
        'CWD' => getcwd(),
    ]);
})->middleware([\Illuminate\Http\Middleware\HandleCors::class]);




