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

// Public routes
Route::post('/login', [UserController::class, 'login']);

// Protected routes – require valid Sanctum token
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', fn(Request $r) => $r->user());
    Route::post('/user/update-profile', [UserController::class, 'updateProfile']);
    Route::post('/user/update-password', [UserController::class, 'updatePassword']);

    // Terrains
    Route::apiResource('terrains', TerrainController::class);

    // Biens
    Route::get('/biens', [BienController::class, 'index']);
    Route::post('/biens', [BienController::class, 'store']);
    Route::get('/biens/{bien}', [BienController::class, 'show']);
    Route::put('/biens/{bien}', [BienController::class, 'update']);
    Route::delete('/biens/{bienId}', [BienController::class, 'destroy']);

    // Clients
    Route::get('/clients', [ClientController::class, 'index']);
    Route::get('/clients/search-by-cin/{cin}', [ClientController::class, 'searchByCin']);
    Route::post('/clients', [ClientController::class, 'store']);
    Route::get('/clients/{client}', [ClientController::class, 'show']);
    Route::get('/clients/{client}', [ClientController::class, 'show']);
    Route::put('/clients/{client}', [ClientController::class, 'update']);
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
    
});
