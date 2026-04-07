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
    ->withRegistered(function ($app) {
        if ($app->environment('production')) {
            $storage = env('LARAVEL_STORAGE_PATH', '/tmp/myamical-storage');
            $app->useStoragePath($storage);
            
            // Force the DB path so migrations use the same file as the server
            $dbPath = env('DB_DATABASE');
            if ($dbPath) {
                config(['database.connections.sqlite.database' => $dbPath]);
            }
        }
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
