<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        'tauri://localhost',
        'http://tauri.localhost',
        'http://localhost:5173', // For Vite Dev
    ],

    'allowed_origins_patterns' => [
        '#^tauri://.*$#',
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,
];