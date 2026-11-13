import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveThemeMode, parseStoredThemeMode, getChartThemeTokens } from './theme';

test('resolveThemeMode handles light, dark, and system modes accurately', () => {
  assert.equal(resolveThemeMode('light', true), 'light');
  assert.equal(resolveThemeMode('light', false), 'light');
  assert.equal(resolveThemeMode('dark', false), 'dark');
  assert.equal(resolveThemeMode('dark', true), 'dark');
  assert.equal(resolveThemeMode('system', true), 'dark');
  assert.equal(resolveThemeMode('system', false), 'light');
});

test('parseStoredThemeMode falls back to light (Brown Cream) on invalid values', () => {
  assert.equal(parseStoredThemeMode('light'), 'light');
  assert.equal(parseStoredThemeMode('dark'), 'dark');
  assert.equal(parseStoredThemeMode('system'), 'system');
  assert.equal(parseStoredThemeMode(null), 'light');
  assert.equal(parseStoredThemeMode('unknown'), 'light');
});

test('getChartThemeTokens returns Brown Cream palette for light and Dark Brown palette for dark', () => {
  const light = getChartThemeTokens('light');
  assert.equal(light.isDark, false);
  assert.equal(light.cardBg, '#FFFDF9');
  assert.equal(light.primary, '#795548');
  assert.equal(light.caramel, '#C49A6C');
  assert.equal(light.gridStroke, '#DED3C5');

  const dark = getChartThemeTokens('dark');
  assert.equal(dark.isDark, true);
  assert.equal(dark.cardBg, '#332A25');
  assert.equal(dark.primary, '#B38B68');
  assert.equal(dark.caramel, '#D1A575');
  assert.equal(dark.gridStroke, '#4A3C33');
});
