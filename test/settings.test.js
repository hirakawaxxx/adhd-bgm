import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SETTINGS,
  MAX_GAIN,
  SETTINGS_STORAGE_KEY,
  loadSettings,
  normalizeSettings,
  saveSettings,
  volumeToGain,
} from '../public/settings.js';

const createMemoryStorage = (initial = {}) => {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => {
      data.set(key, String(value));
    },
    snapshot: () => Object.fromEntries(data),
  };
};

const throwingStorage = {
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
};

describe('DEFAULT_SETTINGS', () => {
  test('defaults to pink noise at a low volume', () => {
    assert.deepEqual({ ...DEFAULT_SETTINGS }, { noiseType: 'pink', volume: 0.3 });
  });

  test('is frozen', () => {
    assert.ok(Object.isFrozen(DEFAULT_SETTINGS));
  });
});

describe('normalizeSettings', () => {
  test('keeps valid values', () => {
    assert.deepEqual(normalizeSettings({ noiseType: 'brown', volume: 0.75 }), {
      noiseType: 'brown',
      volume: 0.75,
    });
  });

  test('accepts volume boundaries 0 and 1', () => {
    assert.equal(normalizeSettings({ noiseType: 'white', volume: 0 }).volume, 0);
    assert.equal(normalizeSettings({ noiseType: 'white', volume: 1 }).volume, 1);
  });

  test('falls back on unknown noise type', () => {
    assert.equal(normalizeSettings({ noiseType: 'blue', volume: 0.5 }).noiseType, 'pink');
  });

  for (const volume of [-0.1, 1.1, Number.NaN, Infinity, '0.5', null, undefined, {}]) {
    test(`falls back on invalid volume ${String(volume)}`, () => {
      assert.equal(normalizeSettings({ noiseType: 'white', volume }).volume, 0.3);
    });
  }

  for (const input of [null, undefined, 'pink', 42, []]) {
    test(`falls back entirely on non-object input ${JSON.stringify(input)}`, () => {
      assert.deepEqual(normalizeSettings(input), { ...DEFAULT_SETTINGS });
    });
  }

  test('returns a new object and does not mutate the input', () => {
    const input = Object.freeze({ noiseType: 'white', volume: 0.5, extra: true });
    const result = normalizeSettings(input);
    assert.notEqual(result, input);
    assert.deepEqual(result, { noiseType: 'white', volume: 0.5 });
  });

  test('never returns DEFAULT_SETTINGS itself', () => {
    assert.notEqual(normalizeSettings(null), DEFAULT_SETTINGS);
  });
});

describe('loadSettings', () => {
  test('loads stored valid settings', () => {
    const storage = createMemoryStorage({
      [SETTINGS_STORAGE_KEY]: JSON.stringify({ noiseType: 'brown', volume: 0.2 }),
    });
    assert.deepEqual(loadSettings(storage), { noiseType: 'brown', volume: 0.2 });
  });

  test('returns defaults when nothing is stored', () => {
    assert.deepEqual(loadSettings(createMemoryStorage()), { ...DEFAULT_SETTINGS });
  });

  test('returns defaults on broken JSON', () => {
    const storage = createMemoryStorage({ [SETTINGS_STORAGE_KEY]: '{not json' });
    assert.deepEqual(loadSettings(storage), { ...DEFAULT_SETTINGS });
  });

  test('normalizes partially invalid stored values', () => {
    const storage = createMemoryStorage({
      [SETTINGS_STORAGE_KEY]: JSON.stringify({ noiseType: 'white', volume: 9 }),
    });
    assert.deepEqual(loadSettings(storage), { noiseType: 'white', volume: 0.3 });
  });

  test('returns defaults when storage throws', () => {
    assert.deepEqual(loadSettings(throwingStorage), { ...DEFAULT_SETTINGS });
  });

  test('returns defaults when storage is unavailable', () => {
    assert.deepEqual(loadSettings(null), { ...DEFAULT_SETTINGS });
  });

  test('returns a new object each time', () => {
    const storage = createMemoryStorage();
    assert.notEqual(loadSettings(storage), loadSettings(storage));
  });
});

describe('saveSettings', () => {
  test('stores normalized settings as JSON and returns true', () => {
    const storage = createMemoryStorage();
    assert.equal(saveSettings(storage, { noiseType: 'white', volume: 0.6, extra: 1 }), true);
    assert.deepEqual(JSON.parse(storage.snapshot()[SETTINGS_STORAGE_KEY]), {
      noiseType: 'white',
      volume: 0.6,
    });
  });

  test('returns false when storage throws', () => {
    assert.equal(saveSettings(throwingStorage, DEFAULT_SETTINGS), false);
  });

  test('returns false when storage is unavailable', () => {
    assert.equal(saveSettings(null, DEFAULT_SETTINGS), false);
  });
});

describe('volumeToGain', () => {
  test('maps with a squared curve capped at MAX_GAIN', () => {
    assert.equal(volumeToGain(0), 0);
    assert.equal(volumeToGain(1), MAX_GAIN);
    assert.ok(Math.abs(volumeToGain(0.5) - MAX_GAIN * 0.25) < 1e-12);
  });

  test('keeps the maximum gain conservative', () => {
    assert.ok(MAX_GAIN > 0 && MAX_GAIN <= 0.8);
  });

  test('clamps out-of-range and invalid input', () => {
    assert.equal(volumeToGain(2), MAX_GAIN);
    assert.equal(volumeToGain(-1), 0);
    assert.equal(volumeToGain(Number.NaN), 0);
  });
});
