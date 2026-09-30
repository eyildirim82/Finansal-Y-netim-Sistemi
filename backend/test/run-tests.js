const { readdirSync } = require('node:fs');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');

function findTests(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const fullPath = join(directory, entry.name);
      if (entry.isDirectory()) return findTests(fullPath);
      return /\.test\.(js|ts)$/.test(entry.name) ? [fullPath] : [];
    })
    .sort();
}

const testFiles = findTests(__dirname);

if (testFiles.length === 0) {
  console.error('No test files found.');
  process.exit(1);
}

console.log(`Running ${testFiles.length} test files:`);
for (const file of testFiles) {
  console.log(`- ${file}`);
}

const result = spawnSync(
  process.execPath,
  ['--require', 'ts-node/register/transpile-only', '--test', ...testFiles],
  { stdio: 'inherit' }
);

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
