import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createRamp, rampFrom, rampPoints, rampValueAt } from '../public/ramp.js';

const EPSILON = 1e-9;
const assertClose = (actual, expected, epsilon = EPSILON) =>
  assert.ok(Math.abs(actual - expected) < epsilon, `${actual} !== ${expected}`);

const fadeIn = (shape) =>
  createRamp({ startTime: 10, startValue: 0, endValue: 1, duration: 2, shape });
const fadeOut = (shape) =>
  createRamp({ startTime: 10, startValue: 1, endValue: 0, duration: 2, shape });

describe('createRamp', () => {
  test('returns a frozen ramp with endTime', () => {
    const ramp = fadeIn('linear');
    assert.ok(Object.isFrozen(ramp));
    assert.deepEqual({ ...ramp }, {
      startTime: 10,
      startValue: 0,
      endTime: 12,
      endValue: 1,
      shape: 'linear',
    });
  });

  test('defaults to a linear shape', () => {
    const ramp = createRamp({ startTime: 0, startValue: 0, endValue: 1, duration: 1 });
    assert.equal(ramp.shape, 'linear');
  });

  const base = { startTime: 0, startValue: 0, endValue: 1, duration: 1 };
  const invalid = [
    ['zero duration', { ...base, duration: 0 }],
    ['negative duration', { ...base, duration: -1 }],
    ['NaN start time', { ...base, startTime: Number.NaN }],
    ['infinite start value', { ...base, startValue: Infinity }],
    ['non-numeric end value', { ...base, endValue: '1' }],
    ['unknown shape', { ...base, shape: 'cubic' }],
  ];
  for (const [name, options] of invalid) {
    test(`rejects ${name}`, () => {
      assert.throws(() => createRamp(options), RangeError);
    });
  }
});

describe('rampValueAt', () => {
  test('holds the start value before the ramp begins', () => {
    assert.equal(rampValueAt(fadeIn('linear'), 5), 0);
  });

  test('holds the end value after the ramp ends', () => {
    assert.equal(rampValueAt(fadeIn('linear'), 20), 1);
  });

  test('interpolates linearly', () => {
    assertClose(rampValueAt(fadeIn('linear'), 11), 0.5);
    assertClose(rampValueAt(fadeOut('linear'), 11.5), 0.25);
  });

  test('equal-power shapes follow sine / cosine', () => {
    assertClose(rampValueAt(fadeIn('equalPowerIn'), 11), Math.SQRT1_2);
    assertClose(rampValueAt(fadeOut('equalPowerOut'), 11), Math.SQRT1_2);
  });

  test('equal-power crossfade keeps total power constant', () => {
    const rampIn = fadeIn('equalPowerIn');
    const rampOut = fadeOut('equalPowerOut');
    for (let t = 10; t <= 12; t += 0.125) {
      const power = rampValueAt(rampIn, t) ** 2 + rampValueAt(rampOut, t) ** 2;
      assertClose(power, 1);
    }
  });
});

describe('rampFrom', () => {
  test('starts a new ramp from the current value of the previous one', () => {
    const next = rampFrom(fadeIn('linear'), 11, 0, 1, 'linear');
    assertClose(next.startValue, 0.5);
    assert.equal(next.startTime, 11);
    assert.equal(next.endTime, 12);
    assert.equal(next.endValue, 0);
  });

  test('does not mutate the previous ramp', () => {
    const previous = fadeIn('linear');
    const next = rampFrom(previous, 11, 0, 1, 'linear');
    assert.notEqual(next, previous);
    assert.equal(previous.endValue, 1);
  });
});

describe('rampPoints', () => {
  test('linear ramps need a single end point', () => {
    assert.deepEqual(rampPoints(fadeIn('linear'), 16), [{ time: 12, value: 1 }]);
  });

  test('curved ramps are split into segments ending at the end value', () => {
    const points = rampPoints(fadeIn('equalPowerIn'), 4);
    assert.equal(points.length, 4);
    assert.deepEqual(points.at(-1), { time: 12, value: 1 });
    assertClose(points[1].value, Math.SQRT1_2);
  });

  test('rejects invalid segment counts', () => {
    assert.throws(() => rampPoints(fadeIn('equalPowerIn'), 0), RangeError);
    assert.throws(() => rampPoints(fadeIn('equalPowerIn'), 1.5), RangeError);
  });
});
