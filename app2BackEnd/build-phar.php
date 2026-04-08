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
$phar->buildFromDirectory(__DIR__, '/^(?!(.*\.git|.*node_modules|.*storage\/app\/public\/clients|.*storage\/framework\/.*|.*database\/.*\.sqlite|.*tests|.*public\/storage)).*$/');

// Stub ultra-robuste pour micro engine : on utilise __FILE__ pour que le PHP s'auto-découvre dans l'EXE
$phar->setStub("<?php require 'phar://' . __FILE__ . '/public/index.php'; __HALT_COMPILER();");

$phar->stopBuffering();

echo "✅ app.phar généré avec succès !\n";