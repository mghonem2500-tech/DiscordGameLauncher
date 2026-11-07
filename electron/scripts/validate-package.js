const fs = require('fs');
const path = require('path');

const packaged = process.argv.includes('--packaged');
const templateDirectory = path.resolve(__dirname, '..', 'build-resources', 'dummygame');
const packagedDirectory = path.resolve(__dirname, '..', 'dist', 'win-unpacked', 'resources', 'dummygame');
const targetDirectory = packaged ? packagedDirectory : templateDirectory;
const requiredFiles = [
  'DummyGame.exe',
  'DummyGame.dll',
  'DummyGame.deps.json',
  'DummyGame.runtimeconfig.json'
];

const missing = requiredFiles.filter(file => {
  const fullPath = path.join(targetDirectory, file);
  try {
    return !fs.statSync(fullPath).isFile() || fs.statSync(fullPath).size === 0;
  } catch {
    return true;
  }
});

if (missing.length) {
  console.error(`DummyGame ${packaged ? 'package' : 'template'} validation failed.`);
  console.error(`Directory: ${targetDirectory}`);
  console.error(`Missing or empty: ${missing.join(', ')}`);
  process.exitCode = 1;
} else {
  console.log(`DummyGame ${packaged ? 'package' : 'template'} is complete: ${targetDirectory}`);
}
