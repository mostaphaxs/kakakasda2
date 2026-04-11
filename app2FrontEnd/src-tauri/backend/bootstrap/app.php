<?php

ini_set('memory_limit', '1G');

// 🛠️ POLYFILL: Manque l'extension mbstring dans le binaire micro.sfx
if (!function_exists('mb_split')) {
    function mb_split($pattern, $string, $limit = -1) {
        return preg_split('/' . $pattern . '/u', $string, $limit);
    }
}

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

$app = Application::configure(basePath: dirname(__DIR__))
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
            config(['filesystems.disks.public.root' => $storage . '/app/public']);
            config(['filesystems.disks.local.root' => $storage . '/app/private']);
        }
        
        $dbPath = env('DB_DATABASE');
        if ($dbPath) {
            config(['database.connections.sqlite.database' => $dbPath]);
            $_ENV['DB_DATABASE'] = $dbPath;
            putenv("DB_DATABASE={$dbPath}");
        }
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();

// 🐘 SIDE-CAR FIX (V4.1): Tell Laravel that Windows drive letters are absolute paths
// so it doesn't try to prepend the base_path to our custom cache directories.
$storage = env('LARAVEL_STORAGE_PATH');
if ($storage && preg_match('/^([a-zA-Z]:)/', $storage, $matches)) {
    $app->addAbsoluteCachePathPrefix($matches[1]);
}

return $app;