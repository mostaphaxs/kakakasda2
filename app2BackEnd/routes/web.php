<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;

Route::get('/', function () {
    return view('welcome');
});

// 🛡️ THE FIX: Serve storage files manually for sidecars (since storage:link fails)
Route::get('/storage/{path}', function ($path) {
    if (!Storage::disk('public')->exists($path)) abort(404);
    return Storage::disk('public')->response($path);
})->where('path', '.*');
