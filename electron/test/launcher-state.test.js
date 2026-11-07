const test = require('node:test');
const assert = require('node:assert/strict');
const { makeGameKey, isGameRunning, syncRunningGameSet, removeExitedGame } = require('../src/launcher-state');

test('running game state is keyed by app id and executable', () => {
  const game = { appId: '123', exe: 'game.exe' };
  const running = syncRunningGameSet(new Set(), game, true);
  assert.equal(isGameRunning(running, game), true);
  assert.equal(makeGameKey(game), '123::game.exe');
  assert.equal(isGameRunning(removeExitedGame(running, game), game), false);
});

test('invalid game entries do not create state keys', () => {
  assert.equal(makeGameKey(null), '');
  assert.equal(isGameRunning(new Set(), {}), false);
});
