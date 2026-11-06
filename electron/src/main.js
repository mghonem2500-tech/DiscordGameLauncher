const { app, BrowserWindow, ipcMain, shell, clipboard } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const os = require('os');
const { spawn } = require('child_process');
const { makeGameKey } = require('./launcher-state');

const DISCORD_DETECTABLE_URL = 'https://discord.com/api/applications/detectable';
const MEDO_USER_DATA_DIR = 'MedoGameLauncher';
const SHARE_PROTOCOL = 'medo-launcher';

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
    if (!name || !exe) return null;

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
    gameListPath: path.join(userData, 'gamelist.json'),
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
  try {
    const raw = await fsp.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, data) {
  await fsp.writeFile(filePath, JSON.stringify(data, null, 2) + os.EOL, 'utf8');
}

async function syncGameList(gameListPath) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  let res;
  try {
    res = await fetch(DISCORD_DETECTABLE_URL, {
    headers: {
      'User-Agent': 'DiscordFakeGameLauncherUI/0.1.0',
      'Accept': 'application/json'
    }, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    throw new Error(`Discord API error: ${res.status} ${res.statusText}`);
  }

  const text = (await res.text()).trim();

  let localTrimmed = null;
  try {
    localTrimmed = (await fsp.readFile(gameListPath, 'utf8')).trim();
  } catch {
    localTrimmed = null;
  }

  if (localTrimmed !== text) {
    // Optional backup
    if (localTrimmed != null) {
      try {
        await fsp.copyFile(gameListPath, gameListPath + '.bak');
      } catch {
        // ignore
      }
    }

    await fsp.writeFile(gameListPath, text + os.EOL, 'utf8');
    return { updated: true };
  }

  return { updated: false };
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

  const appIdFolder = game.appId ? String(game.appId) : sanitizeFolderName(game.name);

  const exeRelPath = normalizeExeRelPath(game.exe);
  if (!exeRelPath || path.isAbsolute(exeRelPath) || exeRelPath.includes(`..${path.sep}`) || exeRelPath.includes(`..\\`)) {
    throw new Error('Invalid executable path supplied by the game database.');
  }
  const exeFolderPart = path.dirname(exeRelPath) === '.' ? '' : path.dirname(exeRelPath);
  const exeFileName = path.basename(exeRelPath);

  const gameFolder = path.join(paths.gamesRoot, appIdFolder, exeFolderPart);
  ensureDirSync(gameFolder);

  const destExePath = path.join(gameFolder, exeFileName);

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

let pendingUpdateInfo = null;

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
  });

  autoUpdater.on('update-not-available', () => {
    pendingUpdateInfo = null;
  });

  autoUpdater.on('error', (err) => {
    mainWindow?.webContents.send('update/error', { message: String(err?.message || err || 'Unknown error') });
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
    mainWindow?.webContents.send('update/error', { message: String(e?.message || e || 'Unknown error') });
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

  await mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

async function addGameEntry(game) {
  const paths = getUserDataPaths();
  ensureDirSync(paths.userData);

  const myGames = await readJsonIfExists(paths.myGamesPath, []);
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

  try {
    if (fs.existsSync(paths.myGamesPath)) await fsp.copyFile(paths.myGamesPath, paths.myGamesPath + '.bak');
  } catch { /* backup is best effort */ }

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

ipcMain.handle('launcher/syncGameList', async () => {
  const paths = getUserDataPaths();
  ensureDirSync(paths.userData);
  const result = await syncGameList(paths.gameListPath);
  await loadDatabaseCache(paths.gameListPath);
  return { ...result, gameListPath: paths.gameListPath };
});

ipcMain.handle('launcher/getDatabaseGames', async (_evt, { filter, offset, limit } = {}) => {
  const paths = getUserDataPaths();

  if (!databaseCache.loaded || databaseCache.gameListPath !== paths.gameListPath) {
    await loadDatabaseCache(paths.gameListPath);
  }

  return pageDatabaseGames({ filter, offset, limit });
});

ipcMain.handle('launcher/getMyGames', async () => {
  const paths = getUserDataPaths();
  const list = await readJsonIfExists(paths.myGamesPath, []);
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
  const params = new URLSearchParams({
    appId: String(game?.appId || ''),
    name: String(game?.name || 'Game'),
    exe: String(game?.exe || '')
  });
  const url = `${SHARE_PROTOCOL}://add-game?${params.toString()}`;
  clipboard.writeText(url);
  return { ok: true, url, copied: true };
});

ipcMain.handle('launcher/importSharedGame', async (_evt, rawUrl) => {
  const game = parseSharedGameUrl(String(rawUrl || '').trim());
  if (!game) return { ok: false, error: 'Invalid Medo Game Launcher share link.' };
  const result = await addGameEntry(game);
  return { ok: true, ...result };
});

ipcMain.handle('launcher/toggleFavorite', async (_evt, { appId, exe }) => {
  const paths = getUserDataPaths();
  const myGames = await readJsonIfExists(paths.myGamesPath, []);
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
  const myGames = await readJsonIfExists(paths.myGamesPath, []);
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

  const myGames = await readJsonIfExists(paths.myGamesPath, []);
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
      ? process.execPath
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
  const existing = gameKey ? runningProcesses.get(gameKey) : null;
  if (existing && !existing.killed && existing.exitCode === null) {
    return { ok: true, exePath: existing.spawnargs?.[0] || '', gameKey, alreadyRunning: true };
  }

  const { destExePath, workingDirectory } = await ensureFakeExeForGame(game, paths);

  const displayName = String(game?.name || path.basename(destExePath));

  const proc = spawn(destExePath, [displayName], {
    cwd: workingDirectory,
    windowsHide: false,
    stdio: 'ignore'
  });

  runningProcesses.set(gameKey, proc);

  proc.once('exit', () => {
    runningProcesses.delete(gameKey);
    mainWindow?.webContents.send('launcher/gameExited', {
      gameKey,
      appId: String(game?.appId || ''),
      exe: String(game?.exe || ''),
      name: String(game?.name || '')
    });
  });

  return { ok: true, exePath: destExePath, gameKey };
});

ipcMain.handle('launcher/stopGame', async (_evt, game) => {
  const requestedKey = game ? makeGameKey(game) : null;

  if (!requestedKey) {
    for (const [gameKey, proc] of [...runningProcesses.entries()]) {
      try { proc.kill(); } catch {}
      runningProcesses.delete(gameKey);
    }
    return { ok: true, stoppedAll: true };
  }

  const proc = runningProcesses.get(requestedKey);
  if (!proc) {
    return { ok: true, stopped: false, gameKey: requestedKey };
  }

  try {
    proc.kill();
  } catch {
    // ignore
  }

  runningProcesses.delete(requestedKey);
  return { ok: true, stopped: true, gameKey: requestedKey };
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
