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
        // 🐘 SIDE-CAR FIX (V4): Always prioritize side-car injected paths
        $storage = env('LARAVEL_STORAGE_PATH');
        if ($storage) {
            $app->useStoragePath($storage);
            // Also update the config for all disks that depend on storage_path()
            config(['filesystems.disks.public.root' => $storage . '/app/public']);
            config(['filesystems.disks.local.root' => $storage . '/app/private']);
        }
        
        $dbPath = env('DB_DATABASE');
        if ($dbPath) {
            // Set both the config and the env to be sure
            config(['database.connections.sqlite.database' => $dbPath]);
            $_ENV['DB_DATABASE'] = $dbPath;
            putenv("DB_DATABASE={$dbPath}");
        }
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
