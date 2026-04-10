<?php
Phar::mapPhar('backend_srv.phar');
// Ce script redirige tout vers l'artisan de Laravel
require 'phar://backend_srv.phar/artisan';
__HALT_COMPILER();