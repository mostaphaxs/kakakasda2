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

echo "📥 2. Fetching native micro engine...\n";
$phpVersion = '8.3.30';
$microSfx = 'micro.sfx';

if (!file_exists($microSfx)) {
    $arch = (php_uname('m') === 'x86_64') ? 'x86_64' : 'aarch64';
    $osName = ($os === 'Windows') ? 'win' : (($os === 'Darwin') ? 'macos' : 'linux');
    $extension = ($os === 'Windows') ? 'zip' : 'tar.gz';
    
    // Naming convention on dl.static-php.dev: php-<version>-micro-<os>-<arch>.<ext>
    // Note: Windows uses 'win-x64' or similar, let's adjust
    $platformLabel = ($os === 'Windows') ? 'win-x64' : "{$osName}-{$arch}";
    $archiveName = "php-{$phpVersion}-micro-{$platformLabel}.{$extension}";
    $url = "https://dl.static-php.dev/static-php-cli/bulk/{$archiveName}";

    echo "Downloading native engine: {$archiveName}...\n";
    $curlCmd = "curl -L {$url} -o " . escapeshellarg($archiveName);
    passthru($curlCmd, $resultCode);

    if ($resultCode !== 0 || !file_exists($archiveName)) {
        die("❌ Error: Failed to download native engine from {$url}\n");
    }

    echo "📦 Extracting engine...\n";
    if ($extension === 'tar.gz') {
        passthru("tar -xzf " . escapeshellarg($archiveName));
        // The binary inside the tar is usually named 'php' or 'micro.sfx'
        if (file_exists('micro.sfx')) {
            // Good
        } elseif (file_exists('php')) {
            rename('php', 'micro.sfx');
        }
    } else {
        // Windows extraction
        passthru("powershell -Command \"Expand-Archive -Path " . escapeshellarg($archiveName) . " -DestinationPath . -Force\"");
        if (file_exists('php.exe')) {
            rename('php.exe', 'micro.sfx');
        }
    }
    
    // Cleanup archive
    unlink($archiveName);
}

if (!file_exists($microSfx)) {
    die("❌ Error: Failed to obtain micro.sfx correctly.\n");
}

// Check size to ensure it's not a corrupted download
if (filesize($microSfx) < 1000000) { 
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
