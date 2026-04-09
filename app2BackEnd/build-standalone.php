<?php
/**
 * 🚀 Standalone Backend Builder for Tauri
 * This script builds the Laravel PHAR and merges it with the FrankenPHP micro engine.
 * Result: A single .exe (Windows) or binary (Linux) that runs the entire backend.
 */

$os = PHP_OS_FAMILY;
$targetTriple = ($os === 'Windows') ? 'x86_64-pc-windows-msvc' : 'x86_64-unknown-linux-gnu';
$suffix = ($os === 'Windows') ? '.exe' : '';
$binaryName = "laravel-backend-{$targetTriple}{$suffix}";

$projectRoot = dirname(__DIR__);
$backendDir = __DIR__;
$tauriInternalDir = $projectRoot . '/app2FrontEnd/src-tauri/internal';

echo "📦 1. Building app.phar...\n";
chdir($backendDir);

// Ensure composer dependencies are optimized
shell_exec('composer install --no-dev --optimize-autoloader --ignore-platform-reqs');

// Trigger phar build
passthru('php -d phar.readonly=0 build-phar.php');

if (!file_exists('app.phar')) {
    die("❌ Error: app.phar was not generated!\n");
}

echo "📥 2. Fetching micro engine...\n";
$microSfx = ($os === 'Windows') ? 'micro_windows_x86_64.sfx' : 'micro_linux_x86_64.sfx';
$url = "https://github.com/crazywhalecc/static-php-cli/releases/download/v2.1.0/{$microSfx}";

if (!file_exists($microSfx)) {
    echo "Downloading {$microSfx} from GitHub...\n";
    file_put_contents($microSfx, fopen($url, 'r'));
}

echo "🔗 3. Merging PHAR with micro engine...\n";
$microData = file_get_contents($microSfx);
$pharData = file_get_contents('app.phar');

if (!is_dir($tauriInternalDir)) {
    mkdir($tauriInternalDir, 0755, true);
}

$outputPath = $tauriInternalDir . '/' . $binaryName;
file_put_contents($outputPath, $microData . $pharData);
chmod($outputPath, 0755);

echo "✅ Success! Backend binary generated at: {$outputPath}\n";
echo "👉 You can now run 'npm run tauri dev' or 'npm run tauri build' in the frontend folder.\n";
