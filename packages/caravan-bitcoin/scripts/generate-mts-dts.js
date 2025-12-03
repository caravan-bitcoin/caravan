#!/usr/bin/env node
/**
 * Generate .d.mts files from .d.ts files for proper ESM type support
 */
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const dtsFile = path.join(distDir, 'index.d.ts');
const dmtsFile = path.join(distDir, 'index.d.mts');

if (fs.existsSync(dtsFile)) {
  // Copy .d.ts to .d.mts for ESM types
  fs.copyFileSync(dtsFile, dmtsFile);
  console.log('✓ Generated index.d.mts');
} else {
  console.error('✗ index.d.ts not found');
  process.exit(1);
}
