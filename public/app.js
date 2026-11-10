import { NOISE_TYPES, generateNoise } from './noise.js';
import { createRamp, rampFrom, rampPoints } from './ramp.js';
import { loadSettings, normalizeSettings, saveSettings, volumeToGain } from './settings.js';

const BUFFER_SECONDS = 10;
const CHANNEL_COUNT = 2;
const FADE_IN_SECONDS = 2;
const FADE_OUT_SECONDS = 1;
const CROSSFADE_SECONDS = 1;
const RESUME_FADE_SECONDS = 0.05;
const STOP_MARGIN_SECONDS = 0.05;
const SUSPEND_MARGIN_SECONDS = 0.2;
const VOLUME_TIME_CONSTANT = 0.08;
const RAMP_SEGMENTS = 16;
const MS_PER_SECOND = 1000;
const PERCENT = 100;
const APP_TITLE = 'ADHD BGM';
const SERVICE_WORKER_URL = '/sw.js';

const NOISE_LABELS = Object.freeze({
  white: 'ホワイトノイズ',
  pink: 'ピンクノイズ',
  brown: 'ブラウンノイズ',
});

const MESSAGES = Object.freeze({
  unsupported: 'このブラウザは Web Audio に対応していません。',
  startFailed: '再生を開始できませんでした。もう一度お試しください。',
  switchFailed: 'ノイズを切り替えられませんでした。',
  interrupted: '一時停止中です。ほかの音声などによる中断が終わると再開します。',
  resumeFailed: '音声が中断されたため停止しました。再生ボタンで再開できます。',
});

class AudioUnsupportedError extends Error {}

const elements = {
  noiseButtons: [...document.querySelectorAll('[data-noise]')],
  playButton: document.getElementById('play-button'),
  playLabel: document.getElementById('play-label'),
  volume: document.getElementById('volume'),
  volumeValue: document.getElementById('volume-value'),
  status: document.getElementById('status'),
  statusAlert: document.getElementById('status-alert'),
};

const storage = getStorage();
let settings = loadSettings(storage);
let isPlaying = false;
let engine = null;
let buffers = Object.freeze({});
let voice = null;
let playToken = 0;
let resumeInFlight = false;

function getStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function enablePlaybackAudioSession() {
  try {
    if (navigator.audioSession) {
      navigator.audioSession.type = 'playback';
    }
  } catch {
    // Unsupported session types are non-fatal; playback still works without it.
  }
}

function createNoiseBuffer(context, type) {
  const length = Math.round(context.sampleRate * BUFFER_SECONDS);
  const buffer = context.createBuffer(CHANNEL_COUNT, length, context.sampleRate);
  for (let channel = 0; channel < CHANNEL_COUNT; channel += 1) {
    buffer.copyToChannel(generateNoise({ type, length }), channel);
  }
  return buffer;
}

function createEngine(initialType) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    throw new AudioUnsupportedError(MESSAGES.unsupported);
  }
  enablePlaybackAudioSession();
  const context = new AudioContextClass();
  const resuming = context.resume();
  try {
    const master = context.createGain();
    master.gain.value = volumeToGain(settings.volume);
    master.connect(context.destination);
    const buffer = createNoiseBuffer(context, initialType);
    context.addEventListener('statechange', recoverPlayback);
    return { engine: Object.freeze({ context, master }), buffer, resuming };
  } catch (error) {
    resuming.catch(() => {});
    context.close().catch(() => {});
    throw error;
  }
}

function ensureEngine(type) {
  if (engine) {
    return engine.context.resume();
  }
  const created = createEngine(type);
  engine = created.engine;
  buffers = Object.freeze({ [type]: created.buffer });
  return created.resuming;
}

function getBuffer(type) {
  if (!buffers[type]) {
    buffers = Object.freeze({ ...buffers, [type]: createNoiseBuffer(engine.context, type) });
  }
  return buffers[type];
}

function prefetchBuffers() {
  for (const type of NOISE_TYPES) {
    setTimeout(() => {
      try {
        getBuffer(type);
      } catch {
        // Retried on demand when the user switches to this type.
      }
    }, 0);
  }
}

// cancelScheduledValues may snap an in-progress ramp back to its pre-automation
// value, so the start value must be re-anchored from the JS-side ramp model.
function applyRamp(param, ramp) {
  param.cancelScheduledValues(ramp.startTime);
  param.setValueAtTime(ramp.startValue, ramp.startTime);
  for (const { time, value } of rampPoints(ramp, RAMP_SEGMENTS)) {
    param.linearRampToValueAtTime(value, time);
  }
}

function startVoice(type, fadeSeconds, shape) {
  const buffer = getBuffer(type);
  const { context, master } = engine;
  const now = context.currentTime;
  const ramp = createRamp({ startTime: now, startValue: 0, endValue: 1, duration: fadeSeconds, shape });
  const gain = context.createGain();
  applyRamp(gain.gain, ramp);
  gain.connect(master);
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.connect(gain);
  source.start(now);
  return Object.freeze({ source, gain, ramp });
}

function releaseVoice(target, fadeSeconds, shape) {
  const ramp = rampFrom(target.ramp, engine.context.currentTime, 0, fadeSeconds, shape);
  target.source.onended = () => {
    target.source.disconnect();
    target.gain.disconnect();
  };
  applyRamp(target.gain.gain, ramp);
  target.source.stop(ramp.endTime + STOP_MARGIN_SECONDS);
}

function updateMediaSession() {
  if (!('mediaSession' in navigator)) {
    return;
  }
  try {
    if (typeof window.MediaMetadata === 'function') {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: NOISE_LABELS[settings.noiseType],
        artist: APP_TITLE,
      });
    }
    navigator.mediaSession.setActionHandler('play', () => play());
    navigator.mediaSession.setActionHandler('pause', () => stop());
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  } catch {
    // Some browsers reject individual actions; the on-page controls still work.
  }
}

function setMediaPlaybackState(state) {
  if ('mediaSession' in navigator) {
    navigator.mediaSession.playbackState = state;
  }
}

async function play() {
  if (isPlaying) {
    return;
  }
  playToken += 1;
  const token = playToken;
  isPlaying = true;
  showStatus('');
  render();
  try {
    await ensureEngine(settings.noiseType);
    if (token !== playToken) {
      return;
    }
    voice = startVoice(settings.noiseType, FADE_IN_SECONDS, 'linear');
    updateMediaSession();
    prefetchBuffers();
    recoverPlayback();
  } catch (error) {
    if (token === playToken) {
      isPlaying = false;
      showStatus(error instanceof AudioUnsupportedError ? MESSAGES.unsupported : MESSAGES.startFailed);
      render();
    }
  }
}

function stop(fadeSeconds = FADE_OUT_SECONDS) {
  if (!isPlaying) {
    return;
  }
  playToken += 1;
  isPlaying = false;
  if (voice) {
    releaseVoice(voice, fadeSeconds, 'linear');
    voice = null;
  }
  setMediaPlaybackState('paused');
  scheduleSuspend(playToken, fadeSeconds);
  render();
}

function scheduleSuspend(token, fadeSeconds) {
  setTimeout(() => {
    if (token !== playToken || isPlaying || !engine) {
      return;
    }
    engine.context.suspend().catch(() => {});
  }, (fadeSeconds + SUSPEND_MARGIN_SECONDS) * MS_PER_SECOND);
}

function togglePlayback() {
  if (isPlaying) {
    stop();
  } else {
    play();
  }
}

function reportContextState(state) {
  if (state === 'running') {
    showStatus('');
    return true;
  }
  if (state === 'interrupted') {
    showStatus(MESSAGES.interrupted, 'warning');
    return true;
  }
  return false;
}

// Self-suspension only happens while stopped, so the isPlaying guard keeps it from
// being undone. While interrupted, resume() can fail immediately, so wait for the
// next statechange instead of retrying.
async function recoverPlayback() {
  if (!isPlaying || !engine || resumeInFlight || reportContextState(engine.context.state)) {
    return;
  }
  resumeInFlight = true;
  try {
    await engine.context.resume();
  } catch {
    // Evaluated below from the resulting state.
  } finally {
    resumeInFlight = false;
  }
  if (isPlaying && !reportContextState(engine.context.state)) {
    stop(RESUME_FADE_SECONDS);
    showStatus(MESSAGES.resumeFailed);
  }
}

function selectNoise(type) {
  if (type === settings.noiseType) {
    return;
  }
  settings = normalizeSettings({ ...settings, noiseType: type });
  saveSettings(storage, settings);
  if (isPlaying && voice) {
    crossfadeTo(settings.noiseType);
  }
  render();
}

function crossfadeTo(type) {
  try {
    const previous = voice;
    voice = startVoice(type, CROSSFADE_SECONDS, 'equalPowerIn');
    releaseVoice(previous, CROSSFADE_SECONDS, 'equalPowerOut');
    updateMediaSession();
  } catch {
    showStatus(MESSAGES.switchFailed);
  }
}

function applyVolume(value, persist) {
  settings = normalizeSettings({ ...settings, volume: value });
  if (engine) {
    engine.master.gain.setTargetAtTime(
      volumeToGain(settings.volume),
      engine.context.currentTime,
      VOLUME_TIME_CONSTANT,
    );
  }
  if (persist) {
    saveSettings(storage, settings);
  }
  renderVolume();
}

function isInteractiveTarget(target) {
  return target instanceof Element
    && (target.closest('button, input, select, textarea, a[href]') !== null || target.isContentEditable);
}

function handleKeydown(event) {
  if (event.code !== 'Space' || event.repeat || isInteractiveTarget(event.target)) {
    return;
  }
  event.preventDefault();
  togglePlayback();
}

function showStatus(message, tone = 'error') {
  elements.status.textContent = message;
  elements.statusAlert.classList.toggle('ui-alert--error', message !== '' && tone === 'error');
  elements.statusAlert.classList.toggle('ui-alert--warning', message !== '' && tone === 'warning');
}

function renderVolume() {
  const percent = Math.round(settings.volume * PERCENT);
  elements.volume.value = String(settings.volume);
  elements.volume.setAttribute('aria-valuetext', `${percent}%`);
  elements.volume.style.setProperty('--fill', `${percent}%`);
  elements.volumeValue.textContent = `${percent}%`;
}

function render() {
  for (const button of elements.noiseButtons) {
    button.setAttribute('aria-pressed', String(button.dataset.noise === settings.noiseType));
  }
  elements.playButton.dataset.playing = String(isPlaying);
  elements.playLabel.textContent = isPlaying ? '停止' : '再生';
  renderVolume();
}

function bindEvents() {
  for (const button of elements.noiseButtons) {
    button.addEventListener('click', () => selectNoise(button.dataset.noise));
  }
  elements.playButton.addEventListener('click', togglePlayback);
  elements.volume.addEventListener('input', () => applyVolume(Number(elements.volume.value), false));
  elements.volume.addEventListener('change', () => applyVolume(Number(elements.volume.value), true));
  document.addEventListener('keydown', handleKeydown);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      recoverPlayback();
    }
  });
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      recoverPlayback();
    }
  });
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return;
  }
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(SERVICE_WORKER_URL).catch(() => {
      // Offline support is optional; the player works without it.
    });
  });
}

bindEvents();
render();
registerServiceWorker();
