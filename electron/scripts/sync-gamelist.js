const path = require('path');
const os = require('os');
const { replaceAtomically } = require('../src/persistence');
const { parseGameList } = require('../src/game-list');

const DISCORD_DETECTABLE_URL = 'https://discord.com/api/applications/detectable';

async function main() {
  const outPath = path.resolve(__dirname, '..', 'gamelist.json');
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
      throw new Error(controller.signal.aborted
        ? 'Timed out while connecting to Discord’s game database.'
        : `Could not connect to Discord’s game database: ${error.message}`);
    }

    if (!res.ok) throw new Error(`Discord API returned HTTP ${res.status}.`);
    const text = (await res.text()).trim();
    parseGameList(text);
    await replaceAtomically(outPath, `${text}${os.EOL}`, `${outPath}.bak`);
    console.log(`Validated and saved ${outPath}`);
  } finally {
    clearTimeout(timeout);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
