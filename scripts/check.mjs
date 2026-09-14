import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('..', import.meta.url));
const phases = {
  typecheck: [require.resolve('typescript/bin/tsc'), '--noEmit'],
  lint: [join(dirname(require.resolve('eslint/package.json')), 'bin/eslint.js'), 'src', 'test', 'scripts', 'eslint.config.mjs', 'vitest.config.ts'],
  test: [require.resolve('vitest/vitest.mjs'), 'run'],
  build: [join(dirname(require.resolve('vite/package.json')), 'bin/vite.js'), 'build'],
  native: ['check', '--manifest-path', 'src-tauri/Cargo.toml', '--locked'],
};
const requested = process.argv.slice(2);
if (requested.length > 1 || (requested[0] && !(requested[0] in phases))) {
  console.error('Usage: npm run check -- [typecheck|lint|test|build|native]');
  process.exit(2);
}
function fingerprint() {
  const hash = createHash('sha256');
  function visit(path) {
    for (const entry of readdirSync(join(root, path), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const relative = join(path, entry.name);
      if (entry.isDirectory()) visit(relative);
      else { hash.update(relative); hash.update(readFileSync(join(root, relative))); }
    }
  }
  for (const path of ['src', 'test', 'scripts', 'src-tauri/src']) visit(path);
  for (const path of ['index.html', 'package.json', 'package-lock.json', 'tsconfig.json', 'vite.config.ts', 'vitest.config.ts', 'eslint.config.mjs', 'src-tauri/Cargo.toml', 'src-tauri/Cargo.lock', 'src-tauri/tauri.conf.json']) hash.update(readFileSync(join(root, path)));
  return hash.digest('hex');
}
const report = { started: new Date().toISOString(), scope: requested[0] ?? 'full', sourceHash: fingerprint(), status: 'running', phases: [] };
mkdirSync(join(root, '.checkpoints'), { recursive: true });
const record = () => writeFileSync(join(root, '.checkpoints/last-check.json'), JSON.stringify(report, null, 2) + '\n');
record();
for (const phase of requested.length ? requested : Object.keys(phases)) {
  console.log(`\n[check] ${phase}`);
  const started = Date.now();
  const command = phase === 'native' ? (process.platform === 'win32' ? 'cargo.exe' : 'cargo') : process.execPath;
  const result = spawnSync(command, phases[phase], { cwd: root, stdio: 'inherit' });
  if (result.error) console.error(result.error.message);
  report.phases.push({ phase, exitCode: result.status ?? 1, elapsedMs: Date.now() - started });
  report.status = result.status === 0 ? 'running' : 'failed'; record();
  if (result.status !== 0) process.exit(result.status ?? 1);
}
if (fingerprint() !== report.sourceHash) {
  report.status = 'source-changed'; record();
  console.error('[check] Source changed during verification. Run the gate again.'); process.exit(1);
}
report.status = 'passed'; record();
console.log('\n[check] PASS');
