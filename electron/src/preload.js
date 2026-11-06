const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('launcherApi', {
  // Window
  minimize: () => ipcRenderer.invoke('app/window/minimize'),
  close: () => ipcRenderer.invoke('app/window/close'),

  // Data
  syncGameList: () => ipcRenderer.invoke('launcher/syncGameList'),
  getDatabaseGames: (filter, offset, limit) => ipcRenderer.invoke('launcher/getDatabaseGames', { filter, offset, limit }),
  getMyGames: () => ipcRenderer.invoke('launcher/getMyGames'),
  addGame: (game) => ipcRenderer.invoke('launcher/addGame', game),
  toggleFavorite: (appId, exe) => ipcRenderer.invoke('launcher/toggleFavorite', { appId, exe }),
  deleteGame: (appId, exe) => ipcRenderer.invoke('launcher/deleteGame', { appId, exe }),
  createShortcut: (appId, exe) => ipcRenderer.invoke('launcher/createShortcut', { appId, exe }),
  shareGame: (game) => ipcRenderer.invoke('launcher/shareGame', game),
  openShareLink: (url) => ipcRenderer.invoke('launcher/openShareLink', url),
  previewSharedGame: (url) => ipcRenderer.invoke('launcher/previewSharedGame', url),
  importSharedGame: (url) => ipcRenderer.invoke('launcher/importSharedGame', url),

  // Run
  selectGame: (game) => ipcRenderer.invoke('launcher/selectGame', game),
  launchGame: (game) => ipcRenderer.invoke('launcher/launchGame', game),
  stopGame: (game) => ipcRenderer.invoke('launcher/stopGame', game),

  // Events
  onGameExited: (handler) => {
    ipcRenderer.removeAllListeners('launcher/gameExited');
    ipcRenderer.on('launcher/gameExited', (_evt, payload) => handler(payload));
  },
  onSharedGame: (handler) => {
    ipcRenderer.removeAllListeners('launcher/sharedGame');
    ipcRenderer.on('launcher/sharedGame', (_evt, payload) => handler(payload));
  },

  // Updates
  installUpdate: () => ipcRenderer.invoke('update/install'),
  remindUpdateLater: () => ipcRenderer.invoke('update/remindLater'),
  quitAndInstallUpdate: () => ipcRenderer.invoke('update/quitAndInstall'),
  onUpdateAvailable: (handler) => {
    ipcRenderer.removeAllListeners('update/available');
    ipcRenderer.on('update/available', (_evt, payload) => handler(payload));
  },
  onUpdateStatus: (handler) => {
    ipcRenderer.removeAllListeners('update/status');
    ipcRenderer.on('update/status', (_evt, payload) => handler(payload));
  },
  onUpdateProgress: (handler) => {
    ipcRenderer.removeAllListeners('update/progress');
    ipcRenderer.on('update/progress', (_evt, payload) => handler(payload));
  },
  onUpdateDownloaded: (handler) => {
    ipcRenderer.removeAllListeners('update/downloaded');
    ipcRenderer.on('update/downloaded', handler);
  },
  onUpdateError: (handler) => {
    ipcRenderer.removeAllListeners('update/error');
    ipcRenderer.on('update/error', (_evt, payload) => handler(payload));
  },
  checkForUpdates: () => ipcRenderer.invoke('update/checkNow'),
  getAppInfo: () => ipcRenderer.invoke('app/getInfo'),
  setLanguage: (language) => ipcRenderer.invoke('app/setLanguage', language),
  completeWelcome: () => ipcRenderer.invoke('app/completeWelcome')
});
