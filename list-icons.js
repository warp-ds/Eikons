#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directory containing the SVG files
const svgDir = path.join(__dirname, 'svg', 'Regular');

// Read all files in the directory
const files = fs.readdirSync(svgDir);

// Filter for SVG files and extract names (without extension)
const iconNames = files
  .filter(file => file.endsWith('.svg'))
  .map(file => path.basename(file, '.svg'))
  .sort(); // Sort alphabetically

// Output in the requested format
console.log('name: [' + iconNames.map(name => `"${name}"`).join(',') + ']');

// Optional: Also output a formatted version with line breaks for readability
console.log('\n\n// Formatted version:');
console.log('name: [');
iconNames.forEach((name, index) => {
  const comma = index < iconNames.length - 1 ? ',' : '';
  console.log(`  "${name}"${comma}`);
});
console.log(']');

// Optional: Output count
console.log(`\n\nTotal icons: ${iconNames.length}`);
