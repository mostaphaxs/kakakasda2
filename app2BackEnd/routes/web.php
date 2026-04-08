<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;

Route::get('/', function () {
    return view('welcome');
});

// 🛡️ THE FIX: Serve storage files manually for sidecars (since storage:link fails)
// 🛡️ THE FIX: Serve storage files manually for sidecars (since storage:link fails)
Route::get('/storage/{path}', function ($path) {
    if (!Storage::disk('public')->exists($path)) {
        \Illuminate\Support\Facades\Log::error("Storage 404: Path not found in public disk", [
            'requested_path' => $path,
            'disk_root' => config('filesystems.disks.public.root'),
            'storage_path' => storage_path(),
            'actual_abs_path' => config('filesystems.disks.public.root') . '/' . $path,
            'exists_on_disk' => file_exists(config('filesystems.disks.public.root') . '/' . $path)
        ]);
        abort(404);
    }
    return Storage::disk('public')->response($path);
})->where('path', '.*');
