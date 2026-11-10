import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  PUBLIC_DIR,
  SW_PATH,
  computeRevision,
  readPrecacheUrls,
  readRevision,
  urlToFile,
} from '../scripts/sw-revision.mjs';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const IHDR_WIDTH_OFFSET = 16;
const IHDR_HEIGHT_OFFSET = 20;
const IHDR_COLOR_TYPE_OFFSET = 25;
const OPAQUE_COLOR_TYPES = new Set([0, 2]);
const BASE_URL = 'https://example.test/';

const swSource = readFileSync(SW_PATH, 'utf8');
const precacheUrls = readPrecacheUrls(swSource);
const indexHtml = readFileSync(join(PUBLIC_DIR, 'index.html'), 'utf8');
const manifest = JSON.parse(readFileSync(join(PUBLIC_DIR, 'manifest.webmanifest'), 'utf8'));

const readPngInfo = (path) => {
  const bytes = readFileSync(path);
  assert.ok(bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE), `${path} is not a PNG`);
  return {
    width: bytes.readUInt32BE(IHDR_WIDTH_OFFSET),
    height: bytes.readUInt32BE(IHDR_HEIGHT_OFFSET),
    colorType: bytes[IHDR_COLOR_TYPE_OFFSET],
  };
};

const HTML_REFERENCE_PATTERN = /\s(?:href|src)="([^"]+)"/g;
const CSS_URL_PATTERN = /url\(\s*(["']?)([^"')]+)\1\s*\)/g;

const localPaths = (refs, base) =>
  refs
    .map((ref) => new URL(ref, base))
    .filter((url) => url.origin === new URL(BASE_URL).origin)
    .map((url) => url.pathname);

const cssReferences = (cssPath) =>
  localPaths(
    [...readFileSync(urlToFile(cssPath), 'utf8').matchAll(CSS_URL_PATTERN)].map(([, , ref]) => ref),
    new URL(cssPath, BASE_URL),
  );

const localReferences = (html) => {
  const paths = localPaths([...html.matchAll(HTML_REFERENCE_PATTERN)].map(([, ref]) => ref), BASE_URL);
  return [...paths, ...paths.filter((path) => path.endsWith('.css')).flatMap(cssReferences)];
};

describe('service worker precache', () => {
  test('lists at least the app shell', () => {
    assert.ok(precacheUrls.includes('/'));
    assert.ok(precacheUrls.length > 1);
  });

  test('has no duplicate entries', () => {
    assert.equal(new Set(precacheUrls).size, precacheUrls.length);
  });

  for (const url of precacheUrls) {
    test(`${url} exists in public/`, () => {
      assert.ok(existsSync(urlToFile(url)), `missing ${urlToFile(url)}`);
    });
  }

  test('does not use URLs the host redirects', () => {
    for (const url of precacheUrls) {
      assert.ok(!url.endsWith('.html'), `${url} would be redirected by the asset server`);
    }
  });

  test('includes every local asset referenced by index.html and its stylesheets', () => {
    const missing = localReferences(indexHtml).filter((path) => !precacheUrls.includes(path));
    assert.deepEqual(missing, []);
  });

  test('detects url() references inside stylesheets', () => {
    assert.ok(localReferences(indexHtml).includes('/fonts/zen-maru-gothic-700.woff2'));
  });

  test('includes every manifest icon', () => {
    const missing = manifest.icons.map(({ src }) => src).filter((src) => !precacheUrls.includes(src));
    assert.deepEqual(missing, []);
  });

  test('PRECACHE_REVISION matches the precached files (run `node scripts/sw-revision.mjs`)', () => {
    assert.equal(readRevision(swSource), computeRevision(precacheUrls));
  });
});

describe('web app manifest', () => {
  test('declares the app identity', () => {
    assert.equal(manifest.name, '集中用ノイズ');
    assert.equal(manifest.lang, 'ja');
    assert.equal(manifest.start_url, '/');
    assert.equal(manifest.scope, '/');
    assert.equal(manifest.display, 'standalone');
  });

  test('has any and maskable icons', () => {
    const purposes = new Set(manifest.icons.map(({ purpose }) => purpose));
    assert.ok(purposes.has('any'));
    assert.ok(purposes.has('maskable'));
  });

  for (const icon of manifest.icons) {
    test(`${icon.src} matches its declared size and is opaque`, () => {
      const path = urlToFile(icon.src);
      assert.ok(existsSync(path), `missing ${path}`);
      const { width, height, colorType } = readPngInfo(path);
      assert.equal(`${width}x${height}`, icon.sizes);
      assert.ok(OPAQUE_COLOR_TYPES.has(colorType), `color type ${colorType} may contain alpha`);
    });
  }

  test('apple-touch-icon is a 180x180 opaque PNG', () => {
    const { width, height, colorType } = readPngInfo(urlToFile('/icons/apple-touch-icon.png'));
    assert.deepEqual([width, height], [180, 180]);
    assert.ok(OPAQUE_COLOR_TYPES.has(colorType));
  });
});

describe('index.html PWA head', () => {
  for (const pattern of [
    /<link rel="manifest" href="[^"]*manifest\.webmanifest"/,
    /<link rel="icon" href="[^"]*favicon\.svg"/,
    /<link rel="apple-touch-icon" href="[^"]*apple-touch-icon\.png"/,
    /<meta name="theme-color" content="#[0-9a-f]{6}" media="\(prefers-color-scheme: light\)"/,
    /<meta name="theme-color" content="#[0-9a-f]{6}" media="\(prefers-color-scheme: dark\)"/,
    /<meta name="apple-mobile-web-app-title" content="[^"]+"/,
  ]) {
    test(`contains ${pattern.source}`, () => {
      assert.match(indexHtml, pattern);
    });
  }
});
