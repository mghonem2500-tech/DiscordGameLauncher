const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { readJsonWithBackup, writeJsonAtomic, replaceAtomically } = require('../src/persistence');

async function makeTempDirectory() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'medo-launcher-test-'));
}

test('writes JSON atomically and preserves the last valid copy', async t => {
  const directory = await makeTempDirectory();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const filePath = path.join(directory, 'library.json');

  await writeJsonAtomic(filePath, [{ id: 1 }]);
  await writeJsonAtomic(filePath, [{ id: 2 }]);

  assert.deepEqual(JSON.parse(await fs.readFile(filePath, 'utf8')), [{ id: 2 }]);
  assert.deepEqual(JSON.parse(await fs.readFile(`${filePath}.bak`, 'utf8')), [{ id: 1 }]);
});

test('restores a valid backup when the primary JSON file is corrupted', async t => {
  const directory = await makeTempDirectory();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const filePath = path.join(directory, 'settings.json');

  await writeJsonAtomic(filePath, { language: 'en' });
  await writeJsonAtomic(filePath, { language: 'ar' });
  await fs.writeFile(filePath, '{corrupt', 'utf8');

  const recovered = await readJsonWithBackup(filePath, {}, {
    validate: value => value && ['en', 'ar'].includes(value.language)
  });
  assert.deepEqual(recovered, { language: 'en' });
  assert.deepEqual(JSON.parse(await fs.readFile(filePath, 'utf8')), { language: 'en' });
});

test('atomically replaces a text data file and keeps its previous copy', async t => {
  const directory = await makeTempDirectory();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const filePath = path.join(directory, 'gamelist.json');

  await replaceAtomically(filePath, '[{"name":"old"}]\n', `${filePath}.bak`);
  await replaceAtomically(filePath, '[{"name":"new"}]\n', `${filePath}.bak`);

  assert.match(await fs.readFile(filePath, 'utf8'), /new/);
  assert.match(await fs.readFile(`${filePath}.bak`, 'utf8'), /old/);
});
