<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;

Route::get('/', function () {
    return view('welcome');
});

// 🛡️ THE FIX: Serve storage files manually for sidecars (since storage:link fails)
// 🛡️ THE FIX: Serve storage files manually for sidecars (since storage:link fails)
// 🛡️ THE FIX: Serve storage files manually for sidecars (guarantees AppData access)
Route::get('/storage/{path}', function ($path) {
    $storageBase = env('LARAVEL_STORAGE_PATH', storage_path());
    $storageBase = str_replace('\\', '/', $storageBase);
    $fullPath = rtrim($storageBase, '/') . '/app/public/' . $path;

    if (!file_exists($fullPath)) {
        return response()->json([
            'error' => 'File not found',
            'attempted_path' => $fullPath,
            'env_storage' => env('LARAVEL_STORAGE_PATH'),
            'storage_path' => storage_path(),
            'cwd' => getcwd()
        ], 404);
    }

    $mime = \Illuminate\Support\Facades\File::mimeType($fullPath);
    return response()->file($fullPath, [
        'Content-Type' => $mime,
        'Access-Control-Allow-Origin' => '*',
    ]);
})->where('path', '.*')->middleware([\Illuminate\Http\Middleware\HandleCors::class]);

// 🔍 DIAGNOSTIC ENDPOINT: Help us see what the PHP process sees
Route::get('/api/debug-storage', function() {
    $storage = env('LARAVEL_STORAGE_PATH');
    $path = $storage . '/app/public';
    return response()->json([
        'LARAVEL_STORAGE_PATH' => $storage,
        'storage_path()' => storage_path(),
        'disk_public_root' => config('filesystems.disks.public.root'),
        'cwd' => getcwd(),
        'public_exists' => is_dir($path),
        'public_contents' => is_dir($path) ? array_diff(scandir($path), ['.', '..']) : 'N/A',
        'php_version' => PHP_VERSION,
        'server_addr' => $_SERVER['SERVER_ADDR'] ?? 'N/A',
    ]);
})->middleware([\Illuminate\Http\Middleware\HandleCors::class]);



