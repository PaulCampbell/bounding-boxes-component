import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputPath = path.resolve(__dirname, 'dist', 'bounding-boxes.js');
const outputDir = path.dirname(outputPath);

await mkdir(outputDir, { recursive: true });

await build({
  entryPoints: [path.resolve(__dirname, 'src', 'bounding-boxes.js')],
  bundle: true,
  minify: true,
  format: 'esm',
  outfile: outputPath,
  sourcemap: false,
  target: ['es2020'],
});

console.log(`Built ${path.relative(__dirname, outputPath)}`);
