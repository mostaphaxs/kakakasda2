<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->prepend(\App\Http\Middleware\ForceCors::class);
        $middleware->append(\App\Http\Middleware\ParseFrenchDates::class);
    })
    ->registered(function ($app) {
        // =====================================================================
        // SIDECAR PATH FIX
        // When running as a bundled binary, ALL writable paths must be
        // redirected to the system's app_data_dir (passed via env vars by Tauri).
        // =====================================================================
        $storagePath = env('LARAVEL_STORAGE_PATH');
        if ($storagePath) {
            $storagePath = rtrim($storagePath, '/\\');
            $app->useStoragePath($storagePath);

            // Force filesystem disk roots to point to the writable storage
            config(['filesystems.disks.public.root' => $storagePath . '/app/public']);
            config(['filesystems.disks.local.root'  => $storagePath . '/app/private']);

            // Also update the URL so Storage::url() returns the correct address
            config(['filesystems.disks.public.url' => env('APP_URL', 'http://127.0.0.1:8000') . '/storage']);
        }

        // =====================================================================
        // DATABASE PATH FIX
        // Tauri injects the absolute path to the SQLite file.
        // =====================================================================
        $dbPath = env('DB_DATABASE');
        if ($dbPath) {
            config(['database.connections.sqlite.database' => $dbPath]);
            // Belt-and-suspenders: also set env for any package that reads it directly
            $_ENV['DB_DATABASE'] = $dbPath;
            putenv("DB_DATABASE={$dbPath}");
        }
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
