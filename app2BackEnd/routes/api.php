<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserController;
use App\Http\Controllers\BienController;
use App\Http\Controllers\TerrainController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\ChargeController;
use App\Http\Controllers\ContractorController;
use App\Http\Controllers\IntervenantController;
use App\Http\Controllers\ContractorPaymentController;
use App\Http\Controllers\AnnexUnitsController;
use App\Http\Controllers\PaymentsController;
use App\Http\Controllers\StatsController;
use App\Http\Controllers\SuiviController;
use App\Http\Controllers\ArticleController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\PurchaseInvoiceController;
use App\Http\Controllers\StockController;
use App\Http\Controllers\GeneralWorkController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\FactureController;
use App\Http\Controllers\OuvrierController;
use App\Http\Controllers\SalarieController;
use App\Http\Controllers\FinancialController;
use App\Http\Controllers\ContentieuxController;
use App\Http\Controllers\ServiceProviderController;
use App\Http\Controllers\ProviderInvoiceController;
use App\Http\Controllers\TerrainMapController;

// Public routes
Route::post('/login', [UserController::class, 'login']);
Route::get('/clients/portal-login/{cin}', [ClientController::class, 'searchByCin']);

// Protected routes – require valid Sanctum token
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', fn(Request $r) => $r->user());
    Route::post('/user/update-profile', [UserController::class, 'updateProfile']);
    Route::post('/user/update-password', [UserController::class, 'updatePassword']);

    // Transactions Ledger
    Route::get('/transactions', [FinancialController::class, 'transactions']);

    // Terrains
    Route::apiResource('terrains', TerrainController::class);

    // Biens
    Route::get('/biens', [BienController::class, 'index']);
    Route::post('/biens', [BienController::class, 'store']);
    Route::get('/biens/{bien}', [BienController::class, 'show']);
    Route::put('/biens/{bien}', [BienController::class, 'update']);
    Route::delete('/biens/{bienId}', [BienController::class, 'destroy']);

    // Digital Twin - Terrain Map
    Route::get('/terrain-map/{terrainId}', [TerrainMapController::class, 'show']);
    Route::put('/terrain-map/{terrainId}', [TerrainMapController::class, 'update']);

    // Clients
    Route::get('/clients', [ClientController::class, 'index']);
    Route::post('/clients', [ClientController::class, 'store']);
    Route::get('/clients/{client}', [ClientController::class, 'show']);
    Route::get('/clients/{client}', [ClientController::class, 'show']);
    Route::put('/clients/{client}', [ClientController::class, 'update']);
    Route::post('/clients/{client}/cancel', [ClientController::class, 'cancel']);
    Route::delete('/clients/{client}', [ClientController::class, 'destroy']);
    Route::post('/clients/{client}/documents', [ClientController::class, 'uploadDocument']);
    Route::delete('/clients/{client}/documents/{documentIndex}', [ClientController::class, 'deleteDocument']);

    // Stats
    Route::get('/stats', [StatsController::class, 'index']);

    // Payments
    Route::post('/payments/{payment}/cancel', [PaymentsController::class, 'cancel']);
    Route::post('/payments/{payment}/associate', [PaymentsController::class, 'associate']);
    Route::apiResource('payments', PaymentsController::class);

    // Charges
    Route::apiResource('charges', ChargeController::class);

    // Contractors
    Route::apiResource('contractors', ContractorController::class);

    // Intervenants
    Route::apiResource('intervenants', IntervenantController::class);

    // Contractor Payments
    Route::apiResource('contractor-payments', ContractorPaymentController::class);

    // Annex Units
    Route::apiResource('annex-units', AnnexUnitsController::class);

    // Suivi de Réalisation
    Route::get('/biens/{bienId}/suivi', [SuiviController::class, 'show']);
    Route::post('/biens/{bienId}/suivi/gros-oeuvre', [SuiviController::class, 'updateGrosOeuvre']);
    Route::post('/biens/{bien}/suivi/finition', [SuiviController::class, 'updateFinition']);
    Route::post('/biens/{bien}/suivi/historique', [SuiviController::class, 'addHistorique']);
    Route::delete('/biens/{bien}/suivi/historique/{historique}', [SuiviController::class, 'deleteHistorique']);

    // Articles
    Route::apiResource('articles', ArticleController::class);

    // Suppliers
    Route::apiResource('suppliers', SupplierController::class);
    Route::post('/suppliers/{supplier}/guarantee-checks', [SupplierController::class, 'addGuaranteeCheck']);
    Route::delete('/guarantee-checks/{check}', [SupplierController::class, 'deleteGuaranteeCheck']);

    // Purchase Invoices
    Route::apiResource('purchase-invoices', PurchaseInvoiceController::class);
    Route::post('/purchase-invoices/{purchase_invoice}/payments', [PurchaseInvoiceController::class, 'addPayment']);

    // Stock management
    Route::get('/stock', [StockController::class, 'index']);
    Route::get('/stock/low-stock', [StockController::class, 'lowStock']);
    Route::post('/stock/exit', [StockController::class, 'exitStock']);

    // General Works
    Route::apiResource('general-works', GeneralWorkController::class);

    // Settings
    Route::get('/settings/pricing', [SettingController::class, 'getPricing']);
    Route::post('/settings/pricing', [SettingController::class, 'updatePricing']);
    
    // Factures
    Route::apiResource('factures', FactureController::class);

    // Workers (Ouvriers)
    Route::apiResource('ouvriers', OuvrierController::class);
    Route::post('/ouvriers/{id}/missions', [OuvrierController::class, 'storeMission']);
    Route::put('/ouvrier-missions/{id}', [OuvrierController::class, 'updateMission']);
    Route::delete('/ouvrier-missions/{id}', [OuvrierController::class, 'destroyMission']);
    Route::post('/ouvriers/{id}/payments', [OuvrierController::class, 'storePayment']);
    Route::delete('/ouvrier-payments/{id}', [OuvrierController::class, 'destroyPayment']);

    Route::apiResource('salaries', SalarieController::class);
    
    // Contentieux (Dossiers Juridiques)
    Route::apiResource('contentieux', ContentieuxController::class);

    // Sociétés de Services
    Route::apiResource('service-providers', ServiceProviderController::class);
    Route::apiResource('provider-invoices', ProviderInvoiceController::class);

    // Universal Media / GED Management
    Route::get('/media', [\App\Http\Controllers\MediaController::class, 'index']);
    Route::post('/media', [\App\Http\Controllers\MediaController::class, 'store']);
    Route::delete('/media/{media}', [\App\Http\Controllers\MediaController::class, 'destroy']);
    
    // TTS Proxy
    Route::get('/proxy-tts', function (Request $request) {
        $text = $request->query('text');
        $url = "https://translate.googleapis.com/translate_tts?ie=UTF-8&q=" . urlencode($text) . "&tl=fr&client=gtx";
        $content = file_get_contents($url);
        return response($content)->header('Content-Type', 'audio/mpeg');
    });

});

// 🖼️ UNIVERSAL DOCUMENT SERVE (Bypass web.php)
Route::get('/sidecar-serve/{path}', function ($path) {
    $path = ltrim($path, '/');
    $storage = env('LARAVEL_STORAGE_PATH');
    
    // 🔥 EMERGENCY FALLBACK: If env is missing, try to reconstruct it from AppData
    if (!$storage && PHP_OS_FAMILY === 'Windows') {
        $appData = $_SERVER['APPDATA'] ?? null;
        if ($appData) {
            $storage = str_replace('\\', '/', $appData) . '/com.mustapha.myamical/storage';
        }
    }
    
    $storage = str_replace('\\', '/', $storage ?: storage_path());
    
    $candidates = [
        rtrim($storage, '/') . '/app/public/' . $path,
        rtrim($storage, '/') . '/app/' . $path,
        rtrim($storage, '/') . '/' . $path, // In case it's absolute
        storage_path('app/public/' . $path),
    ];

    foreach ($candidates as $c) {
        if (file_exists($c) && !is_dir($c)) {
            $mime = 'application/octet-stream';
            try { $mime = \Illuminate\Support\Facades\File::mimeType($c); } catch(\Exception $e){}
            
            return response()->file($c, [
                'Content-Type' => $mime,
                'Access-Control-Allow-Origin' => '*',
                'Cache-Control' => 'no-cache, must-revalidate',
                'X-Sidecar-Found' => 'true'
            ]);
        }
    }

    return response()->json([
        'error' => 'File not found after exhaustive search',
        'requested_path' => $path,
        'candidates_tried' => $candidates,
        'env_storage' => env('LARAVEL_STORAGE_PATH'),
        'resolved_storage' => $storage,
    ], 404);

})->where('path', '.*');

