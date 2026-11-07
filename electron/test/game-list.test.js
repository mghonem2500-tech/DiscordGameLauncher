const test = require('node:test');
const assert = require('node:assert/strict');
const { parseGameList } = require('../src/game-list');

test('accepts a non-empty Discord game list with valid names', () => {
  const games = parseGameList(JSON.stringify([{ name: 'Example Game', executables: [] }]));
  assert.equal(games.length, 1);
  assert.equal(games[0].name, 'Example Game');
});

test('rejects malformed JSON with a stable error code', () => {
  assert.throws(() => parseGameList('{'), error => error.code === 'invalid-json');
});

test('rejects empty and incorrectly shaped lists', () => {
  assert.throws(() => parseGameList('[]'), error => error.code === 'invalid-schema');
  assert.throws(() => parseGameList('{"items":[]}'), error => error.code === 'invalid-schema');
  assert.throws(() => parseGameList('[{"name":"   "}]'), error => error.code === 'invalid-schema');
});
