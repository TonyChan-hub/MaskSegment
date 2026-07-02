import esbuild from 'esbuild';
import { readdirSync } from 'fs';
import { resolve, relative, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const srcDir = resolve(root, 'src');
const distDir = resolve(root, 'dist');

// Find all TS/TSX entry files
const entryPoints = [];
function scan(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      scan(full);
    } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
      entryPoints.push(full);
    }
  }
}
scan(srcDir);

if (entryPoints.length === 0) {
  console.error('No entry points found in src/');
  process.exit(1);
}

console.log(`Building ${entryPoints.length} files...`);

await esbuild.build({
  entryPoints,
  outdir: distDir,
  format: 'cjs',
  platform: 'neutral',
  target: 'es2020',
  bundle: false,
  sourcemap: false,
  minify: true,
  minifyWhitespace: true,
  minifyIdentifiers: true,
  minifySyntax: true,
  treeShaking: false, // Keep all exports since it's a library
  keepNames: false,
  jsx: 'automatic',
  outbase: srcDir,
});

console.log('Build complete.');
