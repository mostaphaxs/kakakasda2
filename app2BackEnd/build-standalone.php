<?php
/**
 * 🚀 Standalone Backend Builder for Tauri — Cross-Platform Edition
 *
 * Supports: Linux (x86_64), Windows (x86_64)
 * Engine:   PHP micro SFX from dl.static-php.dev
 * Binary:   Merged micro.sfx + app.phar => native executable
 */

$os          = PHP_OS_FAMILY;
$phpVersion  = '8.3.16';

if ($os === 'Windows') {
    $targetTriple = 'x86_64-pc-windows-msvc';
    $suffix       = '.exe';
    $platformLabel = 'win-x64';
    $archiveExt    = 'zip';
} else {
    $arch          = (php_uname('m') === 'aarch64') ? 'aarch64' : 'x86_64';
    $osLabel       = ($os === 'Darwin') ? 'macos' : 'linux';
    $targetTriple  = "{$arch}-unknown-linux-gnu";
    $suffix        = '';
    $platformLabel = "{$osLabel}-{$arch}";
    $archiveExt    = 'tar.gz';
}

$binaryName = "laravel-backend-{$targetTriple}{$suffix}";
$projectRoot     = dirname(__DIR__);
$backendDir      = __DIR__;
$tauriInternalDir = $projectRoot . '/app2FrontEnd/src-tauri/internal';

// 1. Build PHAR
echo "📦 1. Building app.phar...\n";
chdir($backendDir);

passthru('composer install --no-dev --optimize-autoloader --ignore-platform-reqs', $composerCode);
passthru('php -d phar.readonly=0 build-phar.php', $pharCode);
if ($pharCode !== 0 || !file_exists('app.phar')) {
    die("❌ app.phar was not generated!\n");
}

// 2. Fetch micro engine
echo "\n📥 2. Using local native PHP micro engine...\n";
$microSfx      = 'micro.sfx';

if (!file_exists($microSfx)) die("❌ micro.sfx not found.\n");

// 3. Merge
echo "\n🔗 3. Merging micro engine + PHAR...\n";
if (!is_dir($tauriInternalDir)) mkdir($tauriInternalDir, 0755, true);
$outputPath = $tauriInternalDir . DIRECTORY_SEPARATOR . $binaryName;

$microData = file_get_contents($microSfx);
$pharData  = file_get_contents('app.phar');
file_put_contents($outputPath, $microData . $pharData, LOCK_EX);

if ($os !== 'Windows') chmod($outputPath, 0755);

$sizeMb = round(filesize($outputPath) / 1024 / 1024, 1);
echo "   ✅ Binary written: {$outputPath} ({$sizeMb} MB)\n";
echo "\n✅ Build complete!\n";
