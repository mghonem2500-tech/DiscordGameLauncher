/* global launcherApi */

const starSvg = `<svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;

let myGames = [];
let selectedGame = null;
let runningGames = new Set();
let launchBusy = false;

const translations = {
  en: {
    addGame: 'Add Game', refresh: 'Refresh Database', library: 'Game Library', filter: 'Filter library...', search: 'Search for games...',
    welcome: 'Medo Game Launcher', initializing: 'Initializing game library', selectHint: 'Select a game from the library to view its details.', ready: 'Ready', playing: 'Playing Now',
    launch: 'Launch Game', stop: 'Stop Playing', details: 'Details', appId: 'App ID', executable: 'Executable', favorite: 'Favorite', running: 'Running',
    yes: 'Yes', no: 'No', stopped: 'Stopped', systemLog: 'System Log', live: 'Live Activity', importTitle: 'Have a shared game link?', import: 'Import',
    addAction: '+ ADD', minimize: 'Minimize', close: 'Close', closeDialog: 'Close dialog',
    shareSuccess: 'Game Shared Successfully', shareCopied: 'Share link copied', shareHint: 'Send this link to the other user. They can paste it inside Add Game.',
    copyAgain: 'Copy link again', openLink: 'Open link', checkUpdates: 'Check for Updates', checking: 'Checking for updates...', current: 'Up to date',
    updateFailed: 'Update check failed', language: 'العربية', welcomeTitle: 'Welcome to Medo Game Launcher', welcomeLead: 'Choose your game and launch it with one click.',
    welcomeCard: 'Everything is ready. Let’s start!', welcomeCardHint: 'Search for a game from Add Game or paste a share link from a friend.', start: 'Get Started',
    updateAvailable: 'Update available', updateUnavailable: 'Update check unavailable', developerPrefix: 'Developed by', downloadTitle: 'Download Latest Version',
    downloadSubtitle: 'Get the latest Medo Game Launcher version.', copyLink: 'Copy Link', downloadDirect: 'Download Directly', databaseTitle: 'Game Database',
    shareDialogTitle: 'Game Shared Successfully', updateTitle: 'Update Available', remindLater: 'Remind me later', installUpdate: 'Install update',
    downloading: 'Downloading update…', installing: 'Installing…', noReleaseNotes: 'No release notes provided.', createShortcut: 'Create shortcut',
    shareGame: 'Share game', deleteGame: 'Delete from library', shortcutCreating: 'Creating shortcut for {name}…', shortcutCreated: 'Shortcut created: {path}',
    shortcutFailed: 'Shortcut failed: {error}', shareFailed: 'Could not create a share link for {name}.', shareCopiedFor: 'Share link copied for {name}.',
    stopBeforeDelete: 'Stop the running game before deleting it.', deleteConfirm: 'Remove “{name}” from your library?', deleted: 'Removed {name} from your library.',
    sharedAdded: 'Added shared game: {name}.', sharedExists: 'Game already exists: {name}.', pasteShare: 'Paste a Medo share link first.',
    invalidShare: 'This share link is invalid or has been modified.', importConfirm: 'Add shared game “{name}” to your library?', added: 'Added: {name}.',
    alreadyInLibrary: 'Already in library: {name}.', addedFromDatabase: 'Added {name} to your library.', cancelled: 'Adding {name} was cancelled.',
    noResults: 'No results.', databaseNotReady: 'Database not ready. Try again.', databaseUpdated: 'Game database updated.',
    databaseUnchanged: 'Game database is already up to date.', databaseUpdateAtStartup: 'Updated game database from Discord.',
    databaseReadyAtStartup: 'Game database is already up to date.', databaseTimeout: 'The game database request timed out. Your saved database was kept.',
    databaseNetwork: 'Could not connect to the game database. Check your internet connection; your saved database was kept.',
    databaseHttp: 'The game database service returned an error. Your saved database was kept.',
    databaseInvalid: 'The game database response was invalid. Your saved database was kept.',
    databaseStorage: 'Could not save the game database. Your previous copy was kept.', databaseRefreshFailed: 'Could not refresh the game database.',
    databaseRefreshing: 'Refreshing…', starting: 'Starting…', stopping: 'Stopping…', launchFailed: 'Could not start {name}: {error}', processStarted: 'Started {name}.',
    alreadyRunning: '{name} is already running.', processTerminated: 'Game session stopped.', processExited: 'Game session ended.',
    processStopFailed: 'Could not stop {name}.', updateProgress: 'Downloading update… {percent}% ({transferred} / {total}){speed}',
    downloadComplete: 'Download complete. Installing…', detectionTitle: 'Detection System Warning', detectionIntro: 'This app uses Discord’s newer detection method.',
    detectionNoExe: 'Discord did not provide an executable filename for this app.', detectionFallback: 'A fallback filename will be used; game tracking may not work correctly.',
    executableOptional: 'Executable filename (optional)', executableExample: 'Example: FC27.exe', cancel: 'Cancel', confirmAdd: 'Add Game',
    databaseError: 'Could not load the database: {error}', syncError: 'Could not refresh the database.', copyFailed: 'Could not copy the link.',
    updateError: 'Update error: {error}',
    closeGamesQuestion: 'Fake game sessions are still running. Choose what should happen when the launcher closes.',
    keepRunningClose: 'Keep running and close', stopGamesClose: 'Stop games and close', closeCancelled: 'Cancel',
    closeFailureTitle: 'Could not stop every session', closeFailure: 'Could not stop: {games}. The launcher will remain open.', ok: 'OK',
    favoriteYes: 'Yes', favoriteNo: 'No', runningYes: 'Yes', runningNo: 'No',
    downloadCopyDone: 'Copied'
  },
  ar: {
    addGame: 'إضافة لعبة', refresh: 'تحديث قاعدة البيانات', library: 'مكتبة الألعاب', filter: 'تصفية المكتبة...', search: 'ابحث عن لعبة...',
    welcome: 'Medo Game Launcher', initializing: 'جارٍ تجهيز مكتبة الألعاب', selectHint: 'اختار لعبة من المكتبة لعرض تفاصيلها.', ready: 'جاهز', playing: 'تعمل الآن',
    launch: 'تشغيل اللعبة', stop: 'إيقاف اللعب', details: 'التفاصيل', appId: 'معرّف التطبيق', executable: 'الملف التنفيذي', favorite: 'المفضلة', running: 'الحالة',
    yes: 'نعم', no: 'لا', stopped: 'متوقفة', systemLog: 'سجل النظام', live: 'نشاط مباشر', importTitle: 'هل لديك رابط لعبة للمشاركة؟', import: 'استيراد',
    addAction: '+ إضافة', minimize: 'تصغير', close: 'إغلاق', closeDialog: 'إغلاق النافذة',
    shareSuccess: 'تمت مشاركة اللعبة بنجاح', shareCopied: 'تم نسخ رابط المشاركة', shareHint: 'أرسل الرابط للمستخدم الآخر ليضيفه من نافذة إضافة لعبة.',
    copyAgain: 'نسخ الرابط مرة أخرى', openLink: 'فتح الرابط', checkUpdates: 'التحقق من التحديثات', checking: 'جارٍ التحقق من التحديثات...',
    current: 'البرنامج محدّث', updateFailed: 'فشل التحقق من التحديث', language: 'English', welcomeTitle: 'مرحبًا بك في Medo Game Launcher',
    welcomeLead: 'اختار لعبتك وشغّلها بضغطة واحدة.', welcomeCard: 'كل حاجة جاهزة.. يلا نبدأ!',
    welcomeCardHint: 'ابحث عن لعبة من إضافة لعبة أو الصق رابط مشاركة من صديق.', start: 'ابدأ الآن', updateAvailable: 'يتوفر تحديث',
    updateUnavailable: 'تعذر التحقق من التحديثات', developerPrefix: 'تطوير', downloadTitle: 'تحميل أحدث إصدار',
    downloadSubtitle: 'احصل على أحدث إصدار من Medo Game Launcher.', copyLink: 'نسخ الرابط', downloadDirect: 'تحميل مباشر', databaseTitle: 'قاعدة الألعاب',
    shareDialogTitle: 'تمت مشاركة اللعبة بنجاح', updateTitle: 'يتوفر تحديث', remindLater: 'ذكّرني لاحقًا', installUpdate: 'تثبيت التحديث',
    downloading: 'جارٍ تنزيل التحديث…', installing: 'جارٍ التثبيت…', noReleaseNotes: 'لا توجد ملاحظات لهذا التحديث.', createShortcut: 'إنشاء اختصار',
    shareGame: 'مشاركة اللعبة', deleteGame: 'حذف من المكتبة', shortcutCreating: 'جارٍ إنشاء اختصار لـ {name}…', shortcutCreated: 'تم إنشاء الاختصار: {path}',
    shortcutFailed: 'تعذر إنشاء الاختصار: {error}', shareFailed: 'تعذر إنشاء رابط مشاركة لـ {name}.', shareCopiedFor: 'تم نسخ رابط {name}.',
    stopBeforeDelete: 'أوقف جلسة اللعبة قبل حذفها.', deleteConfirm: 'هل تريد حذف «{name}» من مكتبتك؟', deleted: 'تم حذف {name} من مكتبتك.',
    sharedAdded: 'تمت إضافة اللعبة المشتركة: {name}.', sharedExists: 'اللعبة موجودة بالفعل: {name}.', pasteShare: 'الصق رابط مشاركة Medo أولًا.',
    invalidShare: 'رابط المشاركة غير صالح أو تم تعديله.', importConfirm: 'هل تريد إضافة «{name}» إلى مكتبتك؟', added: 'تمت الإضافة: {name}.',
    alreadyInLibrary: 'موجودة بالفعل في المكتبة: {name}.', addedFromDatabase: 'تمت إضافة {name} إلى مكتبتك.', cancelled: 'تم إلغاء إضافة {name}.',
    noResults: 'لا توجد نتائج.', databaseNotReady: 'قاعدة البيانات غير جاهزة. حاول مرة أخرى.', databaseUpdated: 'تم تحديث قاعدة الألعاب.',
    databaseUnchanged: 'قاعدة الألعاب محدّثة بالفعل.', databaseUpdateAtStartup: 'تم تحديث قاعدة الألعاب من Discord.',
    databaseReadyAtStartup: 'قاعدة الألعاب محدّثة بالفعل.', databaseTimeout: 'انتهت مهلة الاتصال بقاعدة الألعاب. احتفظنا بالنسخة المحفوظة.',
    databaseNetwork: 'تعذر الاتصال بقاعدة الألعاب. تحقق من الإنترنت؛ احتفظنا بالنسخة المحفوظة.',
    databaseHttp: 'أعادت خدمة قاعدة الألعاب خطأً. احتفظنا بالنسخة المحفوظة.',
    databaseInvalid: 'البيانات المستلمة لقاعدة الألعاب غير صالحة. احتفظنا بالنسخة المحفوظة.',
    databaseStorage: 'تعذر حفظ قاعدة الألعاب. احتفظنا بالنسخة السابقة.', databaseRefreshFailed: 'تعذر تحديث قاعدة الألعاب.',
    databaseRefreshing: 'جارٍ التحديث…', starting: 'جارٍ التشغيل…', stopping: 'جارٍ الإيقاف…', launchFailed: 'تعذر تشغيل {name}: {error}', processStarted: 'بدأت جلسة {name}.',
    alreadyRunning: 'جلسة {name} تعمل بالفعل.', processTerminated: 'تم إيقاف جلسة اللعبة.', processExited: 'انتهت جلسة اللعبة.',
    processStopFailed: 'تعذر إيقاف {name}.', updateProgress: 'جارٍ تنزيل التحديث… {percent}% ({transferred} / {total}){speed}',
    downloadComplete: 'اكتمل التنزيل. جارٍ التثبيت…', detectionTitle: 'تنبيه آلية الاكتشاف', detectionIntro: 'يستخدم هذا التطبيق آلية الاكتشاف الأحدث في Discord.',
    detectionNoExe: 'لم يحدد Discord اسم الملف التنفيذي لهذا التطبيق.', detectionFallback: 'سيُستخدم اسم بديل، وقد لا يعمل تتبع اللعبة بشكل صحيح.',
    executableOptional: 'اسم الملف التنفيذي (اختياري)', executableExample: 'مثال: FC27.exe', cancel: 'إلغاء', confirmAdd: 'إضافة اللعبة',
    databaseError: 'تعذر تحميل قاعدة البيانات: {error}', syncError: 'تعذر تحديث قاعدة البيانات.', copyFailed: 'تعذر نسخ الرابط.',
    updateError: 'خطأ في التحديث: {error}',
    closeGamesQuestion: 'ما زالت هناك جلسات ألعاب وهمية تعمل. اختر ما تريد فعله عند إغلاق المشغّل.',
    keepRunningClose: 'اتركها تعمل وأغلق', stopGamesClose: 'أوقف الألعاب وأغلق', closeCancelled: 'إلغاء',
    closeFailureTitle: 'تعذر إيقاف كل الجلسات', closeFailure: 'تعذر إيقاف: {games}. سيظل المشغّل مفتوحًا.', ok: 'حسنًا',
    favoriteYes: 'نعم', favoriteNo: 'لا', runningYes: 'نعم', runningNo: 'لا', downloadCopyDone: 'تم النسخ'
  }
};
let currentLanguage = localStorage.getItem('medo.language') === 'ar' ? 'ar' : 'en';
function t(key, values = {}) {
  const template = translations[currentLanguage]?.[key] || translations.en[key] || key;
  return Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), template);
}
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

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
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
  setText('#systemLogTitle', t('systemLog'));
  setText('#liveActivityText', t('live'));
  setText('#introStatus', t('initializing'));
  setText('#initialReadyLog', t('ready'));
  setText('#addModalTitle', t('databaseTitle'));
  setText('#shareModalTitle', t('shareDialogTitle'));
  setText('#updateTitle', t('updateTitle'));
  setText('#updateRemindBtn', t('remindLater'));
  setText('#updateInstallBtn', t('installUpdate'));
  setText('#updateProgressText', t('downloading'));
  setText('#warningTitle', t('detectionTitle'));
  setText('#detectionIntro', t('detectionIntro'));
  setText('#detectionNoExe', t('detectionNoExe'));
  setText('#detectionFallback', t('detectionFallback'));
  setText('#executableOptionalLabel', t('executableOptional'));
  setText('#warningCancelBtn', t('cancel'));
  setText('#warningConfirmBtn', t('confirmAdd'));
  const importInput = document.getElementById('importLinkInput');
  if (importInput) importInput.placeholder = currentLanguage === 'ar' ? 'الصق رابط medo-launcher:// هنا...' : 'Paste medo-launcher:// link here...';
  const customExeInput = document.getElementById('customExeInput');
  if (customExeInput) customExeInput.placeholder = t('executableExample');
  document.getElementById('minBtn')?.setAttribute('aria-label', t('minimize'));
  document.getElementById('closeBtn')?.setAttribute('aria-label', t('close'));
  for (const id of ['closeModalBtn', 'closeShareModalBtn', 'closeDownloadModalBtn', 'updateCloseBtn', 'warningCloseBtn']) {
    document.getElementById(id)?.setAttribute('aria-label', t('closeDialog'));
  }
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
const DOWNLOAD_URL = 'https://github.com/mghonem2500-tech/DiscordGameLauncher/releases/download/v0.3.1/Medo.Game.Launcher.Setup.0.3.1.exe';
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
  detailFavorite.textContent = selectedGame.isFavorite ? t('yes') : t('no');
  detailRunning.textContent = isGameRunning(selectedGame) ? t('yes') : t('no');
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
      <div class="game-status-dot ${running ? 'active' : ''}" aria-label="${running ? t('running') : t('stopped')}"></div>
      <div style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(game.name)}</div>
      <button class="game-share-btn" title="${escapeHtml(t('shareGame'))}" aria-label="${escapeHtml(t('shareGame'))}: ${escapeHtml(game.name)}">
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
    log(t('shareFailed', { name: game.name }), 'log-danger');
    return;
  }

  sharedGameForModal = game;
  if (shareLinkInput) shareLinkInput.value = result.url;
  if (shareModal) shareModal.style.display = 'flex';
  log(t('shareCopiedFor', { name: game.name }), 'log-success');
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
    <div class="context-menu-item" id="ctxShortcut">${t('createShortcut')}</div>
    <div class="context-menu-item" id="ctxShare">${t('shareGame')}</div>
    <div class="context-menu-item danger" id="ctxDelete">${t('deleteGame')}</div>
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
    log(t('shortcutCreating', { name: game.name }));

    const r = await launcherApi.createShortcut(game.appId, game.exe);
    if (!r?.ok) {
      log(t('shortcutFailed', { error: r?.error || 'unknown error' }), 'log-danger');
      return;
    }

    log(t('shortcutCreated', { path: r.path }), 'log-success');
  });

  shareBtn.addEventListener('click', async () => {
    closeContextMenu();
    const r = await launcherApi.shareGame(game);
    if (r?.ok) log(t('shareCopiedFor', { name: game.name }), 'log-success');
    else log(t('shareFailed', { name: game.name }), 'log-danger');
  });

  deleteBtn.addEventListener('click', async () => {
    // Avoid deleting the currently running selection
      if (isGameRunning(game) && selectedGame && makeGameKey(selectedGame) === makeGameKey(game)) {
      log(t('stopBeforeDelete'), 'log-danger');
      closeContextMenu();
      return;
    }

    if (!window.confirm(t('deleteConfirm', { name: game.name }))) {
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

    log(t('deleted', { name: game.name }), 'log-success');
  });
}

launcherApi.onSharedGame(async (payload) => {
  if (!payload?.entry) return;
  await refreshMyGames();
  log(payload.added
    ? t('sharedAdded', { name: payload.entry.name })
    : t('sharedExists', { name: payload.entry.name }), payload.added ? 'log-success' : '');
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
  updateInstallBtn.textContent = t('installUpdate');

  const version = payload.version ? `v${payload.version}` : t('updateTitle');
  updateSubtitle.textContent = payload.releaseName
    ? `${version} — ${payload.releaseName}`
    : version;

  updateNotes.innerHTML = renderReleaseNotesHtml(payload.releaseNotes);

  if (updateProgressWrap) {
    updateProgressWrap.style.display = 'none';
    updateProgressFill.style.width = '0%';
    updateProgressText.textContent = t('downloading');
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
    updateProgressText.textContent = t('updateProgress', {
      percent: pct,
      transferred: formatBytes(payload.transferred),
      total: formatBytes(payload.total),
      speed
    });
  } else {
    updateProgressText.textContent = t('downloading').replace('…', `… ${pct}%`);
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
  if (!text) return `<p style="color:var(--text-muted);">${escapeHtml(t('noReleaseNotes'))}</p>`;

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
    log(t('pasteShare'), 'log-danger');
    return;
  }

  const preview = await launcherApi.previewSharedGame(rawUrl);
  if (!preview?.ok) {
    log(t('invalidShare'), 'log-danger');
    return;
  }

  const confirmed = window.confirm(t('importConfirm', { name: preview.game.name }));
  if (!confirmed) return;

  const result = await launcherApi.importSharedGame(rawUrl);
  if (!result?.ok) {
    log(t('invalidShare'), 'log-danger');
    return;
  }

  closeModal();
  input.value = '';
  await refreshMyGames();
  const imported = myGames.find(g => makeGameKey(g) === makeGameKey(result.entry));
  if (imported) await selectGame(imported);
  log(result.added
    ? t('added', { name: result.entry.name })
    : t('alreadyInLibrary', { name: result.entry.name }), result.added ? 'log-success' : '');
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
    modalListEl.innerHTML = `<div style="padding:20px; text-align:center;">${escapeHtml(t('databaseNotReady'))} (${escapeHtml(e.message || e)})</div>`;
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
        <span class="modal-item-name">${escapeHtml(game.name)}</span>
        <span class="modal-item-exe">${escapeHtml(game.exe)}</span>
      </div>
      <div style="color:var(--brand); font-weight:bold; font-size:12px;">${escapeHtml(t('addAction'))}</div>
    `;

    div.onclick = async () => {
      // --- CHECK DETECTION FLAG BEFORE ADDING ---
      if (game.usesNewDetection) {
        const choice = await promptDetectionWarning(game);
        if (!choice?.proceed) {
          log(t('cancelled', { name: game.name }), 'log-entry');
          return; // Abort silently
        }
        if (choice.exe) game.exe = choice.exe;
      }
      // ------------------------------------------

      const installed = await launcherApi.addGame(game);
      const addedGame = installed?.entry || game;
      log(installed?.added === false
        ? t('alreadyInLibrary', { name: addedGame.name })
        : t('addedFromDatabase', { name: addedGame.name }), 'log-success');
      closeModal();
      await refreshMyGames();
      const selected = myGames.find(item => makeGameKey(item) === makeGameKey(addedGame));
      if (selected) await selectGame(selected);
    };

    frag.appendChild(div);
  }

  modalListEl.appendChild(frag);

  const hasAnyRows = modalListEl.querySelector('.modal-item') != null;
  if (!hasAnyRows && modalState.offset === 0) {
    modalListEl.innerHTML = `<div style="padding:20px; text-align:center;">${escapeHtml(t('noResults'))}</div>`;
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
    if (!r?.ok) {
      const key = r?.errorCode === 'timeout' ? 'databaseTimeout'
        : r?.errorCode === 'network' ? 'databaseNetwork'
          : r?.errorCode === 'http' ? 'databaseHttp'
            : r?.errorCode === 'invalid-json' || r?.errorCode === 'invalid-schema' ? 'databaseInvalid'
              : 'databaseStorage';
      log(t(key), 'log-danger');
      return;
    }
    log(r.updated ? t('databaseUpdateAtStartup') : t('databaseReadyAtStartup'), 'log-success');
  } catch (e) {
    log(t('databaseNetwork'), 'log-danger');
  }
}

async function refreshDatabase() {
  if (!refreshBtn) return;
  refreshBtn.disabled = true;
  refreshBtn.textContent = `↻ ${t('databaseRefreshing')}`;
  try {
    const r = await launcherApi.syncGameList();
    if (!r?.ok) {
      const key = r?.errorCode === 'timeout' ? 'databaseTimeout'
        : r?.errorCode === 'network' ? 'databaseNetwork'
          : r?.errorCode === 'http' ? 'databaseHttp'
            : r?.errorCode === 'invalid-json' || r?.errorCode === 'invalid-schema' ? 'databaseInvalid'
              : 'databaseStorage';
      log(t(key), 'log-danger');
      return;
    }
    log(r.updated ? t('databaseUpdated') : t('databaseUnchanged'), 'log-success');
  } catch (e) {
    log(t('databaseRefreshFailed'), 'log-danger');
  } finally {
    refreshBtn.disabled = false;
    refreshBtn.textContent = `↻ ${t('refresh')}`;
  }
}

launchBtn.addEventListener('click', async () => {
  if (!selectedGame || launchBusy) return;
  launchBusy = true;
  launchBtn.disabled = true;
  const game = selectedGame;
  const selectedKey = makeGameKey(game);
  const currentlyRunning = isGameRunning(game);
  document.getElementById('launchBtnText').textContent = t(currentlyRunning ? 'stopping' : 'starting');

  try {
    if (!currentlyRunning) {
      const result = await launcherApi.launchGame(game);
      if (!result?.ok) {
        log(t('launchFailed', { name: game.name, error: result?.error || 'unknown error' }), 'log-danger');
        return;
      }
      const activeGames = await launcherApi.getRunningGames();
      runningGames = new Set((activeGames || []).map(item => item.gameKey));
      renderMainList(searchInput.value);
      log(result.alreadyRunning
        ? t('alreadyRunning', { name: game.name })
        : t('processStarted', { name: game.name }), 'log-success');
    } else {
      const result = await launcherApi.stopGame(game);
      if (!result?.ok) {
        log(t('processStopFailed', { name: game.name }), 'log-danger');
        return;
      }
      runningGames.delete(selectedKey);
      renderMainList(searchInput.value);
      log(t('processTerminated'), 'log-success');
    }
  } catch (error) {
    log(t(currentlyRunning ? 'processStopFailed' : 'launchFailed', {
      name: game.name,
      error: error?.message || error || 'unknown error'
    }), 'log-danger');
  } finally {
    launchBusy = false;
    launchBtn.disabled = false;
    syncSelectedGameLaunchState();
    renderMainList(searchInput.value);
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
  copyDownloadLinkBtn.textContent = t('downloadCopyDone');
  setTimeout(() => { copyDownloadLinkBtn.textContent = old; }, 1400);
});
openDownloadLinkBtn?.addEventListener('click', () => launcherApi.openExternalUrl(DOWNLOAD_URL));
shareOpenBtn?.addEventListener('click', async () => {
  if (!shareLinkInput?.value) return;
  const result = await launcherApi.openShareLink(shareLinkInput.value);
  if (!result?.ok) log(t('invalidShare'), 'log-danger');
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
    updateInstallBtn.textContent = t('downloading');
    setUpdateProgress(0, null);

    const r = await launcherApi.installUpdate();
    if (!r?.ok) {
      log(t('updateError', { error: r?.error || 'unknown error' }), 'log-danger');
      updateUiState.installing = false;
      updateInstallBtn.disabled = false;
      updateRemindBtn.disabled = false;
      updateInstallBtn.textContent = t('installUpdate');
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
    log(t('processExited'), 'log-danger');
  }
  updateDetailsPanel();
});

(async function init() {
  const introOverlay = document.getElementById('introOverlay');
  window.setTimeout(() => introOverlay?.remove(), 2800);

  const info = await launcherApi.getAppInfo();
  if (info) {
    if (info.language === 'ar' || info.language === 'en') {
      currentLanguage = info.language;
      localStorage.setItem('medo.language', currentLanguage);
      applyLanguage();
    }
    if (currentVersion) currentVersion.textContent = `v${info.version}`;
    if (developerName) developerName.textContent = `${t('developerPrefix')}: ${info.author}`;
    if (!info.welcomeSeen && welcomeModal) welcomeModal.style.display = 'flex';
  }
  document.getElementById('welcomeStartBtn')?.addEventListener('click', async () => {
    await launcherApi.completeWelcome();
    if (welcomeModal) welcomeModal.style.display = 'none';
  });

  const activeGames = await launcherApi.getRunningGames();
  runningGames = new Set((activeGames || []).map(game => game.gameKey));
  await ensureDatabaseSynced();
  await refreshMyGames();
  renderMainList('');

  // Update notifications
  if (launcherApi.onUpdateAvailable) {
    launcherApi.onUpdateAvailable((payload) => {
      showUpdateModal(payload);
      log(t('updateAvailable'), 'log-success');
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
      if (updateStatusText) updateStatusText.textContent = t('updateUnavailable');
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
      if (updateProgressText) updateProgressText.textContent = t('downloadComplete');
      if (updateInstallBtn) updateInstallBtn.textContent = t('installing');
      log(t('downloadComplete'), 'log-success');
      // Opens the downloaded installer and quits this app so it can run.
      await launcherApi.quitAndInstallUpdate();
    });
  }
  if (launcherApi.onUpdateError) {
    launcherApi.onUpdateError((payload) => {
      log(t('updateError', { error: payload?.message || 'unknown error' }), 'log-danger');
    });
  }
})();
  document.getElementById('refreshBtn')?.setAttribute('title', t('refresh'));
  document.getElementById('checkUpdateBtn')?.setAttribute('title', t('checkUpdates'));
  document.getElementById('downloadLatestBtn')?.setAttribute('title', t('downloadTitle'));
  document.getElementById('languageBtn')?.setAttribute('title', currentLanguage === 'ar' ? 'تغيير اللغة' : 'Change language');
