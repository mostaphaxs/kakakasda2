#!/bin/bash
# 🐘 Script to rebuild the FrankenPHP backend binary and sync it with Tauri

set -e

PROJECT_ROOT=$(pwd)
BACKEND_DIR="$PROJECT_ROOT/app2BackEnd"
TAURI_INTERNAL_DIR="$PROJECT_ROOT/app2FrontEnd/src-tauri/internal"

echo "🚀 Starting backend rebuild..."

# 1. Build the docker image
docker build -t laravel-static-builder -f "$BACKEND_DIR/static-build.Dockerfile" "$BACKEND_DIR"

# 2. Extract the binary
echo "📦 Extracting binary from container..."
CONTAINER_ID=$(docker create laravel-static-builder)
docker cp "$CONTAINER_ID:/go/src/app/dist/static-php-cli/buildroot/bin/frankenphp" "$PROJECT_ROOT/laravel-backend-linux"
docker rm -f "$CONTAINER_ID"

# 3. Move to Tauri internal folder
echo "🚚 Syncing with Tauri..."
mkdir -p "$TAURI_INTERNAL_DIR"
cp "$PROJECT_ROOT/laravel-backend-linux" "$TAURI_INTERNAL_DIR/laravel-backend-x86_64-unknown-linux-gnu"
chmod +x "$TAURI_INTERNAL_DIR/laravel-backend-x86_64-unknown-linux-gnu"

echo "✅ Success! Now run 'npm run tauri dev' in app2FrontEnd to see the changes."
