export const NOISE_TYPES = Object.freeze(['white', 'pink', 'brown']);
const TARGET_RMS_DBFS = -18;
export const TARGET_RMS = 10 ** (TARGET_RMS_DBFS / 20);
export const MAX_PEAK = 0.9;
export const DEFAULT_CROSSFADE_LENGTH = 4096;

// Paul Kellet's refined pink filter: [pole, gain] per first-order section.
const PINK_SECTIONS = Object.freeze([
  [0.99886, 0.0555179],
  [0.99332, 0.0750759],
  [0.969, 0.153852],
  [0.8665, 0.3104856],
  [0.55, 0.5329522],
  [-0.7616, -0.016898],
]);
const PINK_DIRECT_GAIN = 0.5362;
const PINK_DELAYED_GAIN = 0.115926;

const BROWN_STEP = 0.02;
const BROWN_LEAK = 1.02;

const MULBERRY_INCREMENT = 0x6d2b79f5;
const UINT32_RANGE = 4294967296;

export function createSeededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + MULBERRY_INCREMENT) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / UINT32_RANGE;
  };
}

const whiteSample = (random) => random() * 2 - 1;

function generateWhite(length, random) {
  const out = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    out[i] = whiteSample(random);
  }
  return out;
}

function generatePink(length, random) {
  const out = new Float32Array(length);
  const states = new Float64Array(PINK_SECTIONS.length);
  let delayed = 0;
  for (let i = 0; i < length; i += 1) {
    const white = whiteSample(random);
    let sum = 0;
    for (let s = 0; s < PINK_SECTIONS.length; s += 1) {
      const [pole, gain] = PINK_SECTIONS[s];
      states[s] = pole * states[s] + gain * white;
      sum += states[s];
    }
    out[i] = sum + delayed + white * PINK_DIRECT_GAIN;
    delayed = white * PINK_DELAYED_GAIN;
  }
  return out;
}

function generateBrown(length, random) {
  const out = new Float32Array(length);
  let last = 0;
  for (let i = 0; i < length; i += 1) {
    last = (last + BROWN_STEP * whiteSample(random)) / BROWN_LEAK;
    out[i] = last;
  }
  return out;
}

const GENERATORS = Object.freeze({
  white: generateWhite,
  pink: generatePink,
  brown: generateBrown,
});

// raw has `length + crossfadeLength` samples. The head is blended with the
// overflow tail so that out[length - 1] -> out[0] equals raw[length - 1] -> raw[length].
function crossfadeLoop(raw, length, crossfadeLength) {
  const out = raw.slice(0, length);
  for (let i = 0; i < crossfadeLength; i += 1) {
    const angle = (i / crossfadeLength) * (Math.PI / 2);
    out[i] = raw[i] * Math.sin(angle) + raw[length + i] * Math.cos(angle);
  }
  return out;
}

function normalizeLoudness(samples) {
  const peak = samples.reduce((max, x) => Math.max(max, Math.abs(x)), 0);
  const rms = Math.sqrt(samples.reduce((sum, x) => sum + x * x, 0) / samples.length);
  if (peak === 0 || rms === 0) {
    return samples.slice();
  }
  const scale = Math.min(TARGET_RMS / rms, MAX_PEAK / peak);
  return samples.map((x) => x * scale);
}

function validateOptions({ type, length, random, crossfadeLength }) {
  if (!Object.hasOwn(GENERATORS, type)) {
    throw new RangeError(`Unknown noise type: ${String(type)}`);
  }
  if (!Number.isInteger(length) || length <= 0) {
    throw new RangeError(`length must be a positive integer: ${String(length)}`);
  }
  if (typeof random !== 'function') {
    throw new RangeError('random must be a function returning [0, 1)');
  }
  if (!Number.isInteger(crossfadeLength) || crossfadeLength < 0 || crossfadeLength >= length) {
    throw new RangeError(`crossfadeLength must be an integer in [0, length): ${String(crossfadeLength)}`);
  }
}

export function generateNoise(options) {
  if (options === null || typeof options !== 'object') {
    throw new RangeError('options object is required');
  }
  const {
    type,
    length,
    random = Math.random,
    crossfadeLength = Math.min(DEFAULT_CROSSFADE_LENGTH, Math.floor(length / 2)),
  } = options;
  validateOptions({ type, length, random, crossfadeLength });
  const raw = GENERATORS[type](length + crossfadeLength, random);
  return normalizeLoudness(crossfadeLoop(raw, length, crossfadeLength));
}
