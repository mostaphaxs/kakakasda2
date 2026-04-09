<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;

Route::get('/', function () {
    return view('welcome');
});

// =====================================================================
// STORAGE FILE SERVING — Production Sidecar Fix
//
// In a standalone binary there is no real filesystem symlink.
// We serve storage files directly via Laravel's filesystem abstraction,
// which correctly reads from the persistent LARAVEL_STORAGE_PATH.
// =====================================================================
Route::get('/storage/{path}', function (string $path) {
    // Decode URL-encoded characters (%20 → space, etc.)
    // Use rawurldecode first, then urldecode as a fallback for edge cases.
    $decoded = rawurldecode($path);

    if (!Storage::disk('public')->exists($decoded)) {
        // Some browsers double-encode, try again with urldecode
        $decoded = urldecode($path);
    }

    if (!Storage::disk('public')->exists($decoded)) {
        \Illuminate\Support\Facades\Log::warning('Storage 404', [
            'raw'       => $path,
            'decoded'   => $decoded,
            'disk_root' => config('filesystems.disks.public.root'),
        ]);
        abort(404, "File not found: {$decoded}");
    }

    return Storage::disk('public')->response($decoded);
})->where('path', '.*');
