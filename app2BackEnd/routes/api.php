<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\DeviceController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\SaleController;
use App\Http\Controllers\StatsController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\SupplierController;

// ──────────────────────────────────────────────────────────────────
//  Electronics ERP API Routes
// ──────────────────────────────────────────────────────────────────

// Authentification
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::put('/profile', [AuthController::class, 'updateProfile']);
    Route::put('/password', [AuthController::class, 'updatePassword']);
    Route::get('/reports', [ReportController::class, 'index']);
});

// Stats
Route::get('/stats', [StatsController::class, 'index']);

// Devices – Core Inventory
Route::apiResource('devices', DeviceController::class);
Route::post('/devices/{device}/suggest-price', [DeviceController::class, 'suggestPrice']);

// Customers
Route::apiResource('customers', CustomerController::class);

// Suppliers & Purchases
Route::apiResource('suppliers', SupplierController::class);
Route::apiResource('purchases', \App\Http\Controllers\PurchaseController::class);

// Articles
Route::apiResource('articles', \App\Http\Controllers\ArticleController::class);

// Sales / POS
Route::apiResource('sales', SaleController::class)->except(['update']);

// TTS Proxy
Route::get('/proxy-tts', function (Request $request) {
    $text    = $request->query('text', '');
    $url     = 'https://translate.googleapis.com/translate_tts?ie=UTF-8&q=' . urlencode($text) . '&tl=fr&client=gtx';
    $content = @file_get_contents($url);
    if ($content === false) return response()->json(['error' => 'TTS unavailable'], 503);
    return response($content)->header('Content-Type', 'audio/mpeg');
});
