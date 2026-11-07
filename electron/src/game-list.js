function parseGameList(text) {
  let games;
  try {
    games = JSON.parse(String(text));
  } catch {
    const error = new Error('The game database response is not valid JSON.');
    error.code = 'invalid-json';
    throw error;
  }

  if (!Array.isArray(games) || games.length === 0) {
    const error = new Error('The game database response is empty or has an invalid format.');
    error.code = 'invalid-schema';
    throw error;
  }

  const valid = games.every(game =>
    game && typeof game === 'object' && !Array.isArray(game) &&
    typeof game.name === 'string' && game.name.trim().length > 0 &&
    (game.executables == null || Array.isArray(game.executables)));

  if (!valid) {
    const error = new Error('The game database contains malformed entries.');
    error.code = 'invalid-schema';
    throw error;
  }

  return games;
}

module.exports = { parseGameList };
