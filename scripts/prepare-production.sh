#!/bin/bash
# scripts/prepare-production.sh
# Run this from the root of your project before building the FrankenPHP binary.

echo "🚀 Preparing App for Production..."

cd app2BackEnd

# 1. Clean up
echo "🧹 Cleaning dependencies..."
rm -rf vendor
rm -rf bootstrap/cache/*.php

# 2. Production Install
echo "📦 Installing production dependencies..."
composer install --no-dev --optimize-autoloader

# 3. Laravel Optimization
echo "⚡ Optimizing Laravel..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

# 4. Environment check
if [ ! -f .env ]; then
    echo "❌ ERROR: .env file missing in app2BackEnd!"
    exit 1
fi

echo "✅ Ready to build! You can now run the Docker static build."
