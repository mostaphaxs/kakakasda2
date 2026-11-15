// Copies the built web app (dist/) into the bundled backend's public folder, so
// the backend can serve it to browsers on the office network ("Accès réseau"):
//   http://<ip-du-poste-principal>:8000/            → the app
//   http://<ip-du-poste-principal>:8000/#/portal/login → the client portal
// Run automatically after `vite build`.
import { cpSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const pub = join(root, 'src-tauri', 'backend', 'public');

if (!existsSync(dist)) { console.error('[sync-web] dist/ not found — run vite build first'); process.exit(1); }
if (!existsSync(pub)) { console.error('[sync-web] src-tauri/backend/public not found'); process.exit(1); }

rmSync(join(pub, 'assets'), { recursive: true, force: true }); // drop old hashed bundles
cpSync(dist, pub, { recursive: true });
console.log('[sync-web] web app copied to src-tauri/backend/public');
