#!/usr/bin/env node
/**
 * Generate .d.mts files from .d.ts files for proper ESM type support
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '..', 'dist');
const dtsFile = path.join(distDir, 'index.d.ts');
const dmtsFile = path.join(distDir, 'index.d.mts');
const dctsFile = path.join(distDir, 'index.d.cts');

if (fs.existsSync(dtsFile)) {
  // Copy .d.ts to .d.mts for ESM types
  fs.copyFileSync(dtsFile, dmtsFile);
  console.log('✓ Generated index.d.mts');
  // Copy .d.ts to .d.cts for CommonJS types
  fs.copyFileSync(dtsFile, dctsFile);
  console.log('✓ Generated index.d.cts');
} else {
  console.error('✗ index.d.ts not found');
  process.exit(1);
}
