<?php
$pharFile = 'app.phar';

// On nettoie l'ancien PHAR s'il existe
if (file_exists($pharFile)) {
    unlink($pharFile);
}

$phar = new Phar($pharFile);

// On commence la mise en boîte
$phar->startBuffering();

// On ajoute tout le dossier actuel, en ignorant les trucs lourds/inutiles (surtout storage/app/public qui peut être énorme)
// On ignore aussi explicitement .sfx et .phar pour éviter de s'inclure soi-même ou le moteur micro
$phar->buildFromDirectory(__DIR__, '/^(?!(.*\.git|.*node_modules|.*storage\/app\/public\/clients|.*storage\/framework\/.*|.*database\/.*\.sqlite|.*tests|.*public\/storage|.*\.sfx|.*\.phar)).*$/');

// Stub intelligent pour micro engine : il bascule entre 'artisan' (CLI) et 'index.php' (Web) selon l'usage
$stub = <<<'PHP'
<?php
if (php_sapi_name() === 'cli' || php_sapi_name() === 'micro') {
    // Si on passe 'artisan' en premier argument, on le lance
    if (isset($argv[1]) && $argv[1] === 'artisan') {
        array_shift($argv);
        require 'phar://' . __FILE__ . '/artisan';
    } elseif (count($argv) > 1 && $argv[1] === 'php-cli') {
        // Support pour l'appel actuel de Tauri : ["php-cli", "artisan", ...]
        array_shift($argv);
        if (isset($argv[1]) && $argv[1] === 'artisan') {
            array_shift($argv);
        }
        require 'phar://' . __FILE__ . '/artisan';
    } else {
        require 'phar://' . __FILE__ . '/public/index.php';
    }
} else {
    require 'phar://' . __FILE__ . '/public/index.php';
}
__HALT_COMPILER();
PHP;
$phar->setStub($stub);

$phar->stopBuffering();

echo "✅ app.phar généré avec succès !\n";
