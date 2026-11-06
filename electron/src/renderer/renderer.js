/* global launcherApi */

const starSvg = `<svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;

let myGames = [];
let selectedGame = null;
let runningGames = new Set();

const translations = {
  en: {
    addGame: 'Add Game', refresh: 'Refresh Database', library: 'GAME LIBRARY', filter: 'Filter library...', search: 'Search for games...',
    welcome: 'Welcome to Medo Game Launcher', selectHint: 'Select a game from the library to view its details.', ready: 'Ready', playing: 'Playing Now',
    launch: 'Launch Game', stop: 'Stop Playing', details: 'DETAILS', appId: 'App ID', executable: 'Executable', favorite: 'Favorite', running: 'Running',
    systemLog: 'System Log', live: 'LIVE ACTIVITY', importTitle: 'Have a shared game link?', import: 'Import', shareSuccess: 'Game Shared Successfully',
    shareCopied: 'Share link copied', shareHint: 'Send this link to the other user. They can paste it inside Add Game.', copyAgain: 'Copy link again', openLink: 'Open link',
    checkUpdates: 'Check for Updates', checking: 'Checking for updates...', current: 'Up to date', updateFailed: 'Update check failed', language: 'العربية',
    welcomeTitle: 'Welcome to Medo Game Launcher', welcomeLead: 'Choose your game and launch it with one click.', welcomeCard: 'Everything is ready. Let\'s start!', welcomeCardHint: 'Search for a game from Add Game or paste a share link from a friend.', start: 'Get Started'
  },
  ar: {
    addGame: '\u0625\u0636\u0627\u0641\u0629 \u0644\u0639\u0628\u0629', refresh: '\u062a\u062d\u062f\u064a\u062b \u0642\u0627\u0639\u062f\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a', library: '\u0645\u0643\u062a\u0628\u0629 \u0627\u0644\u0623\u0644\u0639\u0627\u0628', filter: '\u062a\u0635\u0641\u064a\u0629 \u0627\u0644\u0645\u0643\u062a\u0628\u0629...', search: '\u0627\u0628\u062d\u062b \u0639\u0646 \u0644\u0639\u0628\u0629...',
    welcome: '\u0645\u0631\u062d\u0628\u0627\u064b \u0628\u064a\0643 \u0641\u064a Medo Game Launcher', selectHint: '\u0627\u062e\062a\0631 \u0644\0639\u0628\0629 \u0645\0646 \u0627\u0644\u0645\0643\062a\0628\0629 \u0644\u0639\u0631\0636 \u062a\0641\u0627\0635\064a\0644\0647\0627.', ready: '\u062c\0627\0647\0632', playing: '\u062a\0639\0645\0644 \u0627\u0644\u0622\0646',
    launch: '\u062a\0634\063a\064a\0644 \u0627\u0644\0644\0639\0628\0629', stop: '\u0625\064a\0642\0627\0641 \u0627\u0644\0644\0639\0628', details: '\u0627\0644\062a\0641\0627\0635\064a\0644', appId: '\u0645\0639\0631\0651\0641 \u0627\u0644\062a\0637\0628\064a\0642', executable: '\u0627\0644\0645\0644\0641 \u0627\u0644\062a\0646\0641\064a\0630\064a', favorite: '\u0627\0644\0645\0641\0636\0644\0629', running: '\u0627\0644\062d\0627\0644\0629',
    systemLog: '\u0633\062c\0644 \u0627\0644\0646\0638\0627\0645', live: '\u0646\0634\0627\0637 \u0645\0628\0627\0634\0631', importTitle: '\u0647\0644 \u0644\062f\064a\0643 \u0631\0627\0628\0637 \u0645\0634\0627\0631\0643\0629\061f', import: '\u0627\0633\062a\064a\0631\0627\062f', shareSuccess: '\u062a\0645\062a \u0645\0634\0627\0631\0643\0629 \u0627\u0644\0644\0639\0628\0629 \u0628\0646\062c\0627\062d',
    shareCopied: '\u062a\0645 \u0646\0633\062e \u0631\0627\0628\0637 \u0627\0644\0645\0634\0627\0631\0643\0629', shareHint: '\u0627\0631\0633\0644 \u0627\0644\0631\0627\0628\0637 \u0644\0644\0645\0633\062a\062e\062f\0645 \u0627\0644\0622\062e\0631.', copyAgain: '\u0646\0633\062e \u0627\0644\0631\0627\0628\0637 \u0645\0631\0629 \u0623\062e\0631\0649', openLink: '\u0641\062a\062d \u0627\0644\0631\0627\0628\0637',
    checkUpdates: '\u0627\0644\062a\062d\0642\0642 \u0645\0646 \u0627\0644\062a\062d\062f\064a\062b\0627\062a', checking: '\u062c\0627\0631\064a \u0627\0644\062a\062d\0642\0642 \u0645\0646 \u0627\u0644\062a\062d\062f\064a\062b\0627\062a...', current: '\u0627\0644\0628\0631\0646\0627\0645\062c \u0645\064f\062d\062f\062b', updateFailed: '\u0641\0634\0644 \u0627\0644\062a\062d\0642\0642 \u0645\0646 \u0627\0644\062a\062d\062f\064a\062b', language: 'English',
    welcomeTitle: '\u0645\0631\062d\0628\0627\064b \u0628\064a\0643 \u0641\064a Medo Game Launcher', welcomeLead: '\u0627\062e\062a\0627\0631 \u0644\0639\0628\062a\0643 \u0648\0634\063a\0651\0644\0647\0627 \u0628\0636\063a\0637\0629 \u0648\0627\062d\062f\0629.', welcomeCard: '\u0643\0644 \u062d\0627\062c\0629 \u062c\0627\0647\0632\0629.. \u064a\0644\0627 \u0646\0628\062f\0623!', welcomeCardHint: '\u0627\0628\062d\062b \u0639\0646 \u0644\0639\0628\0629 \u0645\0646 Add Game \u0623\0648 \u0627\0644\0635\0642 \u0631\0627\0628\0637 \u0645\0634\0627\0631\0643\0629 \u0645\0646 \u0635\062f\064a\0642.', start: '\u0627\0628\062f\0623 \u0627\0644\u0622\0646'
  }
};

// Keep Arabic strings as real UTF-8 text so Windows does not interpret them as legacy octal escapes.
translations.ar = {
  welcome: 'مرحباً بيك في Medo Game Launcher', selectHint: 'اختار لعبة من المكتبة لعرض تفاصيلها', ready: 'جاهز', playing: 'تعمل الآن',
  launch: 'تشغيل اللعبة', stop: 'إيقاف اللعب', details: 'التفاصيل', appId: 'معرّف التطبيق', executable: 'الملف التنفيذي', favorite: 'المفضلة', running: 'الحالة',
  systemLog: 'سجل النظام', live: 'نشاط مباشر', importTitle: 'هل لديك رابط مشاركة؟', import: 'استيراد', shareSuccess: 'تمت مشاركة اللعبة بنجاح',
  shareCopied: 'تم نسخ رابط المشاركة', shareHint: 'أرسل الرابط للمستخدم الآخر ليضعه داخل إضافة لعبة.', copyAgain: 'نسخ الرابط مرة أخرى', openLink: 'فتح الرابط',
  checkUpdates: 'التحقق من التحديثات', checking: 'جاري التحقق من التحديثات...', current: 'البرنامج محدّث', updateFailed: 'فشل التحقق من التحديث', language: 'English',
  welcomeTitle: 'مرحباً بيك في Medo Game Launcher', welcomeLead: 'اختار لعبتك وشغّلها بضغطة واحدة.', welcomeCard: 'كل حاجة جاهزة.. يلا نبدأ!', welcomeCardHint: 'ابحث عن لعبة من إضافة لعبة أو الصق رابط مشاركة من صديق.', start: 'ابدأ الآن',
  addGame: 'إضافة لعبة', refresh: 'تحديث قاعدة البيانات', library: 'مكتبة الألعاب', filter: 'تصفية المكتبة...', search: 'ابحث عن لعبة...'
};

translations.ar = JSON.parse(document.getElementById('arabicTranslations')?.textContent || '{}');
translations.en.updateAvailable = 'Update available';
translations.en.updateUnavailable = 'Update check unavailable';
translations.ar.updateAvailable = 'يتوفر تحديث';
translations.ar.updateUnavailable = 'تعذر التحقق من التحديثات';
translations.en.welcome = 'Medo Game Launcher';
translations.ar.welcome = 'Medo Game Launcher';
translations.en.developerPrefix = 'Developed by';
translations.ar.developerPrefix = 'تطوير';
translations.en.downloadTitle = 'Download Latest Version';
translations.en.downloadSubtitle = 'Get the latest Medo Game Launcher version.';
translations.en.copyLink = 'Copy Link';
translations.en.downloadDirect = 'Download Directly';
translations.ar.downloadTitle = 'تحميل أحدث إصدار';
translations.ar.downloadSubtitle = 'احصل على أحدث إصدار من Medo Game Launcher.';
translations.ar.copyLink = 'نسخ الرابط';
translations.ar.downloadDirect = 'تحميل مباشر';
let currentLanguage = localStorage.getItem('medo.language') === 'ar' ? 'ar' : 'en';
const t = key => translations[currentLanguage][key] || translations.en[key] || key;
let lastUpdateState = 'ready';
let lastUpdateVersion = '';

function getUpdateStatusText() {
  if (lastUpdateState === 'checking') return t('checking');
  if (lastUpdateState === 'available') return `${t('updateAvailable')}: v${lastUpdateVersion}`;
  if (lastUpdateState === 'current') return t('current');
  if (lastUpdateState === 'error') return t('updateFailed');
  return t('ready');
}

function setText(selector, value) {
  const node = document.querySelector(selector);
  if (node) node.textContent = value;
}

function setButtonText(selector, value) {
  const node = document.querySelector(selector);
  if (!node) return;
  const textNode = [...node.childNodes].find(child => child.nodeType === Node.TEXT_NODE);
  if (textNode) textNode.textContent = ` ${value}`;
  else node.appendChild(document.createTextNode(` ${value}`));
}

function applyLanguage() {
  document.documentElement.lang = currentLanguage;
  document.documentElement.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';
  document.body.classList.toggle('rtl', currentLanguage === 'ar');
  if (developerName) developerName.textContent = `${t('developerPrefix')}: mohamed ghonem`;
  setText('#downloadTitle', t('downloadTitle'));
  setText('#downloadSubtitle', t('downloadSubtitle'));
  setText('#copyDownloadLinkBtn', t('copyLink'));
  setText('#openDownloadLinkBtn', t('downloadDirect'));
  setButtonText('#openAddModalBtn', t('addGame'));
  setText('#refreshBtn', t('refresh'));
  setText('.library-heading span:first-child', `♧  ${t('library')}`);
  setText('#heroEmptyState strong', t('welcome'));
  setText('#heroEmptyState span', t('selectHint'));
  setText('#statusText', t('ready'));
  setText('#launchBtnText', t('launch'));
  const detailsTitle = document.querySelector('.details-title');
  if (detailsTitle) detailsTitle.innerHTML = `<span class="info-symbol">ⓘ</span> ${t('details')}`;
  setText('#detailAppIdLabel', t('appId')); setText('#detailExeLabel', t('executable')); setText('#detailFavoriteLabel', t('favorite')); setText('#detailRunningLabel', t('running'));
  setText('#importSharedGameBtn', t('import')); setText('.share-import-title', t('importTitle'));
  setText('.share-success-title', t('shareCopied')); setText('.share-success-subtitle', t('shareHint')); setText('#shareCopyBtn', t('copyAgain')); setText('#shareOpenBtn', t('openLink'));
  setText('#checkUpdateBtn', t('checkUpdates'));
  const languageBtn = document.getElementById('languageBtn');
  if (languageBtn) {
    languageBtn.classList.toggle('is-arabic', currentLanguage === 'ar');
    languageBtn.innerHTML = `<span class="language-switch-track"><span class="language-switch-thumb"></span></span><span class="language-switch-label">${t('language')}</span>`;
  }
  setText('.welcome-title', t('welcomeTitle')); setText('.welcome-lead', `⚡ ${t('welcomeLead')}`); setText('.welcome-card strong', `🚀 ${t('welcomeCard')}`); setText('.welcome-card span', t('welcomeCardHint')); setText('#welcomeStartBtn', t('start'));
  const search = document.getElementById('searchInput'); if (search) search.placeholder = t('filter');
  const modalSearch = document.getElementById('modalSearchInput'); if (modalSearch) modalSearch.placeholder = t('search');
  // Re-apply these plain labels without legacy-encoded emoji prefixes.
  setText('.library-heading span:first-child', t('library'));
  setText('.welcome-lead', t('welcomeLead'));
  setText('.welcome-card strong', t('welcomeCard'));
  setText('.welcome-card span', t('welcomeCardHint'));
  if (updateStatusText) updateStatusText.textContent = getUpdateStatusText();
  if (selectedGame) syncSelectedGameLaunchState();
}

let modalState = {
  filter: '',
  offset: 0,
  limit: 200,
  hasMore: false,
  loading: false
};

const gameListEl = document.getElementById('gameList');
const heroEmptyState = document.getElementById('heroEmptyState');
const heroContent = document.getElementById('heroContent');
const mainContent = document.getElementById('mainContent');

const launchBtn = document.getElementById('launchBtn');
const logArea = document.getElementById('logArea');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');

const addGameModal = document.getElementById('addGameModal');
const modalListEl = document.getElementById('modalList');
const searchInput = document.getElementById('searchInput');
const modalSearchInput = document.getElementById('modalSearchInput');
const shareModal = document.getElementById('shareModal');
const downloadModal = document.getElementById('downloadModal');
const downloadLinkInput = document.getElementById('downloadLinkInput');
const copyDownloadLinkBtn = document.getElementById('copyDownloadLinkBtn');
const openDownloadLinkBtn = document.getElementById('openDownloadLinkBtn');
const DOWNLOAD_URL = 'https://github.com/mghonem2500-tech/DiscordGameLauncher/releases/download/v0.3.0/Medo.Game.Launcher.Setup.0.3.0.exe';
const shareLinkInput = document.getElementById('shareLinkInput');
const shareCopyBtn = document.getElementById('shareCopyBtn');
const shareOpenBtn = document.getElementById('shareOpenBtn');
const welcomeModal = document.getElementById('welcomeModal');
const updateStatusText = document.getElementById('updateStatusText');
const checkUpdateBtn = document.getElementById('checkUpdateBtn');
const currentVersion = document.getElementById('currentVersion');
const developerName = document.getElementById('developerName');
let sharedGameForModal = null;
const contextMenuEl = document.getElementById('contextMenu');
const refreshBtn = document.getElementById('refreshBtn');

// Update modal
const updateModal = document.getElementById('updateModal');
const updateCloseBtn = document.getElementById('updateCloseBtn');
const updateSubtitle = document.getElementById('updateSubtitle');
const updateNotes = document.getElementById('updateNotes');
const updateInstallBtn = document.getElementById('updateInstallBtn');
const updateRemindBtn = document.getElementById('updateRemindBtn');
const updateProgressWrap = document.getElementById('updateProgressWrap');
const updateProgressFill = document.getElementById('updateProgressFill');
const updateProgressText = document.getElementById('updateProgressText');

// Details panel
const detailAppId = document.getElementById('detailAppId');
const detailExe = document.getElementById('detailExe');
const detailFavorite = document.getElementById('detailFavorite');
const detailRunning = document.getElementById('detailRunning');
let updateUiState = {
  visible: false,
  installing: false
};

function log(msg, type = '') {
  const div = document.createElement('div');
  div.className = `log-entry ${type}`;
  const t = new Date().toLocaleTimeString([], { hour12: false });
  const time = document.createElement('span');
  time.className = 'log-time';
  time.textContent = `[${t}]`;
  div.append(time, document.createTextNode(` ${String(msg)}`));
  logArea.appendChild(div);
  logArea.scrollTop = logArea.scrollHeight;
}

function resetHeroState() {
  document.querySelector('.status-indicator')?.classList.remove('playing');
  statusDot.style.backgroundColor = 'var(--text-muted)';
  statusDot.style.color = 'var(--text-muted)';
  statusText.innerText = t('ready');
  statusText.style.color = 'var(--text-muted)';

  launchBtn.classList.remove('running');
  document.getElementById('launchBtnText').innerText = t('launch');
  document.getElementById('playIcon').style.display = 'block';
  document.getElementById('stopIcon').style.display = 'none';

  updateDetailsPanel();
}

function syncSelectedGameLaunchState() {
  if (!selectedGame) {
    resetHeroState();
    return;
  }

  const running = isGameRunning(selectedGame);
  if (!running) {
    resetHeroState();
    return;
  }

  statusDot.style.backgroundColor = 'var(--success)';
  statusDot.style.color = 'var(--success)';
  statusText.innerText = t('playing');
  statusText.style.color = 'var(--success)';
  document.querySelector('.status-indicator')?.classList.add('playing');

  launchBtn.classList.add('running');
  document.getElementById('launchBtnText').innerText = t('stop');
  document.getElementById('playIcon').style.display = 'none';
  document.getElementById('stopIcon').style.display = 'block';

  updateDetailsPanel();
}

function makeGameKey(game) {
  if (!game || typeof game !== 'object') return '';
  const appId = String(game.appId ?? '');
  const exe = String(game.exe ?? '');
  const key = `${appId}::${exe}`;
  return key === '::' ? '' : key;
}

function isGameRunning(game) {
  return Boolean(game && makeGameKey(game) && runningGames.has(makeGameKey(game)));
}

function updateDetailsPanel() {
  const dash = '—';

  if (!detailAppId || !detailExe || !detailFavorite || !detailRunning) return;

  if (!selectedGame) {
    detailAppId.textContent = dash;
    detailExe.textContent = dash;
    detailFavorite.textContent = dash;
    detailRunning.textContent = dash;
    return;
  }

  detailAppId.textContent = selectedGame.appId || dash;
  detailExe.textContent = selectedGame.exe || dash;
  detailFavorite.textContent = selectedGame.isFavorite ? 'Yes' : 'No';
  detailRunning.textContent = isGameRunning(selectedGame) ? 'Yes' : 'No';
}

// No background thumbnails in the public build.

function renderMainList(filter = '') {
  gameListEl.innerHTML = '';

  const sortedGames = [...myGames].sort((a, b) => {
    if (a.isFavorite === b.isFavorite) return a.name.localeCompare(b.name);
    return a.isFavorite ? -1 : 1;
  });

  const term = filter.toLowerCase();
  for (const game of sortedGames) {
    if (!game.name.toLowerCase().includes(term)) continue;

    const div = document.createElement('div');
    const running = isGameRunning(game);
    div.className = `game-item ${selectedGame === game ? 'active' : ''} ${game.isFavorite ? 'favorite' : ''} ${running ? 'running' : ''}`;

    div.innerHTML = `
      <div class="game-status-dot ${running ? 'active' : ''}" aria-label="${running ? 'Running' : 'Stopped'}"></div>
      <div style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${game.name}</div>
      <button class="game-share-btn" title="Share game" aria-label="Share ${game.name}">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"></line><line x1="15.4" y1="6.5" x2="8.6" y2="10.5"></line></svg>
      </button>
      <div class="fav-icon">${starSvg}</div>
    `;

    div.addEventListener('click', async (e) => {
      if (e.target.closest('.game-share-btn')) {
        await shareGame(game);
      } else if (e.target.closest('.fav-icon')) {
        await toggleFavorite(game);
      } else {
        await selectGame(game);
      }
    });

    div.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      openGameContextMenu(game, e.clientX, e.clientY);
    });

    gameListEl.appendChild(div);
  }
}

async function shareGame(game) {
  const result = await launcherApi.shareGame(game);
  if (!result?.ok) {
    log(`Could not create share link for ${game.name}.`, 'log-danger');
    return;
  }

  sharedGameForModal = game;
  if (shareLinkInput) shareLinkInput.value = result.url;
  if (shareModal) shareModal.style.display = 'flex';
  log(`Share link copied for ${game.name}.`, 'log-success');
}

function closeShareModal() {
  if (shareModal) shareModal.style.display = 'none';
}

function closeContextMenu() {
  contextMenuEl.style.display = 'none';
  contextMenuEl.innerHTML = '';
}

function openGameContextMenu(game, x, y) {
  if (!game) return;

  contextMenuEl.innerHTML = `
    <div class="context-menu-item" id="ctxShortcut">Create shortcut</div>
    <div class="context-menu-item" id="ctxShare">Share game</div>
    <div class="context-menu-item danger" id="ctxDelete">Delete from library</div>
  `;

  const margin = 8;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  contextMenuEl.style.display = 'block';

  // Position first, then clamp after layout
  contextMenuEl.style.left = `${x}px`;
  contextMenuEl.style.top = `${y}px`;

  requestAnimationFrame(() => {
    const rect = contextMenuEl.getBoundingClientRect();
    let left = x;
    let top = y;

    if (left + rect.width + margin > vw) left = Math.max(margin, vw - rect.width - margin);
    if (top + rect.height + margin > vh) top = Math.max(margin, vh - rect.height - margin);

    contextMenuEl.style.left = `${left}px`;
    contextMenuEl.style.top = `${top}px`;
  });

  const shortcutBtn = document.getElementById('ctxShortcut');
  const shareBtn = document.getElementById('ctxShare');
  const deleteBtn = document.getElementById('ctxDelete');

  shortcutBtn.addEventListener('click', async () => {
    closeContextMenu();
    log(`Creating shortcut for ${game.name}...`);

    const r = await launcherApi.createShortcut(game.appId, game.exe);
    if (!r?.ok) {
      log(`Shortcut failed: ${r?.error || 'unknown error'}`, 'log-danger');
      return;
    }

    log(`Shortcut created: ${r.path}`, 'log-success');
  });

  shareBtn.addEventListener('click', async () => {
    closeContextMenu();
    const r = await launcherApi.shareGame(game);
    if (r?.ok) log(`Share link copied for ${game.name}.`, 'log-success');
    else log(`Could not create share link for ${game.name}.`, 'log-danger');
  });

  deleteBtn.addEventListener('click', async () => {
    // Avoid deleting the currently running selection
      if (isGameRunning(game) && selectedGame && makeGameKey(selectedGame) === makeGameKey(game)) {
      log('Stop the running game before deleting it.', 'log-danger');
      closeContextMenu();
      return;
    }

    if (!window.confirm(`Remove "${game.name}" from your library?`)) {
      closeContextMenu();
      return;
    }

    await launcherApi.deleteGame(game.appId, game.exe);
    closeContextMenu();
    await refreshMyGames();

    // If deleted selected game (not running), clear selection
    if (selectedGame && selectedGame.appId === game.appId && selectedGame.exe === game.exe) {
      selectedGame = null;
      heroEmptyState.style.display = 'flex';
      heroContent.style.display = 'none';
      renderMainList(searchInput.value);
      updateDetailsPanel();
    }

    log(`Deleted ${game.name} from library.`, 'log-success');
  });
}

launcherApi.onSharedGame(async (payload) => {
  if (!payload?.entry) return;
  await refreshMyGames();
  const verb = payload.added ? 'Added shared game' : 'Game already exists';
  log(`${verb}: ${payload.entry.name}.`, payload.added ? 'log-success' : '');
  if (payload.added) {
    const imported = myGames.find(g => makeGameKey(g) === makeGameKey(payload.entry));
    if (imported) await selectGame(imported);
  }
});

async function toggleFavorite(game) {
  const updated = await launcherApi.toggleFavorite(game.appId, game.exe);
  if (updated) {
    game.isFavorite = updated.isFavorite;
    renderMainList(searchInput.value);

    if (selectedGame && selectedGame.appId === game.appId && selectedGame.exe === game.exe) {
      selectedGame.isFavorite = updated.isFavorite;
      updateDetailsPanel();
    }
  }
}

async function selectGame(game) {
  selectedGame = game;

  heroEmptyState.style.display = 'none';
  heroContent.style.display = 'flex';

  document.getElementById('heroTitle').innerText = game.name;
  document.getElementById('heroExe').innerText = game.exe;

  updateDetailsPanel();

  await launcherApi.selectGame(game);

  syncSelectedGameLaunchState();
  renderMainList(searchInput.value);
}

function openModal() {
  addGameModal.style.display = 'flex';
  modalSearchInput.value = '';
  resetAndRenderModal('');
}

function closeModal() {
  addGameModal.style.display = 'none';
}

function showUpdateModal(payload) {
  if (!payload || !updateModal) return;

  updateUiState.visible = true;
  updateUiState.installing = false;

  updateInstallBtn.disabled = false;
  updateRemindBtn.disabled = false;
  updateInstallBtn.textContent = 'Install update';

  const version = payload.version ? `v${payload.version}` : 'New version';
  updateSubtitle.textContent = payload.releaseName
    ? `${version} — ${payload.releaseName}`
    : version;

  updateNotes.innerHTML = renderReleaseNotesHtml(payload.releaseNotes);

  if (updateProgressWrap) {
    updateProgressWrap.style.display = 'none';
    updateProgressFill.style.width = '0%';
    updateProgressText.textContent = 'Downloading update…';
  }

  updateModal.style.display = 'flex';
}

function hideUpdateModal() {
  updateUiState.visible = false;
  updateUiState.installing = false;
  updateModal.style.display = 'none';
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

function setUpdateProgress(percent, payload) {
  if (!updateProgressWrap) return;
  updateProgressWrap.style.display = 'block';

  const pct = Math.max(0, Math.min(100, Math.round(percent)));
  updateProgressFill.style.width = `${pct}%`;

  if (payload && Number.isFinite(payload.total) && payload.total > 0) {
    const speed = payload.bytesPerSecond ? ` — ${formatBytes(payload.bytesPerSecond)}/s` : '';
    updateProgressText.textContent =
      `Downloading update… ${pct}% (${formatBytes(payload.transferred)} / ${formatBytes(payload.total)})${speed}`;
  } else {
    updateProgressText.textContent = `Downloading update… ${pct}%`;
  }
}

// --- RELEASE NOTES SANITIZER/RENDERER ---
// GitHub release notes arrive as HTML (markdown already converted upstream).
// We only allow a small whitelist of formatting tags and strip everything
// else (including <img> tags entirely, per design) to avoid XSS and to keep
// the rendered notes looking like the GitHub release page.
const RELEASE_NOTES_ALLOWED_TAGS = new Set([
  'P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'S',
  'UL', 'OL', 'LI', 'A', 'CODE', 'PRE', 'BLOCKQUOTE',
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HR', 'SPAN'
]);
const RELEASE_NOTES_DROP_TAGS = new Set([
  'IMG', 'SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED',
  'VIDEO', 'AUDIO', 'SVG', 'LINK', 'META', 'FORM', 'INPUT', 'BUTTON'
]);
const RELEASE_NOTES_SAFE_URL_RE = /^(https?:|mailto:)/i;

function sanitizeReleaseNotesNode(node) {
  const children = Array.from(node.childNodes);
  for (const child of children) {
    if (child.nodeType === Node.COMMENT_NODE) {
      child.remove();
      continue;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) continue;

    const tag = child.tagName;

    if (RELEASE_NOTES_DROP_TAGS.has(tag)) {
      child.remove();
      continue;
    }

    for (const attr of Array.from(child.attributes)) {
      const name = attr.name.toLowerCase();
      if (tag === 'A' && name === 'href') {
        if (!RELEASE_NOTES_SAFE_URL_RE.test(attr.value.trim())) child.removeAttribute(attr.name);
        continue;
      }
      child.removeAttribute(attr.name);
    }

    if (tag === 'A') {
      child.setAttribute('target', '_blank');
      child.setAttribute('rel', 'noopener noreferrer');
    }

    if (!RELEASE_NOTES_ALLOWED_TAGS.has(tag)) {
      sanitizeReleaseNotesNode(child);
      while (child.firstChild) node.insertBefore(child.firstChild, child);
      child.remove();
      continue;
    }

    sanitizeReleaseNotesNode(child);
  }
}

function renderReleaseNotesHtml(rawNotes) {
  const text = String(rawNotes || '').trim();
  if (!text) return '<p style="color:var(--text-muted);">No release notes provided.</p>';

  // Plain text (no HTML tags) - escape and preserve line breaks.
  if (!/<[a-z!/][\s\S]*>/i.test(text)) {
    const escapeDiv = document.createElement('div');
    escapeDiv.textContent = text;
    return `<p>${escapeDiv.innerHTML.replace(/\n/g, '<br>')}</p>`;
  }

  const doc = new DOMParser().parseFromString(`<div id="release-notes-root">${text}</div>`, 'text/html');
  const root = doc.getElementById('release-notes-root');
  if (!root) return '';

  sanitizeReleaseNotesNode(root);
  return root.innerHTML;
}
// ------------------------------------------

function debounce(fn, waitMs) {
  let t = null;
  return (...args) => {
    if (t) window.clearTimeout(t);
    t = window.setTimeout(() => fn(...args), waitMs);
  };
}

function resetAndRenderModal(filter) {
    updateDetailsPanel();
  modalState = {
    filter: String(filter || ''),
    offset: 0,
    limit: 200,
    hasMore: false,
    loading: false
  };
  modalListEl.innerHTML = '';
  renderNextModalPage();
}

async function importSharedGame() {
  const input = document.getElementById('importLinkInput');
  const rawUrl = String(input?.value || '').trim();
  if (!rawUrl) {
    log('Paste a Medo share link first.', 'log-danger');
    return;
  }

  const preview = await launcherApi.previewSharedGame(rawUrl);
  if (!preview?.ok) {
    log(preview?.error || 'Invalid share link.', 'log-danger');
    return;
  }

  const confirmed = window.confirm(`Add shared game "${preview.game.name}" to your library?`);
  if (!confirmed) return;

  const result = await launcherApi.importSharedGame(rawUrl);
  if (!result?.ok) {
    log(result?.error || 'Could not import share link.', 'log-danger');
    return;
  }

  closeModal();
  input.value = '';
  await refreshMyGames();
  const imported = myGames.find(g => makeGameKey(g) === makeGameKey(result.entry));
  if (imported) await selectGame(imported);
  log(`${result.added ? 'Added' : 'Already in library'}: ${result.entry.name}.`, result.added ? 'log-success' : '');
}

// --- NEW DETECTION WARNING PROMISE HELPERS ---
function promptDetectionWarning(game) {
  return new Promise((resolve) => {
    const modal = document.getElementById('warningModal');
    const closeBtn = document.getElementById('warningCloseBtn');
    const cancelBtn = document.getElementById('warningCancelBtn');
    const confirmBtn = document.getElementById('warningConfirmBtn');
    const exeInput = document.getElementById('customExeInput');

    if (!modal) return resolve({ proceed: true, exe: '' });

    modal.style.display = 'flex';
    if (exeInput) {
      exeInput.value = '';
      setTimeout(() => exeInput.focus(), 0);
    }

    const handleChoice = (proceed) => {
      modal.style.display = 'none';
      closeBtn.onclick = null;
      cancelBtn.onclick = null;
      confirmBtn.onclick = null;
      resolve({ proceed, exe: exeInput ? exeInput.value.trim() : '' });
    };

    closeBtn.onclick = () => handleChoice(false);
    cancelBtn.onclick = () => handleChoice(false);
    confirmBtn.onclick = () => handleChoice(true);
  });
}
// ---------------------------------------------

async function renderNextModalPage() {
  if (modalState.loading) return;
  modalState.loading = true;

  let page;
  try {
    page = await launcherApi.getDatabaseGames(modalState.filter, modalState.offset, modalState.limit);
  } catch (e) {
    modalState.loading = false;
    modalListEl.innerHTML = `<div style="padding:20px; text-align:center;">Database not ready. Try again. (${String(e.message || e)})</div>`;
      updateDetailsPanel();
    return;
  }

  const frag = document.createDocumentFragment();
  const items = Array.isArray(page?.items) ? page.items : [];

  for (const game of items) {
    if (myGames.some(mg => mg.appId === game.id && mg.exe === game.exe)) continue;

    const div = document.createElement('div');
    updateDetailsPanel();
    div.className = 'modal-item';
    div.innerHTML = `
      <div class="modal-item-info">
        <span class="modal-item-name">${game.name}</span>
        <span class="modal-item-exe">${game.exe}</span>
      </div>
      <div style="color:var(--brand); font-weight:bold; font-size:12px;">+ ADD</div>
    `;

    div.onclick = async () => {
      // --- CHECK DETECTION FLAG BEFORE ADDING ---
      if (game.usesNewDetection) {
        const choice = await promptDetectionWarning(game);
        if (!choice?.proceed) {
          log(`Cancelled adding ${game.name}.`, 'log-entry');
          return; // Abort silently
        }
        if (choice.exe) game.exe = choice.exe;
      }
      // ------------------------------------------

      const installed = await launcherApi.addGame(game);
      log(`Installed ${installed.name} successfully.`, 'log-success');
      closeModal();
      await refreshMyGames();
      await selectGame(myGames[myGames.length - 1]);
    };

    frag.appendChild(div);
  }

  modalListEl.appendChild(frag);

  const hasAnyRows = modalListEl.querySelector('.modal-item') != null;
  if (!hasAnyRows && modalState.offset === 0) {
    modalListEl.innerHTML = `<div style="padding:20px; text-align:center;">No results.</div>`;
  }

  modalState.hasMore = Boolean(page?.hasMore);
  modalState.offset += Number.isFinite(page?.items?.length) ? page.items.length : items.length;
  modalState.loading = false;
}

async function refreshMyGames() {
  myGames = await launcherApi.getMyGames();
  renderMainList(searchInput.value);

  // Empty state by default
  if (!myGames.length) {
    selectedGame = null;
    heroEmptyState.style.display = 'flex';
    heroContent.style.display = 'none';
  }
}

async function ensureDatabaseSynced() {
  try {
    const r = await launcherApi.syncGameList();
    log(r.updated ? 'Updated gamelist.json from Discord API.' : 'gamelist.json already up-to-date.', 'log-success');
  } catch (e) {
    log(`Could not sync gamelist.json: ${String(e.message || e)}`, 'log-danger');
  }
}

async function refreshDatabase() {
  if (!refreshBtn) return;
  refreshBtn.disabled = true;
  refreshBtn.textContent = '↻ Refreshing...';
  try {
    const r = await launcherApi.syncGameList();
    log(r.updated ? 'Game database updated.' : 'Game database is already up to date.', 'log-success');
  } catch (e) {
    log(`Database refresh failed: ${String(e.message || e)}`, 'log-danger');
  } finally {
    refreshBtn.disabled = false;
    refreshBtn.textContent = '↻ Refresh Database';
  }
}

launchBtn.addEventListener('click', async () => {
  if (!selectedGame) return;

  const selectedKey = makeGameKey(selectedGame);
  const currentlyRunning = isGameRunning(selectedGame);

  if (!currentlyRunning) {
    launchBtn.classList.add('running');
    document.getElementById('launchBtnText').innerText = t('stop');
    document.getElementById('playIcon').style.display = 'none';
    document.getElementById('stopIcon').style.display = 'block';

    statusDot.style.backgroundColor = 'var(--success)';
    statusDot.style.color = 'var(--success)';
    statusText.innerText = t('playing');
    statusText.style.color = 'var(--success)';

    const r = await launcherApi.launchGame(selectedGame);
    if (r.ok) {
      runningGames.add(selectedKey);
      renderMainList(searchInput.value);
      syncSelectedGameLaunchState();
      log(`Process started: ${selectedGame.exe}`, 'log-success');
    } else {
      log(`Failed to launch: ${r.error}`, 'log-danger');
      launchBtn.classList.remove('running');
      resetHeroState();
    }
  } else {
    await launcherApi.stopGame(selectedGame);
    runningGames.delete(selectedKey);
    renderMainList(searchInput.value);
    syncSelectedGameLaunchState();
    log('Process terminated.', 'log-danger');
  }
});

document.getElementById('openAddModalBtn').onclick = openModal;
if (refreshBtn) refreshBtn.onclick = refreshDatabase;
document.getElementById('closeModalBtn').onclick = closeModal;
document.getElementById('languageBtn')?.addEventListener('click', async () => {
  currentLanguage = currentLanguage === 'en' ? 'ar' : 'en';
  localStorage.setItem('medo.language', currentLanguage);
  await launcherApi.setLanguage(currentLanguage);
  applyLanguage();
});
document.getElementById('importSharedGameBtn').onclick = importSharedGame;
document.getElementById('closeShareModalBtn').onclick = closeShareModal;
document.getElementById('downloadLatestBtn')?.addEventListener('click', () => {
  if (downloadLinkInput) downloadLinkInput.value = DOWNLOAD_URL;
  if (downloadModal) downloadModal.style.display = 'flex';
});
document.getElementById('closeDownloadModalBtn')?.addEventListener('click', () => {
  if (downloadModal) downloadModal.style.display = 'none';
});
downloadModal?.addEventListener('click', (e) => {
  if (e.target === downloadModal) downloadModal.style.display = 'none';
});
copyDownloadLinkBtn?.addEventListener('click', async () => {
  await navigator.clipboard.writeText(DOWNLOAD_URL);
  const old = copyDownloadLinkBtn.textContent;
  copyDownloadLinkBtn.textContent = 'Copied';
  setTimeout(() => { copyDownloadLinkBtn.textContent = old; }, 1400);
});
openDownloadLinkBtn?.addEventListener('click', () => launcherApi.openExternalUrl(DOWNLOAD_URL));
shareOpenBtn?.addEventListener('click', async () => {
  if (!shareLinkInput?.value) return;
  const result = await launcherApi.openShareLink(shareLinkInput.value);
  if (!result?.ok) log('Could not open share link.', 'log-danger');
});
shareCopyBtn?.addEventListener('click', async () => {
  if (!sharedGameForModal) return;
  await shareGame(sharedGameForModal);
});
shareModal?.addEventListener('click', (e) => {
  if (e.target === shareModal) closeShareModal();
});
searchInput.addEventListener('input', (e) => renderMainList(e.target.value));
const onModalSearch = debounce((value) => resetAndRenderModal(value), 200);
modalSearchInput.addEventListener('input', (e) => onModalSearch(e.target.value));

modalListEl.addEventListener('scroll', () => {
  if (!addGameModal || addGameModal.style.display !== 'flex') return;
  if (!modalState.hasMore) return;
  if (modalState.loading) return;

  const remaining = modalListEl.scrollHeight - (modalListEl.scrollTop + modalListEl.clientHeight);
  if (remaining < 250) {
    renderNextModalPage();
  }
});

// Close context menu on outside click / escape
document.addEventListener('click', (e) => {
  if (contextMenuEl.style.display === 'none') return;
  if (e.target && contextMenuEl.contains(e.target)) return;
  closeContextMenu();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeContextMenu();
});

window.addEventListener('blur', () => closeContextMenu());
applyLanguage();

// Update modal events
if (updateCloseBtn) {
  updateCloseBtn.addEventListener('click', async () => {
    await launcherApi.remindUpdateLater();
    hideUpdateModal();
  });
}

if (updateRemindBtn) {
  updateRemindBtn.addEventListener('click', async () => {
    await launcherApi.remindUpdateLater();
    hideUpdateModal();
  });
}

if (updateInstallBtn) {
  updateInstallBtn.addEventListener('click', async () => {
    if (updateUiState.installing) return;
    updateUiState.installing = true;
    updateInstallBtn.disabled = true;
    updateRemindBtn.disabled = true;
    updateInstallBtn.textContent = 'Downloading…';
    setUpdateProgress(0, null);

    const r = await launcherApi.installUpdate();
    if (!r?.ok) {
      log(`Update failed: ${r?.error || 'unknown error'}`, 'log-danger');
      updateUiState.installing = false;
      updateInstallBtn.disabled = false;
      updateRemindBtn.disabled = false;
      updateInstallBtn.textContent = 'Install update';
      if (updateProgressWrap) updateProgressWrap.style.display = 'none';
    }
  });
}

// Window controls
const minBtn = document.getElementById('minBtn');
const closeBtn = document.getElementById('closeBtn');
minBtn.addEventListener('click', () => launcherApi.minimize());
closeBtn.addEventListener('click', () => launcherApi.close());

launcherApi.onGameExited((payload = {}) => {
  const exitedKey = payload && payload.gameKey ? String(payload.gameKey) : '';
  if (!exitedKey) return;

  runningGames.delete(exitedKey);
  renderMainList(searchInput.value);
  if (selectedGame && makeGameKey(selectedGame) === exitedKey) {
    syncSelectedGameLaunchState();
    log('Process exited.', 'log-danger');
  }
  updateDetailsPanel();
});

(async function init() {
  const introOverlay = document.getElementById('introOverlay');
  window.setTimeout(() => introOverlay?.remove(), 2800);

  const info = await launcherApi.getAppInfo();
  if (info) {
    if (currentVersion) currentVersion.textContent = `v${info.version}`;
    if (developerName) developerName.textContent = `${t('developerPrefix')}: ${info.author}`;
    if (!info.welcomeSeen && welcomeModal) welcomeModal.style.display = 'flex';
  }
  document.getElementById('welcomeStartBtn')?.addEventListener('click', async () => {
    await launcherApi.completeWelcome();
    if (welcomeModal) welcomeModal.style.display = 'none';
  });

  await ensureDatabaseSynced();
  await refreshMyGames();
  renderMainList('');

  // Update notifications
  if (launcherApi.onUpdateAvailable) {
    launcherApi.onUpdateAvailable((payload) => {
      showUpdateModal(payload);
      log('Update available.', 'log-success');
    });
  }
  launcherApi.onUpdateStatus?.((status) => {
    if (!updateStatusText) return;
    lastUpdateState = status?.state || 'ready';
    lastUpdateVersion = status?.version || '';
    updateStatusText.textContent = getUpdateStatusText();
  });
  checkUpdateBtn?.addEventListener('click', async () => {
    lastUpdateState = 'checking';
    if (updateStatusText) updateStatusText.textContent = getUpdateStatusText();
    const result = await launcherApi.checkForUpdates();
    if (!result?.ok) {
      lastUpdateState = 'error';
      if (updateStatusText) updateStatusText.textContent = result.error || t('updateUnavailable');
    }
  });
  if (launcherApi.onUpdateProgress) {
    launcherApi.onUpdateProgress((payload) => {
      setUpdateProgress(payload?.percent || 0, payload);
    });
  }
  if (launcherApi.onUpdateDownloaded) {
    launcherApi.onUpdateDownloaded(async () => {
      setUpdateProgress(100, null);
      if (updateProgressText) updateProgressText.textContent = 'Download complete. Installing…';
      if (updateInstallBtn) updateInstallBtn.textContent = 'Installing…';
      log('Update downloaded. Installing…', 'log-success');
      // Opens the downloaded installer and quits this app so it can run.
      await launcherApi.quitAndInstallUpdate();
    });
  }
  if (launcherApi.onUpdateError) {
    launcherApi.onUpdateError((payload) => {
      log(`Update error: ${payload?.message || 'unknown error'}`, 'log-danger');
    });
  }
})();
