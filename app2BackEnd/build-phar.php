<?php
$pharFile = 'app.phar';

// On nettoie l'ancien PHAR s'il existe
if (file_exists($pharFile)) {
    unlink($pharFile);
}

$phar = new Phar($pharFile);

// On commence la mise en boîte
$phar->startBuffering();

// On ajoute tout le dossier actuel, en ignorant les trucs lourds/inutiles
$phar->buildFromDirectory(__DIR__, '/^(?!(.*\.git|.*node_modules|.*storage\/logs|.*database\/.*\.sqlite|.*tests)).*$/');

// Le fichier par défaut qui se lancera quand le Sidecar démarre
$phar->setStub($phar->createDefaultStub('public/index.php'));

$phar->stopBuffering();

echo "✅ app.phar généré avec succès !\n";