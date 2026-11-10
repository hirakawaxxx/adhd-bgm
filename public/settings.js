import { NOISE_TYPES } from './noise.js';

export const SETTINGS_STORAGE_KEY = 'adhd-bgm:settings';
export const MAX_GAIN = 0.8;
export const DEFAULT_SETTINGS = Object.freeze({ noiseType: 'pink', volume: 0.3 });

const MIN_VOLUME = 0;
const MAX_VOLUME = 1;

const isValidVolume = (value) =>
  typeof value === 'number' && Number.isFinite(value) && value >= MIN_VOLUME && value <= MAX_VOLUME;

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export function normalizeSettings(input) {
  const source = isPlainObject(input) ? input : {};
  return {
    noiseType: NOISE_TYPES.includes(source.noiseType) ? source.noiseType : DEFAULT_SETTINGS.noiseType,
    volume: isValidVolume(source.volume) ? source.volume : DEFAULT_SETTINGS.volume,
  };
}

export function loadSettings(storage) {
  try {
    const stored = storage ? storage.getItem(SETTINGS_STORAGE_KEY) : null;
    return normalizeSettings(stored === null ? null : JSON.parse(stored));
  } catch {
    return normalizeSettings(null);
  }
}

export function saveSettings(storage, settings) {
  if (!storage) {
    return false;
  }
  try {
    storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalizeSettings(settings)));
    return true;
  } catch {
    return false;
  }
}

export function volumeToGain(volume) {
  if (!Number.isFinite(volume)) {
    return 0;
  }
  const clamped = Math.min(MAX_VOLUME, Math.max(MIN_VOLUME, volume));
  return MAX_GAIN * clamped * clamped;
}
