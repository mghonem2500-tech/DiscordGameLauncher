const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

async function replaceAtomically(filePath, contents, backupPath = null) {
  const directory = path.dirname(filePath);
  await fs.mkdir(directory, { recursive: true });
  const nonce = `${process.pid}-${crypto.randomBytes(6).toString('hex')}`;
  const temporaryPath = `${filePath}.${nonce}.tmp`;
  let handle;

  try {
    handle = await fs.open(temporaryPath, 'wx');
    await handle.writeFile(contents, 'utf8');
    await handle.sync();
    await handle.close();
    handle = null;

    if (backupPath) {
      try {
        const existing = await fs.readFile(filePath, 'utf8');
        JSON.parse(existing);
        const backupTemporaryPath = `${backupPath}.${nonce}.tmp`;
        try {
          await fs.mkdir(path.dirname(backupPath), { recursive: true });
          await fs.copyFile(filePath, backupTemporaryPath);
          await fs.rename(backupTemporaryPath, backupPath);
        } catch {
          await fs.rm(backupTemporaryPath, { force: true }).catch(() => {});
        }
      } catch {
        // Do not replace a known-good backup with a corrupt or missing file.
      }
    }

    await fs.rename(temporaryPath, filePath);
  } catch (error) {
    if (handle) await handle.close().catch(() => {});
    await fs.rm(temporaryPath, { force: true }).catch(() => {});
    throw error;
  }
}

async function writeJsonAtomic(filePath, value, { backupPath = `${filePath}.bak` } = {}) {
  await replaceAtomically(filePath, `${JSON.stringify(value, null, 2)}${os.EOL}`, backupPath);
}

async function readJsonWithBackup(filePath, fallback, { backupPath = `${filePath}.bak`, validate } = {}) {
  const isValid = value => {
    try {
      return typeof validate === 'function' ? Boolean(validate(value)) : true;
    } catch {
      return false;
    }
  };

  try {
    const value = JSON.parse(await fs.readFile(filePath, 'utf8'));
    if (isValid(value)) return value;
  } catch {
    // Try the last valid copy below.
  }

  try {
    const recovered = JSON.parse(await fs.readFile(backupPath, 'utf8'));
    if (isValid(recovered)) {
      await replaceAtomically(filePath, `${JSON.stringify(recovered, null, 2)}${os.EOL}`);
      return recovered;
    }
  } catch {
    // No valid backup exists.
  }

  return fallback;
}

module.exports = { replaceAtomically, writeJsonAtomic, readJsonWithBackup };
