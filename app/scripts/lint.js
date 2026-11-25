/**
 * Lightweight Zero-Dependency Code Syntax & Integrity Validator
 * Recursively scans src/ and tests/ directories and validates JavaScript syntax using Node.js --check.
 * Note: Performs syntax validation, not full ESLint style-rule enforcement.
 */

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function getJavaScriptFiles(dir) {
  let files = [];
  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(getJavaScriptFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

const targetDirs = [
  path.resolve(__dirname, '../src'),
  path.resolve(__dirname, '../tests')
];

const jsFiles = targetDirs.flatMap(getJavaScriptFiles);

console.log(`[SYNTAX VALIDATOR] Checking ${jsFiles.length} JavaScript files for syntax validity and parse integrity...`);

let failed = false;

for (const file of jsFiles) {
  const relativePath = path.relative(path.resolve(__dirname, '..'), file);
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
    console.log(`  ✔ [VALID] ${relativePath}`);
  } catch (err) {
    console.error(`  ✖ [SYNTAX ERROR] ${relativePath}`);
    console.error(err.stderr.toString());
    failed = true;
  }
}

if (failed) {
  console.error('\n✖ Syntax validation failed with parse errors.');
  process.exit(1);
} else {
  console.log(`\n✔ Syntax validation passed successfully! All ${jsFiles.length} files parsed with zero errors.`);
}
