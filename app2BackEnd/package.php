<?php
$pharFile = 'simple_app.phar';
if (file_exists($pharFile)) unlink($pharFile);

$phar = new Phar($pharFile);

// On ne prend QUE ce qui est nécessaire au runtime
$phar->buildFromDirectory(__DIR__, '/((app|bootstrap|config|database|routes|vendor)\/.*|artisan|.env)$/');

// On définit le stub pour qu'il lance artisan proprement
$defaultStub = $phar->createDefaultStub('artisan');
$phar->setStub($defaultStub);

echo "Phar créé ! Taille : " . round(filesize($pharFile) / 1024 / 1024, 2) . " MB\n";