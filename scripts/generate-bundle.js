import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const projectRoot = path.resolve(process.cwd());
const backendDir = path.join(projectRoot, 'app2BackEnd');
const frontendDir = path.join(projectRoot, 'app2FrontEnd');

console.log('🚀 Starting One-Click Bundle Generation...');

// 1. Build Backend
console.log('🐘 Building Backend Binary...');
try {
    process.chdir(backendDir);
    execSync('php build-standalone.php', { stdio: 'inherit' });
} catch (error) {
    console.error('❌ Failed to build backend:', error.message);
    process.exit(1);
}

// 2. Build Frontend/Tauri
console.log('🦀 Building Tauri App (One-Click Executable)...');
try {
    process.chdir(frontendDir);
    execSync('npm run tauri build', { stdio: 'inherit' });
} catch (error) {
    console.error('❌ Failed to build Tauri app:', error.message);
    process.exit(1);
}

console.log('✅ Success! Your one-click executable is ready.');
console.log('📍 Look into: app2FrontEnd/src-tauri/target/release/bundle/');
