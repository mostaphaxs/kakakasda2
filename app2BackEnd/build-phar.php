<?php
$pharFile = 'app.phar';

if (file_exists($pharFile)) {
    unlink($pharFile);
}

$phar = new Phar($pharFile);
$phar->startBuffering();

echo "Finding files via system find...\n";
$cmd = 'find . -type f -not -name "*.sqlite" -not -name "*.phar" -not -name "*.sfx" -not -path "./.git/*" -not -path "./node_modules/*" -not -path "./storage/framework/*" -not -path "./tests/*" -not -path "./storage/app/public/clients/*" -not -path "*/.DS_Store"';
exec($cmd, $files);

echo "Found " . count($files) . " files. Compiling natively via ArrayIterator...\n";

$iteratorFiles = [];
foreach ($files as $file) {
    if (str_starts_with($file, './')) {
        $file = substr($file, 2);
    }
    $iteratorFiles[$file] = __DIR__ . '/' . $file;
}

// buildFromIterator is incredibly fast because it adds all files inside the C extension
$phar->buildFromIterator(new ArrayIterator($iteratorFiles), __DIR__);

$stub = <<<'PHP'
<?php
// Entry-point stub for micro-php Phar binary
$argv = isset($argv) ? $argv : [];

$mode = isset($argv[1]) ? $argv[1] : '';

if ($mode === 'php-cli') {
    if (isset($argv[2]) && $argv[2] === 'artisan') {
        $argv = array_slice($argv, 3);
        array_unshift($argv, 'artisan');
        $_SERVER['argv'] = $argv;
        $_SERVER['argc'] = count($argv);
        require 'phar://' . __FILE__ . '/artisan';
    } else {
        $argv = array_slice($argv, 2);
        array_unshift($argv, 'artisan');
        $_SERVER['argv'] = $argv;
        $_SERVER['argc'] = count($argv);
        require 'phar://' . __FILE__ . '/artisan';
    }
} elseif ($mode === 'php-server') {
    require 'phar://' . __FILE__ . '/public/index.php';
} else {
    require 'phar://' . __FILE__ . '/public/index.php';
}
__HALT_COMPILER();
PHP;

$phar->setStub($stub);
$phar->stopBuffering();

echo "✅ app.phar generated successfully!\n";
