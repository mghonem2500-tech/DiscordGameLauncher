const { app, BrowserWindow, ipcMain, shell, clipboard, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const os = require('os');
const crypto = require('crypto');
const { spawn, execFile } = require('child_process');
const { promisify } = require('util');
const { writeJsonAtomic, readJsonWithBackup, replaceAtomically } = require('./persistence');
const { parseGameList } = require('./game-list');
const { makeGameKey } = require('./launcher-state');

const execFileAsync = promisify(execFile);

const DISCORD_DETECTABLE_URL = 'https://discord.com/api/applications/detectable';
const MEDO_USER_DATA_DIR = 'MedoGameLauncher';
const SHARE_PROTOCOL = 'medo-launcher';
const SHARE_SIGNING_KEY = 'medo-game-launcher-share-v1';

let pendingSharedUrls = [];

function extractShareUrl(values) {
  return (values || []).find(value => String(value || '').toLowerCase().startsWith(`${SHARE_PROTOCOL}://`)) || '';
}

function parseSharedGameUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== `${SHARE_PROTOCOL}:` || parsed.hostname !== 'add-game') return null;

    const name = String(parsed.searchParams.get('name') || '').trim().slice(0, 200);
    const appId = String(parsed.searchParams.get('appId') || '').trim().slice(0, 100);
    const exe = String(parsed.searchParams.get('exe') || '').trim().slice(0, 200);
    const signature = String(parsed.searchParams.get('sig') || '').trim();
    if (!name || !exe || !signature) return null;

    const expected = crypto.createHmac('sha256', SHARE_SIGNING_KEY)
      .update(`${appId}|${name}|${exe}`)
      .digest('hex');
    if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;

    return { id: appId, name, exe };
  } catch {
    return null;
  }
}

// In-memory cache to avoid re-reading/parsing large gamelist.json on every search.
let databaseCache = {
  loaded: false,
  gameListPath: null,
  games: []
};

function ensureDirSync(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function getUserDataPaths() {
  const userData = app.getPath('userData');
  return {
    userData,
    myGamesPath: path.join(userData, 'myGames.json'),
    myGamesBackupPath: path.join(userData, 'myGames.json.bak'),
    welcomePath: path.join(userData, 'welcome-seen.json'),
    languagePath: path.join(userData, 'language.json'),
    gameListPath: path.join(userData, 'gamelist.json'),
    runningGamesPath: path.join(userData, 'running-games.json'),
    gamesRoot: path.join(userData, 'games')
  };
}

function sanitizeFolderName(name) {
  return (name || 'UnknownApp')
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/[\u0000-\u001F]/g, '_')
    .trim()
    .slice(0, 128);
}

function fallbackExeNameFromTitle(name) {
  const base = sanitizeFolderName(String(name || 'Game'))
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);

  const safeBase = base || 'Game';
  return safeBase.toLowerCase().endsWith('.exe') ? safeBase : `${safeBase}.exe`;
}

function normalizeExeRelPath(exeName) {
  return (exeName || '')
    .replace(/\\/g, path.sep)
    .replace(/\//g, path.sep);
}

function pickBestExecutable(appEntry) {
  const exes = Array.isArray(appEntry.executables) ? appEntry.executables : [];

  const nonLauncherWin32 = exes.find(e =>
    String(e?.os || '').toLowerCase() === 'win32' && !e?.is_launcher && e?.name);
  if (nonLauncherWin32) return nonLauncherWin32;

  const anyWin32 = exes.find(e =>
    String(e?.os || '').toLowerCase() === 'win32' && e?.name);
  return anyWin32 || null;
}

function toDatabaseGames(detectableApps) {
  const result = [];
  for (const appEntry of detectableApps || []) {
    if (!appEntry?.name) continue;
    const bestExe = pickBestExecutable(appEntry);

    const appId = String(appEntry.id || '');
    const exeName = bestExe?.name ? String(bestExe.name) : fallbackExeNameFromTitle(appEntry.name);

    result.push({
      id: appId,
      name: String(appEntry.name),
      exe: exeName,
      isLauncher: Boolean(bestExe?.is_launcher),
      usesNewDetection: !bestExe || !bestExe.name, // <-- FLAG FOR FRONTEND
      _nameLower: String(appEntry.name).toLowerCase()
    });
  }

  result.sort((a, b) => a.name.localeCompare(b.name));
  return result;
}

async function loadDatabaseCache(gameListPath) {
  if (!gameListPath) return;

  try {
    const detectableApps = await readJsonIfExists(gameListPath, []);
    const games = toDatabaseGames(detectableApps);
    databaseCache = {
      loaded: true,
      gameListPath,
      games
    };
  } catch {
    // Keep old cache if parsing fails
  }
}

function pageDatabaseGames({ filter, offset, limit }) {
  const term = String(filter || '').trim().toLowerCase();
  const start = Number.isFinite(offset) ? Math.max(0, offset) : 0;
  const pageSize = Number.isFinite(limit) ? Math.min(500, Math.max(1, limit)) : 200;

  const items = [];
  let matchIndex = 0;
  let hasMore = false;

  const games = databaseCache.games;

  for (let i = 0; i < games.length; i++) {
    const g = games[i];
    if (term && !g._nameLower.includes(term)) continue;

    if (matchIndex >= start && items.length < pageSize) {
      // Strip internal fields before crossing IPC boundary
      items.push({
        id: g.id,
        name: g.name,
        exe: g.exe,
        isLauncher: g.isLauncher,
        usesNewDetection: g.usesNewDetection // <-- SEND TO FRONTEND
      });
    }

    matchIndex++;

    // Determine whether there is at least one more match beyond this page
    if (items.length >= pageSize && matchIndex > start + pageSize) {
      hasMore = true;
      break;
    }
  }

  return {
    items,
    offset: start,
    limit: pageSize,
    hasMore
  };
}

async function readJsonIfExists(filePath, fallback) {
  return readJsonWithBackup(filePath, fallback);
}

async function writeJson(filePath, data, { backup = true } = {}) {
  await writeJsonAtomic(filePath, data, { backupPath: backup ? `${filePath}.bak` : null });
}

async function readMyGamesList(paths) {
  return readJsonWithBackup(paths.myGamesPath, [], {
    backupPath: paths.myGamesBackupPath,
    validate: Array.isArray
  });
}

async function syncGameList(gameListPath) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    let res;
    try {
      res = await fetch(DISCORD_DETECTABLE_URL, {
        headers: {
          'User-Agent': 'DiscordFakeGameLauncherUI/0.1.0',
          'Accept': 'application/json'
        },
        signal: controller.signal
      });
    } catch (error) {
      const timeoutError = new Error(controller.signal.aborted
        ? 'The game database request timed out.'
        : 'Could not connect to the game database. Check your internet connection.');
      timeoutError.code = controller.signal.aborted ? 'timeout' : 'network';
      throw timeoutError;
    }

    if (!res.ok) {
      const error = new Error(`The game database returned HTTP ${res.status}.`);
      error.code = 'http';
      error.status = res.status;
      throw error;
    }

    let text;
    try {
      text = (await res.text()).trim();
      parseGameList(text);
    } catch (error) {
      if (!error.code) {
        error.code = controller.signal.aborted ? 'timeout' : 'network';
        error.message = controller.signal.aborted
          ? 'The game database request timed out while downloading data.'
          : 'Could not download the game database.';
      }
      throw error;
    }

    let localTrimmed = null;
    try {
      const local = (await fsp.readFile(gameListPath, 'utf8')).trim();
      parseGameList(local);
      localTrimmed = local;
    } catch {
      // A corrupt local list is replaced only after the remote response validates.
    }

    if (localTrimmed === text) return { updated: false };

    await replaceAtomically(gameListPath, `${text}${os.EOL}`, `${gameListPath}.bak`);
    return { updated: true };
  } catch (error) {
    if (!error.code) error.code = 'storage';
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}


async function findDummyGameTemplate() {
  if (process.env.DUMMYGAME_EXE && fs.existsSync(process.env.DUMMYGAME_EXE)) {
    return process.env.DUMMYGAME_EXE;
  }

  // Packaged build: bundled via electron-builder extraResources
  if (app.isPackaged) {
    const bundled = path.join(process.resourcesPath, 'dummygame', 'DummyGame.exe');
    if (fs.existsSync(bundled)) return bundled;
  }

  // Repo-relative fallback (dev): ../src/DummyGame/bin/**/DummyGame.exe
  const repoRoot = path.resolve(app.getAppPath(), '..', '..');
  const dummyProjBin = path.join(repoRoot, 'src', 'DummyGame', 'bin');
  if (!fs.existsSync(dummyProjBin)) return null;

  // Try common locations first (Release, Debug)
  const candidates = [];
  const configs = ['Release', 'Debug'];
  for (const cfg of configs) {
    candidates.push(path.join(dummyProjBin, cfg, 'net8.0-windows', 'DummyGame.exe'));
    candidates.push(path.join(dummyProjBin, cfg, 'net8.0-windows7.0', 'DummyGame.exe'));
  }

  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }

  // Last resort: shallow search
  const stack = [dummyProjBin];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        // avoid huge recursion
        if (p.toLowerCase().includes('ref')) continue;
        stack.push(p);
      } else if (e.isFile() && e.name.toLowerCase() === 'dummygame.exe') {
        return p;
      }
    }
  }

  return null;
}

async function ensureFakeExeForGame(game, paths) {
  const dummySourceExe = await findDummyGameTemplate();
  if (!dummySourceExe) {
    throw new Error('Could not find DummyGame.exe. Run: npm run build:dummy (from electron/), or set DUMMYGAME_EXE env var to the built DummyGame.exe path.');
  }

  ensureDirSync(paths.gamesRoot);

  const rawAppIdFolder = game.appId ? String(game.appId) : sanitizeFolderName(game.name);
  const appIdFolder = sanitizeFolderName(rawAppIdFolder).replace(/[. ]+$/g, '') || 'UnknownApp';

  const exeRelPath = normalizeExeRelPath(game.exe);
  if (!exeRelPath || path.isAbsolute(exeRelPath) || exeRelPath.split(/[\\/]+/).some(part => part === '..' || part === '.')) {
    throw new Error('Invalid executable path supplied by the game database.');
  }
  const exeFolderPart = path.dirname(exeRelPath) === '.' ? '' : path.dirname(exeRelPath);
  const exeFileName = path.basename(exeRelPath);

  const gamesRoot = path.resolve(paths.gamesRoot);
  const gameFolder = path.resolve(gamesRoot, appIdFolder, exeFolderPart);
  if (!gameFolder.startsWith(`${gamesRoot}${path.sep}`)) {
    throw new Error('The game path resolves outside the launcher games folder.');
  }
  const destExePath = path.resolve(gameFolder, exeFileName);
  if (!destExePath.startsWith(`${gameFolder}${path.sep}`)) {
    throw new Error('The executable path resolves outside the selected game folder.');
  }

  ensureDirSync(gameFolder);

  // Always refresh the fake executable from the bundled template. Existing
  // users may have an older DummyGame window cached in their userData folder.
  // The process is checked before this function is called, so overwriting is safe.
  await fsp.copyFile(dummySourceExe, destExePath);

  // Copy sidecar files DummyGame.* from source dir and refresh old versions.
  const sourceDir = path.dirname(dummySourceExe);
  const dummyBase = path.basename(dummySourceExe, path.extname(dummySourceExe));

  const sidecars = await fsp.readdir(sourceDir);
  for (const fileName of sidecars) {
    if (!fileName.toLowerCase().startsWith(dummyBase.toLowerCase() + '.')) continue;
    if (fileName.toLowerCase() === path.basename(dummySourceExe).toLowerCase()) continue;

    const src = path.join(sourceDir, fileName);
    const dest = path.join(gameFolder, fileName);
    await fsp.copyFile(src, dest);
  }

  return { destExePath, workingDirectory: path.dirname(destExePath) };
}

let mainWindow = null;
let runningProcesses = new Map();
const inFlightLaunches = new Set();

let pendingUpdateInfo = null;
let registryWriteQueue = Promise.resolve();
let allowWindowClose = false;
let closePromptActive = false;

function processRecordForStorage(gameKey, record) {
  return {
    gameKey,
    appId: String(record.game?.appId || ''),
    exe: String(record.game?.exe || ''),
    name: String(record.game?.name || ''),
    pid: Number(record.pid),
    exePath: String(record.exePath || ''),
    startedAt: String(record.startedAt || new Date().toISOString())
  };
}

function persistRunningGames() {
  const paths = getUserDataPaths();
  const snapshot = [...runningProcesses.entries()].map(([key, record]) => processRecordForStorage(key, record));
  registryWriteQueue = registryWriteQueue
    .catch(() => {})
    .then(() => writeJson(paths.runningGamesPath, snapshot));
  return registryWriteQueue;
}

async function getWindowsProcessExecutablePath(pid) {
  const safePid = Number(pid);
  if (!Number.isSafeInteger(safePid) || safePid <= 0) return { status: 'missing' };
  const command = `$ErrorActionPreference='Stop'; $p=Get-CimInstance -ClassName Win32_Process -Filter 'ProcessId = ${safePid}'; if ($p) { [Console]::Out.Write($p.ExecutablePath) }`;
  try {
    const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], {
      windowsHide: true,
      timeout: 5000,
      maxBuffer: 1024 * 1024
    });
    const exePath = String(stdout || '').trim();
    return exePath ? { status: 'found', exePath } : { status: 'missing' };
  } catch {
    return { status: 'unknown' };
  }
}

function pathsEqual(left, right) {
  return path.resolve(String(left)).toLowerCase() === path.resolve(String(right)).toLowerCase();
}

async function restoreRunningGames() {
  if (process.platform !== 'win32') return;
  const paths = getUserDataPaths();
  const records = await readJsonWithBackup(paths.runningGamesPath, [], { validate: Array.isArray });
  const gamesRoot = path.resolve(paths.gamesRoot);
  let changed = false;

  for (const record of records) {
    const game = { appId: String(record?.appId || ''), exe: String(record?.exe || ''), name: String(record?.name || '') };
    const gameKey = makeGameKey(game);
    const pid = Number(record?.pid);
    const exePath = String(record?.exePath || '');
    if (!gameKey || !Number.isSafeInteger(pid) || pid <= 0 || !path.isAbsolute(exePath) ||
        !path.resolve(exePath).toLowerCase().startsWith(`${gamesRoot}${path.sep}`.toLowerCase())) {
      changed = true;
      continue;
    }

    const processInfo = await getWindowsProcessExecutablePath(pid);
    if (processInfo.status === 'missing' ||
        (processInfo.status === 'found' && !pathsEqual(processInfo.exePath, exePath))) {
      changed = true;
      continue;
    }

    runningProcesses.set(gameKey, {
      proc: null,
      pid,
      exePath,
      game,
      startedAt: String(record.startedAt || new Date().toISOString()),
      recovered: true,
      verificationPending: processInfo.status === 'unknown'
    });
  }

  if (changed) await persistRunningGames();
}

async function stopOneGame(gameKey, record) {
  if (!record) return true;
  const pid = Number(record.pid || record.proc?.pid);
  if (process.platform === 'win32' && Number.isSafeInteger(pid) && pid > 0) {
    if (record.recovered) {
      const processInfo = await getWindowsProcessExecutablePath(pid);
      if (processInfo.status === 'missing') {
        if (runningProcesses.get(gameKey) === record) runningProcesses.delete(gameKey);
        await persistRunningGames();
        return true;
      }
      if (processInfo.status !== 'found' || !pathsEqual(processInfo.exePath, record.exePath)) return false;
    }

    try {
      await execFileAsync('taskkill.exe', ['/PID', String(pid), '/T', '/F'], {
        windowsHide: true,
        timeout: 5000
      });
    } catch {
      const processInfo = await getWindowsProcessExecutablePath(pid);
      if (processInfo.status !== 'missing') return false;
    }
  } else if (record.proc && record.proc.exitCode === null && !record.proc.killed) {
    try {
      record.proc.kill();
    } catch {
      if (record.proc.exitCode === null) return false;
    }
  }

  if (runningProcesses.get(gameKey) === record) runningProcesses.delete(gameKey);
  await persistRunningGames();
  return true;
}

async function stopAllGames() {
  const failed = [];
  for (const [gameKey, record] of [...runningProcesses.entries()]) {
    if (!await stopOneGame(gameKey, record)) failed.push(record.game?.name || gameKey);
  }
  return failed;
}

function getRunningGamesForUi() {
  return [...runningProcesses.entries()].map(([gameKey, record]) => ({
    gameKey,
    appId: String(record.game?.appId || ''),
    exe: String(record.game?.exe || ''),
    name: String(record.game?.name || '')
  }));
}

function coerceReleaseNotesToText(releaseNotes) {
  if (!releaseNotes) return '';

  // electron-updater can provide string or array (for multi-platform notes)
  if (typeof releaseNotes === 'string') return releaseNotes;

  if (Array.isArray(releaseNotes)) {
    // Prefer Windows notes, else join whatever exists
    const win = releaseNotes.find(r => String(r?.path || '').toLowerCase().includes('win'));
    const chosen = win || releaseNotes[0];
    if (typeof chosen?.note === 'string') return chosen.note;
    return releaseNotes
      .map(r => (typeof r?.note === 'string' ? r.note : ''))
      .filter(Boolean)
      .join('\n\n');
  }

  return String(releaseNotes);
}

async function maybeCheckForUpdates() {
  // Updates only make sense in packaged builds.
  if (!app.isPackaged) return;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  mainWindow?.webContents.send('update/status', { state: 'checking' });

  autoUpdater.on('update-available', (info) => {
    // No persisted dismissal: if the user picks "remind later", the update
    // prompt will simply reappear the next time the app starts and checks.
    pendingUpdateInfo = info;
    const payload = {
      version: String(info?.version || ''),
      releaseName: String(info?.releaseName || ''),
      releaseDate: info?.releaseDate ? String(info.releaseDate) : '',
      releaseNotes: coerceReleaseNotesToText(info?.releaseNotes)
    };

    mainWindow?.webContents.send('update/available', payload);
    mainWindow?.webContents.send('update/status', { state: 'available', version: payload.version });
  });

  autoUpdater.on('update-not-available', () => {
    pendingUpdateInfo = null;
    mainWindow?.webContents.send('update/status', { state: 'current', version: app.getVersion() });
  });

  autoUpdater.on('error', (err) => {
    const message = String(err?.message || err || 'Unknown error');
    mainWindow?.webContents.send('update/status', { state: 'error', message });
    mainWindow?.webContents.send('update/error', { message });
  });

  autoUpdater.on('download-progress', (progress) => {
    mainWindow?.webContents.send('update/progress', {
      percent: Number(progress?.percent) || 0,
      transferred: Number(progress?.transferred) || 0,
      total: Number(progress?.total) || 0,
      bytesPerSecond: Number(progress?.bytesPerSecond) || 0
    });
  });

  autoUpdater.on('update-downloaded', () => {
    mainWindow?.webContents.send('update/downloaded');
  });

  try {
    await autoUpdater.checkForUpdates();
  } catch (e) {
    const message = String(e?.message || e || 'Unknown error');
    mainWindow?.webContents.send('update/status', { state: 'error', message });
    mainWindow?.webContents.send('update/error', { message });
  }
}


async function createWindow() {
  const windowIcon = app.isPackaged
    ? path.join(process.resourcesPath, 'medo-icon.ico')
    : path.join(app.getAppPath(), 'assets', 'icon.ico');

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 700,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    icon: windowIcon,
    backgroundColor: '#36393f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.on('close', event => {
    if (allowWindowClose || runningProcesses.size === 0) return;
    event.preventDefault();
    if (closePromptActive) return;
    closePromptActive = true;

    void (async () => {
      const languageState = await readJsonIfExists(getUserDataPaths().languagePath, {});
      const arabic = languageState?.language === 'ar';
      const response = await dialog.showMessageBox(mainWindow, {
        type: 'warning',
        title: arabic ? 'جلسات ألعاب قيد التشغيل' : 'Game sessions are running',
        message: arabic
          ? 'هناك جلسات ألعاب وهمية ما زالت تعمل. ماذا تريد أن يحدث عند إغلاق المشغّل؟'
          : 'Fake game sessions are still running. Choose what should happen when the launcher closes.',
        buttons: arabic
          ? ['اتركها تعمل وأغلق', 'أوقف الألعاب وأغلق', 'إلغاء']
          : ['Keep running and close', 'Stop games and close', 'Cancel'],
        defaultId: 0,
        cancelId: 2,
        noLink: true
      });

      if (response.response === 2) return;
      if (response.response === 1) {
        const failed = await stopAllGames();
        if (failed.length) {
          await dialog.showMessageBox(mainWindow, {
            type: 'error',
            title: arabic ? 'تعذر إيقاف بعض الجلسات' : 'Could not stop every session',
            message: arabic
              ? `تعذر إيقاف: ${failed.join('، ')}. سيظل المشغّل مفتوحًا.`
              : `Could not stop: ${failed.join(', ')}. The launcher will remain open.`,
            buttons: [arabic ? 'حسنًا' : 'OK']
          });
          return;
        }
      } else {
        await persistRunningGames();
      }

      allowWindowClose = true;
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();
    })().catch(error => {
      console.error('Could not complete the close flow:', error);
    }).finally(() => {
      closePromptActive = false;
    });
  });

  await mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

async function addGameEntry(game) {
  const paths = getUserDataPaths();
  ensureDirSync(paths.userData);

  const myGames = await readMyGamesList(paths);
  const safeList = Array.isArray(myGames) ? myGames : [];
  const entry = {
    appId: String(game?.id ?? game?.appId ?? ''),
    name: String(game?.name || 'Game').trim().slice(0, 200),
    exe: String(game?.exe || '').trim().slice(0, 200),
    isFavorite: false
  };

  if (!entry.exe) entry.exe = fallbackExeNameFromTitle(entry.name);

  const key = `${entry.appId}::${entry.exe}`;
  const existing = safeList.find(g => `${String(g?.appId || '')}::${String(g?.exe || '')}` === key);
  if (existing) return { entry: existing, added: false };

  safeList.push(entry);
  await writeJson(paths.myGamesPath, safeList);
  return { entry, added: true };
}

async function handleSharedGameUrl(rawUrl) {
  const game = parseSharedGameUrl(rawUrl);
  if (!game) return false;

  const result = await addGameEntry(game);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send('launcher/sharedGame', { ...result, source: rawUrl });
  }
  return true;
}

const initialShareUrl = extractShareUrl(process.argv);
if (initialShareUrl) pendingSharedUrls.push(initialShareUrl);

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, commandLine) => {
    const shareUrl = extractShareUrl(commandLine);
    if (shareUrl) void handleSharedGameUrl(shareUrl);
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

app.whenReady().then(async () => {
  app.setAppUserModelId('com.medo.game-launcher');
  // Keep Medo Game Launcher completely isolated from the original launcher.
  // This prevents shared libraries, cached game files and settings.
  app.setPath('userData', path.join(app.getPath('appData'), MEDO_USER_DATA_DIR));
  if (process.platform === 'win32') app.setAsDefaultProtocolClient(SHARE_PROTOCOL);
  await restoreRunningGames();
  await createWindow();

  for (const shareUrl of pendingSharedUrls.splice(0)) await handleSharedGameUrl(shareUrl);

  // Check for updates (packaged builds only)
  await maybeCheckForUpdates();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('app/window/minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('app/window/close', () => {
  mainWindow?.close();
});

ipcMain.handle('app/openExternalUrl', async (_evt, rawUrl) => {
  const url = String(rawUrl || '').trim();
  if (!/^https:\/\/github\.com\/mghonem2500-tech\/DiscordGameLauncher\/releases\/download\//i.test(url)) {
    return { ok: false, error: 'Invalid download URL.' };
  }
  await shell.openExternal(url);
  return { ok: true };
});

ipcMain.handle('launcher/syncGameList', async () => {
  const paths = getUserDataPaths();
  ensureDirSync(paths.userData);
  try {
    const result = await syncGameList(paths.gameListPath);
    await loadDatabaseCache(paths.gameListPath);
    return { ok: true, ...result, gameListPath: paths.gameListPath };
  } catch (error) {
    await loadDatabaseCache(paths.gameListPath);
    return { ok: false, errorCode: error.code || 'network', status: error.status || 0 };
  }
});

ipcMain.handle('launcher/getRunningGames', () => getRunningGamesForUi());

ipcMain.handle('launcher/getDatabaseGames', async (_evt, { filter, offset, limit } = {}) => {
  const paths = getUserDataPaths();

  if (!databaseCache.loaded || databaseCache.gameListPath !== paths.gameListPath) {
    await loadDatabaseCache(paths.gameListPath);
  }

  return pageDatabaseGames({ filter, offset, limit });
});

ipcMain.handle('launcher/getMyGames', async () => {
  const paths = getUserDataPaths();
  const list = await readMyGamesList(paths);
  const safeList = Array.isArray(list) ? list : [];

  // Privacy/safety: remove any persisted artwork fields from older versions.
  let changed = false;
  for (const g of safeList) {
    if (g && typeof g === 'object') {
      if (Object.prototype.hasOwnProperty.call(g, 'icon')) { delete g.icon; changed = true; }
      if (Object.prototype.hasOwnProperty.call(g, 'thumbnail')) { delete g.thumbnail; changed = true; }
      if (Object.prototype.hasOwnProperty.call(g, 'igdbId')) { delete g.igdbId; changed = true; }
    }
  }
  if (changed) {
    try { await writeJson(paths.myGamesPath, safeList); } catch { /* ignore */ }
  }

  return safeList;
});

ipcMain.handle('launcher/addGame', async (_evt, game) => {
  return (await addGameEntry(game)).entry;
});

ipcMain.handle('launcher/shareGame', async (_evt, game) => {
  const appId = String(game?.appId || '');
  const name = String(game?.name || 'Game');
  const exe = String(game?.exe || '');
  const sig = crypto.createHmac('sha256', SHARE_SIGNING_KEY).update(`${appId}|${name}|${exe}`).digest('hex');
  const params = new URLSearchParams({ appId, name, exe, sig });
  const url = `${SHARE_PROTOCOL}://add-game?${params.toString()}`;
  clipboard.writeText(url);
  return { ok: true, url, copied: true };
});

ipcMain.handle('launcher/openShareLink', async (_evt, rawUrl) => {
  const url = String(rawUrl || '').trim();
  if (!parseSharedGameUrl(url)) return { ok: false, error: 'Invalid share link.' };
  await shell.openExternal(url);
  return { ok: true };
});

ipcMain.handle('launcher/previewSharedGame', async (_evt, rawUrl) => {
  const game = parseSharedGameUrl(String(rawUrl || '').trim());
  return game ? { ok: true, game } : { ok: false, error: 'Invalid or modified share link.' };
});

ipcMain.handle('launcher/importSharedGame', async (_evt, rawUrl) => {
  const game = parseSharedGameUrl(String(rawUrl || '').trim());
  if (!game) return { ok: false, error: 'Invalid Medo Game Launcher share link.' };
  const result = await addGameEntry(game);
  return { ok: true, ...result };
});

ipcMain.handle('app/getInfo', async () => {
  const paths = getUserDataPaths();
  const welcomeSeen = Boolean((await readJsonIfExists(paths.welcomePath, {}))?.seen);
  const language = (await readJsonIfExists(paths.languagePath, {}))?.language === 'ar' ? 'ar' : 'en';
  return { name: 'Medo Game Launcher', version: app.getVersion(), author: 'mohamed ghonem', welcomeSeen, language };
});

ipcMain.handle('app/completeWelcome', async () => {
  const paths = getUserDataPaths();
  await writeJson(paths.welcomePath, { seen: true, seenAt: new Date().toISOString() });
  return { ok: true };
});

ipcMain.handle('app/setLanguage', async (_evt, language) => {
  const paths = getUserDataPaths();
  const safeLanguage = language === 'ar' ? 'ar' : 'en';
  await writeJson(paths.languagePath, { language: safeLanguage });
  return { ok: true, language: safeLanguage };
});

ipcMain.handle('update/checkNow', async () => {
  if (!app.isPackaged) return { ok: false, error: 'Update checking is available in the installed version.' };
  await maybeCheckForUpdates();
  return { ok: true };
});

ipcMain.handle('launcher/toggleFavorite', async (_evt, { appId, exe }) => {
  const paths = getUserDataPaths();
  const myGames = await readMyGamesList(paths);
  const safeList = Array.isArray(myGames) ? myGames : [];

  let updated = null;
  for (const g of safeList) {
    if (String(g?.appId || '') === String(appId || '') && String(g?.exe || '') === String(exe || '')) {
      g.isFavorite = !g.isFavorite;
      updated = g;
      break;
    }
  }

  await writeJson(paths.myGamesPath, safeList);
  return updated;
});

ipcMain.handle('launcher/deleteGame', async (_evt, { appId, exe }) => {
  const paths = getUserDataPaths();
  const myGames = await readMyGamesList(paths);
  const safeList = Array.isArray(myGames) ? myGames : [];

  const before = safeList.length;
  const filtered = safeList.filter(g => !(
    String(g?.appId || '') === String(appId || '') &&
    String(g?.exe || '') === String(exe || '')
  ));

  if (filtered.length !== before) {
    await writeJson(paths.myGamesPath, filtered);
  }

  return { ok: true, removed: before - filtered.length };
});

ipcMain.handle('launcher/createShortcut', async (_evt, { appId, exe }) => {
  if (process.platform !== 'win32') {
    return { ok: false, error: 'Shortcuts are only supported on Windows.' };
  }

  const paths = getUserDataPaths();
  ensureDirSync(paths.userData);

  const myGames = await readMyGamesList(paths);
  const safeList = Array.isArray(myGames) ? myGames : [];

  const game = safeList.find(g =>
    String(g?.appId || '') === String(appId || '') &&
    String(g?.exe || '') === String(exe || '')
  );

  if (!game) return { ok: false, error: 'Game not found in library.' };

  try {
    const { destExePath, workingDirectory } = await ensureFakeExeForGame(game, paths);
    const desktopDir = app.getPath('desktop');

    const baseName = sanitizeFolderName(game.name || path.basename(destExePath, path.extname(destExePath))) || 'Game';
    let shortcutPath = path.join(desktopDir, `${baseName}.lnk`);

    // Avoid overwriting existing shortcuts: Game.lnk, Game (2).lnk, ...
    if (fs.existsSync(shortcutPath)) {
      for (let i = 2; i < 1000; i++) {
        const candidate = path.join(desktopDir, `${baseName} (${i}).lnk`);
        if (!fs.existsSync(candidate)) {
          shortcutPath = candidate;
          break;
        }
      }
    }

    const displayName = String(game?.name || path.basename(destExePath));
    const escaped = displayName.replace(/"/g, '\\"');
    const args = `"${escaped}"`;
    const shortcutIcon = app.isPackaged
      ? path.join(process.resourcesPath, 'medo-icon.ico')
      : path.join(app.getAppPath(), 'assets', 'icon.ico');

    const ok = shell.writeShortcutLink(shortcutPath, {
      target: destExePath,
      cwd: workingDirectory,
      args,
      icon: shortcutIcon,
      iconIndex: 0
    });

    if (!ok) return { ok: false, error: 'Failed to create shortcut.' };
    return { ok: true, path: shortcutPath };
  } catch (e) {
    return { ok: false, error: String(e?.message || e || 'Failed to create shortcut') };
  }
});

ipcMain.handle('launcher/selectGame', async (_evt, game) => {
  // No per-game icons/thumbnails in the public build.
  return true;
});

ipcMain.handle('launcher/launchGame', async (_evt, game) => {
  const paths = getUserDataPaths();
  ensureDirSync(paths.userData);

  const gameKey = makeGameKey(game);
  if (!gameKey) return { ok: false, error: 'Invalid game entry.' };
  if (inFlightLaunches.has(gameKey)) return { ok: true, gameKey, alreadyRunning: true, starting: true };
  const existing = gameKey ? runningProcesses.get(gameKey) : null;
  if (existing) return { ok: true, exePath: existing.exePath, gameKey, alreadyRunning: true };

  inFlightLaunches.add(gameKey);
  try {
    const { destExePath, workingDirectory } = await ensureFakeExeForGame(game, paths);
    const displayName = String(game?.name || path.basename(destExePath));
    const languageState = await readJsonIfExists(paths.languagePath, {});
    const language = languageState?.language === 'ar' ? 'ar' : 'en';
    const proc = spawn(destExePath, [displayName], {
      cwd: workingDirectory,
      env: { ...process.env, MEDO_LANGUAGE: language },
      windowsHide: false,
      stdio: 'ignore',
      detached: process.platform === 'win32'
    });

    const record = {
      proc,
      pid: 0,
      exePath: destExePath,
      game: {
        appId: String(game?.appId || ''),
        exe: String(game?.exe || ''),
        name: displayName
      },
      startedAt: new Date().toISOString(),
      recovered: false
    };
    let didSpawn = false;
    let finished = false;
    const finishRecord = () => {
      if (!didSpawn || finished) return;
      finished = true;
      if (runningProcesses.get(gameKey) === record) {
        runningProcesses.delete(gameKey);
        void persistRunningGames().catch(error => console.error('Could not save running-game state:', error));
      }
      mainWindow?.webContents.send('launcher/gameExited', {
        gameKey,
        appId: record.game.appId,
        exe: record.game.exe,
        name: record.game.name
      });
    };

    proc.once('exit', finishRecord);
    proc.on('error', () => finishRecord());

    await new Promise((resolve, reject) => {
      proc.once('spawn', () => {
        didSpawn = true;
        record.pid = Number(proc.pid) || 0;
        runningProcesses.set(gameKey, record);
        resolve();
      });
      proc.once('error', reject);
    });

    proc.unref();
    await persistRunningGames();
    return { ok: true, exePath: destExePath, gameKey };
  } catch (error) {
    return { ok: false, error: String(error?.message || error || 'Could not start the game process.') };
  } finally {
    inFlightLaunches.delete(gameKey);
  }
});

ipcMain.handle('launcher/stopGame', async (_evt, game) => {
  const requestedKey = game ? makeGameKey(game) : null;

  if (!requestedKey) {
    const failed = await stopAllGames();
    return { ok: failed.length === 0, stoppedAll: failed.length === 0, failed };
  }

  const record = runningProcesses.get(requestedKey);
  if (!record) {
    return { ok: true, stopped: false, gameKey: requestedKey };
  }

  const stopped = await stopOneGame(requestedKey, record);
  return { ok: stopped, stopped, gameKey: requestedKey };
});

// ───────────────────────────────────────────────────────────
// Updates
// ───────────────────────────────────────────────────────────
ipcMain.handle('update/remindLater', async () => {
  // Intentionally not persisted: the update prompt will show again on the
  // next app startup since nothing is written to disk here.
  pendingUpdateInfo = null;
  return { ok: true };
});

ipcMain.handle('update/install', async () => {
  if (!app.isPackaged) return { ok: false, error: 'Updates are only available in packaged builds.' };

  try {
    await autoUpdater.downloadUpdate();

    // When update-downloaded fires, renderer can call quitAndInstall.
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e?.message || e || 'Failed to download update') };
  }
});

ipcMain.handle('update/quitAndInstall', async () => {
  if (!app.isPackaged) return { ok: false, error: 'Not packaged.' };
  try {
    autoUpdater.quitAndInstall(true, true);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e?.message || e || 'Failed to install update') };
  }
});
