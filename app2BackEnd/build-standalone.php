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

echo "📥 2. Checking micro engine...\n";
$microSfx = 'micro.sfx';

if (!file_exists($microSfx)) {
    die("❌ Error: micro.sfx not found in " . __DIR__ . "\n👉 Please ensure the micro engine binary is placed in the backend folder.\n");
}

// Check size to ensure it's not a corrupted 9-byte error file
if (filesize($microSfx) < 1000000) { // Should be at least 1MB
    die("❌ Error: micro.sfx file is too small or corrupted. Size: " . filesize($microSfx) . " bytes\n");
}

echo "🔗 3. Merging PHAR with micro engine...\n";
$microData = file_get_contents($microSfx);
$pharData = file_get_contents('app.phar');

if (!$microData || !$pharData) {
    die("❌ Error: Failed to read micro.sfx or app.phar\n");
}

if (!is_dir($tauriInternalDir)) {
    mkdir($tauriInternalDir, 0755, true);
}

$outputPath = $tauriInternalDir . '/' . $binaryName;
file_put_contents($outputPath, $microData . $pharData);
chmod($outputPath, 0755);

echo "✅ Success! Backend binary generated at: {$outputPath}\n";
echo "👉 You can now run 'npm run tauri dev' or 'npm run tauri build' in the frontend folder.\n";
