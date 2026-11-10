import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_PEAK,
  NOISE_TYPES,
  TARGET_RMS,
  createSeededRandom,
  generateNoise,
} from '../public/noise.js';

const LENGTH = 48000;
const CROSSFADE_LENGTH = 2400;
const SEAM_SEEDS = 20;
const SEAM_RATIO_LIMIT = 1.5;
const RMS_SPREAD_DB = 1;
const FLOAT32_TOLERANCE = 1e-5;

const makeNoise = (type, seed = 1, crossfadeLength = CROSSFADE_LENGTH) =>
  generateNoise({
    type,
    length: LENGTH,
    random: createSeededRandom(seed),
    crossfadeLength,
  });

const peakOf = (samples) => samples.reduce((max, x) => Math.max(max, Math.abs(x)), 0);
const rmsOf = (samples) => Math.sqrt(samples.reduce((sum, x) => sum + x * x, 0) / samples.length);
const toDb = (value) => 20 * Math.log10(value);

const meanAdjacentDiff = (samples) => {
  let sum = 0;
  for (let i = 1; i < samples.length; i += 1) {
    sum += Math.abs(samples[i] - samples[i - 1]);
  }
  return sum / (samples.length - 1);
};

// A single seam jump is a random variable, so average it over many seeds relative
// to an ordinary adjacent step; a continuous loop averages close to 1.
const meanSeamRatio = (type, crossfadeLength) => {
  let sum = 0;
  for (let seed = 1; seed <= SEAM_SEEDS; seed += 1) {
    const samples = makeNoise(type, seed, crossfadeLength);
    sum += Math.abs(samples[LENGTH - 1] - samples[0]) / meanAdjacentDiff(samples);
  }
  return sum / SEAM_SEEDS;
};

const createSequenceRandom = (step) => {
  let index = 0;
  return () => {
    const value = (index * step) % 1;
    index += 1;
    return value;
  };
};

describe('createSeededRandom', () => {
  test('returns values in [0, 1)', () => {
    const random = createSeededRandom(42);
    for (let i = 0; i < 1000; i += 1) {
      const value = random();
      assert.ok(value >= 0 && value < 1, `out of range: ${value}`);
    }
  });

  test('is deterministic for the same seed', () => {
    const a = createSeededRandom(7);
    const b = createSeededRandom(7);
    assert.deepEqual([a(), a(), a()], [b(), b(), b()]);
  });
});

describe('generateNoise', () => {
  for (const type of NOISE_TYPES) {
    describe(type, () => {
      const samples = makeNoise(type);

      test('returns a Float32Array of the requested length', () => {
        assert.ok(samples instanceof Float32Array);
        assert.equal(samples.length, LENGTH);
      });

      test('all samples are finite and within [-1, 1]', () => {
        assert.ok(samples.every((x) => Number.isFinite(x) && Math.abs(x) <= 1));
      });

      test('peak does not exceed MAX_PEAK', () => {
        assert.ok(peakOf(samples) <= MAX_PEAK + FLOAT32_TOLERANCE);
      });

      test('RMS is close to TARGET_RMS', () => {
        assert.ok(Math.abs(toDb(rmsOf(samples)) - toDb(TARGET_RMS)) < RMS_SPREAD_DB / 2);
      });

      test('loop seam is as continuous as an ordinary step', () => {
        assert.ok(meanSeamRatio(type, CROSSFADE_LENGTH) < SEAM_RATIO_LIMIT);
      });

      test('is deterministic for the same seed', () => {
        assert.deepEqual(makeNoise(type, 123), makeNoise(type, 123));
      });

      test('differs for different seeds', () => {
        assert.notDeepEqual(makeNoise(type, 1), makeNoise(type, 2));
      });
    });
  }

  for (const type of ['pink', 'brown']) {
    test(`${type} seam check detects a missing crossfade`, () => {
      assert.ok(meanSeamRatio(type, 0) >= SEAM_RATIO_LIMIT);
    });
  }

  test('RMS of all types matches within 1 dB', () => {
    const levels = NOISE_TYPES.map((type) => toDb(rmsOf(makeNoise(type))));
    assert.ok(Math.max(...levels) - Math.min(...levels) < RMS_SPREAD_DB, levels.join(', '));
  });

  test('crossfade blends the head with the overflow tail (known sequence)', () => {
    const length = 1000;
    const crossfadeLength = 100;
    const step = 0.618034;
    const raw = Array.from({ length: length + crossfadeLength }, (_, k) => 2 * ((k * step) % 1) - 1);
    const out = generateNoise({
      type: 'white',
      length,
      random: createSequenceRandom(step),
      crossfadeLength,
    });
    const scale = out[crossfadeLength] / raw[crossfadeLength];
    const expected = (i) => {
      if (i >= crossfadeLength) {
        return raw[i];
      }
      const angle = (i / crossfadeLength) * (Math.PI / 2);
      return raw[i] * Math.sin(angle) + raw[length + i] * Math.cos(angle);
    };
    for (let i = 0; i < length; i += 1) {
      assert.ok(Math.abs(out[i] - scale * expected(i)) < FLOAT32_TOLERANCE, `index ${i}`);
    }
    assert.ok(Math.abs(out[0] - scale * raw[length]) < FLOAT32_TOLERANCE);
  });

  test('brown and pink are lower-frequency than white', () => {
    const white = meanAdjacentDiff(makeNoise('white'));
    const pink = meanAdjacentDiff(makeNoise('pink'));
    const brown = meanAdjacentDiff(makeNoise('brown'));
    assert.ok(brown < pink, `brown ${brown} >= pink ${pink}`);
    assert.ok(pink < white, `pink ${pink} >= white ${white}`);
  });

  test('uses Math.random and a default crossfade when omitted', () => {
    const samples = generateNoise({ type: 'white', length: LENGTH });
    assert.equal(samples.length, LENGTH);
  });

  describe('rejects invalid arguments', () => {
    const base = { type: 'white', length: LENGTH, crossfadeLength: CROSSFADE_LENGTH };
    const cases = [
      ['unknown type', { ...base, type: 'blue' }],
      ['zero length', { ...base, length: 0 }],
      ['negative length', { ...base, length: -10 }],
      ['fractional length', { ...base, length: 10.5 }],
      ['NaN length', { ...base, length: Number.NaN }],
      ['non-function random', { ...base, random: 0.5 }],
      ['negative crossfade', { ...base, crossfadeLength: -1 }],
      ['crossfade >= length', { ...base, crossfadeLength: LENGTH }],
      ['fractional crossfade', { ...base, crossfadeLength: 1.5 }],
    ];
    for (const [name, options] of cases) {
      test(name, () => {
        assert.throws(() => generateNoise(options), RangeError);
      });
    }

    test('missing options', () => {
      assert.throws(() => generateNoise(), RangeError);
    });
  });
});
